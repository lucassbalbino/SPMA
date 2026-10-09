// e2e de /pre-cursos (T8), pela UI real. Cobre REQ-PC-14 na camada de tela.
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("30");

const CPF_GT = "51910001104";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2];

let cdCursoDoGo: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Listagem Pré-Curso",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Listagem Pré-Curso 2",
    uf: "RJ",
  });

  const verba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 5000 });
  const verba2 = criarVerba({ cdOfertante: CNPJ_GO_2, vlVerba: 5000 });

  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPreCurso({
    cdOfertante: CNPJ_GO_2,
    cdVerba: verba2.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GT,
  });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("REQ-PC-14: GO só vê os pré-cursos do próprio Ofertante", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pre-cursos");
  await expect(page).toHaveURL(/\/pre-cursos$/);

  const itens = await page.getByTestId("lista-pre-cursos").getByRole("listitem").count();
  expect(itens).toBe(1);
  await expect(page.getByText(`Pré-curso #${cdCursoDoGo}`)).toBeVisible();

  // A listagem não tem mais atalho de criação: criar curso é só "Novo curso"
  // na navbar (/pre-cursos/novo). O GO é quem via o botão, então é aqui que a
  // ausência prova algo.
  await expect(page.getByText("Novo pré-curso")).toHaveCount(0);
});

test("REQ-PC-14: GT vê todos os pré-cursos cadastrados", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_GT, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pre-cursos");

  const itens = await page.getByTestId("lista-pre-cursos").getByRole("listitem").count();
  expect(itens).toBeGreaterThanOrEqual(2);
});

test("cada item lista o status e linka para a tela de detalhe", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pre-cursos");

  await expect(page.getByTestId(`status-pre-curso-${cdCursoDoGo}`)).toHaveText("Em andamento");

  // A tela de detalhe em si (T10) ainda não existe nesta tarefa - checa só
  // que o link aponta para a URL correta, sem navegar (evita depender de
  // uma rota que só a próxima tarefa cria).
  await expect(
    page.getByText(`Pré-curso #${cdCursoDoGo}`).locator("xpath=ancestor::a"),
  ).toHaveAttribute("href", `/pre-cursos/${cdCursoDoGo}`);
});
