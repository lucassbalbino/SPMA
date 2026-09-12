// e2e de POST/GET /api/avaliacoes (AVAL-01 a 06, AVAL-22).
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  getAvaliacao,
  upsertUsuario,
} from "./helpers/db";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

function calcularDvCnpj(digitos: number[]): number {
  let soma = 0;
  let peso = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += digitos[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCnpjValido(indice: number): string {
  const base12 = `41${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CPF_GT = "52161005120";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CPF_AL = "52191005489";
const CPF_AL_JA_MATRICULADO = "35379907580";
const CPF_AL_RN12 = "52601815906";
const CPF_INEXISTENTE = "11144477735";

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2, CPF_AL, CPF_AL_JA_MATRICULADO, CPF_AL_RN12];

let cdCursoDoGo: number;
let cdCursoDoGo2: number;
let cdCursoJaComAvaliacao: number;
let cdCursoParaTesteEscopo: number;
let cdCursoRN12Alvo: number;

async function logarComCsrf(documento: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { documento, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) throw new Error(`Login não emitiu sessão/CSRF para ${documento}`);
  return { idSessao, idCsrf };
}

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Avaliação Teste",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Avaliação Teste 2",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_JA_MATRICULADO, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_RN12, tipo: "AL", senha: SENHA, primeiraVez: false });

  const cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;
  const cdVerba2 = criarVerba({ cdOfertante: CNPJ_GO_2, vlVerba: 10000 }).cdVerba;

  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  cdCursoDoGo2 = criarPreCurso({
    cdOfertante: CNPJ_GO_2,
    cdVerba: cdVerba2,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_2,
  }).cdCurso;
  cdCursoJaComAvaliacao = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarAvaliacao({ cpf: CPF_AL_JA_MATRICULADO, cdCurso: cdCursoJaComAvaliacao });

  cdCursoParaTesteEscopo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  cdCursoRN12Alvo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  // RN-12: CPF_AL_RN12 já tem uma avaliação EM_ANDAMENTO noutro curso.
  criarAvaliacao({ cpf: CPF_AL_RN12, cdCurso: cdCursoDoGo2 });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("GO matricula um Aluno num curso do próprio Ofertante -> 201, EM_ANDAMENTO", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_AL, cdCurso: cdCursoDoGo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.avaliacao.status).toBe("EM_ANDAMENTO");
  expect(corpo.avaliacao.parte1Completa).toBe(false);
  expect(corpo.avaliacao.respostas).toBeNull();

  const persistida = getAvaliacao(CPF_AL, cdCursoDoGo);
  expect(persistida?.status).toBe("EM_ANDAMENTO");
  expect(persistida?.parte1Completa).toBe(false);
  expect(persistida?.respostas).toBeNull();

  await cliente.dispose();
});

test("AVAL-05 (404): CPF que não corresponde a nenhum usuário", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_INEXISTENTE, cdCurso: cdCursoParaTesteEscopo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);
  await cliente.dispose();
});

test("AVAL-02 (400): CPF corresponde a um usuário que não é Aluno", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_GT, cdCurso: cdCursoParaTesteEscopo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  await cliente.dispose();
});

test("AVAL-03 (409): par (CPF, cdCurso) já matriculado, nenhum novo registro, registro existente inalterado", async () => {
  const antes = getAvaliacao(CPF_AL_JA_MATRICULADO, cdCursoJaComAvaliacao);
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_AL_JA_MATRICULADO, cdCurso: cdCursoJaComAvaliacao },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  await cliente.dispose();

  const depois = getAvaliacao(CPF_AL_JA_MATRICULADO, cdCursoJaComAvaliacao);
  expect(depois).toEqual(antes);
});

test("AVAL-04/RN-12 (409): Aluno já tem outra avaliação EM_ANDAMENTO noutro curso, nada criado nem alterado", async () => {
  const antes = getAvaliacao(CPF_AL_RN12, cdCursoDoGo2);
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_AL_RN12, cdCurso: cdCursoRN12Alvo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  await cliente.dispose();

  expect(getAvaliacao(CPF_AL_RN12, cdCursoRN12Alvo)).toBeNull();

  const depois = getAvaliacao(CPF_AL_RN12, cdCursoDoGo2);
  expect(depois).toEqual(antes);
  expect(depois?.status).toBe("EM_ANDAMENTO");
});

test("cdCurso inexistente é rejeitado com 404", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_AL, cdCurso: 999999999 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);
  await cliente.dispose();
});

test("AVAL-05 (403): curso de outro Ofertante é rejeitado, nenhum registro criado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_AL, cdCurso: cdCursoParaTesteEscopo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  await cliente.dispose();

  expect(getAvaliacao(CPF_AL, cdCursoParaTesteEscopo)).toBeNull();
});

test("AVAL-06 (403): usuário não-GO (Aluno) não pode matricular", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/avaliacoes", {
    data: { cpf: CPF_AL, cdCurso: cdCursoParaTesteEscopo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  await cliente.dispose();
});

test("AVAL-22: GO só lista avaliações de cursos do próprio Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/avaliacoes", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacoes.length).toBeGreaterThan(0);
  expect(
    corpo.avaliacoes.every((a: { cdOfertante: string }) => a.cdOfertante === CNPJ_GO),
  ).toBe(true);

  await cliente.dispose();
});

test("AVAL-22: GT lista avaliações de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/avaliacoes?cdOfertante=${CNPJ_GO}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.avaliacoes.some((a: { cdOfertante: string }) => a.cdOfertante === CNPJ_GO),
  ).toBe(true);

  await cliente.dispose();
});

test("AVAL-22: Aluno lista só a própria avaliação", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/avaliacoes", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacoes.length).toBeGreaterThan(0);
  expect(
    corpo.avaliacoes.every((a: { cpf: string }) => a.cpf === CPF_AL),
  ).toBe(true);

  await cliente.dispose();
});
