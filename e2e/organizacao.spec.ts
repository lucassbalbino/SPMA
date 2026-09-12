// e2e de GET/PATCH /api/usuarios/[documento]/organizacao (T12/UGO-01,
// UGO-05, UGO-15, UGO-16), reescrito a partir de `ofertantes.spec.ts`.
//
// Nota (UGO/AD-043): `POST /api/ofertantes` (pré-cadastro administrativo
// avulso, CA-OV-01/02 originais) e `GET /api/ofertantes` (listagem em
// coleção, CA-OV-07 original) não têm mais rota equivalente - sem `model
// Ofertante` separado, não existe mais "criar/listar Ofertantes" como
// endpoint próprio. O que antes era CA-OV-01 (AM/GT pré-cadastra um
// Ofertante com nome/UF) hoje é simplesmente `POST /api/usuarios` com
// `tipo: "GO"` (T11, já coberto em `e2e/usuarios.spec.ts`); o que antes era
// CA-OV-07 (listagem para escolher um Ofertante) hoje é
// `prisma.usuario.findMany({where:{tipo:"GO"}})` na própria tela
// `usuarios/novo` (T15, `e2e/usuarios-novo-page.spec.ts`), não uma rota
// JSON. Este arquivo cobre o que sobra da família CA-OV-02 (validação) e o
// acesso de leitura por escopo (equivalente ao papel que a listagem tinha)
// contra a rota única que resta: `GET/PATCH .../organizacao`.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

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
  const base12 = `22${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO_A = gerarCnpjValido(1);
const CNPJ_GO_B = gerarCnpjValido(2);
const CPF_AM = "30104005009";
const CPF_GT = "30204006007";
const CPF_ALUNO = "30080090001";

const CPFS = [CNPJ_GO_A, CNPJ_GO_B, CPF_AM, CPF_GT, CPF_ALUNO];

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
    nome: "Ofertante A (organizacao)",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_B,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante B (organizacao)",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_ALUNO, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-OV-07 (equivalente): AM lê os dados organizacionais de qualquer GO (escopo nacional)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${CNPJ_GO_B}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.usuario.documento).toBe(CNPJ_GO_B);
  expect(corpo.usuario.nome).toBe("Ofertante B (organizacao)");

  await cliente.dispose();
});

test("CA-OV-07 (equivalente): GT lê os dados organizacionais de qualquer GO (escopo nacional)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);

  await cliente.dispose();
});

test("listagem/leitura: Aluno não tem acesso (403)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_ALUNO);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("CA-OV-02 (equivalente): PATCH com nome vazio é rejeitado com 400 indicando o campo", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    data: { nome: "", uf: "SP" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe("Nome é obrigatório");
  expect(getUsuario(CNPJ_GO_A)?.nome).toBe("Ofertante A (organizacao)");

  await cliente.dispose();
});

test("CA-OV-02 (equivalente): PATCH sem UF é rejeitado com 400", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/usuarios/${CNPJ_GO_A}/organizacao`, {
    data: { nome: "Ofertante A Sem Uf" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect(getUsuario(CNPJ_GO_A)?.nome).toBe("Ofertante A (organizacao)");

  await cliente.dispose();
});

test("nenhuma rota /api/ofertantes* responde mais (404 do Next.js)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);
  const headers = cabecalhosAutenticados(idSessao, idCsrf);

  const cliente = await novoCliente();
  const resColecao = await cliente.get("/api/ofertantes", { headers });
  const resPost = await cliente.post("/api/ofertantes", {
    data: { nome: "Fantasma", uf: "SP" },
    headers,
  });
  const resId = await cliente.get(`/api/ofertantes/1`, { headers });

  expect(resColecao.status()).toBe(404);
  expect(resPost.status()).toBe(404);
  expect(resId.status()).toBe(404);

  await cliente.dispose();
});
