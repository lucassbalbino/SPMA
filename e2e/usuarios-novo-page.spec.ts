// e2e de /usuarios/novo (T29), pela UI real. Cobre CA-AU-05: GO logado só
// vê GO/VO/AL como opções de tipo e consegue criar um AL.
import { expect, test } from "@playwright/test";
import { criarOfertante, deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO_CRIADOR = "40300040083";
const CPF_NOVO_AL = "40310041090";

const CPFS = [CPF_GO_CRIADOR, CPF_NOVO_AL];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  const ofertante = criarOfertante({ nome: "Ofertante do GO (T29)", uf: "SP" });
  upsertUsuario({
    cpf: CPF_GO_CRIADOR,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: ofertante.cdOfertante,
  });
});

test.afterAll(() => {
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

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_AL);
  expect(criado?.tipo).toBe("AL");
  expect(criado?.criadoPor).toBe(CPF_GO_CRIADOR);
});
