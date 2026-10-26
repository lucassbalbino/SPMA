// e2e do nome e e-mail declarados depois do 1º login (AD-050), pela UI real.
// Que perfis caem na tela é coberto em `src/lib/auth/guards.test.ts`; aqui só
// o caminho inteiro de um deles.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";

// GT recém-criado: só o AM nasce com nome e e-mail.
const CPF_GT_SEM_NOME = "71801002002";

test.beforeAll(() => {
  deleteUsuarios([CPF_GT_SEM_NOME]);
  upsertUsuario({ cpf: CPF_GT_SEM_NOME, nome: null, tipo: "GT", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios([CPF_GT_SEM_NOME]);
});

test("AD-050: GT sem nome é levado a /dados-cadastrais, informa nome e e-mail e a navegação libera", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_GT_SEM_NOME, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/painel");
  await expect(page).toHaveURL(/\/dados-cadastrais$/);

  await page.getByLabel("Nome completo").fill("Gestora Turismo Nova");
  await page.getByLabel("E-mail").fill("gestora.nova@exemplo.dev");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  expect(getUsuario(CPF_GT_SEM_NOME)).toMatchObject({
    nome: "Gestora Turismo Nova",
    email: "gestora.nova@exemplo.dev",
  });

  // Uma segunda vez a tela não reabre: o nome já está gravado.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel$/);
});
