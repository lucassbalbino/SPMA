// e2e de /avaliacoes (T7), pela UI real. Cobre AVAL-22 na camada de tela.
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
const CPF_GT = "60000274003";
const CPF_GO = "60000287768";
const CPF_AL = "60000301426";

const CPFS = [CPF_GT, CPF_GO, CPF_AL];

let cdOfertante: number;
let cdOfertante2: number;
let cdCursoDoGo: number;

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Listagem Avaliação", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Listagem Avaliação 2", uf: "RJ" }).cdOfertante;
  const verba = criarVerba({ cdOfertante, vlVerba: 5000 });
  const verba2 = criarVerba({ cdOfertante: cdOfertante2, vlVerba: 5000 });

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });

  cdCursoDoGo = criarPreCurso({
    cdOfertante,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarAvaliacao({ cpf: CPF_AL, cdCurso: cdCursoDoGo });

  const cdCursoDoGo2 = criarPreCurso({
    cdOfertante: cdOfertante2,
    cdVerba: verba2.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GT,
  }).cdCurso;
  criarAvaliacao({ cpf: CPF_AL, cdCurso: cdCursoDoGo2 });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("AVAL-22: GO só vê as avaliações de cursos do próprio Ofertante", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/avaliacoes");
  await expect(page).toHaveURL(/\/avaliacoes$/);

  const itens = await page.getByTestId("lista-avaliacoes").getByRole("listitem").count();
  expect(itens).toBe(1);
  await expect(page.getByText(`Avaliação #${cdCursoDoGo}`)).toBeVisible();
});

test("AVAL-22: GT vê todas as avaliações cadastradas", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GT, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/avaliacoes");

  const itens = await page.getByTestId("lista-avaliacoes").getByRole("listitem").count();
  expect(itens).toBeGreaterThanOrEqual(2);
});

test("AVAL-22: Aluno vê a(s) própria(s) avaliação(ões)", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_AL, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/avaliacoes");

  const itens = await page.getByTestId("lista-avaliacoes").getByRole("listitem").count();
  expect(itens).toBe(2);
});

test("cada item lista o status e linka para a tela de detalhe", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf: CPF_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/avaliacoes");

  await expect(
    page.getByTestId(`status-avaliacao-${CPF_AL}-${cdCursoDoGo}`),
  ).toHaveText("Em andamento");

  await expect(
    page.getByText(`Avaliação #${cdCursoDoGo}`).locator("xpath=ancestor::a"),
  ).toHaveAttribute("href", `/avaliacoes/${CPF_AL}/${cdCursoDoGo}`);
});
