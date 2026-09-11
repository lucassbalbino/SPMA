// e2e da edição posterior dos dados pessoais pelo perfil do Aluno
// (PESSOAL-16 a 20), pela UI real.
import { expect, test, type Page } from "@playwright/test";
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

const CPFS = [CPF_AL_A, CPF_AL_B, CPF_GO];

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
  avalPessoalRacaEtnia: "Negro",
  avalPessoalCondicaoPcd: "Sim, tenho deficiência auditiva.",
};

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CPF_AL_A,
    tipo: "AL",
    senha: SENHA,
    primeiraVez: false,
    dadosPessoaisCompletos: true,
  });
  criarDadosPessoais(CPF_AL_A, RESPOSTAS_A);

  upsertUsuario({
    cpf: CPF_AL_B,
    tipo: "AL",
    senha: SENHA,
    primeiraVez: false,
    dadosPessoaisCompletos: true,
  });
  criarDadosPessoais(CPF_AL_B, RESPOSTAS_B);

  // AM (não GO): não precisa de Ofertante vinculado para chegar a /painel -
  // um GO sem cdOfertante cairia no gate (não relacionado) de
  // requireOfertanteVinculado, contaminando o teste de PESSOAL-20.
  upsertUsuario({ cpf: CPF_GO, tipo: "AM", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

async function login(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
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

test("PESSOAL-20: um não-Aluno acessando /meus-dados diretamente recebe não encontrado", async ({
  page,
}) => {
  await login(page, CPF_GO);
  const res = await page.goto("/meus-dados");

  expect(res?.status()).toBe(404);
});
