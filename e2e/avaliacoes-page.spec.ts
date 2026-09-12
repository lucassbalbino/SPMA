// e2e de /avaliacoes (T7), pela UI real. Cobre AVAL-22 na camada de tela.
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
  const base12 = `42${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CPF_GT = "60000274003";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);
const CPF_AL = "60000301426";

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2, CPF_AL];

let cdCursoDoGo: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Listagem Avaliação",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Listagem Avaliação 2",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });

  const verba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 5000 });
  const verba2 = criarVerba({ cdOfertante: CNPJ_GO_2, vlVerba: 5000 });

  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarAvaliacao({ cpf: CPF_AL, cdCurso: cdCursoDoGo });

  const cdCursoDoGo2 = criarPreCurso({
    cdOfertante: CNPJ_GO_2,
    cdVerba: verba2.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GT,
  }).cdCurso;
  criarAvaliacao({ cpf: CPF_AL, cdCurso: cdCursoDoGo2 });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("AVAL-22: GO só vê as avaliações de cursos do próprio Ofertante", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO, senha: SENHA },
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
    data: { documento: CPF_GT, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/avaliacoes");

  const itens = await page.getByTestId("lista-avaliacoes").getByRole("listitem").count();
  expect(itens).toBeGreaterThanOrEqual(2);
});

test("AVAL-22: Aluno vê a(s) própria(s) avaliação(ões)", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AL, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/avaliacoes");

  const itens = await page.getByTestId("lista-avaliacoes").getByRole("listitem").count();
  expect(itens).toBe(2);
});

test("cada item lista o status e linka para a tela de detalhe", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO, senha: SENHA },
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
