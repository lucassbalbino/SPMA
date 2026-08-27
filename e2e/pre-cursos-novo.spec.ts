// e2e de /pre-cursos/novo (T9), pela UI real. Cobre REQ-PC-01/02/03 na
// camada de tela.
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO = "52111003107";

let cdOfertante: number;
let cdOfertanteOutro: number;
let cdVerba: number;
let cdVerbaOutro: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO]);

  cdOfertante = criarOfertante({ nome: "Ofertante Novo Pré-Curso", uf: "SP" }).cdOfertante;
  cdOfertanteOutro = criarOfertante({
    nome: "Ofertante Novo Pré-Curso Outro",
    uf: "RJ",
  }).cdOfertante;

  cdVerba = criarVerba({ cdOfertante, vlVerba: 1000 }).cdVerba;
  cdVerbaOutro = criarVerba({ cdOfertante: cdOfertanteOutro, vlVerba: 1000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertanteOutro]);
  deleteUsuarios([CPF_GO]);
});

async function login(page: import("@playwright/test").Page) {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);
}

test("seletor de Verba mostra só as Verbas do Ofertante do GO autenticado", async ({ page }) => {
  await login(page);
  await page.goto("/pre-cursos/novo");

  await page.getByTestId("select-verba").click();
  await expect(page.getByTestId(`opcao-verba-${cdVerba}`)).toBeVisible();
  await expect(page.getByTestId(`opcao-verba-${cdVerbaOutro}`)).toHaveCount(0);
});

test("GO cria pré-curso dentro do saldo e é redirecionado para a tela de preenchimento", async ({
  page,
}) => {
  await login(page);
  await page.goto("/pre-cursos/novo");

  await page.getByTestId("select-verba").click();
  await page.getByTestId(`opcao-verba-${cdVerba}`).click();
  await page.getByLabel("Valor alocado ao curso").fill("500");
  await page.getByRole("button", { name: "Criar pré-curso" }).click();

  await expect(page).toHaveURL(/\/pre-cursos\/\d+$/);
});

test("valor acima do saldo disponível exibe erro com o saldo informado, sem navegação", async ({
  page,
}) => {
  await login(page);
  await page.goto("/pre-cursos/novo");

  await page.getByTestId("select-verba").click();
  await page.getByTestId(`opcao-verba-${cdVerba}`).click();
  await page.getByLabel("Valor alocado ao curso").fill("999999");
  await page.getByRole("button", { name: "Criar pré-curso" }).click();

  await expect(page.getByTestId("erro-novo-pre-curso")).toContainText("saldo disponível");
  await expect(page).toHaveURL(/\/pre-cursos\/novo$/);
});
