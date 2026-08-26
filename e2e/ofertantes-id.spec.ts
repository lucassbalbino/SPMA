// e2e de GET/PATCH /api/ofertantes/[id] (REQ-OV-02, REQ-OV-03, REQ-OV-05).
import { expect, test } from "@playwright/test";
import { criarOfertante, deleteUsuarios, getOfertante, upsertUsuario } from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GO_A = "40105006033";
const CPF_GO_B = "40206007086";
const CPF_AM = "40307008029";
const CPF_VT = "40408009071";
const CPF_VO_A = "40509000177";

const CPFS = [CPF_GO_A, CPF_GO_B, CPF_AM, CPF_VT, CPF_VO_A];

let cdOfertanteA: number;
let cdOfertanteB: number;

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

  cdOfertanteA = criarOfertante({ nome: "Ofertante A (por-id)", uf: "SP" }).cdOfertante;
  cdOfertanteB = criarOfertante({ nome: "Ofertante B (por-id)", uf: "RJ" }).cdOfertante;

  upsertUsuario({ cpf: CPF_GO_A, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertanteA });
  upsertUsuario({ cpf: CPF_GO_B, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertanteB });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VO_A, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante: cdOfertanteA });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-OV-06: GO consulta o próprio Ofertante", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/ofertantes/${cdOfertanteA}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.ofertante.cdOfertante).toBe(cdOfertanteA);

  await cliente.dispose();
});

test("CA-OV-06 / CA-OV-15: GO consultando o Ofertante de outro GO recebe 403", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/ofertantes/${cdOfertanteB}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AM consulta qualquer Ofertante (escopo nacional)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/ofertantes/${cdOfertanteB}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);

  await cliente.dispose();
});

test("consulta de Ofertante inexistente recebe 404", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/ofertantes/999999999", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);

  await cliente.dispose();
});

test("CA-OV-03: GO vinculado edita o próprio Ofertante e a alteração persiste", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/ofertantes/${cdOfertanteA}`, {
    data: { nome: "Ofertante A Editado", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  expect(getOfertante(cdOfertanteA)?.nome).toBe("Ofertante A Editado");

  await cliente.dispose();
});

test("CA-OV-04: GO tentando editar o Ofertante de outro GO recebe 403 e nada muda", async () => {
  const nomeOriginal = getOfertante(cdOfertanteB)?.nome;
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/ofertantes/${cdOfertanteB}`, {
    data: { nome: "Tentativa Indevida", uf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getOfertante(cdOfertanteB)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});

test("VT não pode editar, mesmo tendo leitura nacional", async () => {
  const nomeOriginal = getOfertante(cdOfertanteA)?.nome;
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VT);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/ofertantes/${cdOfertanteA}`, {
    data: { nome: "Tentativa De Vt", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getOfertante(cdOfertanteA)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});

test("VO não pode editar o próprio Ofertante (somente leitura)", async () => {
  const nomeOriginal = getOfertante(cdOfertanteA)?.nome;
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/ofertantes/${cdOfertanteA}`, {
    data: { nome: "Tentativa De Vo", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getOfertante(cdOfertanteA)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});

test("edição sem token CSRF válido é rejeitada com 403", async () => {
  const nomeOriginal = getOfertante(cdOfertanteA)?.nome;
  const csrfArbitrario = "csrf-arbitrario";

  const { idSessao } = await logarComCsrf(CPF_GO_A);
  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/ofertantes/${cdOfertanteA}`, {
    data: { nome: "Sem Csrf", uf: "SP" },
    headers: {
      Cookie: `spma_sessao=${idSessao}; spma_csrf=${csrfArbitrario}`,
      "x-csrf-token": "outro-valor-diferente",
    },
  });

  expect(res.status()).toBe(403);
  expect(getOfertante(cdOfertanteA)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});
