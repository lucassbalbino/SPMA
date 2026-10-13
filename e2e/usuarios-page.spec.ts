// e2e de /usuarios, a "Gestão de usuários", pela UI real. Era o e2e de
// /usuarios/novo (T29); a criação mudou de endereço (GU-01/GU-03) e o antigo
// redireciona (GU-02). Cobre CA-AU-05 (GO logado só vê
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
import { geradorDeCnpj } from "./helpers/cnpj";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("27");

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

  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/usuarios$/);

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

  await page.goto("/usuarios");
  await page.locator("select#tipo").selectOption("VO");

  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await expect(page.locator("#vlVerba")).toHaveCount(0);
});

test("OGO-09/OGO-12: AM logado cria um GO só com CNPJ, nome e verba - a tela não pede nenhum dado organizacional", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");

  // OGO-13: para os outros tipos o E-mail continua sendo pedido.
  await page.locator("select#tipo").selectOption("VO");
  await expect(page.locator("#email")).toBeVisible();

  // OGO-12: com GO, só CNPJ, nome e verba. Nada de Ofertante existente, nem
  // E-mail, UF, Responsável, Telefone ou Município.
  await page.locator("select#tipo").selectOption("GO");
  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  for (const campo of ["email", "uf", "responsavel", "telefone", "municipio"]) {
    await expect(page.locator(`#${campo}`)).toHaveCount(0);
  }
  await expect(page.locator("#vlVerba")).toBeVisible();

  // Com GO selecionado o campo de documento é rotulado "CNPJ".
  await page.getByLabel("CNPJ").fill(CNPJ_NOVO_GO);
  await page.getByLabel("Nome").fill("GO Criado Pela UI");
  await page.getByLabel("Valor da verba").fill("7500");
  await page.getByLabel("Data da verba").fill("2026-04-20");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CNPJ_NOVO_GO);
  expect(criado?.tipo).toBe("GO");
  expect(criado?.nome).toBe("GO Criado Pela UI");
  expect(criado?.cdOfertante).toBeNull();
  expect(criado?.criadoPor).toBe(CPF_AM_CRIADOR);

  const verba = getVerba((await resposta.json()).verba.cdVerba);
  expect(verba?.cdOfertante).toBe(CNPJ_NOVO_GO);
  expect(Number(verba?.vlVerba)).toBe(7500);
});

test("UGO-14: AM logado vincula um VO a um GO existente, escolhido de uma lista", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");

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

  await page.goto("/usuarios");
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

  await page.goto("/usuarios");

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

test("GU-02: abrir /usuarios/novo termina em /usuarios com o formulário de criação", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");

  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.locator("select#tipo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar usuário" })).toBeVisible();
});
