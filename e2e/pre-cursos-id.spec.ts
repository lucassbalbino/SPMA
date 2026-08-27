// e2e de GET/PATCH /api/pre-cursos/[id] (REQ-PC-04, REQ-PC-05, REQ-PC-06,
// REQ-PC-12, REQ-PC-13).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  encerrarPreCursoFixture,
  getPreCurso,
  upsertUsuario,
} from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GO = "51506007090";
const CPF_VO = "51607008033";
const CPF_GO_2 = "51708009086";

const CPFS = [CPF_GO, CPF_VO, CPF_GO_2];

let cdOfertante: number;
let cdOfertante2: number;
let cdVerba: number;
let cdCursoEmAndamento: number;
let cdCursoEncerrado: number;

async function logarComCsrf(cpf: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) throw new Error(`Login não emitiu sessão/CSRF para ${cpf}`);
  return { idSessao, idCsrf };
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Pré-Curso Id Teste", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Pré-Curso Id Teste 2", uf: "RJ" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_VO, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_GO_2, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertante2 });

  cdCursoEmAndamento = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 1000,
    criadoPor: CPF_GO,
  }).cdCurso;

  cdCursoEncerrado = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 500,
    criadoPor: CPF_GO,
  }).cdCurso;
  encerrarPreCursoFixture(cdCursoEncerrado);
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("REQ-PC-04: GO grava um bloco parcial -> 200, demais campos continuam ausentes", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { identifUf: "SP", identifMunicipio: "Campinas" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.preCurso.respostas).toEqual({ identifUf: "SP", identifMunicipio: "Campinas" });
  expect(corpo.preCurso.respostas.qualifNomeCurso).toBeUndefined();

  await cliente.dispose();
});

test("REQ-PC-04: segundo bloco preserva o primeiro (merge raso)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { qualifNomeCurso: "Guia Local" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.preCurso.respostas.identifUf).toBe("SP");
  expect(corpo.preCurso.respostas.identifMunicipio).toBe("Campinas");
  expect(corpo.preCurso.respostas.qualifNomeCurso).toBe("Guia Local");

  const persistido = getPreCurso(cdCursoEmAndamento);
  expect(persistido?.respostas).toEqual({
    identifUf: "SP",
    identifMunicipio: "Campinas",
    qualifNomeCurso: "Guia Local",
  });

  await cliente.dispose();
});

test("REQ-PC-06: valor de infraestrutura fora de 0-5 é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const antes = getPreCurso(cdCursoEmAndamento);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { infraBasicaBanheiros: 9 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getPreCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("edge case (Planejamento): término anterior ao início é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const antes = getPreCurso(cdCursoEmAndamento);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: {
      planejDataInicioPrevista: "2026-06-01",
      planejDataTerminoPrevista: "2026-03-01",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getPreCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("edge case (Planejamento): a ordem também é validada contra o estado mesclado quando as datas chegam em PATCHs separados", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const clienteInicio = await novoCliente();
  const resInicio = await clienteInicio.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { planejDataInicioPrevista: "2026-06-01" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(resInicio.status()).toBe(200);
  await clienteInicio.dispose();

  const antes = getPreCurso(cdCursoEmAndamento);

  const clienteTermino = await novoCliente();
  const resTermino = await clienteTermino.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { planejDataTerminoPrevista: "2026-03-01" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(resTermino.status()).toBe(400);
  const depois = getPreCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await clienteTermino.dispose();
});

test("REQ-PC-12: gravação em pré-curso ENCERRADO é rejeitada com 409, dado inalterado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const antes = getPreCurso(cdCursoEncerrado);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEncerrado}`, {
    data: { identifUf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  const depois = getPreCurso(cdCursoEncerrado);
  expect(depois?.respostas).toEqual(antes?.respostas);
  expect(depois?.status).toBe("ENCERRADO");

  await cliente.dispose();
});

test("REQ-PC-13: GO de outro Ofertante recebe 403 ao ler", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("REQ-PC-15: GO de outro Ofertante recebe 403 ao gravar", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { identifUf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("VO consulta (leitura) -> 200", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VO);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);

  await cliente.dispose();
});

test("VO tenta gravar -> 403 (perfil de leitura, nunca escreve)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { identifUf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});
