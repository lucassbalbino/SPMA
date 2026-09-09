// e2e de /pre-cursos/novo (T9), pela UI real. Cobre REQ-PC-01/02/03 e o
// AD-040 na camada de tela.
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
const CPF_AM = "51416007008";

let cdOfertante: number;
let cdOfertanteOutro: number;
let cdVerba: number;
let cdVerbaOutro: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO, CPF_AM]);

  cdOfertante = criarOfertante({ nome: "Ofertante Novo Pré-Curso", uf: "SP" }).cdOfertante;
  cdOfertanteOutro = criarOfertante({
    nome: "Ofertante Novo Pré-Curso Outro",
    uf: "RJ",
  }).cdOfertante;

  cdVerba = criarVerba({ cdOfertante, vlVerba: 1000 }).cdVerba;
  cdVerbaOutro = criarVerba({ cdOfertante: cdOfertanteOutro, vlVerba: 1000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertanteOutro]);
  deleteUsuarios([CPF_GO, CPF_AM]);
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

// AD-040: a mesma tela, com a escolha invertida. O AM não vê seletor de
// verba - o custeio sai sempre da verba ilimitada - e escolhe o Ofertante,
// inclusive um a que nenhum GO dele responde.
test("AM escolhe Ofertante (não verba) e a tela avisa que a verba é a ilimitada", async ({
  page,
}) => {
  await login(page, CPF_AM);
  await page.goto("/pre-cursos/novo");

  await expect(page.getByTestId("aviso-verba-ilimitada")).toBeVisible();
  await expect(page.getByTestId("select-verba")).toHaveCount(0);

  // Escopo nacional: a lista traz todo Ofertante cadastrado, então o que se
  // afirma é presença (contagem), não posição na rolagem do seletor.
  await page.getByTestId("select-ofertante").click();
  await expect(page.getByTestId(`opcao-ofertante-${cdOfertante}`)).toHaveCount(1);
  await expect(page.getByTestId(`opcao-ofertante-${cdOfertanteOutro}`)).toHaveCount(1);
});

test("AM cria pré-curso com valor acima de qualquer verba e é redirecionado para o preenchimento", async ({
  page,
}) => {
  await login(page, CPF_AM);
  await page.goto("/pre-cursos/novo");

  await page.getByTestId("select-ofertante").click();
  await page.getByTestId(`opcao-ofertante-${cdOfertanteOutro}`).click();
  await page.getByLabel("Valor alocado ao curso").fill("99999999.99");
  await page.getByRole("button", { name: "Criar pré-curso" }).click();

  await expect(page).toHaveURL(/\/pre-cursos\/\d+$/);
});
