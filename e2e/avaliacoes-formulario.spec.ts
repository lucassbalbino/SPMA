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

// Marca uma opção de radio/checkbox pelo testid da própria opção
// (`campo-<chave>-opcao-<indice>`), e não pelo rótulo: depois da troca para
// o questionário fonte, vários blocos passaram a ter mais de um grupo com as
// mesmas alternativas ("Sim"/"Não", "Sim"/"Parcialmente"/"Não"), o que
// tornaria ambíguo qualquer `getByRole` por nome dentro do bloco.
async function marcarOpcao(page: Page, chave: string, indice: number) {
  const item = page.getByTestId(`campo-${chave}-opcao-${indice}`);
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
  // Dados Pessoais (Q3-Q9)
  const b1 = blocoParte1(page, 1);
  await abrirBloco(b1, "bloco-parte1-1");
  await selecionar(page, "campo-avalPessoalEstado-select", "SP");
  await page.getByTestId("campo-avalPessoalMunicipio").fill("Ubatuba");
  await marcarOpcao(page, "avalPessoalGenero", 0); // Feminino
  await marcarOpcao(page, "avalPessoalFaixaEtaria", 2); // 26 a 35 anos
  await selecionar(page, "campo-avalPessoalEscolaridade-select", "Ensino médio completo");
  await marcarOpcao(page, "avalPessoalRacaEtnia", 2); // Pardo
  await marcarOpcao(page, "avalPessoalCondicaoPcd", 0); // Não sou uma PCD
  await abrirBloco(b1, "bloco-parte1-1");

  // Situação Profissional (Q10-Q13)
  const b2 = blocoParte1(page, 2);
  await abrirBloco(b2, "bloco-parte1-2");
  await selecionar(page, "campo-avalProfissCondicaoTrabalho-select", "Desempregado");
  await marcarOpcao(page, "avalProfissAtuaTurismo", 0); // Sim
  await selecionar(
    page,
    "campo-avalProfissAtividadeEspecifica-select",
    "Alojamento (meios de hospedagem)",
  );
  await selecionar(page, "campo-avalProfissFaixaRenda-select", "Até 01 salário mínimo");
  await abrirBloco(b2, "bloco-parte1-2");

  // Experiência (Q14-Q16)
  const b3 = blocoParte1(page, 3);
  await abrirBloco(b3, "bloco-parte1-3");
  await marcarOpcao(page, "avalExperienciaTrabalhoPrevio", 1); // Não
  await marcarOpcao(page, "avalExperienciaCursoAnterior", 0); // Sim
  await selecionar(
    page,
    "campo-avalExperienciaTipoCursoAnterior-select",
    "Atualização profissional",
  );
  await abrirBloco(b3, "bloco-parte1-3");

  // Motivação (Q17-Q18)
  const b4 = blocoParte1(page, 4);
  await abrirBloco(b4, "bloco-parte1-4");
  await marcarOpcao(page, "avalMotivMotivosParticipacao", 0); // Conseguir um emprego
  await marcarOpcao(page, "avalMotivFormaConhecimento", 1); // pelas Redes Sociais
  await abrirBloco(b4, "bloco-parte1-4");

  // Expectativas (Q19-Q21)
  const b5 = blocoParte1(page, 5);
  await abrirBloco(b5, "bloco-parte1-5");
  await marcarOpcao(page, "avalExpectAtendimento", 0); // Sim
  await marcarOpcao(page, "avalExpectEmprego", 1); // Talvez
  await marcarOpcao(page, "avalExpectRenda", 2); // Média
  await abrirBloco(b5, "bloco-parte1-5");
}

async function preencherParte2Concluiu(page: Page) {
  // Participação (Q22, Q23)
  const b1 = blocoParte2(page, 1);
  await abrirBloco(b1, "bloco-parte2-1");
  await marcarOpcao(page, "avalParticipConcluiuCurso", 0); // Sim
  await marcarOpcao(page, "avalParticipPercentualFrequencia", 3); // 76% a 100%
  await abrirBloco(b1, "bloco-parte2-1");

  // Avaliação do curso (Q24)
  const b2 = blocoParte2(page, 2);
  await abrirBloco(b2, "bloco-parte2-2");
  await selecionar(page, "campo-avalCursoDinamicasInclusao-select", "Ótimo");
  await selecionar(page, "campo-avalCursoMaterialDidatico-select", "Bom");
  await selecionar(page, "campo-avalCursoConteudo-select", "Ótimo");
  await selecionar(page, "campo-avalCursoClareza-select", "Bom");
  await selecionar(page, "campo-avalCursoConhecimentoInstrutores-select", "Ótimo");
  await selecionar(page, "campo-avalCursoOrganizacao-select", "Bom");
  await selecionar(page, "campo-avalCursoInfraestruturaBasica-select", "Regular");
  await selecionar(page, "campo-avalCursoInfraestruturaSalaAula-select", "Regular");
  await abrirBloco(b2, "bloco-parte2-2");

  // Aprendizado (Q25-Q27)
  const b3 = blocoParte2(page, 3);
  await abrirBloco(b3, "bloco-parte2-3");
  await marcarOpcao(page, "avalAprendizAmpliacaoConhecimento", 0); // Ampliou / Melhorou
  await marcarOpcao(page, "avalAprendizAtendimentoExpectativas", 0); // Sim
  await marcarOpcao(page, "avalAprendizSensacaoPreparo", 1); // Parcialmente
  await abrirBloco(b3, "bloco-parte2-3");

  // Continuidade nos Estudos (Q28)
  const b4 = blocoParte2(page, 4);
  await abrirBloco(b4, "bloco-parte2-4");
  await marcarOpcao(page, "avalContinuidadeRetomadaEstudos", 3); // Sim, ao ensino técnico
  await abrirBloco(b4, "bloco-parte2-4");

  // Motivações após o Curso (Q29)
  const b5 = blocoParte2(page, 5);
  await abrirBloco(b5, "bloco-parte2-5");
  await marcarOpcao(page, "avalMotivacoesPosPercepcoes", 0);
  await abrirBloco(b5, "bloco-parte2-5");

  // Oportunidades Reais de Trabalho e Emprego (Q30, Q31)
  const b6 = blocoParte2(page, 6);
  await abrirBloco(b6, "bloco-parte2-6");
  await marcarOpcao(page, "avalOportunSituacaoTrabalho", 0); // emprego com carteira no Turismo
  await marcarOpcao(page, "avalOportunIntencaoAtuarTurismo", 0); // Sim
  await abrirBloco(b6, "bloco-parte2-6");

  // Efetivação no Emprego e Aumento da Renda (Q32-Q34)
  const b7 = blocoParte2(page, 7);
  await abrirBloco(b7, "bloco-parte2-7");
  await marcarOpcao(page, "avalEfetivEmprego", 0); // Sim
  await marcarOpcao(page, "avalEfetivAumentoRenda", 0); // Sim
  await marcarOpcao(page, "avalEfetivMelhoriaPadraoVida", 1); // Sim, parcialmente
  await abrirBloco(b7, "bloco-parte2-7");

  // Avaliação geral (Q35-Q37)
  const b8 = blocoParte2(page, 8);
  await abrirBloco(b8, "bloco-parte2-8");
  await page.getByTestId("campo-avalGeralNota").fill("9");
  await page
    .getByTestId("campo-avalGeralMelhoriasComunidade")
    .fill("Mais gente da comunidade trabalhando com receptivo");
  await marcarOpcao(page, "avalGeralRecomendaCurso", 0); // Sim
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
  await marcarOpcao(page, "avalParticipConcluiuCurso", 1); // Não
  await marcarOpcao(page, "avalParticipMotivoNaoConclusao", 3); // Problemas pessoais/familiares
  await marcarOpcao(page, "avalParticipPercentualFrequencia", 0); // Até 25%
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
