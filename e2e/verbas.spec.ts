// e2e de POST/GET /api/verbas (REQ-OV-08, REQ-OV-09, REQ-OV-10, REQ-OV-11).
import { expect, test } from "@playwright/test";
import { criarOfertante, criarVerba, deleteUsuarios, getVerba, upsertUsuario } from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GT = "50105006041";
const CPF_AM = "50206007094";
const CPF_GO = "50307008037";
const CPF_GO_2 = "50408009080";

const CPFS = [CPF_GT, CPF_AM, CPF_GO, CPF_GO_2];

let cdOfertante: number;
let cdOfertante2: number;
let cdVerbaExistente: number;

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

  cdOfertante = criarOfertante({ nome: "Ofertante Verba Teste", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Verba Teste 2", uf: "RJ" }).cdOfertante;
  cdVerbaExistente = criarVerba({ cdOfertante: cdOfertante2, vlVerba: 5000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_GO_2, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertante2 });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-OV-08: GT cria Verba com valor positivo para Ofertante existente", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante, vlVerba: 12000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.verba.cdOfertante).toBe(cdOfertante);
  expect(Number(corpo.verba.vlVerba)).toBe(12000);
  expect(getVerba(corpo.verba.cdVerba)).not.toBeNull();

  await cliente.dispose();
});

test("CA-OV-08: AM também pode criar Verba", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante, vlVerba: 3000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  await cliente.dispose();
});

test("GO não pode criar Verba (só a consome)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante, vlVerba: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("CA-OV-09: criação de Verba com Ofertante inexistente é rejeitada com 400", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: 999999999, vlVerba: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  await cliente.dispose();
});

test("criação de Verba com valor não-positivo é rejeitada com 400", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante, vlVerba: 0 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  await cliente.dispose();
});

test("listagem escopada: GT vê a Verba de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas?cdOfertante=${cdOfertante2}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.verbas.some((v: { cdVerba: number }) => v.cdVerba === cdVerbaExistente),
  ).toBe(true);

  await cliente.dispose();
});

test("listagem escopada: GO só vê as Verbas do próprio Ofertante, mesmo pedindo outro cdOfertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas?cdOfertante=${cdOfertante}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.verbas.every((v: { cdOfertante: number }) => v.cdOfertante === cdOfertante2)).toBe(true);
  expect(
    corpo.verbas.some((v: { cdVerba: number }) => v.cdVerba === cdVerbaExistente),
  ).toBe(true);

  await cliente.dispose();
});

test("CA-OV-10: Verba recém-criada sem curso vinculado tem saldoDisponivel igual ao valor total", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas?cdOfertante=${cdOfertante2}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const corpo = await res.json();
  const verba = corpo.verbas.find((v: { cdVerba: number }) => v.cdVerba === cdVerbaExistente);
  expect(Number(verba.saldoDisponivel)).toBe(5000);

  await cliente.dispose();
});
