// e2e de /pos-cursos/novo (T8), pela UI real. Cobre REQ-PO-01/02/03 na
// camada de tela.
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("37");

const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_SEM_ELEGIVEIS = gerarCnpjValido(2);
const CNPJ_GO_TERCEIRO = gerarCnpjValido(3);
const CPF_AM = "51105006140";
const CPF_GT = "51108009107";

const CPFS = [CNPJ_GO, CNPJ_GO_SEM_ELEGIVEIS, CNPJ_GO_TERCEIRO, CPF_AM, CPF_GT];

let cdCursoElegivel: number;
let cdCursoComPosCurso: number;
let cdCursoElegivelOutroOfertante: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_SEM_ELEGIVEIS, CNPJ_GO_TERCEIRO]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_SEM_ELEGIVEIS, CNPJ_GO_TERCEIRO]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Novo Pós-Curso",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_SEM_ELEGIVEIS,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Novo Pós-Curso Sem Elegíveis",
    uf: "RJ",
  });
  upsertUsuario({
    cpf: CNPJ_GO_TERCEIRO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Novo Pós-Curso Terceiro",
    uf: "MG",
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });

  const verba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 1000 });
  const verbaSemElegiveis = criarVerba({ cdOfertante: CNPJ_GO_SEM_ELEGIVEIS, vlVerba: 1000 });
  const verbaTerceiro = criarVerba({ cdOfertante: CNPJ_GO_TERCEIRO, vlVerba: 1000 });

  cdCursoElegivel = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;

  cdCursoComPosCurso = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoComPosCurso, criadoPor: CNPJ_GO });

  const cdCursoDoOutro = criarPreCurso({
    cdOfertante: CNPJ_GO_SEM_ELEGIVEIS,
    cdVerba: verbaSemElegiveis.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_SEM_ELEGIVEIS,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoDoOutro, criadoPor: CNPJ_GO_SEM_ELEGIVEIS });

  cdCursoElegivelOutroOfertante = criarPreCurso({
    cdOfertante: CNPJ_GO_TERCEIRO,
    cdVerba: verbaTerceiro.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_SEM_ELEGIVEIS, CNPJ_GO_TERCEIRO]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_SEM_ELEGIVEIS, CNPJ_GO_TERCEIRO]);
  deleteUsuarios(CPFS);
});

async function login(page: import("@playwright/test").Page, documento: string) {
  const login = await page.request.post("/api/auth/login", { data: { documento, senha: SENHA } });
  expect(login.ok()).toBe(true);
}

test("seletor de pré-curso mostra só os elegíveis do Ofertante do GO autenticado", async ({
  page,
}) => {
  await login(page, CNPJ_GO);
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
  await login(page, CNPJ_GO);
  await page.goto("/pos-cursos/novo");

  await page.getByTestId("select-pre-curso").click();
  await page.getByTestId(`opcao-pre-curso-${cdCursoElegivel}`).click();
  await page.getByRole("button", { name: "Criar pós-curso" }).click();

  await expect(page).toHaveURL(new RegExp(`/pos-cursos/${cdCursoElegivel}$`));
});

test("quando não há nenhum pré-curso elegível, a tela mostra uma mensagem informativa", async ({
  page,
}) => {
  await login(page, CNPJ_GO_SEM_ELEGIVEIS);
  await page.goto("/pos-cursos/novo");

  await expect(page.getByTestId("select-pre-curso")).toHaveCount(0);
  await expect(page.getByText("Nenhum pré-curso disponível")).toBeVisible();
});

test("GT não pode criar pós-curso: a tela mostra a mensagem de acesso negado, sem seletor", async ({
  page,
}) => {
  await login(page, CPF_GT);
  await page.goto("/pos-cursos/novo");

  await expect(page.getByTestId("select-pre-curso")).toHaveCount(0);
  await expect(page.getByText("Seu perfil não pode criar pós-cursos.")).toBeVisible();
});
