// e2e de /avaliacoes/novo (T8), pela UI real. Cobre AVAL-01 a 05 na camada
// de tela.
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO = "60000315133";
const CPF_GO_SEM_CURSOS = "60000328898";
const CPF_AL = "60000342530";
const CPF_GT = "60000356247";
const CPF_AL_RN12 = "60000411019";

const CPFS = [CPF_GO, CPF_GO_SEM_CURSOS, CPF_AL, CPF_GT, CPF_AL_RN12];

let cdOfertante: number;
let cdOfertanteSemCursos: number;
let cdCurso: number;
let cdCursoOutroDoGo: number;

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Nova Avaliação", uf: "SP" }).cdOfertante;
  cdOfertanteSemCursos = criarOfertante({
    nome: "Ofertante Nova Avaliação Sem Cursos",
    uf: "RJ",
  }).cdOfertante;

  const verba = criarVerba({ cdOfertante, vlVerba: 1000 });

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({
    cpf: CPF_GO_SEM_CURSOS,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteSemCursos,
  });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_RN12, tipo: "AL", senha: SENHA, primeiraVez: false });

  cdCurso = criarPreCurso({
    cdOfertante,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;

  cdCursoOutroDoGo = criarPreCurso({
    cdOfertante,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  // RN-12: CPF_AL_RN12 já tem uma avaliação EM_ANDAMENTO em cdCurso.
  criarAvaliacao({ cpf: CPF_AL_RN12, cdCurso });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertante, cdOfertanteSemCursos]);
  deleteUsuarios(CPFS);
});

async function login(page: import("@playwright/test").Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test("seletor de curso mostra só os cursos do Ofertante do GO autenticado", async ({ page }) => {
  await login(page, CPF_GO);
  await page.goto("/avaliacoes/novo");

  await page.getByTestId("select-curso").click();
  await expect(page.getByTestId(`opcao-curso-${cdCurso}`)).toBeVisible();
});

test("GO matricula um Aluno existente e é redirecionado para a tela de preenchimento", async ({
  page,
}) => {
  await login(page, CPF_GO);
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
  await login(page, CPF_GO);
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
  await login(page, CPF_GO);
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
  await login(page, CPF_GO_SEM_CURSOS);
  await page.goto("/avaliacoes/novo");

  await expect(page.getByTestId("select-curso")).toHaveCount(0);
  await expect(page.getByText("Nenhum curso cadastrado")).toBeVisible();
});
