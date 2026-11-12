// e2e de POST /api/cursos (o ato de criar curso) e GET /api/pre-cursos (REQ-PC-01, REQ-PC-02, REQ-PC-03, REQ-PC-14).
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
  getPreCurso,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";
// RU-57: toda formação nasce com nome.
const NOME_FORMACAO = "Formação de Teste e2e";

const gerarCnpjValido = geradorDeCnpj("29");

const CPF_GT = "51102003000";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CPF_AL = "51405006048";
const CPF_AM = "51102003190";

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2, CPF_AL, CPF_AM];

let cdVerba: number;
let cdVerbaPequena: number;
let cdVerba2Am: number;
let cdCursoComRespostas: number;

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
    nome: "Ofertante Pré-Curso Teste",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Pré-Curso Teste 2",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });

  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;
  cdVerbaPequena = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 500 }).cdVerba;
  cdVerba2Am = criarVerba({ cdOfertante: CNPJ_GO_2, vlVerba: 1000 }).cdVerba;
  cdCursoComRespostas = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
    respostas: { qualifModalidade: "Presencial" },
  }).cdCurso;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

// RU-58 mudou o nascimento do pré: antes, sem nenhuma resposta; agora, só com
// a pergunta 8 (o nome da formação, sem espaços nas pontas).
test("GO cria curso com valor dentro do saldo -> 201, pré nasce só com o nome e pós sem respostas", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/cursos", {
    data: { nome: `  ${NOME_FORMACAO}  `, cdVerba, vlCursoAlocado: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.preCurso.status).toBe("EM_ANDAMENTO");
  expect(corpo.preCurso.respostas).toEqual({ qualifNomeCurso: NOME_FORMACAO });
  expect(corpo.posCurso.respostas).toBeNull();

  // O pós-curso nasce junto do curso, na mesma transação (decisão do usuário,
  // 2026-10-09): o 201 traz os dois.
  expect(corpo.posCurso.cdCurso).toBe(corpo.preCurso.cdCurso);

  const persistido = getPreCurso(corpo.preCurso.cdCurso);
  expect(persistido?.status).toBe("EM_ANDAMENTO");
  expect(persistido?.respostas).toEqual({ qualifNomeCurso: NOME_FORMACAO });
  expect(persistido?.criadoPor).toBe(CNPJ_GO);

  const consulta = await cliente.get(`/api/pre-cursos/${corpo.preCurso.cdCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(consulta.status()).toBe(200);
  expect((await consulta.json()).preCurso.respostas).toEqual({ qualifNomeCurso: NOME_FORMACAO });

  // O GET do pós tem de devolver `null` igual ao POST. Afirmação separada de
  // propósito: o POST devolve `respostas: null` literal, enquanto o GET passa
  // por `respostasOuNulo` sobre as colunas. Sem esta linha, trocar essa função
  // por uma que devolvesse `{}` não quebrava teste nenhum - foi o mutante que
  // sobreviveu a 83 specs no sensor do Verifier. Desde RU-58 o pré nasce com
  // o nome, então a guarda mora no pós, que continua nascendo vazio.
  const consultaPos = await cliente.get(`/api/pos-cursos/${corpo.preCurso.cdCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(consultaPos.status()).toBe(200);
  expect((await consultaPos.json()).posCurso.respostas).toBeNull();

  await cliente.dispose();
});

// RU-57: sem nome, a formação não nasce.
test.describe("RU-57: POST /api/cursos sem nome", () => {
  for (const [caso, nome] of [
    ["ausente", undefined],
    ["vazio", ""],
    ["só espaços", "   "],
  ] as const) {
    test(`nome ${caso} -> 400 "Nome da formação é obrigatório", nada criado`, async () => {
      const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
      const cliente = await novoCliente();
      const antes = await contarPreCursosDoGo(cliente, idSessao, idCsrf);

      const res = await cliente.post("/api/cursos", {
        data: { nome, cdVerba, vlCursoAlocado: 100 },
        headers: cabecalhosAutenticados(idSessao, idCsrf),
      });

      expect(res.status()).toBe(400);
      expect((await res.json()).erro).toBe("Nome da formação é obrigatório");
      expect(await contarPreCursosDoGo(cliente, idSessao, idCsrf)).toBe(antes);

      await cliente.dispose();
    });
  }
});

async function contarPreCursosDoGo(
  cliente: Awaited<ReturnType<typeof novoCliente>>,
  idSessao: string,
  idCsrf: string,
): Promise<number> {
  const res = await cliente.get("/api/pre-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  return (await res.json()).preCursos.length;
}

test("REQ-PC-02: valor acima do saldo disponível é rejeitado com 400 e o saldo é informado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/cursos", {
    data: { nome: NOME_FORMACAO, cdVerba: cdVerbaPequena, vlCursoAlocado: 999999 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(Number(corpo.saldoDisponivel)).toBe(500);

  await cliente.dispose();
});

test("AD-016: valor exatamente igual ao saldo disponível é aceito", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/cursos", {
    data: { nome: NOME_FORMACAO, cdVerba: cdVerbaPequena, vlCursoAlocado: 500 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  await cliente.dispose();
});

test("AD-040: AM cria curso para Ofertante ao qual não está vinculado -> 201, curso pertence a esse Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/cursos", {
    data: { nome: NOME_FORMACAO, cdVerba: cdVerba2Am, vlCursoAlocado: 100 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.preCurso.cdOfertante).toBe(CNPJ_GO_2);

  const persistido = getPreCurso(corpo.preCurso.cdCurso);
  expect(persistido?.cdOfertante).toBe(CNPJ_GO_2);
  expect(persistido?.criadoPor).toBe(CPF_AM);

  await cliente.dispose();
});

test("REQ-PC-03: Verba de outro Ofertante é rejeitada com 403, nenhum registro criado", async () => {
  const { idSessao: idSessaoGt, idCsrf: idCsrfGt } = await logarComCsrf(CPF_GT);
  const clienteGt = await novoCliente();
  const antes = await (
    await clienteGt.get(`/api/pre-cursos?cdOfertante=${CNPJ_GO}`, {
      headers: cabecalhosAutenticados(idSessaoGt, idCsrfGt),
    })
  ).json();
  await clienteGt.dispose();

  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);
  const cliente = await novoCliente();
  const res = await cliente.post("/api/cursos", {
    data: { nome: NOME_FORMACAO, cdVerba, vlCursoAlocado: 100 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  await cliente.dispose();

  const clienteGt2 = await novoCliente();
  const depois = await (
    await clienteGt2.get(`/api/pre-cursos?cdOfertante=${CNPJ_GO}`, {
      headers: cabecalhosAutenticados(idSessaoGt, idCsrfGt),
    })
  ).json();
  await clienteGt2.dispose();

  expect(depois.preCursos.length).toBe(antes.preCursos.length);
});

test("AL não pode criar curso", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/cursos", {
    data: { nome: NOME_FORMACAO, cdVerba, vlCursoAlocado: 100 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AL não pode listar pré-cursos", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/pre-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("REQ-PC-14: GO só lista pré-cursos do próprio Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/pre-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.preCursos.length).toBeGreaterThan(0);
  expect(
    corpo.preCursos.every((p: { cdOfertante: string }) => p.cdOfertante === CNPJ_GO),
  ).toBe(true);
  // COL-11: o item traz as respostas como `{ chave: valor }` e nenhuma coluna `P*`.
  const item = corpo.preCursos.find((p: { cdCurso: number }) => p.cdCurso === cdCursoComRespostas);
  expect(item.respostas).toEqual({ qualifModalidade: "Presencial" });
  expect(Object.keys(item).filter((campo) => /^p\d/.test(campo))).toEqual([]);

  await cliente.dispose();
});

test("REQ-PC-14: GT lista pré-cursos de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pre-cursos?cdOfertante=${CNPJ_GO}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.preCursos.some((p: { cdOfertante: string }) => p.cdOfertante === CNPJ_GO),
  ).toBe(true);

  await cliente.dispose();
});
