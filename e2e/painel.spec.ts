// e2e de /painel (T28). Cobre REQ-AU-10: usuários de perfis diferentes veem
// conteúdo diferente no painel.
import { expect, test, type Page } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GT = "40200030094";
const CPF_AL = "40100020003";

const CPFS = [CPF_GT, CPF_AL];

async function logar(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { documento: cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false, nome: "Lucia Gestora" });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("perfis diferentes (GT vs AL) veem conteúdo diferente no painel", async ({ page, browser }) => {
  await logar(page, CPF_GT);
  await page.goto("/painel");
  const perfilGt = await page.getByTestId("painel-perfil").textContent();
  const modulosGt = await page.getByTestId("painel-modulos").textContent();

  const contextoAl = await browser.newContext();
  const pageAl = await contextoAl.newPage();
  await logar(pageAl, CPF_AL);
  await pageAl.goto("/painel");
  const perfilAl = await pageAl.getByTestId("painel-perfil").textContent();
  const modulosAl = await pageAl.getByTestId("painel-modulos").textContent();
  await contextoAl.close();

  // RU-34: o perfil aparece por extenso, não pela sigla.
  expect(perfilGt).toBe("Você está no perfil de Gestor Turismo");
  expect(perfilAl).toBe("Você está no perfil de Aluno");
  expect(modulosGt).not.toBe(modulosAl);
});

// RU-34 (doc 1): saudação, perfil por extenso e a lista do que o perfil faz.
test("RU-34: o painel do GT diz o perfil por extenso e o que ele está apto a realizar", async ({
  page,
}) => {
  await logar(page, CPF_GT);
  await page.goto("/painel");

  await expect(page.getByText("Olá, Lucia Gestora", { exact: true })).toBeVisible();
  await expect(page.getByTestId("painel-perfil")).toHaveText("Você está no perfil de Gestor Turismo");
  await expect(page.getByTestId("painel-apto")).toHaveText("Portanto, está apto a realizar:");
  await expect(page.getByTestId("painel-modulos").getByRole("listitem")).toHaveText([
    "Gestão de Usuários",
    "Gestão de Ofertante",
    "Gestão de Recursos",
    "Gestão de Formações",
    "Editar Perfil",
  ]);
});
