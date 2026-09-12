// e2e de /pos-cursos (T7), pela UI real. Cobre REQ-PO-12 na camada de tela.
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
  const base12 = `36${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CPF_GT = "52241005932";
const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_2 = gerarCnpjValido(2);

const CPFS = [CPF_GT, CNPJ_GO, CNPJ_GO_2];

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
    nome: "Ofertante Listagem Pós-Curso",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Listagem Pós-Curso 2",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });

  const verba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 5000 });
  const verba2 = criarVerba({ cdOfertante: CNPJ_GO_2, vlVerba: 5000 });

  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba: verba.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoDoGo, criadoPor: CNPJ_GO });

  const cdCursoDoGo2 = criarPreCurso({
    cdOfertante: CNPJ_GO_2,
    cdVerba: verba2.cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GT,
  }).cdCurso;
  criarPosCurso({ cdCurso: cdCursoDoGo2, criadoPor: CPF_GT });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_2]);
  deleteUsuarios(CPFS);
});

test("REQ-PO-12: GO só vê os pós-cursos do próprio Ofertante", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pos-cursos");
  await expect(page).toHaveURL(/\/pos-cursos$/);

  const itens = await page.getByTestId("lista-pos-cursos").getByRole("listitem").count();
  expect(itens).toBe(1);
  await expect(page.getByText(`Pós-curso #${cdCursoDoGo}`)).toBeVisible();
});

test("REQ-PO-12: GT vê todos os pós-cursos cadastrados", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_GT, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pos-cursos");

  const itens = await page.getByTestId("lista-pos-cursos").getByRole("listitem").count();
  expect(itens).toBeGreaterThanOrEqual(2);
});

test("cada item lista o status e linka para a tela de detalhe", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/pos-cursos");

  await expect(page.getByTestId(`status-pos-curso-${cdCursoDoGo}`)).toHaveText("Em andamento");

  // A tela de detalhe em si (T9) ainda não existe nesta tarefa - checa só
  // que o link aponta para a URL correta, sem navegar (evita depender de
  // uma rota que só a próxima tarefa cria).
  await expect(
    page.getByText(`Pós-curso #${cdCursoDoGo}`).locator("xpath=ancestor::a"),
  ).toHaveAttribute("href", `/pos-cursos/${cdCursoDoGo}`);
});
