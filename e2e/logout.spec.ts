// e2e de POST /api/auth/logout (T21).
//
// Nota (seguranca-transversal, T14/T20): a rota exige CSRF (REQ-SEC-15),
// checado antes até da sessão (design.md). Chamadas autenticadas usam
// `cabecalhosAutenticados` (T19); CA-SEC-15 é a exceção deliberada (prova a
// rejeição por CSRF ausente, então não pode anexar um token válido).
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getSessao, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhoCookie,
  cabecalhosAutenticados,
  cookiesDaResposta,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";
const CPF_LOGOUT = "20070080097";
const CPF_LOGOUT_CSRF = "20090040007";
const CPFS = [CPF_LOGOUT, CPF_LOGOUT_CSRF];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_LOGOUT, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_LOGOUT_CSRF, tipo: "AL", senha: SENHA, primeiraVez: false });
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
  const idCsrf = idCsrfDaResposta(login);
  expect(idSessao).not.toBeNull();
  expect(idCsrf).not.toBeNull();

  const clienteLogout = await novoCliente();
  const logout = await clienteLogout.post("/api/auth/logout", {
    headers: cabecalhosAutenticados(idSessao!, idCsrf!),
  });

  expect(logout.status()).toBe(200);
  // O cookie é limpo na resposta: valor vazio e prazo no passado.
  const cookies = cookiesDaResposta(logout);
  expect(cookies).toContain("spma_sessao=");
  expect(cookies).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  // A sessão deixou de existir no banco.
  expect(getSessao(idSessao!)).toBeNull();

  const senhaHashAntes = getUsuario(CPF_LOGOUT)?.senhaHash;

  // O mesmo cookie de sessão, agora, não autentica uma rota protegida de
  // verdade - o par CSRF em si continua válido (double-submit não depende
  // da sessão), só a sessão que caiu.
  const clienteProtegido = await novoCliente();
  const protegida = await clienteProtegido.post("/api/auth/primeiro-acesso", {
    data: { senha: "OutraSenha123", confirmacaoSenha: "OutraSenha123" },
    headers: cabecalhosAutenticados(idSessao!, idCsrf!),
  });

  expect(protegida.status()).toBe(401);
  // E, por não ter autenticado, nada foi alterado no usuário.
  expect(getUsuario(CPF_LOGOUT)?.senhaHash).toBe(senhaHashAntes);

  await clienteLogin.dispose();
  await clienteLogout.dispose();
  await clienteProtegido.dispose();
});

test("logout sem sessão ativa é tratado com 401, sem erro 500", async () => {
  // REQ-SEC-15: CSRF é checado antes da sessão, então mesmo este cenário de
  // sessão ausente/inválida precisa de um par CSRF autoconsistente
  // (cookie == header) para alcançar a checagem de sessão que este teste
  // prova - double-submit não tem estado no servidor, então o valor não
  // precisa vir de um login real.
  const csrfArbitrario = "csrf-arbitrario-sem-sessao";

  const semCookie = await novoCliente();
  const resSemCookie = await semCookie.post("/api/auth/logout", {
    headers: {
      Cookie: `spma_csrf=${csrfArbitrario}`,
      "x-csrf-token": csrfArbitrario,
    },
  });

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/auth/logout", {
    headers: cabecalhosAutenticados(
      "00000000-0000-4000-8000-000000000000",
      csrfArbitrario,
    ),
  });

  expect(resSemCookie.status()).toBe(401);
  expect(resCookieInvalido.status()).toBe(401);
  expect(resSemCookie.status()).toBeLessThan(500);
  expect(resCookieInvalido.status()).toBeLessThan(500);

  await semCookie.dispose();
  await cookieInvalido.dispose();
});

test("CA-SEC-15: logout sem token CSRF válido é rejeitado com 403, sessão permanece ativa", async () => {
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { cpf: CPF_LOGOUT_CSRF, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(login);
  expect(idSessao).not.toBeNull();

  const clienteLogout = await novoCliente();
  const semToken = await clienteLogout.post("/api/auth/logout", {
    headers: cabecalhoCookie(idSessao!),
  });

  expect(semToken.status()).toBe(403);
  // Sem CSRF válido, o logout não acontece: a sessão continua no banco.
  expect(getSessao(idSessao!)).not.toBeNull();

  await clienteLogin.dispose();
  await clienteLogout.dispose();
});

test("REQ-SEC-15: logout com CSRF válido remove spma_sessao e spma_csrf (ambos expirados no passado)", async () => {
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { cpf: CPF_LOGOUT_CSRF, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(login);
  const idCsrf = idCsrfDaResposta(login);
  expect(idSessao).not.toBeNull();
  expect(idCsrf).not.toBeNull();

  const clienteLogout = await novoCliente();
  const res = await clienteLogout.post("/api/auth/logout", {
    headers: cabecalhosAutenticados(idSessao!, idCsrf!),
  });

  expect(res.status()).toBe(200);

  const cookies = cookiesDaResposta(res);
  const linhaSessao = cookies.split("\n").find((l) => l.startsWith("spma_sessao="));
  const linhaCsrf = cookies.split("\n").find((l) => l.startsWith("spma_csrf="));

  expect(linhaSessao).toBeDefined();
  expect(linhaCsrf).toBeDefined();
  expect(linhaSessao).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  expect(linhaCsrf).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  expect(getSessao(idSessao!)).toBeNull();

  await clienteLogin.dispose();
  await clienteLogout.dispose();
});
