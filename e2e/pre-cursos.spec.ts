// e2e de POST/GET /api/pre-cursos (REQ-PC-01, REQ-PC-02, REQ-PC-03,
// REQ-PC-14, AD-040).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getPreCurso,
  upsertUsuario,
} from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GT = "51102003000";
const CPF_GO = "51203004052";
const CPF_GO_2 = "51304005003";
const CPF_AL = "51405006048";
const CPF_AM = "51416007008";

const CPFS = [CPF_GT, CPF_GO, CPF_GO_2, CPF_AL, CPF_AM];

let cdOfertante: number;
let cdOfertante2: number;
let cdVerba: number;
let cdVerbaPequena: number;

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

  cdOfertante = criarOfertante({ nome: "Ofertante Pré-Curso Teste", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Pré-Curso Teste 2", uf: "RJ" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;
  cdVerbaPequena = criarVerba({ cdOfertante, vlVerba: 500 }).cdVerba;

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_GO_2, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertante2 });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("GO cria pré-curso com valor dentro do saldo -> 201, EM_ANDAMENTO, respostas nulas", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdVerba, vlCursoAlocado: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.preCurso.status).toBe("EM_ANDAMENTO");
  expect(corpo.preCurso.respostas).toBeNull();

  const persistido = getPreCurso(corpo.preCurso.cdCurso);
  expect(persistido?.status).toBe("EM_ANDAMENTO");
  expect(persistido?.respostas).toBeNull();
  expect(persistido?.criadoPor).toBe(CPF_GO);

  await cliente.dispose();
});

test("REQ-PC-02: valor acima do saldo disponível é rejeitado com 400 e o saldo é informado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdVerba: cdVerbaPequena, vlCursoAlocado: 999999 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(Number(corpo.saldoDisponivel)).toBe(500);

  await cliente.dispose();
});

test("AD-016: valor exatamente igual ao saldo disponível é aceito", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdVerba: cdVerbaPequena, vlCursoAlocado: 500 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  await cliente.dispose();
});

test("REQ-PC-03: Verba de outro Ofertante é rejeitada com 403, nenhum registro criado", async () => {
  const { idSessao: idSessaoGt, idCsrf: idCsrfGt } = await logarComCsrf(CPF_GT);
  const clienteGt = await novoCliente();
  const antes = await (
    await clienteGt.get(`/api/pre-cursos?cdOfertante=${cdOfertante}`, {
      headers: cabecalhosAutenticados(idSessaoGt, idCsrfGt),
    })
  ).json();
  await clienteGt.dispose();

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);
  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdVerba, vlCursoAlocado: 100 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  await cliente.dispose();

  const clienteGt2 = await novoCliente();
  const depois = await (
    await clienteGt2.get(`/api/pre-cursos?cdOfertante=${cdOfertante}`, {
      headers: cabecalhosAutenticados(idSessaoGt, idCsrfGt),
    })
  ).json();
  await clienteGt2.dispose();

  expect(depois.preCursos.length).toBe(antes.preCursos.length);
});

test("AL não pode criar pré-curso", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdVerba, vlCursoAlocado: 100 },
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
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/pre-cursos", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.preCursos.length).toBeGreaterThan(0);
  expect(
    corpo.preCursos.every((p: { cdOfertante: number }) => p.cdOfertante === cdOfertante),
  ).toBe(true);

  await cliente.dispose();
});

// AD-040 - o AM cria curso em qualquer Ofertante, custeado pela verba
// ilimitada. O que estes testes provam, além do 201: o curso nasce no
// Ofertante informado (não no da verba, que o AM nem escolhe) e a verba que
// o custeia é a ilimitada - nenhum saldo de Ofertante é consumido.
test("AD-040: AM cria pré-curso em qualquer Ofertante, custeado pela verba ilimitada", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    // Valor maior que qualquer verba deste spec: numa verba com teto isto
    // seria o 400 de saldo.
    data: { cdOfertante: cdOfertante2, vlCursoAlocado: 99999999.99 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();

  const persistido = getPreCurso(corpo.preCurso.cdCurso);
  expect(persistido?.cdOfertante).toBe(cdOfertante2);
  expect(persistido?.criadoPor).toBe(CPF_AM);

  const resVerba = await cliente.get(`/api/verbas/${corpo.preCurso.cdVerba}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  const { verba } = await resVerba.json();

  expect(verba.ilimitada).toBe(true);
  expect(verba.cdOfertante).toBeNull();
  expect(verba.saldoDisponivel).toBeNull();

  await cliente.dispose();
});

test("AD-040: AM informando Ofertante inexistente é rejeitado com 400", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdOfertante: 999999, vlCursoAlocado: 100 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  await cliente.dispose();
});

test("AD-040: a verba ilimitada é do AM - o GO não custeia curso por ela", async () => {
  const { idSessao: idSessaoAm, idCsrf: idCsrfAm } = await logarComCsrf(CPF_AM);
  const clienteAm = await novoCliente();
  const criado = await (
    await clienteAm.post("/api/pre-cursos", {
      data: { cdOfertante, vlCursoAlocado: 100 },
      headers: cabecalhosAutenticados(idSessaoAm, idCsrfAm),
    })
  ).json();
  await clienteAm.dispose();

  const cdVerbaIlimitada = criado.preCurso.cdVerba;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  const res = await cliente.post("/api/pre-cursos", {
    data: { cdVerba: cdVerbaIlimitada, vlCursoAlocado: 100 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  await cliente.dispose();
});

test("REQ-PC-14: GT lista pré-cursos de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/pre-cursos?cdOfertante=${cdOfertante}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.preCursos.some((p: { cdOfertante: number }) => p.cdOfertante === cdOfertante),
  ).toBe(true);

  await cliente.dispose();
});
