// e2e de /cadastro-ofertante (T27), pela UI real. Cobre CA-AU-07: GO sem
// Ofertante é barrado, cadastra, e passa a acessar o restante do sistema.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getOfertante, getUsuario, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO_SEM_OFERTANTE = "40080090001";
const NOME_OFERTANTE = "Ofertante via UI";

test.beforeAll(() => {
  deleteUsuarios([CPF_GO_SEM_OFERTANTE]);
  upsertUsuario({
    cpf: CPF_GO_SEM_OFERTANTE,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: null,
  });
});

test.afterAll(() => {
  deleteUsuarios([CPF_GO_SEM_OFERTANTE]);
});

test("CA-AU-07: GO sem Ofertante é barrado, cadastra pela UI e passa a acessar o restante do sistema", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO_SEM_OFERTANTE, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  // Barrado: qualquer outra rota protegida redireciona para cá (já provado
  // em e2e/protegido-layout.spec.ts para o guard em si); aqui confirmamos
  // que a própria página de cadastro está acessível para o GO pendente.
  await page.goto("/cadastro-ofertante");
  await expect(page).toHaveURL(/\/cadastro-ofertante$/);
  expect(getUsuario(CPF_GO_SEM_OFERTANTE)?.cdOfertante).toBeNull();

  await page.getByLabel("Nome").fill(NOME_OFERTANTE);
  await page.getByLabel("UF").fill("SP");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/ofertantes")),
    page.getByRole("button", { name: "Cadastrar" }).click(),
  ]);
  expect(resposta.ok()).toBe(true);

  const usuario = getUsuario(CPF_GO_SEM_OFERTANTE);
  expect(usuario?.cdOfertante).not.toBeNull();
  expect(getOfertante(usuario!.cdOfertante!)?.nome).toBe(NOME_OFERTANTE);

  // Liberado: o guard de ofertante não barra mais - /painel deixa de
  // redirecionar para /cadastro-ofertante.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel$/);
});
