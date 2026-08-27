// e2e de GET/PATCH /api/pos-cursos/[cdCurso] (REQ-PO-04, REQ-PO-05, REQ-PO-06,
// REQ-PO-08, REQ-PO-11).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  encerrarPosCursoFixture,
  getPosCurso,
  upsertUsuario,
} from "./helpers/db";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GO = "52201005567";
const CPF_VO = "52211005683";
const CPF_GO_2 = "52221005708";

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

  cdOfertante = criarOfertante({ nome: "Ofertante Pós-Curso Id Teste", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Pós-Curso Id Teste 2", uf: "RJ" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_VO, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({
    cpf: CPF_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertante2,
  });

  cdCursoEmAndamento = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 1000,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoEmAndamento, criadoPor: CPF_GO });

  cdCursoEncerrado = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 500,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoEncerrado, criadoPor: CPF_GO });
  encerrarPosCursoFixture(cdCursoEncerrado);
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("REQ-PO-04: GO grava um bloco parcial -> 200, demais campos continuam ausentes", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: {
      posAcompanhConceitosTrabalhados: "Sustentabilidade",
      posAcompanhPlanoAcao: "Reforço semanal",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCurso.respostas).toEqual({
    posAcompanhConceitosTrabalhados: "Sustentabilidade",
    posAcompanhPlanoAcao: "Reforço semanal",
  });
  expect(corpo.posCurso.respostas.posParticNumInscritos).toBeUndefined();

  await cliente.dispose();
});

test("REQ-PO-04: segundo bloco preserva o primeiro (merge raso)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posParticNumInscritos: 40 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCurso.respostas.posAcompanhConceitosTrabalhados).toBe("Sustentabilidade");
  expect(corpo.posCurso.respostas.posAcompanhPlanoAcao).toBe("Reforço semanal");
  expect(corpo.posCurso.respostas.posParticNumInscritos).toBe(40);

  const persistido = getPosCurso(cdCursoEmAndamento);
  expect(persistido?.respostas).toEqual({
    posAcompanhConceitosTrabalhados: "Sustentabilidade",
    posAcompanhPlanoAcao: "Reforço semanal",
    posParticNumInscritos: 40,
  });

  await cliente.dispose();
});

test("REQ-PO-06: valor monetário negativo é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const antes = getPosCurso(cdCursoEmAndamento);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posFinValorTotalExecutado: -1 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getPosCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("edge case (Execução): término anterior ao início é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const antes = getPosCurso(cdCursoEmAndamento);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: {
      posExecDataInicioReal: "2026-06-01",
      posExecDataTerminoReal: "2026-03-01",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getPosCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("edge case (Execução): a ordem também é validada contra o estado mesclado quando as datas chegam em PATCHs separados", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const clienteInicio = await novoCliente();
  const resInicio = await clienteInicio.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posExecDataInicioReal: "2026-06-01" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(resInicio.status()).toBe(200);
  await clienteInicio.dispose();

  const antes = getPosCurso(cdCursoEmAndamento);

  const clienteTermino = await novoCliente();
  const resTermino = await clienteTermino.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posExecDataTerminoReal: "2026-03-01" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(resTermino.status()).toBe(400);
  const depois = getPosCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await clienteTermino.dispose();
});

test("REQ-PO-08: gravação em pós-curso ENCERRADO é rejeitada com 409, dado inalterado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const antes = getPosCurso(cdCursoEncerrado);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEncerrado}`, {
    data: { posParticNumInscritos: 10 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  const depois = getPosCurso(cdCursoEncerrado);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("REQ-PO-11: GO de outro Ofertante recebe 403 ao ler", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("GO de outro Ofertante recebe 403 ao gravar", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posParticNumInscritos: 10 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("VO consulta (leitura) -> 200", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VO);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);

  await cliente.dispose();
});

test("VO tenta gravar -> 403 (perfil de leitura, nunca escreve)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posParticNumInscritos: 10 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});
