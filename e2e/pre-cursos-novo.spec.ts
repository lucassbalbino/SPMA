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
const CPF_AM = "51104005123";
const CPF_GT = "51106007085";
const CPF_GO_SEM_VERBA = "51107008000";

let cdOfertante: number;
let cdOfertanteOutro: number;
let cdOfertanteSemVerba: number;
let cdVerba: number;
let cdVerbaOutro: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO, CPF_AM, CPF_GT, CPF_GO_SEM_VERBA]);

  cdOfertante = criarOfertante({ nome: "Ofertante Novo Pré-Curso", uf: "SP" }).cdOfertante;
  cdOfertanteOutro = criarOfertante({
    nome: "Ofertante Novo Pré-Curso Outro",
    uf: "RJ",
  }).cdOfertante;
  cdOfertanteSemVerba = criarOfertante({
    nome: "Ofertante Novo Pré-Curso Sem Verba",
    uf: "MG",
  }).cdOfertante;

  cdVerba = criarVerba({ cdOfertante, vlVerba: 1000 }).cdVerba;
  cdVerbaOutro = criarVerba({ cdOfertante: cdOfertanteOutro, vlVerba: 1000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CPF_GO_SEM_VERBA,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteSemVerba,
  });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertanteOutro, cdOfertanteSemVerba]);
  deleteUsuarios([CPF_GO, CPF_AM, CPF_GT, CPF_GO_SEM_VERBA]);
});

async function login(page: import("@playwright/test").Page, cpf: string = CPF_GO) {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf, senha: SENHA },
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

test("AD-040: seletor de Verba do AM mostra as Verbas de TODOS os Ofertantes, com o nome do Ofertante", async ({
  page,
}) => {
  await login(page, CPF_AM);
  await page.goto("/pre-cursos/novo");

  await page.getByTestId("select-verba").click();
  const opcaoVerba = page.getByTestId(`opcao-verba-${cdVerba}`);
  await expect(opcaoVerba).toContainText("Ofertante Novo Pré-Curso");
  await expect(opcaoVerba).toContainText(`Verba #${cdVerba}`);
  await expect(opcaoVerba).toContainText("saldo R$ 1000.00");

  const opcaoVerbaOutro = page.getByTestId(`opcao-verba-${cdVerbaOutro}`);
  await expect(opcaoVerbaOutro).toContainText("Ofertante Novo Pré-Curso Outro");
  await expect(opcaoVerbaOutro).toContainText(`Verba #${cdVerbaOutro}`);
  await expect(opcaoVerbaOutro).toContainText("saldo R$ 1000.00");
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

test("GT não pode criar pré-curso: a tela mostra a mensagem de acesso negado, sem seletor", async ({
  page,
}) => {
  await login(page, CPF_GT);
  await page.goto("/pre-cursos/novo");

  await expect(page.getByTestId("select-verba")).toHaveCount(0);
  await expect(page.getByText("Seu perfil não pode criar pré-cursos.")).toBeVisible();
});

test("GO sem nenhuma Verba vê a mensagem de lista vazia, sem seletor", async ({ page }) => {
  await login(page, CPF_GO_SEM_VERBA);
  await page.goto("/pre-cursos/novo");

  await expect(page.getByTestId("select-verba")).toHaveCount(0);
  await expect(page.getByText("Nenhuma verba disponível para criar um curso.")).toBeVisible();
});
