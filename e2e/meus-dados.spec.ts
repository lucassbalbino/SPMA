// e2e da edição posterior dos dados pessoais pelo perfil do Aluno
// (PESSOAL-16 a 20), pela UI real.
import { expect, test, type Page } from "@playwright/test";
import { geradorDeCnpj } from "./helpers/cnpj";
import {
  criarDadosPessoais,
  deleteUsuarios,
  getDadosPessoais,
  getUsuario,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";

const CPF_AL_A = "70050060031";
const CPF_AL_B = "70060070030";
const CPF_GO = "70070080038";
// Editar Perfil dos outros perfis (RU-47 a RU-53).
const CPF_GT_PERFIL = "62730405402";
const CNPJ_GO_PERFIL = geradorDeCnpj("62")(2);

const CPFS = [CPF_AL_A, CPF_AL_B, CPF_GO, CPF_GT_PERFIL, CNPJ_GO_PERFIL];

const RESPOSTAS_A = {
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "São Paulo, SP",
  avalPessoalGenero: "Masculino",
  avalPessoalFaixaEtaria: "36 a 50 anos",
  avalPessoalEscolaridade: "Ensino superior completo",
  avalPessoalRacaEtnia: "Branco",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
};

const RESPOSTAS_B = {
  avalPessoalEstado: "BA",
  avalPessoalMunicipio: "Salvador, BA",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "19 a 25 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Preto",
  avalPessoalCondicaoPcd: "Sim.",
};

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CPF_AL_A,
    tipo: "AL",
    // AD-050: o e-mail entra na completude dos dados pessoais.
    email: "aluno-a@exemplo.dev",
    senha: SENHA,
    primeiraVez: false,
    dadosPessoaisCompletos: true,
  });
  criarDadosPessoais(CPF_AL_A, RESPOSTAS_A);

  upsertUsuario({
    cpf: CPF_AL_B,
    tipo: "AL",
    // AD-050: o e-mail entra na completude dos dados pessoais.
    email: "aluno-b@exemplo.dev",
    senha: SENHA,
    primeiraVez: false,
    dadosPessoaisCompletos: true,
  });
  criarDadosPessoais(CPF_AL_B, RESPOSTAS_B);

  // AM (não GO): não passa pelo onboarding organizacional para chegar a
  // /painel - um GO pendente cairia no gate (não relacionado) de
  // requireDadosOrganizacionaisCompletos, contaminando o teste de PESSOAL-20.
  upsertUsuario({ cpf: CPF_GO, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CPF_GT_PERFIL,
    tipo: "GT",
    senha: SENHA,
    primeiraVez: false,
    nome: "GT Editar Perfil",
    email: "gt.perfil@exemplo.dev",
  });
  upsertUsuario({
    cpf: CNPJ_GO_PERFIL,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    dadosOrganizacionaisCompletos: true,
    nome: "GO Editar Perfil",
    email: "go.perfil@exemplo.dev",
    telefone: "6133334444",
  });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

async function login(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { documento: cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test("PESSOAL-16: Aluno abre /meus-dados e vê as 7 respostas atuais, editáveis", async ({
  page,
}) => {
  await login(page, CPF_AL_A);
  await page.goto("/meus-dados");

  await expect(page.getByTestId("form-dados-pessoais")).toBeVisible();
  await expect(page.getByTestId("campo-avalPessoalMunicipio")).toHaveValue(
    RESPOSTAS_A.avalPessoalMunicipio,
  );
  await expect(page.getByTestId("campo-avalPessoalEstado-select")).toContainText("SP");
  await expect(page.getByTestId("campo-avalPessoalGenero-opcao-1")).toBeChecked(); // Masculino
});

test("PESSOAL-17: alterar 1 campo persiste só ele, mantendo os outros 6", async ({ page }) => {
  await login(page, CPF_AL_A);
  await page.goto("/meus-dados");

  await page.getByTestId("campo-avalPessoalMunicipio").fill("Campinas, SP");
  await page.getByTestId("botao-salvar-dados-pessoais").click();

  await expect(page.getByTestId("sucesso-dados-pessoais")).toBeVisible();
  expect(getDadosPessoais(CPF_AL_A)).toEqual({
    ...RESPOSTAS_A,
    avalPessoalMunicipio: "Campinas, SP",
  });
  expect(getUsuario(CPF_AL_A)?.dadosPessoaisCompletos).toBe(true);
});

test("PESSOAL-18: valor vazio é rejeitado, cadastro permanece completo e inalterado", async ({
  page,
}) => {
  const antes = getDadosPessoais(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto("/meus-dados");

  await page.getByTestId("campo-avalPessoalMunicipio").fill("");
  await page.getByTestId("botao-salvar-dados-pessoais").click();

  await expect(page.getByTestId("erro-dados-pessoais")).toBeVisible();
  expect(getUsuario(CPF_AL_A)?.dadosPessoaisCompletos).toBe(true);
  expect(getDadosPessoais(CPF_AL_A)).toEqual(antes);
});

// PESSOAL-19: a rota nunca recebe CPF (opera só sobre o da própria sessão) -
// a prova é que editar como A nunca toca o dado de B.
test("PESSOAL-19: a edição de um Aluno nunca afeta o dado pessoal de outro", async ({ page }) => {
  await login(page, CPF_AL_A);
  await page.goto("/meus-dados");
  await page.getByTestId("campo-avalPessoalMunicipio").fill("Santos, SP");
  await page.getByTestId("botao-salvar-dados-pessoais").click();
  await expect(page.getByTestId("sucesso-dados-pessoais")).toBeVisible();

  expect(getDadosPessoais(CPF_AL_B)).toEqual(RESPOSTAS_B);
});

// RU-47/RU-48 (comentário 2) substituem o PESSOAL-20: o não-Aluno deixou de
// receber 404 e passou a ter o próprio Editar Perfil.
test("RU-48/RU-53: o AM abre /meus-dados e vê o Editar Perfil, sem o aviso de senha", async ({
  page,
}) => {
  await login(page, CPF_GO);
  const res = await page.goto("/meus-dados");

  expect(res?.status()).toBe(200);
  await expect(page.getByTestId("form-perfil")).toBeVisible();
  await expect(page.getByTestId("form-dados-pessoais")).toHaveCount(0);
  await expect(page.getByTestId("aviso-senha")).toHaveCount(0);
});

// RU-52 (comentário 2): o Aluno informa o telefone pelos próprios dados,
// opcional, com a mesma regra de DDD do resto do sistema.
test("RU-52: Aluno grava o telefone com DDD; sem DDD é recusado; vazio apaga", async ({ page }) => {
  await login(page, CPF_AL_A);
  await page.goto("/meus-dados");
  const campo = page.getByTestId("campo-telefone");
  const salvar = page.getByTestId("botao-salvar-dados-pessoais");

  await campo.fill("61999281374");
  await expect(campo).toHaveValue("(61) 99928-1374");
  await salvar.click();
  await expect(page.getByTestId("sucesso-dados-pessoais")).toBeVisible();
  expect(getUsuario(CPF_AL_A)?.telefone).toBe("61999281374");

  await campo.fill("99928-1374");
  await salvar.click();
  await expect(page.getByTestId("erro-dados-pessoais")).toHaveText(
    "Informe o telefone com DDD, ex.: (61) 99999-9999",
  );
  expect(getUsuario(CPF_AL_A)?.telefone).toBe("61999281374");

  await campo.fill("");
  await salvar.click();
  await expect(page.getByTestId("sucesso-dados-pessoais")).toBeVisible();
  expect(getUsuario(CPF_AL_A)?.telefone).toBeNull();
});

test("RU-48: o GT edita nome, e-mail e telefone e vê os valores novos ao recarregar", async ({ page }) => {
  await login(page, CPF_GT_PERFIL);
  await page.goto("/meus-dados");

  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("GT Editar Perfil");
  await page.getByLabel("Nome", { exact: true }).fill("GT Perfil Novo");
  await page.getByLabel("E-mail").fill("gt.novo@exemplo.dev");
  await page.getByLabel("Telefone/WhatsApp (com DDD)").fill("61999281374");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByTestId("salvo-perfil")).toHaveText("Perfil salvo.");

  await page.reload();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("GT Perfil Novo");
  await expect(page.getByLabel("E-mail")).toHaveValue("gt.novo@exemplo.dev");
  await expect(page.getByLabel("Telefone/WhatsApp (com DDD)")).toHaveValue("(61) 99928-1374");
  expect(getUsuario(CPF_GT_PERFIL)?.telefone).toBe("61999281374");
});

test("RU-53: GO e Aluno veem que a troca de senha é pedida ao gestor", async ({ page }) => {
  const aviso = "A troca de senha deve ser pedida ao gestor do seu curso.";

  await login(page, CNPJ_GO_PERFIL);
  await page.goto("/meus-dados");
  await expect(page.getByTestId("form-perfil")).toBeVisible();
  await expect(page.getByTestId("aviso-senha")).toHaveText(aviso);

  await login(page, CPF_AL_B);
  await page.goto("/meus-dados");
  await expect(page.getByTestId("form-dados-pessoais")).toBeVisible();
  await expect(page.getByTestId("aviso-senha")).toHaveText(aviso);
});
