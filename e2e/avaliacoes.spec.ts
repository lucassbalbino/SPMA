// e2e de GET /api/avaliacoes (AVAL-22).
//
// Os testes de POST saíram com a rota (decisão do usuário, 2026-10-09): o
// Aluno nasce matriculado na transação de POST /api/usuarios, coberta em
// `usuarios.spec.ts`. AVAL-01 a 06 deixaram de ser uma rota própria.
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
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("41");

const CPF_GT = "52161005120";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CPF_AL = "52191005489";
// Aluno de um curso de OUTRO Ofertante: é o que dá dente ao "GO só lista as do
// próprio" - sem ele a asserção passaria com a lista toda de um só Ofertante.
const CPF_AL_DE_OUTRO_OFERTANTE = "52601815906";

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2, CPF_AL, CPF_AL_DE_OUTRO_OFERTANTE];

let cdCursoDoGo: number;
let cdCursoDoGo2: number;

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
  upsertUsuario({
    cpf: CPF_AL_DE_OUTRO_OFERTANTE,
    tipo: "AL",
    senha: SENHA,
    primeiraVez: false,
  });

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
  // As duas matrículas que as três listagens exigem, semeadas pelo Prisma
  // (`criarAvaliacao`) e não pela rota - que não existe mais. Antes, a do
  // CPF_AL era efeito colateral do primeiro teste de POST deste arquivo.
  criarAvaliacao({ cpf: CPF_AL, cdCurso: cdCursoDoGo });
  criarAvaliacao({ cpf: CPF_AL_DE_OUTRO_OFERTANTE, cdCurso: cdCursoDoGo2 });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
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
