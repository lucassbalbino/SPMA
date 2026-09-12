// e2e de GET/PATCH /api/usuarios/[documento]/organizacao (REQ-OV-02,
// REQ-OV-03, REQ-OV-05, UGO-01/05/15/16), reescrito a partir de
// `ofertantes-id.spec.ts`. O alvo passa de um `cdOfertante` numérico de uma
// tabela `Ofertante` autônoma para o próprio `documento` (CNPJ) do GO
// (AD-043) - mesmos cenários (CA-OV-03..06/15), mesmas guardas
// (`podeAcessarOfertante`/`podeEditarOfertante`), só o alvo muda.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
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
  const base12 = `23${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO_A = gerarCnpjValido(1);
const CNPJ_GO_B = gerarCnpjValido(2);
const CPF_AM = "40307008029";
const CPF_VT = "40408009071";
const CPF_VO_A = "40509000177";

const CPFS = [CNPJ_GO_A, CNPJ_GO_B, CPF_AM, CPF_VT, CPF_VO_A];

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
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO_A,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante A (por-documento)",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_B,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante B (por-documento)",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CPF_VO_A,
    tipo: "VO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: CNPJ_GO_A,
  });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-OV-06: GO consulta os próprios dados organizacionais", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.usuario.documento).toBe(CNPJ_GO_A);

  await cliente.dispose();
});

test("CA-OV-06 / CA-OV-15: GO consultando os dados organizacionais de outro GO recebe 403", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${CNPJ_GO_B}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AM consulta os dados organizacionais de qualquer GO (escopo nacional)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${CNPJ_GO_B}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);

  await cliente.dispose();
});

test("consulta de GO inexistente recebe 404", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);
  const cnpjInexistente = gerarCnpjValido(999);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${cnpjInexistente}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);

  await cliente.dispose();
});

test("CA-OV-03: GO vinculado edita os próprios dados organizacionais e a alteração persiste", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    data: { nome: "Ofertante A Editado", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  expect(getUsuario(CNPJ_GO_A)?.nome).toBe("Ofertante A Editado");

  await cliente.dispose();
});

test("CA-OV-04: GO tentando editar os dados organizacionais de outro GO recebe 403 e nada muda", async () => {
  const nomeOriginal = getUsuario(CNPJ_GO_B)?.nome;
  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_B}/organizacao`, {
    data: { nome: "Tentativa Indevida", uf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CNPJ_GO_B)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});

test("VT não pode editar, mesmo tendo leitura nacional", async () => {
  const nomeOriginal = getUsuario(CNPJ_GO_A)?.nome;
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VT);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    data: { nome: "Tentativa De Vt", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CNPJ_GO_A)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});

test("VO não pode editar os dados organizacionais do próprio GO vinculado (somente leitura)", async () => {
  const nomeOriginal = getUsuario(CNPJ_GO_A)?.nome;
  const { idSessao, idCsrf } = await logarComCsrf(CPF_VO_A);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    data: { nome: "Tentativa De Vo", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CNPJ_GO_A)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});

test("edição sem token CSRF válido é rejeitada com 403", async () => {
  const nomeOriginal = getUsuario(CNPJ_GO_A)?.nome;
  const csrfArbitrario = "csrf-arbitrario";

  const { idSessao } = await logarComCsrf(CNPJ_GO_A);
  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    data: { nome: "Sem Csrf", uf: "SP" },
    headers: {
      Cookie: `spma_sessao=${idSessao}; spma_csrf=${csrfArbitrario}`,
      "x-csrf-token": "outro-valor-diferente",
    },
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CNPJ_GO_A)?.nome).toBe(nomeOriginal);

  await cliente.dispose();
});
