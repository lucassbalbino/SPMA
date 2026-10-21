// e2e de /avaliacoes/[cpf]/[cdCurso] (T9), pela UI real. Cobre AVAL-07 a
// AVAL-19 na camada de tela.
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test, type Locator, type Page } from "@playwright/test";
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
import { geradorDeCnpj } from "./helpers/cnpj";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("46");

const CNPJ_GO_A = gerarCnpjValido(1);
const CPF_AL_A = "60000383643";
const CPF_AL_OUTRO = "60000397350";

let cdVerbaA: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO_A]);
  deleteVerbasPorOfertante([CNPJ_GO_A]);
  deleteUsuarios([CNPJ_GO_A, CPF_AL_A, CPF_AL_OUTRO]);

  upsertUsuario({
    cpf: CNPJ_GO_A,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Formulário Avaliação A",
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_AL_A, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_OUTRO, tipo: "AL", senha: SENHA, primeiraVez: false });

  cdVerbaA = criarVerba({ cdOfertante: CNPJ_GO_A, vlVerba: 10000 }).cdVerba;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf([CPF_AL_A, CPF_AL_OUTRO]);
  deletePreCursosPorOfertante([CNPJ_GO_A]);
  deleteVerbasPorOfertante([CNPJ_GO_A]);
  deleteUsuarios([CNPJ_GO_A, CPF_AL_A, CPF_AL_OUTRO]);
});

function criarAvaliacaoFixture(cpf: string): number {
  const cdCurso = criarPreCurso({
    cdOfertante: CNPJ_GO_A,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_A,
  }).cdCurso;
  criarAvaliacao({ cpf, cdCurso });
  return cdCurso;
}

async function login(page: Page, documento: string) {
  const res = await page.request.post("/api/auth/login", { data: { documento, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

// 4 blocos em Parte 1, seguidos pelos blocos de Parte 2 no mesmo fluxo de
// `data-slot="accordion-item"` (dois Accordion na página, renderizados em
// sequência) - escopar por índice absoluto evita colisão de rótulos de
// opção repetidos entre blocos num `getByRole` sem escopo.
const TOTAL_BLOCOS_PARTE_1 = 3;

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
    page.getByRole("button", { name: "Salvar" }).click(),
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
  // Experiência (Q14-Q16) - primeiro bloco desde que as 7 perguntas de dados
  // pessoais (PESSOAL-11) e Situação Profissional (MTUR-08) saíram deste
  // formulário.
  const b1 = blocoParte1(page, 1);
  await abrirBloco(b1, "bloco-parte1-1");
  await marcarOpcao(page, "avalExperienciaTrabalhoPrevio", 1); // Não
  await marcarOpcao(page, "avalExperienciaCursoAnterior", 0); // Sim
  await selecionar(
    page,
    "campo-avalExperienciaTipoCursoAnterior-select",
    "Atualização profissional",
  );
  await abrirBloco(b1, "bloco-parte1-1");

  // Motivação (Q17-Q18)
  const b2 = blocoParte1(page, 2);
  await abrirBloco(b2, "bloco-parte1-2");
  await marcarOpcao(page, "avalMotivMotivosParticipacao", 0); // Conseguir um emprego
  await marcarOpcao(page, "avalMotivFormaConhecimento", 1); // pelas Redes Sociais
  await abrirBloco(b2, "bloco-parte1-2");

  // Expectativas (Q19-Q21)
  const b3 = blocoParte1(page, 3);
  await abrirBloco(b3, "bloco-parte1-3");
  await marcarOpcao(page, "avalExpectAtendimento", 0); // Sim
  await marcarOpcao(page, "avalExpectEmprego", 1); // Talvez
  await marcarOpcao(page, "avalExpectRenda", 2); // Média
  await abrirBloco(b3, "bloco-parte1-3");
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

  // Motivações após o Curso (Q29) - Q28 saiu com a revisão do MTur (MTUR-08).
  const b4 = blocoParte2(page, 4);
  await abrirBloco(b4, "bloco-parte2-4");
  await marcarOpcao(page, "avalMotivacoesPosPercepcoes", 0);
  await abrirBloco(b4, "bloco-parte2-4");

  // Avaliação geral (Q35-Q37) - Q30-Q34 saíram com a revisão do MTur.
  const b5 = blocoParte2(page, 5);
  await abrirBloco(b5, "bloco-parte2-5");
  await page.getByTestId("campo-avalGeralNota").fill("9");
  await page
    .getByTestId("campo-avalGeralMelhoriasComunidade")
    .fill("Mais gente da comunidade trabalhando com receptivo");
  await marcarOpcao(page, "avalGeralRecomendaCurso", 0); // Sim
  await abrirBloco(b5, "bloco-parte2-5");
}

// PESSOAL-11: as 7 perguntas de dados pessoais não existem mais nesta tela -
// nem escondidas nem desabilitadas, simplesmente não são renderizadas.
test("PESSOAL-11: a tela de avaliação não renderiza nenhuma das 7 perguntas de dados pessoais", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await expect(page.getByTestId("bloco-parte1-1")).toBeVisible();

  for (const chave of [
    "avalPessoalEstado",
    "avalPessoalMunicipio",
    "avalPessoalGenero",
    "avalPessoalFaixaEtaria",
    "avalPessoalEscolaridade",
    "avalPessoalRacaEtnia",
    "avalPessoalCondicaoPcd",
  ]) {
    await expect(page.locator(`[data-testid^="campo-${chave}"]`)).toHaveCount(0);
  }

  await expect(page.getByText("Dados Pessoais")).toHaveCount(0);
});

// MTUR-08/MTUR-12: os 4 blocos que o aluno só responde depois do certificado
// não são renderizados, e as perguntas restantes mantêm o número do papel.
test("MTUR-08: a tela de avaliação não renderiza os 4 blocos removidos pelo MTur", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await expect(page.getByTestId("bloco-parte1-1")).toHaveText(/Experiência/);
  await expect(page.getByTestId("bloco-parte2-4")).toHaveText(/Motivações após o Curso/);
  await expect(page.getByTestId("bloco-parte2-5")).toHaveText(/Avaliação geral/);
  await expect(page.getByTestId("bloco-parte2-6")).toHaveCount(0);

  for (const titulo of [
    "Situação Profissional",
    "Continuidade nos Estudos",
    "Oportunidades Reais de Trabalho e Emprego",
    "Efetivação no Emprego e Aumento da Renda",
  ]) {
    await expect(page.getByText(titulo)).toHaveCount(0);
  }

  await abrirBloco(blocoParte1(page, 1), "bloco-parte1-1");
  await expect(
    page.getByText("14. Já trabalhou no setor de Turismo?", { exact: true }),
  ).toBeVisible();

  // MTUR-12: a Parte 2 pula de Q27 para Q29 e de Q29 para Q35, sem renumerar.
  await abrirBloco(blocoParte2(page, 4), "bloco-parte2-4");
  await expect(
    page.getByText("29. Após a conclusão do Curso, você sente que:", { exact: true }),
  ).toBeVisible();
  await abrirBloco(blocoParte2(page, 5), "bloco-parte2-5");
  await expect(
    page.getByText("35. Qual nota você dá para o Curso (0 a 10)?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/^38\. A partir da sua experiência como aluno do Curso/),
  ).toBeVisible();
});

test("Aluno salva um bloco parcial de Parte 1 e o dado persiste após reload", async ({ page }) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  const b1 = blocoParte1(page, 1);
  await abrirBloco(b1, "bloco-parte1-1");
  await marcarOpcao(page, "avalExperienciaTrabalhoPrevio", 0); // Sim
  const resposta = await salvarRascunho(page);
  expect(resposta.ok()).toBe(true);
  await expect(page.getByTestId("erro-avaliacao")).toHaveCount(0);

  await page.reload();
  await abrirBloco(blocoParte1(page, 1), "bloco-parte1-1");
  await expect(page.getByTestId("campo-avalExperienciaTrabalhoPrevio-opcao-0")).toBeChecked();
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
  await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);

  await abrirBloco(blocoParte1(page, 1), "bloco-parte1-1");
  await expect(page.getByTestId("campo-avalExperienciaTipoCursoAnterior-select")).toBeDisabled();
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
  await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("um GO do Ofertante do curso abre a tela -> vê os dados, sem controles de edição", async ({
  page,
}) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CNPJ_GO_A);
  await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  await expect(page.getByTestId("form-avaliacao")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("outro Aluno tentando acessar a URL diretamente recebe não encontrado", async ({ page }) => {
  const cdCurso = criarAvaliacaoFixture(CPF_AL_A);

  await login(page, CPF_AL_OUTRO);
  const res = await page.goto(`/avaliacoes/${CPF_AL_A}/${cdCurso}`);

  expect(res?.status()).toBe(404);
});
