// e2e de /pre-cursos (T8), pela UI real. Cobre REQ-PC-14 na camada de tela.
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GT = "51910001104";
const CPF_GO = "52011002109";

const CPFS = [CPF_GT, CPF_GO];

let cdOfertante: number;
let cdOfertante2: number;
let cdCursoDoGo: number;

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Listagem Pré-Curso", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Listagem Pré-Curso 2", uf: "RJ" }).cdOfertante;
  const verba = criarVerba({ cdOfertante, vlVerba: 5000 });
  const verba2 = criarVerba({ cdOfertante: cdOfertante2, vlVerba: 5000 });

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });

  cdCursoDoGo = criarPreCurso({
    cdOfertante,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarPreCurso({
    cdOfertante: cdOfertante2,
    cdVerba: verba2.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GT,
  });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("REQ-PC-14: GO só vê os pré-cursos do próprio Ofertante", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pre-cursos");
  await expect(page).toHaveURL(/\/pre-cursos$/);

  const itens = await page.getByTestId("lista-pre-cursos").getByRole("listitem").count();
  expect(itens).toBe(1);
  await expect(page.getByText(`Pré-curso #${cdCursoDoGo}`)).toBeVisible();
});

test("REQ-PC-14: GT vê todos os pré-cursos cadastrados", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GT, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pre-cursos");

  const itens = await page.getByTestId("lista-pre-cursos").getByRole("listitem").count();
  expect(itens).toBeGreaterThanOrEqual(2);
});

test("cada item lista o status e linka para a tela de detalhe", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO, senha: SENHA },
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
