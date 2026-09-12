// e2e de /pre-cursos/novo (T9), pela UI real. Cobre REQ-PC-01/02/03 na
// camada de tela.
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
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
  const base12 = `31${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO = gerarCnpjValido(1);
const CPF_AM = "51104005123";
const CPF_GT = "51106007085";
const CNPJ_GO_OUTRO = gerarCnpjValido(2);
const CNPJ_GO_SEM_VERBA = gerarCnpjValido(3);

const CPFS = [CNPJ_GO, CPF_AM, CPF_GT, CNPJ_GO_OUTRO, CNPJ_GO_SEM_VERBA];

let cdVerba: number;
let cdVerbaOutro: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO, CNPJ_GO_SEM_VERBA]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO, CNPJ_GO_SEM_VERBA]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Novo Pré-Curso",
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CNPJ_GO_OUTRO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Novo Pré-Curso Outro",
    uf: "RJ",
  });
  upsertUsuario({
    cpf: CNPJ_GO_SEM_VERBA,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Novo Pré-Curso Sem Verba",
    uf: "MG",
  });

  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 1000 }).cdVerba;
  cdVerbaOutro = criarVerba({ cdOfertante: CNPJ_GO_OUTRO, vlVerba: 1000 }).cdVerba;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO, CNPJ_GO_SEM_VERBA]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO, CNPJ_GO_SEM_VERBA]);
  deleteUsuarios(CPFS);
});

async function login(page: import("@playwright/test").Page, documento: string = CNPJ_GO) {
  const login = await page.request.post("/api/auth/login", {
    data: { documento, senha: SENHA },
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
  await login(page, CNPJ_GO_SEM_VERBA);
  await page.goto("/pre-cursos/novo");

  await expect(page.getByTestId("select-verba")).toHaveCount(0);
  await expect(page.getByText("Nenhuma verba disponível para criar um curso.")).toBeVisible();
});
