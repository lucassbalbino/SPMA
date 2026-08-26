// e2e de CA-SEC-15 (T21) - prova direta da exigência de CSRF numa rota
// representativa (`/api/auth/primeiro-acesso`): sem token, com token
// divergente do cookie, e com token igual ao cookie (controle positivo).
// A rejeição por CSRF ausente/divergente já é coberta em cada rota
// individualmente (T13-T16/T20); este spec reúne os três cenários do
// critério de aceite num único arquivo.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const NOVA_SENHA = "NovaSenha123";

const CPF_SEM_TOKEN = "50010020012";
const CPF_TOKEN_DIVERGENTE = "50020030010";
const CPF_TOKEN_CORRETO = "50030040019";

const CPFS = [CPF_SEM_TOKEN, CPF_TOKEN_DIVERGENTE, CPF_TOKEN_CORRETO];

/** Loga uma conta em 1º acesso (senhaHash null) e devolve sessão + CSRF. */
async function abrirSessaoDePrimeiroAcesso(
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

test("CA-SEC-15: POST sem header x-csrf-token é rejeitado com 403", async () => {
  const { idSessao, idCsrf } = await abrirSessaoDePrimeiroAcesso(CPF_SEM_TOKEN);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    // Cookie de sessão + cookie CSRF presentes, mas sem o header que o
    // ecoa - é exatamente o que falta para o double-submit bater.
    headers: { Cookie: `spma_sessao=${idSessao}; spma_csrf=${idCsrf}` },
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_SEM_TOKEN)?.senhaHash).toBeNull();
  expect(getUsuario(CPF_SEM_TOKEN)?.primeiraVez).toBe(true);

  await cliente.dispose();
});

test("CA-SEC-15: POST com header x-csrf-token divergente do cookie é rejeitado com 403", async () => {
  const { idSessao, idCsrf } = await abrirSessaoDePrimeiroAcesso(
    CPF_TOKEN_DIVERGENTE,
  );

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: {
      Cookie: `spma_sessao=${idSessao}; spma_csrf=${idCsrf}`,
      "x-csrf-token": `${idCsrf}-diferente`,
    },
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_TOKEN_DIVERGENTE)?.senhaHash).toBeNull();
  expect(getUsuario(CPF_TOKEN_DIVERGENTE)?.primeiraVez).toBe(true);

  await cliente.dispose();
});

test("CA-SEC-15: POST com header x-csrf-token igual ao cookie é aceito (200)", async () => {
  const { idSessao, idCsrf } = await abrirSessaoDePrimeiroAcesso(
    CPF_TOKEN_CORRETO,
  );

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  expect(getUsuario(CPF_TOKEN_CORRETO)?.senhaHash).not.toBeNull();
  expect(getUsuario(CPF_TOKEN_CORRETO)?.primeiraVez).toBe(false);

  await cliente.dispose();
});
