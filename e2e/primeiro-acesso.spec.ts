// e2e de POST /api/auth/primeiro-acesso (T20). Cobre CA-AU-02 e os erros
// listados no task: sem sessão válida e senha fora da política mínima.
//
// Nota (seguranca-transversal, T13): a rota agora exige CSRF (REQ-SEC-15).
// Os 3 testes originais abaixo enviam só o cookie de sessão e ficam
// vermelhos até o helper e2e de CSRF (T19) e a atualização deste arquivo
// (T20, Fase 4) - regressão documentada e aceita em design.md (Riscos).
// Os 2 testes novos no fim do arquivo (CA-SEC-15/CA-SEC-17) já constroem o
// cabeçalho CSRF manualmente, sem depender do helper que ainda não existe.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhoCookie,
  cookiesDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";
import type { APIResponse } from "@playwright/test";

const NOVA_SENHA = "NovaSenha123";

const CPF_DEFINE_SENHA = "20040050092";
const CPF_SEM_SESSAO = "20050060090";
const CPF_SENHA_CURTA = "20060070099";
const CPF_SEM_CSRF = "20070020000";
const CPF_SENHA_DIVERGENTE = "20080030009";

const CPFS = [
  CPF_DEFINE_SENHA,
  CPF_SEM_SESSAO,
  CPF_SENHA_CURTA,
  CPF_SEM_CSRF,
  CPF_SENHA_DIVERGENTE,
];

/** Loga uma conta em 1º acesso (senhaHash null) e devolve o id da sessão. */
async function abrirSessaoDePrimeiroAcesso(cpf: string): Promise<string> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf, senha: "irrelevante" },
  });
  const idSessao = idSessaoDaResposta(res);
  await cliente.dispose();

  if (!idSessao) {
    throw new Error(`Login de 1º acesso não emitiu sessão para ${cpf}`);
  }
  return idSessao;
}

/** Valor do cookie de CSRF emitido pela resposta, ou null se não houver. */
function idCsrfDaResposta(res: APIResponse): string | null {
  const match = cookiesDaResposta(res).match(/spma_csrf=([^;\s]+)/);
  return match ? match[1] : null;
}

/**
 * Mesmo fluxo de `abrirSessaoDePrimeiroAcesso`, mas também devolve o token
 * de CSRF emitido pelo login (T12) - necessário para os testes de CA-SEC-17
 * que precisam passar pela checagem de CSRF (T13) para alcançar a validação
 * de corpo que provam.
 */
async function abrirSessaoDePrimeiroAcessoComCsrf(
  cpf: string,
): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf, senha: "irrelevante" },
  });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) {
    throw new Error(`Login de 1º acesso não emitiu sessão/CSRF para ${cpf}`);
  }
  return { idSessao, idCsrf };
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  for (const cpf of CPFS) {
    upsertUsuario({ cpf, tipo: "AL", senha: null, primeiraVez: true });
  }
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-AU-02: define a senha, desativa primeiraVez e passa a autenticar com ela", async () => {
  const idSessao = await abrirSessaoDePrimeiroAcesso(CPF_DEFINE_SENHA);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(200);
  // CA-AU-10: nem a senha em texto puro nem o hash aparecem na resposta -
  // este é o único endpoint da feature que recebe uma senha em texto puro
  // e também devolve dados de usuário (validation.md, iterações 1 e 2).
  const corpoResposta = await res.text();
  expect(corpoResposta).not.toMatch(/senhaHash|\$argon2/i);
  expect(corpoResposta).not.toContain(NOVA_SENHA);

  const usuario = getUsuario(CPF_DEFINE_SENHA);
  expect(usuario?.primeiraVez).toBe(false);
  expect(usuario?.senhaHash).not.toBeNull();
  expect(usuario?.senhaHash).toContain("$argon2");

  // A senha gravada é realmente a informada: agora ela autentica pelo login,
  // e a conta deixou de ser tratada como 1º acesso.
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { cpf: CPF_DEFINE_SENHA, senha: NOVA_SENHA },
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).primeiroAcesso).toBe(false);

  await cliente.dispose();
  await clienteLogin.dispose();
});

test("sem sessão válida retorna 401 e não altera nenhum usuário", async () => {
  const antes = getUsuario(CPF_SEM_SESSAO);

  const semCookie = await novoCliente();
  const resSemCookie = await semCookie.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
  });

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: cabecalhoCookie("00000000-0000-4000-8000-000000000000"),
  });

  expect(resSemCookie.status()).toBe(401);
  expect(resCookieInvalido.status()).toBe(401);

  const depois = getUsuario(CPF_SEM_SESSAO);
  expect(depois?.senhaHash).toBeNull();
  expect(depois?.primeiraVez).toBe(true);
  expect(depois?.senhaHash).toBe(antes?.senhaHash ?? null);

  await semCookie.dispose();
  await cookieInvalido.dispose();
});

test("senha com menos de 8 caracteres é rejeitada e primeiraVez continua true", async () => {
  const idSessao = await abrirSessaoDePrimeiroAcesso(CPF_SENHA_CURTA);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: "Curta1", confirmacaoSenha: "Curta1" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(400);

  const usuario = getUsuario(CPF_SENHA_CURTA);
  expect(usuario?.primeiraVez).toBe(true);
  expect(usuario?.senhaHash).toBeNull();

  await cliente.dispose();
});

test("CA-SEC-15: POST sem token CSRF válido (ausente ou divergente do cookie) é rejeitado com 403, sem alterar senhaHash", async () => {
  const idSessao = await abrirSessaoDePrimeiroAcesso(CPF_SEM_CSRF);

  const semToken = await novoCliente();
  const resSemToken = await semToken.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: cabecalhoCookie(idSessao),
  });
  expect(resSemToken.status()).toBe(403);

  const comTokenDivergente = await novoCliente();
  const resDivergente = await comTokenDivergente.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: {
      Cookie: `spma_sessao=${idSessao}; spma_csrf=valor-do-cookie`,
      "x-csrf-token": "valor-diferente-do-cookie",
    },
  });
  expect(resDivergente.status()).toBe(403);

  const usuario = getUsuario(CPF_SEM_CSRF);
  expect(usuario?.senhaHash).toBeNull();
  expect(usuario?.primeiraVez).toBe(true);

  await semToken.dispose();
  await comTokenDivergente.dispose();
});

test("CA-SEC-17: POST direto à API com senha diferente de confirmacaoSenha é rejeitado com 400 mesmo com CSRF válido (servidor é autoridade)", async () => {
  const { idSessao, idCsrf } = await abrirSessaoDePrimeiroAcessoComCsrf(
    CPF_SENHA_DIVERGENTE,
  );

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    // Bypass de qualquer validação client-side: envia direto à API um
    // payload que viola a regra condicional já existente no schema
    // (senha === confirmacaoSenha) - CA-SEC-17.
    data: { senha: NOVA_SENHA, confirmacaoSenha: "OutraSenhaTotalmente1" },
    headers: {
      Cookie: `spma_sessao=${idSessao}; spma_csrf=${idCsrf}`,
      "x-csrf-token": idCsrf,
    },
  });

  expect(res.status()).toBe(400);

  const usuario = getUsuario(CPF_SENHA_DIVERGENTE);
  expect(usuario?.senhaHash).toBeNull();
  expect(usuario?.primeiraVez).toBe(true);

  await cliente.dispose();
});
