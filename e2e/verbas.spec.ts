// e2e de POST/GET /api/verbas (REQ-OV-08, REQ-OV-09, REQ-OV-10, REQ-OV-11).
//
// UGO-14/AD-043: sem `model Ofertante` separado, o "Ofertante" da Verba é o
// próprio GO, identificado por CNPJ - `criarOfertante` (removido em T5) dá
// lugar a `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarVerba,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  getVerba,
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
  const base12 = `25${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CPF_GT = "50105006041";
const CPF_AM = "50206007094";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CNPJ_INEXISTENTE = gerarCnpjValido(999);

const CPFS = [CPF_GT, CPF_AM, CNPJ_GO, CNPJ_GO_2];

let cdVerbaExistente: number;

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
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Verba Teste",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Verba Teste 2",
    uf: "RJ",
  });

  cdVerbaExistente = criarVerba({ cdOfertante: CNPJ_GO_2, vlVerba: 5000 }).cdVerba;
});

test.afterAll(() => {
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("CA-OV-08: GT cria Verba com valor positivo para Ofertante existente", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_GO, vlVerba: 12000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  const corpo = await res.json();
  expect(corpo.verba.cdOfertante).toBe(CNPJ_GO);
  expect(Number(corpo.verba.vlVerba)).toBe(12000);
  expect(getVerba(corpo.verba.cdVerba)).not.toBeNull();

  await cliente.dispose();
});

test("CA-OV-08: AM também pode criar Verba", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_GO, vlVerba: 3000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  await cliente.dispose();
});

test("GO não pode criar Verba (só a consome)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_GO, vlVerba: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("CA-OV-09: criação de Verba com Ofertante inexistente é rejeitada com 400 claro", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_INEXISTENTE, vlVerba: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe("Ofertante informado não existe");

  await cliente.dispose();
});

test("criação de Verba com valor não-positivo é rejeitada com 400", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_GO, vlVerba: 0 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  await cliente.dispose();
});

test("listagem escopada: GT vê a Verba de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas?cdOfertante=${CNPJ_GO_2}`, {
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
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas?cdOfertante=${CNPJ_GO}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.verbas.every((v: { cdOfertante: string }) => v.cdOfertante === CNPJ_GO_2)).toBe(true);
  expect(
    corpo.verbas.some((v: { cdVerba: number }) => v.cdVerba === cdVerbaExistente),
  ).toBe(true);

  await cliente.dispose();
});

test("CA-OV-10: Verba recém-criada sem curso vinculado tem saldoDisponivel igual ao valor total", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas?cdOfertante=${CNPJ_GO_2}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const corpo = await res.json();
  const verba = corpo.verbas.find((v: { cdVerba: number }) => v.cdVerba === cdVerbaExistente);
  expect(Number(verba.saldoDisponivel)).toBe(5000);

  await cliente.dispose();
});
