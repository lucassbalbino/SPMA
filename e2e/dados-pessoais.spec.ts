// e2e da coleta obrigatória de dados pessoais no primeiro acesso (PESSOAL-01
// a 06, PESSOAL-27), pela UI real.
import { expect, test, type Page } from "@playwright/test";
import { deleteUsuarios, getDadosPessoais, getUsuario, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";

// Aluno recém-criado, ainda sem os 7 dados pessoais - o cenário que o gate
// obrigatório precisa barrar.
const CPF_AL_NOVO = "70010020039";
// Aluno que já respondeu - o cenário em que a tela principal precisa se
// comportar normalmente, sem o questionário (PESSOAL-27).
const CPF_AL_COMPLETO = "70020030037";
// Não-Aluno - confirma que o gate não altera a navegação de nenhum outro
// perfil (PESSOAL-04), mesmo nunca tendo a flag marcada. AM, não GO: GO sem
// `cdOfertante` cai no gate (não relacionado) de `requireOfertanteVinculado`,
// que provaria o teste errado.
const CPF_AM = "70030040035";

const CPFS = [CPF_AL_NOVO, CPF_AL_COMPLETO, CPF_AM];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({
    cpf: CPF_AL_NOVO,
    tipo: "AL",
    senha: SENHA,
    primeiraVez: false,
    dadosPessoaisCompletos: false,
  });
  upsertUsuario({
    cpf: CPF_AL_COMPLETO,
    tipo: "AL",
    senha: SENHA,
    primeiraVez: false,
    dadosPessoaisCompletos: true,
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

async function login(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

function textoExato(texto: string): RegExp {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

// Mesmo helper de `avaliacoes-formulario.spec.ts`: abre o Select pelo testid
// do gatilho e clica na opção pelo prefixo `campo-<chave>-opcao-`, casando o
// texto exato (evita colisão com rótulos parecidos).
async function selecionar(page: Page, testIdTrigger: string, rotulo: string) {
  await page.getByTestId(testIdTrigger).click();
  const prefixoOpcao = testIdTrigger.replace(/-select$/, "-opcao-");
  await page
    .locator(`[data-testid^="${prefixoOpcao}"]`)
    .filter({ hasText: textoExato(rotulo) })
    .click();
}

// Mesmo helper de `avaliacoes-formulario.spec.ts`: marca a opção pelo
// próprio testid (`campo-<chave>-opcao-<indice>`), não pelo rótulo.
async function marcarOpcao(page: Page, chave: string, indice: number) {
  const item = page.getByTestId(`campo-${chave}-opcao-${indice}`);
  await item.click();
  await expect(item).toBeChecked();
}

async function preencherOs7(page: Page) {
  await selecionar(page, "campo-avalPessoalEstado-select", "AM");
  await page.getByTestId("campo-avalPessoalMunicipio").fill("Manaus, AM");
  await marcarOpcao(page, "avalPessoalGenero", 0); // Feminino
  await marcarOpcao(page, "avalPessoalFaixaEtaria", 2); // 26 a 35 anos
  await selecionar(page, "campo-avalPessoalEscolaridade-select", "Ensino médio completo");
  await marcarOpcao(page, "avalPessoalRacaEtnia", 2); // Pardo
  await marcarOpcao(page, "avalPessoalCondicaoPcd", 0); // Não sou uma Pessoa com Deficiência.
}

test("PESSOAL-01/02: Aluno novo é redirecionado para /dados-pessoais ao tentar abrir /painel, e vê as 7 perguntas", async ({
  page,
}) => {
  await login(page, CPF_AL_NOVO);
  await page.goto("/painel");

  await expect(page).toHaveURL(/\/dados-pessoais$/);
  await expect(page.getByTestId("form-dados-pessoais")).toBeVisible();
  await expect(page.getByTestId("campo-avalPessoalCondicaoPcd-grupo")).toBeVisible();
});

test("PESSOAL-05: envio com 1 dos 7 campos faltando é rejeitado, nada é persistido e a navegação segue bloqueada", async ({
  page,
}) => {
  await login(page, CPF_AL_NOVO);
  await page.goto("/dados-pessoais");

  // Preenche 6 dos 7 - falta avalPessoalCondicaoPcd.
  await selecionar(page, "campo-avalPessoalEstado-select", "AM");
  await page.getByTestId("campo-avalPessoalMunicipio").fill("Manaus, AM");
  await marcarOpcao(page, "avalPessoalGenero", 0);
  await marcarOpcao(page, "avalPessoalFaixaEtaria", 2);
  await selecionar(page, "campo-avalPessoalEscolaridade-select", "Ensino médio completo");
  await marcarOpcao(page, "avalPessoalRacaEtnia", 2);

  await page.getByTestId("botao-salvar-dados-pessoais").click();

  await expect(page.getByTestId("erro-dados-pessoais")).toBeVisible();
  await expect(page).toHaveURL(/\/dados-pessoais$/);
  expect(getUsuario(CPF_AL_NOVO)?.dadosPessoaisCompletos).toBe(false);
  expect(getDadosPessoais(CPF_AL_NOVO)).toBeNull();
});

test("PESSOAL-01/03/06: Aluno novo preenche as 7 perguntas, é levado a /painel e a navegação libera", async ({
  page,
}) => {
  await login(page, CPF_AL_NOVO);
  await page.goto("/dados-pessoais");

  await preencherOs7(page);
  await page.getByTestId("botao-salvar-dados-pessoais").click();

  await expect(page).toHaveURL(/\/painel$/);
  expect(getUsuario(CPF_AL_NOVO)?.dadosPessoaisCompletos).toBe(true);
  expect(getDadosPessoais(CPF_AL_NOVO)).toEqual({
    avalPessoalEstado: "AM",
    avalPessoalMunicipio: "Manaus, AM",
    avalPessoalGenero: "Feminino",
    avalPessoalFaixaEtaria: "26 a 35 anos",
    avalPessoalEscolaridade: "Ensino médio completo",
    avalPessoalRacaEtnia: "Pardo",
    avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
  });

  // A navegação libera de verdade: revisitar /painel não mostra o
  // questionário de novo (PESSOAL-03/27).
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("form-dados-pessoais")).toHaveCount(0);
});

test("PESSOAL-27: Aluno que já respondeu acessa a tela principal normalmente, sem o questionário", async ({
  page,
}) => {
  await login(page, CPF_AL_COMPLETO);
  await page.goto("/painel");

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("painel-perfil")).toBeVisible();
  await expect(page.getByTestId("form-dados-pessoais")).toHaveCount(0);
});

test("PESSOAL-04: um não-Aluno nunca é redirecionado para /dados-pessoais", async ({ page }) => {
  await login(page, CPF_AM);
  await page.goto("/painel");

  await expect(page).toHaveURL(/\/painel$/);
});
