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
  getVerbasPorOfertante,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("25");

const CPF_GT = "50105006041";
const CPF_AM = "50206007094";
// GV-34 (AD-046): o VT perdeu a leitura de verba.
const CPF_VT = "50107008084";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CNPJ_INEXISTENTE = gerarCnpjValido(999);

const CPFS = [CPF_GT, CPF_AM, CPF_VT, CNPJ_GO, CNPJ_GO_2];

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
  upsertUsuario({ cpf: CPF_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
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
    data: { cdOfertante: CNPJ_GO, dsVerba: "Verba e2e", vlVerba: 12000 },
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
    data: { cdOfertante: CNPJ_GO, dsVerba: "Verba e2e", vlVerba: 3000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  await cliente.dispose();
});

test("GO não pode criar Verba (só a consome)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_GO, dsVerba: "Verba e2e", vlVerba: 1000 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("CA-OV-09: criação de Verba com Ofertante inexistente é rejeitada com 400 claro", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_INEXISTENTE, dsVerba: "Verba e2e", vlVerba: 1000 },
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
    data: { cdOfertante: CNPJ_GO, dsVerba: "Verba e2e", vlVerba: 0 },
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

test("GV-34: VT recebe 403 na listagem de verbas, sem nenhuma verba no corpo", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VT);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/verbas", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(await res.json()).not.toHaveProperty("verbas");

  await cliente.dispose();
});

// GV-06/GV-33 (gestao-de-verbas): o teto de DECIMAL(10,2) provado na rota,
// lendo o banco - não só no schema.
test("GV-06/GV-33: POST acima do teto ou com 3 casas é 400 sem criar verba; exatamente 99999999.99 é 201 com o valor gravado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);
  const quantidadeAntes = getVerbasPorOfertante(CNPJ_GO).length;

  const cliente = await novoCliente();
  for (const vlVerba of [100000000, 10.123]) {
    const res = await cliente.post("/api/verbas", {
      data: { cdOfertante: CNPJ_GO, dsVerba: "Verba e2e", vlVerba },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });
    expect(res.status(), `vlVerba=${vlVerba}`).toBe(400);
  }
  expect(getVerbasPorOfertante(CNPJ_GO)).toHaveLength(quantidadeAntes);

  const res = await cliente.post("/api/verbas", {
    data: { cdOfertante: CNPJ_GO, dsVerba: "Verba e2e", vlVerba: 99999999.99 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(res.status()).toBe(201);
  expect(getVerba((await res.json()).verba.cdVerba)?.vlVerba).toBe("99999999.99");

  await cliente.dispose();
});

// IDV-02, IDV-05, IDV-11 (identificacao-verba): a rota grava o texto sem os
// espaços das pontas, aceita repetição no mesmo GO e devolve o campo no GET.
test("IDV-02/05/11: POST grava a identificação sem espaços, aceita a mesma identificação duas vezes e o GET a devolve", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);
  const cliente = await novoCliente();

  const cdVerbas: number[] = [];
  for (let i = 0; i < 2; i++) {
    const res = await cliente.post("/api/verbas", {
      data: { cdOfertante: CNPJ_GO, dsVerba: "  Repasse Março  ", vlVerba: 100 },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });
    expect(res.status()).toBe(201);
    cdVerbas.push((await res.json()).verba.cdVerba);
  }

  expect(cdVerbas[0]).not.toBe(cdVerbas[1]);
  expect(getVerba(cdVerbas[0])?.dsVerba).toBe("Repasse Março");
  expect(getVerba(cdVerbas[1])?.dsVerba).toBe("Repasse Março");

  const lista = await cliente.get(`/api/verbas?cdOfertante=${CNPJ_GO}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  const verbas: { cdVerba: number; dsVerba: string }[] = (await lista.json()).verbas;
  for (const cdVerba of cdVerbas) {
    expect(verbas.find((v) => v.cdVerba === cdVerba)?.dsVerba).toBe("Repasse Março");
  }

  await cliente.dispose();
});

test("IDV-03/IDV-04: POST sem identificação, só com espaços ou com 61 caracteres é 400 com a mensagem, sem criar verba", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);
  const quantidadeAntes = getVerbasPorOfertante(CNPJ_GO).length;
  const cliente = await novoCliente();

  const casos: [string | undefined, string][] = [
    [undefined, "Identificação é obrigatória"],
    ["   ", "Identificação é obrigatória"],
    ["a".repeat(61), "Identificação deve ter no máximo 60 caracteres"],
  ];
  for (const [dsVerba, mensagem] of casos) {
    const res = await cliente.post("/api/verbas", {
      data: { cdOfertante: CNPJ_GO, dsVerba, vlVerba: 100 },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });
    expect(res.status(), `dsVerba=${JSON.stringify(dsVerba)}`).toBe(400);
    expect((await res.json()).erro).toBe(mensagem);
  }
  expect(getVerbasPorOfertante(CNPJ_GO)).toHaveLength(quantidadeAntes);

  await cliente.dispose();
});
