// e2e de GET/PATCH /api/pos-cursos/[cdCurso] (REQ-PO-04, REQ-PO-05, REQ-PO-06,
// REQ-PO-08, REQ-PO-11).
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
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
  const base12 = `38${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO = gerarCnpjValido(1);
const CPF_VO = "52211005683";
const CNPJ_GO_2 = gerarCnpjValido(2);

const CPFS = [CNPJ_GO, CPF_VO, CNPJ_GO_2];

let cdVerba: number;
let cdCursoEmAndamento: number;
let cdCursoEncerrado: number;

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

  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Pós-Curso Id Teste",
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_VO, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante: CNPJ_GO });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Pós-Curso Id Teste 2",
    uf: "RJ",
  });

  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;

  cdCursoEmAndamento = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 1000,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoEmAndamento, criadoPor: CNPJ_GO });

  cdCursoEncerrado = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 500,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoEncerrado, criadoPor: CNPJ_GO });
  encerrarPosCursoFixture(cdCursoEncerrado);
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("REQ-PO-04: GO grava um bloco parcial -> 200, demais campos continuam ausentes", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: {
      posAcompanhConceitosTrabalhados:
      "Não se aplica.",
      posAcompanhPlanoAcao: "Não se aplica.",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCurso.respostas).toEqual({
    posAcompanhConceitosTrabalhados:
      "Não se aplica.",
    posAcompanhPlanoAcao: "Não se aplica.",
  });
  expect(corpo.posCurso.respostas.posParticNumInscritos).toBeUndefined();

  await cliente.dispose();
});

test("REQ-PO-04: segundo bloco preserva o primeiro (merge raso)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posParticNumInscritos: 40 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCurso.respostas.posAcompanhConceitosTrabalhados).toBe("Não se aplica.");
  expect(corpo.posCurso.respostas.posAcompanhPlanoAcao).toBe("Não se aplica.");
  expect(corpo.posCurso.respostas.posParticNumInscritos).toBe(40);

  const persistido = getPosCurso(cdCursoEmAndamento);
  expect(persistido?.respostas).toEqual({
    posAcompanhConceitosTrabalhados:
      "Não se aplica.",
    posAcompanhPlanoAcao: "Não se aplica.",
    posParticNumInscritos: 40,
  });

  await cliente.dispose();
});

test("REQ-PO-06: valor monetário negativo é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
  const antes = getPosCurso(cdCursoEmAndamento);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    data: { posFinValorTotal: -1 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getPosCurso(cdCursoEmAndamento);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("edge case (Execução): término anterior ao início é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pos-cursos/${cdCursoEmAndamento}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("GO de outro Ofertante recebe 403 ao gravar", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

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
