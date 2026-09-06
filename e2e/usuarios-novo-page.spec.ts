// e2e de /usuarios/novo (T29), pela UI real. Cobre CA-AU-05 (GO logado só vê
// GO/VO/AL como opções de tipo e cria um AL já matriculado), REQ-OV-08 (AM
// logado escolhe o Ofertante e informa a verba no mesmo formulário do GO) e
// AVAL-01 (curso obrigatório na criação do Aluno).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getAvaliacao,
  getUsuario,
  getVerba,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO_CRIADOR = "40300040083";
const CPF_NOVO_AL = "40310041090";
const CPF_AM_CRIADOR = "40320042006";
const CPF_NOVO_GO = "40330043005";
const CPF_NOVO_AL_SEM_CURSO = "40440044049";

const NOME_OFERTANTE_AM = "Ofertante Escolhido Pelo AM (T29)";

const CPFS = [
  CPF_GO_CRIADOR,
  CPF_NOVO_AL,
  CPF_AM_CRIADOR,
  CPF_NOVO_GO,
  CPF_NOVO_AL_SEM_CURSO,
];

let cdOfertanteDoGo: number;
let cdOfertanteDoAm: number;
let cdCursoDoGo: number;

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  cdOfertanteDoGo = criarOfertante({ nome: "Ofertante do GO (T29)", uf: "SP" }).cdOfertante;
  upsertUsuario({
    cpf: CPF_GO_CRIADOR,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteDoGo,
  });

  cdOfertanteDoAm = criarOfertante({ nome: NOME_OFERTANTE_AM, uf: "MG" }).cdOfertante;
  upsertUsuario({ cpf: CPF_AM_CRIADOR, tipo: "AM", senha: SENHA, primeiraVez: false });

  // AVAL-01: sem curso no Ofertante do GO não há como criar um Aluno pela UI.
  const cdVerba = criarVerba({ cdOfertante: cdOfertanteDoGo, vlVerba: 10000 }).cdVerba;
  cdCursoDoGo = criarPreCurso({
    cdOfertante: cdOfertanteDoGo,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_CRIADOR,
  }).cdCurso;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertanteDoGo, cdOfertanteDoAm]);
  deleteUsuarios(CPFS);
});

test("CA-AU-05: GO logado só vê GO/VO/AL como opções e consegue criar um AL pela UI", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await expect(page).toHaveURL(/\/usuarios\/novo$/);

  const opcoes = await page.locator("select#tipo option").allTextContents();
  expect(opcoes.sort()).toEqual(["AL", "GO", "VO"]);

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
  expect(criado?.criadoPor).toBe(CPF_GO_CRIADOR);
  expect(getAvaliacao(CPF_NOVO_AL, cdCursoDoGo)?.status).toBe("EM_ANDAMENTO");
});

test("CA-AU-05: GO logado não vê os campos de Ofertante/verba (não gere verba)", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await page.locator("select#tipo").selectOption("GO");

  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await expect(page.locator("#vlVerba")).toHaveCount(0);
});

test("REQ-OV-08: AM logado escolhe o Ofertante, informa a verba e cria os dois de uma vez", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");

  // Os campos de Ofertante/verba só existem depois de escolher o tipo GO.
  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await page.locator("select#tipo").selectOption("GO");
  await expect(page.locator("select#cdOfertante")).toBeVisible();

  await page.getByLabel("CPF").fill(CPF_NOVO_GO);
  await page.getByLabel("Nome").fill("GO Criado Pela UI");
  await page.locator("select#cdOfertante").selectOption({ label: NOME_OFERTANTE_AM });
  await page.getByLabel("Valor da verba").fill("7500");
  await page.getByLabel("Data da verba").fill("2026-04-20");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_GO);
  expect(criado?.tipo).toBe("GO");
  expect(criado?.cdOfertante).toBe(cdOfertanteDoAm);
  expect(criado?.criadoPor).toBe(CPF_AM_CRIADOR);

  const verba = getVerba((await resposta.json()).verba.cdVerba);
  expect(verba?.cdOfertante).toBe(cdOfertanteDoAm);
  expect(Number(verba?.vlVerba)).toBe(7500);
});

test("REQ-OV-08: AM que tenta criar GO sem escolher o Ofertante é barrado antes do envio", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");
  await page.locator("select#tipo").selectOption("GO");
  await page.getByLabel("CPF").fill(CPF_NOVO_GO);
  await page.getByLabel("Nome").fill("GO Sem Ofertante");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("Ofertante é obrigatório")).toBeVisible();
});

test("AVAL-01: o GO só vê no seletor os cursos do próprio Ofertante e não envia sem escolher um", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO_CRIADOR, senha: SENHA },
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
