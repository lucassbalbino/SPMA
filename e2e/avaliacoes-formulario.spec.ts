// e2e de /avaliacoes/[cpf]/[cdCurso] (T9), pela UI real. Cobre AVAL-07 a
// AVAL-19 na camada de tela.
import { expect, test, type Locator, type Page } from "@playwright/test";
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
const CPF_GO_A = "60000369900";
const CPF_AL_A = "60000383643";
const CPF_AL_OUTRO = "60000397350";

let cdOfertanteA: number;
let cdVerbaA: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO_A, CPF_AL_A, CPF_AL_OUTRO]);

  cdOfertanteA = criarOfertante({ nome: "Ofertante Formulário Avaliação A", uf: "SP" }).cdOfertante;
  cdVerbaA = criarVerba({ cdOfertante: cdOfertanteA, vlVerba: 10000 }).cdVerba;

  upsertUsuario({
    cpf: CPF_GO_A,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteA,
  });
  upsertUsuario({ cpf: CPF_AL_A, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_OUTRO, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf([CPF_AL_A, CPF_AL_OUTRO]);
  deletePreCursosPorOfertante([cdOfertanteA]);
  deleteUsuarios([CPF_GO_A, CPF_AL_A, CPF_AL_OUTRO]);
});

function criarAvaliacaoFixture(cpf: string): number {
  const cdCurso = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  }).cdCurso;
  criarAvaliacao({ cpf, cdCurso });
  return cdCurso;
}

async function login(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

// 5 blocos em Parte 1, seguidos pelos blocos de Parte 2 no mesmo fluxo de
// `data-slot="accordion-item"` (dois Accordion na página, renderizados em
// sequência) - escopar por índice absoluto evita colisão de rótulos de
// opção repetidos entre blocos num `getByRole` sem escopo.
const TOTAL_BLOCOS_PARTE_1 = 5;

function blocoParte1(page: Page, indice: number): Locator {
  return page.locator('[data-slot="accordion-item"]').nth(indice - 1);
}

function blocoParte2(page: Page, indice: number): Locator {
  return page.locator('[data-slot="accordion-item"]').nth(TOTAL_BLOCOS_PARTE_1 + indice - 1);
}

async function abrirBloco(escopo: Locator, testId: string) {
  await escopo.getByTestId(testId).click();
}

function textoExato(texto: string): RegExp {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

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
      (res) => res.url().includes("/api/avaliacoes/") && res.request().method() === "PATCH",
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

async function preencherParte1(page: Page) {
  const b1 = blocoParte1(page, 1);
  await abrirBloco(b1, "bloco-parte1-1");
  await selecionar(page, "campo-avalPessoalEstado-select", "SP");
  await page.getByTestId("campo-avalPessoalMunicipio").fill("Ubatuba");
  await selecionar(page, "campo-avalPessoalGenero-select", "Feminino");
  await selecionar(page, "campo-avalPessoalFaixaEtaria-select", "25 a 34 anos");
  await selecionar(page, "campo-avalPessoalEscolaridade-select", "Médio completo");
  await selecionar(page, "campo-avalPessoalRacaEtnia-select", "Parda");
  await marcarRadio(b1, "Não");
  await abrirBloco(b1, "bloco-parte1-1");

  const b2 = blocoParte1(page, 2);
  await abrirBloco(b2, "bloco-parte1-2");
  await selecionar(page, "campo-avalProfissCondicaoTrabalho-select", "Desempregado(a)");
  await marcarRadio(b2, "Sim");
  await page.getByTestId("campo-avalProfissAtividadeEspecifica").fill("Recepção em pousada local");
  await selecionar(page, "campo-avalProfissFaixaRenda-select", "Até 1 salário mínimo");
  await abrirBloco(b2, "bloco-parte1-2");

  const b3 = blocoParte1(page, 3);
  await abrirBloco(b3, "bloco-parte1-3");
  await b3.getByRole("radio", { name: "Não", exact: true }).first().click();
  await b3.getByRole("radio", { name: "Sim", exact: true }).last().click();
  await selecionar(page, "campo-avalExperienciaTipoCursoAnterior-select", "Curso livre");
  await abrirBloco(b3, "bloco-parte1-3");

  const b4 = blocoParte1(page, 4);
  await abrirBloco(b4, "bloco-parte1-4");
  await marcarCheckbox(b4, "Geração de renda");
  await selecionar(page, "campo-avalMotivFormaConhecimento-select", "Redes sociais");
  await abrirBloco(b4, "bloco-parte1-4");

  const b5 = blocoParte1(page, 5);
  await abrirBloco(b5, "bloco-parte1-5");
  await selecionar(page, "campo-avalExpectAtendimento-select", "Atendeu totalmente");
  await selecionar(page, "campo-avalExpectEmprego-select", "Atendeu parcialmente");
  await selecionar(page, "campo-avalExpectRenda-select", "Superou minhas expectativas");
  await abrirBloco(b5, "bloco-parte1-5");
}

async function preencherParte2Concluiu(page: Page) {
  const b1 = blocoParte2(page, 1);
  await abrirBloco(b1, "bloco-parte2-1");
  await marcarRadio(b1, "Sim");
  await page.getByTestId("campo-avalParticipPercentualFrequencia").fill("90");
  await abrirBloco(b1, "bloco-parte2-1");

  const b2 = blocoParte2(page, 2);
  await abrirBloco(b2, "bloco-parte2-2");
  await selecionar(page, "campo-avalCursoDinamicasInclusao-select", "5 - Ótimo");
  await selecionar(page, "campo-avalCursoMaterialDidatico-select", "4 - Bom");
  await selecionar(page, "campo-avalCursoConteudo-select", "5 - Ótimo");
  await selecionar(page, "campo-avalCursoClareza-select", "4 - Bom");
  await selecionar(page, "campo-avalCursoConhecimentoInstrutores-select", "5 - Ótimo");
  await selecionar(page, "campo-avalCursoOrganizacao-select", "4 - Bom");
  await selecionar(page, "campo-avalCursoInfraestruturaBasica-select", "3 - Regular");
  await selecionar(page, "campo-avalCursoInfraestruturaSalaAula-select", "3 - Regular");
  await abrirBloco(b2, "bloco-parte2-2");

  const b3 = blocoParte2(page, 3);
  await abrirBloco(b3, "bloco-parte2-3");
  await selecionar(page, "campo-avalAprendizAmpliacaoConhecimento-select", "Sim, totalmente");
  await selecionar(page, "campo-avalAprendizAtendimentoExpectativas-select", "Atendeu totalmente");
  await selecionar(
    page,
    "campo-avalAprendizSensacaoPreparo-select",
    "Sim, me sinto totalmente preparado(a)",
  );
  await abrirBloco(b3, "bloco-parte2-3");

  const b4 = blocoParte2(page, 4);
  await abrirBloco(b4, "bloco-parte2-4");
  await selecionar(page, "campo-avalContinuidadeRetomadaEstudos-select", "Pretendo retomar em breve");
  await abrirBloco(b4, "bloco-parte2-4");

  const b5 = blocoParte2(page, 5);
  await abrirBloco(b5, "bloco-parte2-5");
  await marcarCheckbox(b5, "Maior autoconfiança");
  await abrirBloco(b5, "bloco-parte2-5");

  const b6 = blocoParte2(page, 6);
  await abrirBloco(b6, "bloco-parte2-6");
  await selecionar(page, "campo-avalOportunSituacaoTrabalho-select", "Empregado(a) na área de Turismo");
  await selecionar(page, "campo-avalOportunIntencaoAtuarTurismo-select", "Sim");
  await abrirBloco(b6, "bloco-parte2-6");

  const b7 = blocoParte2(page, 7);
  await abrirBloco(b7, "bloco-parte2-7");
  await selecionar(page, "campo-avalEfetivEmprego-select", "Sim");
  await selecionar(page, "campo-avalEfetivAumentoRenda-select", "Sim");
  await selecionar(page, "campo-avalEfetivMelhoriaPadraoVida-select", "Sim");
  await abrirBloco(b7, "bloco-parte2-7");

  const b8 = blocoParte2(page, 8);
  await abrirBloco(b8, "bloco-parte2-8");
  await page.getByTestId("campo-avalGeralNota").fill("9");
  await selecionar(page, "campo-avalGeralMelhoriasComunidade-select", "Sim");
  await selecionar(page, "campo-avalGeralRecomendaCurso-select", "Sim");
  await abrirBloco(b8, "bloco-parte2-8");
}

test("Aluno salva um bloco parcial de Parte 1 e o dado persiste após reload", async ({ page }) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  const b1 = blocoParte1(page, 1);
  await abrirBloco(b1, "bloco-parte1-1");
  await page.getByTestId("campo-avalPessoalMunicipio").fill("Ubatuba");
  const resposta = await salvarRascunho(page);
  expect(resposta.ok()).toBe(true);
  await expect(page.getByTestId("erro-avaliacao")).toHaveCount(0);

  await page.reload();
  await abrirBloco(blocoParte1(page, 1), "bloco-parte1-1");
  await expect(page.getByTestId("campo-avalPessoalMunicipio")).toHaveValue("Ubatuba");
});

test("antes da Parte 1 completa, os controles de Parte 2 aparecem desabilitados com o aviso do gate", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await expect(page.getByTestId("aviso-parte2-bloqueada")).toBeVisible();
  await abrirBloco(blocoParte2(page, 1), "bloco-parte2-1");
  await expect(
    page.getByTestId("campo-avalParticipConcluiuCurso-grupo").getByRole("radio").first(),
  ).toBeDisabled();
});

test("Concluiu='Não' + motivo, sem preencher o restante da Parte 2, encerra com sucesso (AVAL-12)", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await preencherParte1(page);
  const respostaParte1 = await salvarRascunho(page);
  expect(respostaParte1.ok()).toBe(true);
  await expect(page.getByTestId("aviso-parte2-bloqueada")).toHaveCount(0);

  const b1 = blocoParte2(page, 1);
  await abrirBloco(b1, "bloco-parte2-1");
  await b1.getByRole("radio", { name: "Não", exact: true }).click();
  await marcarCheckbox(b1, "Falta de tempo");
  await abrirBloco(b1, "bloco-parte2-1");

  const respostaSalvar = await salvarRascunho(page);
  expect(respostaSalvar.ok()).toBe(true);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(true);
  await expect(page.getByTestId("status-avaliacao")).toHaveText("Encerrado");
});

test("Concluiu='Sim' sem completar as 22 chaves e tenta encerrar -> bloqueado, pendências exibidas (AVAL-13/16)", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await preencherParte1(page);
  await salvarRascunho(page);

  const b1 = blocoParte2(page, 1);
  await abrirBloco(b1, "bloco-parte2-1");
  await b1.getByRole("radio", { name: "Sim", exact: true }).click();
  await abrirBloco(b1, "bloco-parte2-1");
  await salvarRascunho(page);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(false);

  await expect(page.getByTestId("lista-pendencias")).toBeVisible();
  await expect(page.getByTestId("pendencia-avalGeralNota")).toBeVisible();
  await expect(page.getByTestId("status-avaliacao")).toHaveText("Em andamento");
});

test("Parte 1 completa + Parte 2 completa (Concluiu='Sim') encerra de forma irreversível", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await preencherParte1(page);
  await salvarRascunho(page);

  await preencherParte2Concluiu(page);
  const respostaSalvar = await salvarRascunho(page);
  expect(respostaSalvar.ok()).toBe(true);
  await expect(page.getByTestId("erro-avaliacao")).toHaveCount(0);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(true);

  await expect(page.getByTestId("status-avaliacao")).toHaveText("Encerrado");
  await expect(page.getByTestId("lista-pendencias")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);

  await abrirBloco(blocoParte1(page, 1), "bloco-parte1-1");
  await expect(page.getByTestId("campo-avalPessoalMunicipio")).toBeDisabled();
});

test("avaliação encerrada é somente leitura, sem botões de ação", async ({ page }) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);
  await preencherParte1(page);
  await salvarRascunho(page);
  await preencherParte2Concluiu(page);
  await salvarRascunho(page);
  await encerrar(page);

  await page.reload();

  await expect(page.getByTestId("status-avaliacao")).toHaveText("Encerrado");
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("um GO do Ofertante do curso abre a tela -> vê os dados, sem controles de edição", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_GO_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await expect(page.getByTestId("form-avaliacao")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("outro Aluno tentando acessar a URL diretamente recebe não encontrado", async ({ page }) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_OUTRO);
  const res = await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  expect(res?.status()).toBe(404);
});
