// e2e de /avaliacoes/novo (T8), pela UI real. Cobre AVAL-01 a 05 na camada
// de tela.
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";

function calcularDvCnpj(digitos: number[]): number {
  let soma = 0;
  let peso = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += digitos[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCnpjValido(indice: number): string {
  const base12 = `43${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_SEM_CURSOS = gerarCnpjValido(2);
const CPF_AL = "60000342530";
const CPF_GT = "60000356247";
const CPF_AL_RN12 = "60000411019";

const CPFS = [CNPJ_GO, CNPJ_GO_SEM_CURSOS, CPF_AL, CPF_GT, CPF_AL_RN12];

let cdCurso: number;
let cdCursoOutroDoGo: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_SEM_CURSOS]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_SEM_CURSOS]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Nova Avaliação",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_SEM_CURSOS,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Nova Avaliação Sem Cursos",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_RN12, tipo: "AL", senha: SENHA, primeiraVez: false });

  const verba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 1000 });

  cdCurso = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;

  cdCursoOutroDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  // RN-12: CPF_AL_RN12 já tem uma avaliação EM_ANDAMENTO em cdCurso.
  criarAvaliacao({ cpf: CPF_AL_RN12, cdCurso });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_SEM_CURSOS]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_SEM_CURSOS]);
  deleteUsuarios(CPFS);
});

async function login(page: import("@playwright/test").Page, documento: string) {
  const res = await page.request.post("/api/auth/login", { data: { documento, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test("seletor de curso mostra só os cursos do Ofertante do GO autenticado", async ({ page }) => {
  await login(page, CNPJ_GO);
  await page.goto("/avaliacoes/novo");

  await page.getByTestId("select-curso").click();
  await expect(page.getByTestId(`opcao-curso-${cdCurso}`)).toBeVisible();
});

test("GO matricula um Aluno existente e é redirecionado para a tela de preenchimento", async ({
  page,
}) => {
  await login(page, CNPJ_GO);
  await page.goto("/avaliacoes/novo");

  await page.getByTestId("campo-cpf-aluno").fill(CPF_AL);
  await page.getByTestId("select-curso").click();
  await page.getByTestId(`opcao-curso-${cdCurso}`).click();
  await page.getByRole("button", { name: "Matricular" }).click();

  await expect(page).toHaveURL(new RegExp(`/avaliacoes/${CPF_AL}/${cdCurso}$`));
});

test("tentativa com CPF de um usuário não-Aluno exibe a mensagem de erro do servidor, sem redirecionar", async ({
  page,
}) => {
  await login(page, CNPJ_GO);
  await page.goto("/avaliacoes/novo");

  await page.getByTestId("campo-cpf-aluno").fill(CPF_GT);
  await page.getByTestId("select-curso").click();
  await page.getByTestId(`opcao-curso-${cdCurso}`).click();
  await page.getByRole("button", { name: "Matricular" }).click();

  await expect(page.getByTestId("erro-nova-avaliacao")).toBeVisible();
  await expect(page).toHaveURL(/\/avaliacoes\/novo$/);
});

test("RN-12: tentativa de matricular um Aluno com avaliação EM_ANDAMENTO noutro curso exibe erro, sem redirecionar", async ({
  page,
}) => {
  await login(page, CNPJ_GO);
  await page.goto("/avaliacoes/novo");

  await page.getByTestId("campo-cpf-aluno").fill(CPF_AL_RN12);
  await page.getByTestId("select-curso").click();
  await page.getByTestId(`opcao-curso-${cdCursoOutroDoGo}`).click();
  await page.getByRole("button", { name: "Matricular" }).click();

  await expect(page.getByTestId("erro-nova-avaliacao")).toBeVisible();
  await expect(page).toHaveURL(/\/avaliacoes\/novo$/);
});

test("quando o GO não tem nenhum curso cadastrado, a tela mostra uma mensagem informativa", async ({
  page,
}) => {
  await login(page, CNPJ_GO_SEM_CURSOS);
  await page.goto("/avaliacoes/novo");

  await expect(page.getByTestId("select-curso")).toHaveCount(0);
  await expect(page.getByText("Nenhum curso cadastrado")).toBeVisible();
});
