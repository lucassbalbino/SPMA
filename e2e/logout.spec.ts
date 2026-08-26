// e2e de POST /api/auth/logout (T21).
//
// Nota (seguranca-transversal, T14): a rota agora exige CSRF (REQ-SEC-15).
// Os 2 testes originais abaixo enviam só o cookie de sessão e ficam
// vermelhos até o helper e2e de CSRF (T19) e a atualização deste arquivo
// (T20, Fase 4) - regressão documentada e aceita em design.md (Riscos). Os
// 2 testes novos no fim do arquivo já constroem o cabeçalho CSRF
// manualmente, sem depender do helper que ainda não existe.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getSessao, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhoCookie,
  cookiesDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";
import type { APIResponse } from "@playwright/test";

const SENHA = "SenhaValida123";
const CPF_LOGOUT = "20070080097";
const CPF_LOGOUT_CSRF = "20090040007";
const CPFS = [CPF_LOGOUT, CPF_LOGOUT_CSRF];

/** Valor do cookie de CSRF emitido pela resposta, ou null se não houver. */
function idCsrfDaResposta(res: APIResponse): string | null {
  const match = cookiesDaResposta(res).match(/spma_csrf=([^;\s]+)/);
  return match ? match[1] : null;
}

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
    headers: {
      Cookie: `spma_sessao=${idSessao}; spma_csrf=${idCsrf}`,
      "x-csrf-token": idCsrf!,
    },
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
