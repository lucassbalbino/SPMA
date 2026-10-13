// e2e de /verbas, a tela de verbas (gestao-de-verbas, AD-046), pela UI real.
//
// Documentos exclusivos deste arquivo: CNPJs com prefixo "55" e CPFs
// 701010xxxxx, que nenhum outro spec usa (playwright.config.ts: arquivos
// rodam em paralelo e cada um traz os próprios dados).
import { expect, test, type Page } from "@playwright/test";
import {
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  getVerbasPorOfertante,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("55");

// GO_A tem 1 verba com curso alocado; GO_B tem 1 verba; GO_C não tem nenhuma.
const CNPJ_GO_A = gerarCnpjValido(1);
const CNPJ_GO_B = gerarCnpjValido(2);
const CNPJ_GO_C = gerarCnpjValido(3);
const CPF_VO_DE_C = "70101001010";
const CPF_VT = "70101002092";
const CPF_AM = "70101003064";
const CPF_GT = "70101004036";

const CNPJS = [CNPJ_GO_A, CNPJ_GO_B, CNPJ_GO_C];
const DOCUMENTOS = [CPF_VO_DE_C, CPF_VT, CPF_AM, CPF_GT, ...CNPJS];

let cdVerbaA: number;
let cdVerbaB: number;

async function logar(page: Page, documento: string) {
  const res = await page.request.post("/api/auth/login", { data: { documento, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test.beforeAll(() => {
  deletePreCursosPorOfertante(CNPJS);
  deleteVerbasPorOfertante(CNPJS);
  deleteUsuarios(DOCUMENTOS);

  upsertUsuario({ cpf: CNPJ_GO_A, tipo: "GO", senha: SENHA, primeiraVez: false, nome: "GO Verbas Página A" });
  upsertUsuario({ cpf: CNPJ_GO_B, tipo: "GO", senha: SENHA, primeiraVez: false, nome: "GO Verbas Página B" });
  upsertUsuario({ cpf: CNPJ_GO_C, tipo: "GO", senha: SENHA, primeiraVez: false, nome: "GO Verbas Página C" });
  upsertUsuario({
    cpf: CPF_VO_DE_C,
    tipo: "VO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: CNPJ_GO_C,
  });
  upsertUsuario({ cpf: CPF_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });

  cdVerbaA = criarVerba({ cdOfertante: CNPJ_GO_A, vlVerba: 5000, dtVerba: "2026-03-10" }).cdVerba;
  criarPreCurso({ cdOfertante: CNPJ_GO_A, cdVerba: cdVerbaA, vlCursoAlocado: 1200, criadoPor: CNPJ_GO_A });
  cdVerbaB = criarVerba({ cdOfertante: CNPJ_GO_B, vlVerba: 700 }).cdVerba;
});

test.afterAll(() => {
  deletePreCursosPorOfertante(CNPJS);
  deleteVerbasPorOfertante(CNPJS);
  deleteUsuarios(DOCUMENTOS);
});

test("GV-11/GV-14: GO vê só a própria verba, com GO, CNPJ, valor, saldo e data, sem formulário nem edição", async ({
  page,
}) => {
  await logar(page, CNPJ_GO_A);
  await page.goto("/verbas");

  const linha = page.getByTestId(`verba-${cdVerbaA}`);
  await expect(linha).toContainText("GO Verbas Página A");
  await expect(linha).toContainText(CNPJ_GO_A);
  await expect(linha).toContainText("Valor R$ 5000.00");
  // GV-16 na tela: 5000 - 1200 alocados a um curso.
  await expect(linha).toContainText("Saldo R$ 3800.00");
  await expect(linha).toContainText("10/03/2026");

  await expect(page.getByTestId(`verba-${cdVerbaB}`)).toHaveCount(0);

  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
});

test("GV-15/GV-14: VO de um GO sem verbas vê 'Nenhuma verba cadastrada.' e nenhum formulário", async ({
  page,
}) => {
  await logar(page, CPF_VO_DE_C);
  await page.goto("/verbas");

  await expect(page.getByText("Nenhuma verba cadastrada.")).toBeVisible();
  await expect(page.locator('[data-testid^="verba-"]')).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
});

test("GV-17: VT abre /verbas e vê 'Seu perfil não tem acesso a verbas.', sem nenhuma verba", async ({
  page,
}) => {
  await logar(page, CPF_VT);
  await page.goto("/verbas");

  await expect(page.getByText("Seu perfil não tem acesso a verbas.")).toBeVisible();
  await expect(page.locator('[data-testid^="verba-"]')).toHaveCount(0);
  await expect(page.getByText("Nenhuma verba cadastrada.")).toHaveCount(0);
});

test("GV-03/GV-04/GV-05: AM envia o formulário incompleto e vê a mensagem de cada falta, sem criar verba", async ({
  page,
}) => {
  await logar(page, CPF_AM);
  await page.goto("/verbas");

  const criar = page.getByRole("button", { name: "Criar verba" });

  await criar.click();
  await expect(page.getByText("Ofertante é obrigatório")).toBeVisible();

  await page.getByLabel("GO").selectOption(CNPJ_GO_C);
  await criar.click();
  await expect(page.getByText("Valor da verba é obrigatório")).toBeVisible();

  await page.getByLabel("Valor da verba").fill("0");
  await criar.click();
  await expect(page.getByText("Valor da verba deve ser positivo")).toBeVisible();

  expect(getVerbasPorOfertante(CNPJ_GO_C)).toEqual([]);
});

test("GV-01/GV-02/GV-07: AM cria uma segunda verba para um GO que já tem uma, e as duas aparecem na lista sem recarregar", async ({
  page,
}) => {
  await logar(page, CPF_AM);
  await page.goto("/verbas");

  // GV-01: os três campos do formulário.
  await expect(page.getByLabel("GO")).toBeVisible();
  await expect(page.getByLabel("Valor da verba")).toBeVisible();
  await expect(page.getByLabel("Data de liberação")).toBeVisible();

  await page.getByLabel("GO").selectOption(CNPJ_GO_B);
  await page.getByLabel("Valor da verba").fill("1500.75");
  await page.getByLabel("Data de liberação").fill("2026-05-01");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith("/api/verbas") && res.request().method() === "POST"),
    page.getByRole("button", { name: "Criar verba" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  // GV-07: a verba anterior de B continua, e a nova é a segunda.
  const verbasDeB = getVerbasPorOfertante(CNPJ_GO_B);
  expect(verbasDeB.map((verba) => verba.cdVerba)[0]).toBe(cdVerbaB);
  expect(verbasDeB).toHaveLength(2);
  const nova = verbasDeB[1];
  expect(nova.cdOfertante).toBe(CNPJ_GO_B);
  expect(Number(nova.vlVerba)).toBe(1500.75);
  expect(nova.dtVerba).toMatch(/^2026-05-01/);

  // GV-02: as duas linhas na lista, sem recarregar a página.
  await expect(page.getByTestId(`verba-${cdVerbaB}`)).toContainText("Valor R$ 700.00");
  const linhaNova = page.getByTestId(`verba-${nova.cdVerba}`);
  await expect(linhaNova).toContainText("GO Verbas Página B");
  await expect(linhaNova).toContainText("Valor R$ 1500.75");
  await expect(linhaNova).toContainText("01/05/2026");
});

test("GV-09: o botão 'Criar verba' fica desabilitado enquanto o envio está em andamento", async ({
  page,
}) => {
  await logar(page, CPF_GT);
  await page.goto("/verbas");

  // Segura o POST para observar o estado intermediário do botão.
  let liberar: () => void = () => {};
  const segurado = new Promise<void>((resolve) => (liberar = resolve));
  await page.route("**/api/verbas", async (rota) => {
    if (rota.request().method() === "POST") await segurado;
    await rota.continue();
  });

  await page.getByLabel("GO").selectOption(CNPJ_GO_B);
  await page.getByLabel("Valor da verba").fill("10");

  const criar = page.getByRole("button", { name: "Criar verba" });
  await criar.click();
  await expect(criar).toBeDisabled();

  liberar();
  await expect(criar).toBeEnabled();
});

