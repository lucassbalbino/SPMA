// e2e de /login (T24), pela UI real (não a API diretamente). Cobre
// CA-AU-01, CA-AU-03 e CA-AU-04.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";
const SENHA_ERRADA = "SenhaErrada123";

const CPF_COM_SENHA = "40010020004";
const CPF_SENHA_ERRADA = "40020030002";

// Válido por módulo 11, mas sem conta no banco (CA-AU-04).
const CPF_INEXISTENTE = "70780890906";
// Dígito verificador inválido (CA-AU-03).
const CPF_INVALIDO = "12345678901";

const CPFS = [CPF_COM_SENHA, CPF_SENHA_ERRADA];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_COM_SENHA, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_SENHA_ERRADA, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

// O anúncio de rota do próprio Next.js (`__next-route-announcer__`) também
// usa role="alert", então o erro do formulário é localizado pelo seu
// data-slot (ver src/components/ui/field.tsx `FieldError`), não pela role.
const erroDoFormulario = (page: import("@playwright/test").Page) =>
  page.locator('[data-slot="field-error"]');

test("CA-AU-01: CPF e senha corretos autenticam pela UI e emitem cookie de sessão protegido", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("CPF").fill(CPF_COM_SENHA);
  await page.getByLabel("Senha").fill(SENHA);

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login")),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);

  expect(resposta.ok()).toBe(true);
  await expect(erroDoFormulario(page)).toHaveCount(0);

  const cookies = await page.context().cookies();
  const cookieSessao = cookies.find((c) => c.name === "spma_sessao");
  expect(cookieSessao).toBeDefined();
  expect(cookieSessao?.httpOnly).toBe(true);
  expect(cookieSessao?.secure).toBe(true);
  expect(cookieSessao?.sameSite).toBe("Lax");
});

test("CA-AU-03: CPF com dígito verificador inválido é rejeitado na UI sem sair do login", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("CPF").fill(CPF_INVALIDO);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(erroDoFormulario(page)).toHaveText("CPF inválido");
  expect(new URL(page.url()).pathname).toBe("/login");

  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "spma_sessao")).toBeUndefined();
});

test("CA-AU-04: CPF inexistente e senha errada mostram a mesma mensagem genérica na UI", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("CPF").fill(CPF_INEXISTENTE);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(erroDoFormulario(page)).toBeVisible();
  const mensagemInexistente = await erroDoFormulario(page).textContent();

  await page.goto("/login");
  await page.getByLabel("CPF").fill(CPF_SENHA_ERRADA);
  await page.getByLabel("Senha").fill(SENHA_ERRADA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(erroDoFormulario(page)).toBeVisible();
  const mensagemSenhaErrada = await erroDoFormulario(page).textContent();

  expect(mensagemInexistente).toBe("CPF ou senha inválidos");
  expect(mensagemSenhaErrada).toBe(mensagemInexistente);
  expect(new URL(page.url()).pathname).toBe("/login");

  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "spma_sessao")).toBeUndefined();
});
