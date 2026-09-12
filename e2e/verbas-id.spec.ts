// e2e de GET/PATCH /api/verbas/[id] (REQ-OV-09, REQ-OV-10, REQ-OV-11, REQ-OV-12).
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
  const base12 = `26${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CPF_GT = "60105006050";
const CNPJ_GO_A = gerarCnpjValido(1);
const CNPJ_GO_B = gerarCnpjValido(2);

const CPFS = [CPF_GT, CNPJ_GO_A, CNPJ_GO_B];

let cdVerbaSemCurso: number;
let cdVerbaComCurso: number;

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
  deletePreCursosPorOfertante([CNPJ_GO_A, CNPJ_GO_B]);
  deleteVerbasPorOfertante([CNPJ_GO_A, CNPJ_GO_B]);
  deleteUsuarios(CPFS);

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CNPJ_GO_A,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Verba Id A",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_B,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Verba Id B",
    uf: "RJ",
  });

  cdVerbaSemCurso = criarVerba({ cdOfertante: CNPJ_GO_A, vlVerba: 8000 }).cdVerba;

  cdVerbaComCurso = criarVerba({ cdOfertante: CNPJ_GO_A, vlVerba: 8000 }).cdVerba;
  criarPreCurso({
    cdOfertante: CNPJ_GO_A,
    cdVerba: cdVerbaComCurso,
    vlCursoAlocado: 3000,
    criadoPor: CNPJ_GO_A,
  });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO_A, CNPJ_GO_B]);
  deleteVerbasPorOfertante([CNPJ_GO_A, CNPJ_GO_B]);
  deleteUsuarios(CPFS);
});

test("CA-OV-10/11: GET devolve saldoDisponivel correto (sem e com curso alocado)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_A);
  const cliente = await novoCliente();

  const resSemCurso = await cliente.get(`/api/verbas/${cdVerbaSemCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(resSemCurso.status()).toBe(200);
  expect(Number((await resSemCurso.json()).verba.saldoDisponivel)).toBe(8000);

  const resComCurso = await cliente.get(`/api/verbas/${cdVerbaComCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(resComCurso.status()).toBe(200);
  expect(Number((await resComCurso.json()).verba.saldoDisponivel)).toBe(5000);

  await cliente.dispose();
});

test("GO de outro Ofertante recebe 403 ao consultar a Verba", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_B);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/verbas/${cdVerbaSemCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AD-016: edição que iguala o valor total ao já alocado é aceita (mesma regra de igualdade de CA-OV-12/14, aplicada à edição)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/verbas/${cdVerbaComCurso}`, {
    data: { vlVerba: 3000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  expect(Number(getVerba(cdVerbaComCurso)?.vlVerba)).toBe(3000);

  // Restaura para não afetar os testes seguintes.
  await cliente.patch(`/api/verbas/${cdVerbaComCurso}`, {
    data: { vlVerba: 8000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  await cliente.dispose();
});

test("CA-OV-14: edição abaixo do já alocado é rejeitada com 409, valor original preservado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);
  const valorOriginal = getVerba(cdVerbaComCurso)?.vlVerba;

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/verbas/${cdVerbaComCurso}`, {
    data: { vlVerba: 2999.99 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  expect(getVerba(cdVerbaComCurso)?.vlVerba).toBe(valorOriginal);

  await cliente.dispose();
});

test("GO não pode editar Verba (só AM/GT gerenciam)", async () => {
  const valorOriginal = getVerba(cdVerbaSemCurso)?.vlVerba;
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/verbas/${cdVerbaSemCurso}`, {
    data: { vlVerba: 1 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getVerba(cdVerbaSemCurso)?.vlVerba).toBe(valorOriginal);

  await cliente.dispose();
});
