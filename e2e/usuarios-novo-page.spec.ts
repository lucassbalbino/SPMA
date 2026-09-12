// e2e de /usuarios/novo (T29), pela UI real. Cobre CA-AU-05 (GO logado só vê
// GO/VO/AL como opções de tipo e cria um AL já matriculado), REQ-OV-08 (AM
// logado informa os dados organizacionais do GO e a verba no mesmo
// formulário) e AVAL-01 (curso obrigatório na criação do Aluno).
//
// UGO-14/AD-043: sem `model Ofertante` separado, criar um GO deixa de ser
// "escolher um Ofertante já cadastrado" - o próprio GO informa CNPJ+UF (T15).
// A lista de GOs existentes passa a servir só para vincular um VO a um deles.
import { expect, test } from "@playwright/test";
import {
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  getAvaliacao,
  getUsuario,
  getVerba,
  upsertUsuario,
} from "./helpers/db";

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
  const base12 = `27${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO_CRIADOR = gerarCnpjValido(1);
const CPF_NOVO_AL = "40310041090";
const CPF_AM_CRIADOR = "40320042006";
const CNPJ_NOVO_GO = gerarCnpjValido(2);
const CPF_NOVO_VO = "40350045020";
const CPF_NOVO_AL_SEM_CURSO = "40440044049";

const NOME_GO_EXISTENTE = "GO Já Cadastrado (T29)";

const CPFS = [
  CNPJ_GO_CRIADOR,
  CPF_NOVO_AL,
  CPF_AM_CRIADOR,
  CNPJ_NOVO_GO,
  CPF_NOVO_VO,
  CPF_NOVO_AL_SEM_CURSO,
];

let cdCursoDoGo: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteVerbasPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO_CRIADOR,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: NOME_GO_EXISTENTE,
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_AM_CRIADOR, tipo: "AM", senha: SENHA, primeiraVez: false });

  // AVAL-01: sem curso no Ofertante do GO não há como criar um Aluno pela UI.
  const cdVerba = criarVerba({ cdOfertante: CNPJ_GO_CRIADOR, vlVerba: 10000 }).cdVerba;
  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO_CRIADOR,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_CRIADOR,
  }).cdCurso;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteVerbasPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteUsuarios(CPFS);
});

test("CA-AU-05: GO logado só vê VO/AL como opções e consegue criar um AL pela UI", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await expect(page).toHaveURL(/\/usuarios\/novo$/);

  const opcoes = await page.locator("select#tipo option").allTextContents();
  expect(opcoes.sort()).toEqual(["AL", "VO"]);

  await page.getByLabel("CPF").fill(CPF_NOVO_AL);
  await page.getByLabel("Nome").fill("Aluno Criado Pela UI");
  await page.locator("select#tipo").selectOption("AL");
  await page.locator("select#cdCurso").selectOption(String(cdCursoDoGo));

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_AL);
  expect(criado?.tipo).toBe("AL");
  expect(criado?.criadoPor).toBe(CNPJ_GO_CRIADOR);
  expect(getAvaliacao(CPF_NOVO_AL, cdCursoDoGo)?.status).toBe("EM_ANDAMENTO");
});

test("GO logado não vê os campos de Ofertante/verba (não gere verba)", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await page.locator("select#tipo").selectOption("VO");

  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await expect(page.locator("#vlVerba")).toHaveCount(0);
});

test("UGO-01: AM logado cria um GO informando CNPJ+nome+UF (sem escolher Ofertante existente) e a verba no mesmo passo", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");

  // Os campos organizacionais/verba só existem depois de escolher o tipo GO;
  // não há mais um seletor de "Ofertante existente" para esse tipo.
  await expect(page.locator("#uf")).toHaveCount(0);
  await page.locator("select#tipo").selectOption("GO");
  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await expect(page.locator("#uf")).toBeVisible();

  await page.getByLabel("CPF").fill(CNPJ_NOVO_GO);
  await page.getByLabel("Nome").fill("GO Criado Pela UI");
  await page.getByLabel("UF").fill("MG");
  await page.getByLabel("Valor da verba").fill("7500");
  await page.getByLabel("Data da verba").fill("2026-04-20");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CNPJ_NOVO_GO);
  expect(criado?.tipo).toBe("GO");
  expect(criado?.uf).toBe("MG");
  expect(criado?.cdOfertante).toBeNull();
  expect(criado?.criadoPor).toBe(CPF_AM_CRIADOR);

  const verba = getVerba((await resposta.json()).verba.cdVerba);
  expect(verba?.cdOfertante).toBe(CNPJ_NOVO_GO);
  expect(Number(verba?.vlVerba)).toBe(7500);
});

test("UGO-01: AM que tenta criar GO sem informar UF é barrado antes do envio", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await page.locator("select#tipo").selectOption("GO");
  await page.getByLabel("CPF").fill(gerarCnpjValido(3));
  await page.getByLabel("Nome").fill("GO Sem Uf");
  await page.getByLabel("Valor da verba").fill("1000");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("UF é obrigatória")).toBeVisible();
});

test("UGO-14: AM logado vincula um VO a um GO existente, escolhido de uma lista", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");

  // O seletor de Ofertante só existe depois de escolher o tipo VO.
  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await page.locator("select#tipo").selectOption("VO");
  await expect(page.locator("select#cdOfertante")).toBeVisible();

  await page.getByLabel("CPF").fill(CPF_NOVO_VO);
  await page.getByLabel("Nome").fill("VO Criado Pela UI");
  await page.locator("select#cdOfertante").selectOption({ label: NOME_GO_EXISTENTE });

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_VO);
  expect(criado?.tipo).toBe("VO");
  expect(criado?.cdOfertante).toBe(CNPJ_GO_CRIADOR);
  expect(criado?.criadoPor).toBe(CPF_AM_CRIADOR);
});

test("REQ-OV-08 (equivalente/UGO-14): AM que tenta criar VO sem escolher o Ofertante é barrado antes do envio", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await page.locator("select#tipo").selectOption("VO");
  await page.getByLabel("CPF").fill("40360046037");
  await page.getByLabel("Nome").fill("VO Sem Ofertante");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("Ofertante é obrigatório")).toBeVisible();
});

test("AVAL-01: o GO só vê no seletor os cursos do próprio Ofertante e não envia sem escolher um", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");

  // O seletor de curso só existe para o tipo AL.
  await page.locator("select#tipo").selectOption("VO");
  await expect(page.locator("select#cdCurso")).toHaveCount(0);

  await page.locator("select#tipo").selectOption("AL");
  const opcoes = await page.locator("select#cdCurso option").allTextContents();
  expect(opcoes).toEqual(["Selecione", `Curso #${cdCursoDoGo}`]);

  await page.getByLabel("CPF").fill(CPF_NOVO_AL_SEM_CURSO);
  await page.getByLabel("Nome").fill("Aluno Sem Curso");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("Curso é obrigatório")).toBeVisible();
  expect(getUsuario(CPF_NOVO_AL_SEM_CURSO)).toBeNull();
});
