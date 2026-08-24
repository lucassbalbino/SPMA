// e2e de POST /api/auth/logout (T21).
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getSessao, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhoCookie,
  cookiesDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";
const CPF_LOGOUT = "20070080097";
const CPFS = [CPF_LOGOUT];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_LOGOUT, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("após o logout o cookie anterior não autentica mais uma rota protegida", async () => {
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { cpf: CPF_LOGOUT, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(login);
  expect(idSessao).not.toBeNull();

  const clienteLogout = await novoCliente();
  const logout = await clienteLogout.post("/api/auth/logout", {
    headers: cabecalhoCookie(idSessao!),
  });

  expect(logout.status()).toBe(200);
  // O cookie é limpo na resposta: valor vazio e prazo no passado.
  const cookies = cookiesDaResposta(logout);
  expect(cookies).toContain("spma_sessao=");
  expect(cookies).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  // A sessão deixou de existir no banco.
  expect(getSessao(idSessao!)).toBeNull();

  const senhaHashAntes = getUsuario(CPF_LOGOUT)?.senhaHash;

  // O mesmo cookie, agora, não autentica uma rota protegida de verdade.
  const clienteProtegido = await novoCliente();
  const protegida = await clienteProtegido.post("/api/auth/primeiro-acesso", {
    data: { senha: "OutraSenha123", confirmacaoSenha: "OutraSenha123" },
    headers: cabecalhoCookie(idSessao!),
  });

  expect(protegida.status()).toBe(401);
  // E, por não ter autenticado, nada foi alterado no usuário.
  expect(getUsuario(CPF_LOGOUT)?.senhaHash).toBe(senhaHashAntes);

  await clienteLogin.dispose();
  await clienteLogout.dispose();
  await clienteProtegido.dispose();
});

test("logout sem sessão ativa é tratado com 401, sem erro 500", async () => {
  const semCookie = await novoCliente();
  const resSemCookie = await semCookie.post("/api/auth/logout");

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/auth/logout", {
    headers: cabecalhoCookie("00000000-0000-4000-8000-000000000000"),
  });

  expect(resSemCookie.status()).toBe(401);
  expect(resCookieInvalido.status()).toBe(401);
  expect(resSemCookie.status()).toBeLessThan(500);
  expect(resCookieInvalido.status()).toBeLessThan(500);

  await semCookie.dispose();
  await cookieInvalido.dispose();
});
