// e2e de src/app/(protegido)/layout.tsx (T25). Cobre a ordem exata do guard
// chain wired no layout: requireSession() -> requirePrimeiroAcessoConcluido()
// -> requireOfertanteVinculado(). /painel (stub de T25, conteúdo real em
// T28) é usado como "outra rota protegida" alcançável neste ponto da
// feature - ver SPEC_DEVIATION em layout.tsx sobre por que /primeiro-acesso
// e /cadastro-ofertante não podem ser os alvos guardados por este mesmo
// layout.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";

const CPF_PRIMEIRA_VEZ = "40050060007";
const CPF_GO_SEM_OFERTANTE = "40060070005";

const CPFS = [CPF_PRIMEIRA_VEZ, CPF_GO_SEM_OFERTANTE];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_PRIMEIRA_VEZ, tipo: "AL", senha: null, primeiraVez: true });
  upsertUsuario({
    cpf: CPF_GO_SEM_OFERTANTE,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: null,
  });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("sem sessão, visitar uma rota protegida redireciona para /login", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login$/);
});

test("primeiraVez=true redireciona para /primeiro-acesso mesmo acessando outra rota protegida diretamente", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_PRIMEIRA_VEZ, senha: "qualquer" },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/painel");
  await expect(page).toHaveURL(/\/primeiro-acesso$/);
});

test("primeiraVez=false mas GO sem cdOfertante redireciona para /cadastro-ofertante", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO_SEM_OFERTANTE, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/painel");
  await expect(page).toHaveURL(/\/cadastro-ofertante$/);
});
