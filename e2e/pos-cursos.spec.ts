// e2e de POST/GET /api/pos-cursos (REQ-PO-01, REQ-PO-02, REQ-PO-03, REQ-PO-12).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
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

const CPF_GT = "52161005120";
const CPF_GO = "52171005246";
const CPF_GO_2 = "52181005362";
const CPF_AL = "52191005489";

const CPFS = [CPF_GT, CPF_GO, CPF_GO_2, CPF_AL];

let cdOfertante: number;
let cdOfertante2: number;
let cdVerba: number;
let cdCursoDoGo: number;
let cdCursoDoGo2: number;
let cdCursoJaComPosCurso: number;
let cdCursoParaTesteEscopo: number;

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

  cdOfertante = criarOfertante({ nome: "Ofertante Pós-Curso Teste", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Pós-Curso Teste 2", uf: "RJ" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;
  const cdVerba2 = criarVerba({ cdOfertante: cdOfertante2, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({
    cpf: CPF_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertante2,
  });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });

  cdCursoDoGo = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  cdCursoDoGo2 = criarPreCurso({
    cdOfertante: cdOfertante2,
    cdVerba: cdVerba2,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_2,
  }).cdCurso;
  cdCursoJaComPosCurso = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoJaComPosCurso, criadoPor: CPF_GO });

  cdCursoParaTesteEscopo = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("GO cria pós-curso para um pré-curso do próprio Ofertante -> 201, EM_ANDAMENTO, respostas nulas", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

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
  expect(persistido?.criadoPor).toBe(CPF_GO);

  await cliente.dispose();
});

test("REQ-PO-02: cdCurso que já tem pós-curso é rejeitado com 409, nenhum novo registro", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: cdCursoJaComPosCurso },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});

test("cdCurso inexistente é rejeitado com 404", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pos-cursos", {
    data: { cdCurso: 999999999 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);

  await cliente.dispose();
});

test("REQ-PO-03: pré-curso de outro Ofertante é rejeitado com 403, nenhum registro criado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

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
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/pos-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCursos.length).toBeGreaterThan(0);
  expect(
    corpo.posCursos.every((p: { cdOfertante: number }) => p.cdOfertante === cdOfertante),
  ).toBe(true);

  await cliente.dispose();
});

test("REQ-PO-12: GT lista pós-cursos de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pos-cursos?cdOfertante=${cdOfertante}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.posCursos.some((p: { cdOfertante: number }) => p.cdOfertante === cdOfertante),
  ).toBe(true);

  await cliente.dispose();
});
