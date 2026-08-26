// e2e de GET/PATCH /api/verbas/[id] (REQ-OV-09, REQ-OV-10, REQ-OV-11, REQ-OV-12).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getVerba,
  upsertUsuario,
} from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GT = "60105006050";
const CPF_GO_A = "60206007000";
const CPF_GO_B = "60307008045";

const CPFS = [CPF_GT, CPF_GO_A, CPF_GO_B];

let cdOfertanteA: number;
let cdOfertanteB: number;
let cdVerbaSemCurso: number;
let cdVerbaComCurso: number;

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

  cdOfertanteA = criarOfertante({ nome: "Ofertante Verba Id A", uf: "SP" }).cdOfertante;
  cdOfertanteB = criarOfertante({ nome: "Ofertante Verba Id B", uf: "RJ" }).cdOfertante;

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO_A, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertanteA });
  upsertUsuario({ cpf: CPF_GO_B, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertanteB });

  cdVerbaSemCurso = criarVerba({ cdOfertante: cdOfertanteA, vlVerba: 8000 }).cdVerba;

  cdVerbaComCurso = criarVerba({ cdOfertante: cdOfertanteA, vlVerba: 8000 }).cdVerba;
  criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaComCurso,
    vlCursoAlocado: 3000,
    criadoPor: CPF_GO_A,
  });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertanteA, cdOfertanteB]);
  deleteUsuarios(CPFS);
});

test("CA-OV-10/11: GET devolve saldoDisponivel correto (sem e com curso alocado)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_A);
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
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_B);

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
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/verbas/${cdVerbaSemCurso}`, {
    data: { vlVerba: 1 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getVerba(cdVerbaSemCurso)?.vlVerba).toBe(valorOriginal);

  await cliente.dispose();
});
