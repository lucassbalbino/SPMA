// e2e de /pos-cursos/novo (T8), pela UI real. Cobre REQ-PO-01/02/03 na
// camada de tela.
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO = "52261006128";
const CPF_GO_SEM_ELEGIVEIS = "52271006244";
const CPF_AM = "51105006140";

let cdOfertante: number;
let cdOfertanteSemElegiveis: number;
let cdOfertanteTerceiro: number;
let cdCursoElegivel: number;
let cdCursoComPosCurso: number;
let cdCursoElegivelOutroOfertante: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO, CPF_GO_SEM_ELEGIVEIS, CPF_AM]);

  cdOfertante = criarOfertante({ nome: "Ofertante Novo Pós-Curso", uf: "SP" }).cdOfertante;
  cdOfertanteSemElegiveis = criarOfertante({
    nome: "Ofertante Novo Pós-Curso Sem Elegíveis",
    uf: "RJ",
  }).cdOfertante;
  cdOfertanteTerceiro = criarOfertante({
    nome: "Ofertante Novo Pós-Curso Terceiro",
    uf: "MG",
  }).cdOfertante;

  const verba = criarVerba({ cdOfertante, vlVerba: 1000 });
  const verbaSemElegiveis = criarVerba({ cdOfertante: cdOfertanteSemElegiveis, vlVerba: 1000 });
  const verbaTerceiro = criarVerba({ cdOfertante: cdOfertanteTerceiro, vlVerba: 1000 });

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({
    cpf: CPF_GO_SEM_ELEGIVEIS,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteSemElegiveis,
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });

  cdCursoElegivel = criarPreCurso({
    cdOfertante,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;

  cdCursoComPosCurso = criarPreCurso({
    cdOfertante,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoComPosCurso, criadoPor: CPF_GO });

  const cdCursoDoOutro = criarPreCurso({
    cdOfertante: cdOfertanteSemElegiveis,
    cdVerba: verbaSemElegiveis.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_SEM_ELEGIVEIS,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoDoOutro, criadoPor: CPF_GO_SEM_ELEGIVEIS });

  cdCursoElegivelOutroOfertante = criarPreCurso({
    cdOfertante: cdOfertanteTerceiro,
    cdVerba: verbaTerceiro.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertanteSemElegiveis, cdOfertanteTerceiro]);
  deleteUsuarios([CPF_GO, CPF_GO_SEM_ELEGIVEIS, CPF_AM]);
});

async function login(page: import("@playwright/test").Page, cpf: string) {
  const login = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(login.ok()).toBe(true);
}

test("seletor de pré-curso mostra só os elegíveis do Ofertante do GO autenticado", async ({
  page,
}) => {
  await login(page, CPF_GO);
  await page.goto("/pos-cursos/novo");

  await page.getByTestId("select-pre-curso").click();
  await expect(page.getByTestId(`opcao-pre-curso-${cdCursoElegivel}`)).toBeVisible();
  await expect(page.getByTestId(`opcao-pre-curso-${cdCursoComPosCurso}`)).toHaveCount(0);
});

test("AD-040: seletor de pré-curso do AM mostra elegíveis de TODOS os Ofertantes", async ({
  page,
}) => {
  await login(page, CPF_AM);
  await page.goto("/pos-cursos/novo");

  await page.getByTestId("select-pre-curso").click();
  await expect(page.getByTestId(`opcao-pre-curso-${cdCursoElegivel}`)).toBeVisible();
  await expect(page.getByTestId(`opcao-pre-curso-${cdCursoElegivelOutroOfertante}`)).toBeVisible();
  await expect(page.getByTestId(`opcao-pre-curso-${cdCursoComPosCurso}`)).toHaveCount(0);
});

test("GO cria pós-curso escolhendo um pré-curso elegível e é redirecionado para a tela de preenchimento", async ({
  page,
}) => {
  await login(page, CPF_GO);
  await page.goto("/pos-cursos/novo");

  await page.getByTestId("select-pre-curso").click();
  await page.getByTestId(`opcao-pre-curso-${cdCursoElegivel}`).click();
  await page.getByRole("button", { name: "Criar pós-curso" }).click();

  await expect(page).toHaveURL(new RegExp(`/pos-cursos/${cdCursoElegivel}$`));
});

test("quando não há nenhum pré-curso elegível, a tela mostra uma mensagem informativa", async ({
  page,
}) => {
  await login(page, CPF_GO_SEM_ELEGIVEIS);
  await page.goto("/pos-cursos/novo");

  await expect(page.getByTestId("select-pre-curso")).toHaveCount(0);
  await expect(page.getByText("Nenhum pré-curso disponível")).toBeVisible();
});
