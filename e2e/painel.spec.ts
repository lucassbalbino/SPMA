// e2e de /painel (T28). Cobre REQ-AU-10: usuários de perfis diferentes veem
// conteúdo diferente no painel.
import { expect, test, type Page } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GT = "40200030094";
const CPF_AL = "40100020003";

const CPFS = [CPF_GT, CPF_AL];

async function logar(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
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

  expect(perfilGt).toContain("GT");
  expect(perfilAl).toContain("AL");
  expect(perfilGt).not.toBe(perfilAl);
  expect(modulosGt).not.toBe(modulosAl);
});
