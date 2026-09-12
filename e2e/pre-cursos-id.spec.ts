// e2e de GET/PATCH /api/pre-cursos/[id] (REQ-PC-04, REQ-PC-05, REQ-PC-06,
// REQ-PC-12, REQ-PC-13).
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  encerrarPreCursoFixture,
  getPreCurso,
  upsertUsuario,
} from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

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
  const base12 = `32${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO = gerarCnpjValido(1);
const CPF_VO = "51607008033";
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
    nome: "Ofertante Pré-Curso Id Teste",
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_VO, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante: CNPJ_GO });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Pré-Curso Id Teste 2",
    uf: "RJ",
  });

  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;

  cdCursoEmAndamento = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 1000,
    criadoPor: CNPJ_GO,
  }).cdCurso;

  cdCursoEncerrado = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 500,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  encerrarPreCursoFixture(cdCursoEncerrado);
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("REQ-PC-04: GO grava um bloco parcial -> 200, demais campos continuam ausentes", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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

// RESP-20: seleção múltipla com lista vazia é barrada pelo `.min(1)` do Zod,
// antes de chegar ao repositório. Importa especificamente sob a AD-041: o
// merge por chave apaga as linhas da chave ANTES de inserir as novas, então
// uma lista vazia que escapasse da validação apagaria a resposta já gravada
// sem colocar nada no lugar. O teste prova que a chave sobrevive intacta.
test("RESP-20: seleção múltipla com lista vazia é rejeitada com 400, resposta anterior intacta", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const gravou = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { publicoPerfil: ["Mulheres", "Jovens"] },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(gravou.status()).toBe(200);

  const res = await cliente.patch(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    data: { publicoPerfil: [] },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  const depois = getPreCurso(cdCursoEmAndamento);
  expect(depois?.respostas?.publicoPerfil).toEqual(["Mulheres", "Jovens"]);

  await cliente.dispose();
});

test("edge case (Planejamento): término anterior ao início é rejeitado com 400, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pre-cursos/${cdCursoEmAndamento}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("REQ-PC-15: GO de outro Ofertante recebe 403 ao gravar", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

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
