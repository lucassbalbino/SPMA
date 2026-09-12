// e2e de POST/GET /api/pos-cursos (REQ-PO-01, REQ-PO-02, REQ-PO-03, REQ-PO-12).
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
  const base12 = `35${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CPF_GT = "73914620048";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CPF_AL = "73914623063";
const CPF_AM = "51103004107";

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2, CPF_AL, CPF_AM];

let cdVerba: number;
let cdCursoDoGo: number;
let cdCursoDoGo2: number;
let cdCursoJaComPosCurso: number;
let cdCursoParaTesteEscopo: number;
let cdCursoParaAm: number;

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
    nome: "Ofertante Pós-Curso Teste",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Pós-Curso Teste 2",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });

  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;
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
  cdCursoJaComPosCurso = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoJaComPosCurso, criadoPor: CNPJ_GO });

  cdCursoParaTesteEscopo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;

  cdCursoParaAm = criarPreCurso({
    cdOfertante: CNPJ_GO_2,
    cdVerba: cdVerba2,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_2,
  }).cdCurso;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("GO cria pós-curso para um pré-curso do próprio Ofertante -> 201, EM_ANDAMENTO, respostas nulas", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: cdCursoDoGo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.posCurso.status).toBe("EM_ANDAMENTO");
  expect(corpo.posCurso.respostas).toBeNull();

  const persistido = getPosCurso(cdCursoDoGo);
  expect(persistido?.status).toBe("EM_ANDAMENTO");
  expect(persistido?.respostas).toBeNull();
  expect(persistido?.criadoPor).toBe(CNPJ_GO);

  await cliente.dispose();
});

test("AD-040: AM cria pós-curso para pré-curso de Ofertante ao qual não está vinculado -> 201", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: cdCursoParaAm },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.posCurso.status).toBe("EM_ANDAMENTO");

  const persistido = getPosCurso(cdCursoParaAm);
  expect(persistido?.criadoPor).toBe(CPF_AM);

  await cliente.dispose();
});

test("REQ-PO-02: cdCurso que já tem pós-curso é rejeitado com 409, nenhum novo registro", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: cdCursoJaComPosCurso },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});

test("cdCurso inexistente é rejeitado com 404", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: 999999999 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);

  await cliente.dispose();
});

test("REQ-PO-03: pré-curso de outro Ofertante é rejeitado com 403, nenhum registro criado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: cdCursoParaTesteEscopo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  await cliente.dispose();

  expect(getPosCurso(cdCursoParaTesteEscopo)).toBeNull();
});

test("AL não pode criar pós-curso", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: cdCursoDoGo2 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AL não pode listar pós-cursos", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/pos-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("REQ-PO-12: GO só lista pós-cursos do próprio Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/pos-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCursos.length).toBeGreaterThan(0);
  expect(
    corpo.posCursos.every((p: { cdOfertante: string }) => p.cdOfertante === CNPJ_GO),
  ).toBe(true);

  await cliente.dispose();
});

test("REQ-PO-12: GT lista pós-cursos de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pos-cursos?cdOfertante=${CNPJ_GO}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.posCursos.some((p: { cdOfertante: string }) => p.cdOfertante === CNPJ_GO),
  ).toBe(true);

  await cliente.dispose();
});
