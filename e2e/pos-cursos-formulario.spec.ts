// e2e de /pos-cursos/[cdCurso] (T9), pela UI real. Cobre REQ-PO-04 a
// REQ-PO-11 na camada de tela.
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  criarOfertante,
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  encerrarPosCursoFixture,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO_A = "52281006360";
const CPF_GO_B = "52291006487";
const CPF_VO_A = "52301006565";

let cdOfertanteA: number;
let cdOfertanteB: number;
let cdVerbaA: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO_A, CPF_GO_B, CPF_VO_A]);

  cdOfertanteA = criarOfertante({
    nome: "Ofertante Formulário Pós-Curso A",
    uf: "SP",
  }).cdOfertante;
  cdOfertanteB = criarOfertante({
    nome: "Ofertante Formulário Pós-Curso B",
    uf: "RJ",
  }).cdOfertante;

  cdVerbaA = criarVerba({ cdOfertante: cdOfertanteA, vlVerba: 10000 }).cdVerba;

  upsertUsuario({
    cpf: CPF_GO_A,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteA,
  });
  upsertUsuario({
    cpf: CPF_GO_B,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteB,
  });
  upsertUsuario({
    cpf: CPF_VO_A,
    tipo: "VO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteA,
  });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertanteA, cdOfertanteB]);
  deleteUsuarios([CPF_GO_A, CPF_GO_B, CPF_VO_A]);
});

function criarPosCursoFixture(cdOfertante: number, criadoPor: string): number {
  const cdCurso = criarPreCurso({
    cdOfertante,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor,
  }).cdCurso;
  criarPosCurso({ cdCurso, criadoPor });
  return cdCurso;
}

async function login(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

// Cada AccordionItem carrega data-slot="accordion-item" (accordion.tsx) na
// ordem de BLOCOS - escopar por aí evita colisão de rótulos de opção
// repetidos entre blocos num `getByRole` sem escopo.
function bloco(page: Page, indice: number): Locator {
  return page.locator('[data-slot="accordion-item"]').nth(indice - 1);
}

async function abrirBloco(page: Page, indice: number) {
  await bloco(page, indice).getByTestId(`bloco-${indice}`).click();
}

async function fecharBloco(page: Page, indice: number) {
  await bloco(page, indice).getByTestId(`bloco-${indice}`).click();
}

function textoExato(texto: string): RegExp {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

// Diferente do Accordion (keepMounted: false), o popup do Select não
// desmonta ao fechar - com dois campos de select diferentes reusando a
// mesma opção literal (ex.: "Não" em posFinHouveDevolucaoRecursos e em
// posFinNecessidadeAditivo), um `getByRole("option", ...)` sem escopo pode
// resolver para a opção (fechada, oculta) do campo errado. Escopar pelo
// prefixo do testid do próprio campo evita a colisão.
async function selecionar(page: Page, testIdTrigger: string, rotulo: string) {
  await page.getByTestId(testIdTrigger).click();
  const prefixoOpcao = testIdTrigger.replace(/-select$/, "-opcao-");
  await page
    .locator(`[data-testid^="${prefixoOpcao}"]`)
    .filter({ hasText: textoExato(rotulo) })
    .click();
}

async function marcarCheckbox(escopo: Locator, rotulo: string) {
  const item = escopo.getByRole("checkbox", { name: rotulo, exact: true });
  await item.click();
  await expect(item).toBeChecked();
}

async function marcarRadio(escopo: Locator, rotulo: string) {
  const item = escopo.getByRole("radio", { name: rotulo, exact: true });
  await item.click();
  await expect(item).toBeChecked();
}

async function salvarRascunho(page: Page) {
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/pos-cursos/") && res.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: "Salvar rascunho" }).click(),
  ]);
  return resposta;
}

async function encerrar(page: Page) {
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/encerrar") && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Encerrar" }).click(),
  ]);
  return resposta;
}

async function preencherTodosOsCampos(page: Page, opcoes: { omitirDetalheAlteracao?: boolean } = {}) {
  await abrirBloco(page, 1);
  await marcarCheckbox(bloco(page, 1), "Dificuldade de concentração");
  await page.getByTestId("campo-posAcompanhConceitosTrabalhados").fill("Turismo de base comunitária");
  await page.getByTestId("campo-posAcompanhPlanoAcao").fill("Reforço individual semanal");
  await selecionar(page, "campo-posAcompanhAvaliacaoCognitiva-select", "Prova escrita");
  await marcarCheckbox(bloco(page, 1), "Relatórios de frequência");
  await fecharBloco(page, 1);

  await abrirBloco(page, 2);
  await page.getByTestId("campo-posExecDataInicioReal").fill("2026-03-01");
  await page.getByTestId("campo-posExecDataTerminoReal").fill("2026-06-01");
  await page.getByTestId("campo-posExecCargaHorariaRealizada").fill("120");
  await marcarCheckbox(bloco(page, 2), "Evasão de alunos");
  await marcarRadio(bloco(page, 2), "Sim");
  if (!opcoes.omitirDetalheAlteracao) {
    await page
      .getByTestId("campo-posExecAlteracaoDetalhe")
      .fill("Curso estendido em 2 semanas por feriados");
  }
  await fecharBloco(page, 2);

  await abrirBloco(page, 3);
  await page.getByTestId("campo-posParticNumInscritos").fill("40");
  await page.getByTestId("campo-posParticNumMatriculados").fill("35");
  await page.getByTestId("campo-posParticNumConcluintes").fill("30");
  await selecionar(page, "campo-posParticMotivosAbandono-select", "Conflito com trabalho");
  await selecionar(
    page,
    "campo-posParticRelacaoDemandaOferta-select",
    "Demanda superou a oferta de vagas",
  );
  await selecionar(page, "campo-posParticIntencaoNovaOferta-select", "Sim");
  await fecharBloco(page, 3);

  await abrirBloco(page, 4);
  await page.getByTestId("campo-posFinValorTotalExecutado").fill("15000");
  await page.getByTestId("campo-posFinValorDespesaDocentes").fill("8000");
  await page.getByTestId("campo-posFinValorDespesaMaterialDidatico").fill("3000");
  await page.getByTestId("campo-posFinValorDespesaInfraestrutura").fill("4000");
  await selecionar(page, "campo-posFinHouveDevolucaoRecursos-select", "Não");
  await page.getByTestId("campo-posFinValorDevolvido").fill("0");
  await selecionar(page, "campo-posFinNecessidadeAditivo-select", "Não");
  await fecharBloco(page, 4);

  await abrirBloco(page, 5);
  await marcarCheckbox(bloco(page, 5), "Nova turma no mesmo local");
  await marcarCheckbox(bloco(page, 5), "Aumento do número de vagas");
  await fecharBloco(page, 5);
}

test("GO salva um bloco parcial e o dado persiste após reload", async ({ page }) => {
  const cdCurso = criarPosCursoFixture(cdOfertanteA, CPF_GO_A);

  await login(page, CPF_GO_A);
  await page.goto(`/pos-cursos/${cdCurso}`);

  await abrirBloco(page, 1);
  await page.getByTestId("campo-posAcompanhPlanoAcao").fill("Rascunho de plano de ação");
  const resposta = await salvarRascunho(page);
  expect(resposta.ok()).toBe(true);
  await expect(page.getByTestId("erro-pos-curso")).toHaveCount(0);

  await page.reload();
  await abrirBloco(page, 1);
  await expect(page.getByTestId("campo-posAcompanhPlanoAcao")).toHaveValue(
    "Rascunho de plano de ação",
  );
});

test("encerramento bloqueado por campo condicional pendente referencia o campo", async ({
  page,
}) => {
  const cdCurso = criarPosCursoFixture(cdOfertanteA, CPF_GO_A);

  await login(page, CPF_GO_A);
  await page.goto(`/pos-cursos/${cdCurso}`);

  // Demais 25 campos completos (Independent Test da spec: "mantendo os
  // demais campos obrigatórios completos") - isola a asserção no único
  // campo que falta.
  await preencherTodosOsCampos(page, { omitirDetalheAlteracao: true });

  const respostaSalvar = await salvarRascunho(page);
  expect(respostaSalvar.ok()).toBe(true);
  await expect(page.getByTestId("erro-pos-curso")).toHaveCount(0);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(false);

  await expect(page.getByTestId("lista-pendencias")).toBeVisible();
  await expect(page.getByTestId("pendencia-posExecAlteracaoDetalhe")).toBeVisible();
  await expect(page.getByTestId("lista-pendencias").locator("li")).toHaveCount(1);
});

test("GO preenche os 26 campos e encerra o pós-curso de forma irreversível", async ({ page }) => {
  const cdCurso = criarPosCursoFixture(cdOfertanteA, CPF_GO_A);

  await login(page, CPF_GO_A);
  await page.goto(`/pos-cursos/${cdCurso}`);

  await preencherTodosOsCampos(page);

  const respostaSalvar = await salvarRascunho(page);
  expect(respostaSalvar.ok()).toBe(true);
  await expect(page.getByTestId("erro-pos-curso")).toHaveCount(0);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(true);

  await expect(page.getByTestId("status-pos-curso")).toHaveText("Encerrado");
  await expect(page.getByTestId("lista-pendencias")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);

  await abrirBloco(page, 1);
  await expect(page.getByTestId("campo-posAcompanhPlanoAcao")).toBeDisabled();
});

test("pós-curso encerrado é somente leitura, sem botões de ação", async ({ page }) => {
  const cdCurso = criarPosCursoFixture(cdOfertanteA, CPF_GO_A);
  encerrarPosCursoFixture(cdCurso);

  await login(page, CPF_GO_A);
  await page.goto(`/pos-cursos/${cdCurso}`);

  await expect(page.getByTestId("status-pos-curso")).toHaveText("Encerrado");
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);

  await abrirBloco(page, 1);
  await expect(page.getByTestId("campo-posAcompanhPlanoAcao")).toBeDisabled();
});

test("VO visualiza os dados sem controles de edição", async ({ page }) => {
  const cdCurso = criarPosCursoFixture(cdOfertanteA, CPF_GO_A);

  await login(page, CPF_VO_A);
  await page.goto(`/pos-cursos/${cdCurso}`);

  await expect(page.getByTestId("form-pos-curso")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("GO de outro Ofertante tentando acessar diretamente recebe não encontrado", async ({
  page,
}) => {
  const cdCurso = criarPosCursoFixture(cdOfertanteA, CPF_GO_A);

  await login(page, CPF_GO_B);
  const res = await page.goto(`/pos-cursos/${cdCurso}`);

  expect(res?.status()).toBe(404);
});
