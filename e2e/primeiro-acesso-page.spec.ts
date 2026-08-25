// e2e de /primeiro-acesso (T26), pela UI real. Cobre CA-AU-02: usuário em
// 1º acesso define a senha pelo formulário e fica liberado para o resto do
// sistema (aqui verificado via /painel, que só existe como stub até T28,
// mas já basta para provar que o guard de primeiro acesso deixou de barrar).
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";

const NOVA_SENHA = "NovaSenhaValida123";

const CPF_PRIMEIRO_ACESSO = "40070080003";

test.beforeAll(() => {
  deleteUsuarios([CPF_PRIMEIRO_ACESSO]);
  upsertUsuario({ cpf: CPF_PRIMEIRO_ACESSO, tipo: "AL", senha: null, primeiraVez: true });
});

test.afterAll(() => {
  deleteUsuarios([CPF_PRIMEIRO_ACESSO]);
});

test("CA-AU-02: usuário em 1º acesso define a senha pela UI e é liberado para o restante do sistema", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_PRIMEIRO_ACESSO, senha: "irrelevante" },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/primeiro-acesso");
  await expect(page).toHaveURL(/\/primeiro-acesso$/);

  await page.getByLabel("Nova senha").fill(NOVA_SENHA);
  await page.getByLabel("Confirme a senha").fill(NOVA_SENHA);

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/primeiro-acesso")),
    page.getByRole("button", { name: "Salvar senha" }).click(),
  ]);
  expect(resposta.ok()).toBe(true);

  const usuario = getUsuario(CPF_PRIMEIRO_ACESSO);
  expect(usuario?.primeiraVez).toBe(false);
  expect(usuario?.senhaHash).not.toBeNull();

  // Liberado: o guard de primeiro acesso não barra mais - /painel deixa de
  // redirecionar para /primeiro-acesso.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel$/);
});
