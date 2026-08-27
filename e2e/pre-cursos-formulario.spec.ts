// e2e de /pre-cursos/[id] (T10), pela UI real. Cobre REQ-PC-04 a REQ-PC-12
// na camada de tela.
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  encerrarPreCursoFixture,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO_A = "52131004141";
const CPF_GO_B = "52141004268";
const CPF_VO_A = "52151004384";

let cdOfertanteA: number;
let cdOfertanteB: number;
let cdVerbaA: number;

test.beforeAll(() => {
  deleteUsuarios([CPF_GO_A, CPF_GO_B, CPF_VO_A]);

  cdOfertanteA = criarOfertante({
    nome: "Ofertante Formulário Pré-Curso A",
    uf: "SP",
  }).cdOfertante;
  cdOfertanteB = criarOfertante({
    nome: "Ofertante Formulário Pré-Curso B",
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

async function login(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

// Cada AccordionItem carrega data-slot="accordion-item" (accordion.tsx) na
// ordem de BLOCOS - escopar por aí garante que um rótulo de opção repetido
// entre blocos (ex.: "Outra" em vários grupos de checkbox) nunca colide num
// `getByRole`, independente de quais outros blocos ainda estão montados.
function bloco(page: Page, indice: number): Locator {
  return page.locator('[data-slot="accordion-item"]').nth(indice - 1);
}

async function abrirBloco(page: Page, indice: number) {
  await bloco(page, indice).getByTestId(`bloco-${indice}`).click();
}

async function fecharBloco(page: Page, indice: number) {
  await bloco(page, indice).getByTestId(`bloco-${indice}`).click();
}

async function selecionar(page: Page, testIdTrigger: string, rotulo: string) {
  await page.getByTestId(testIdTrigger).click();
  await page.getByRole("option", { name: rotulo, exact: true }).click();
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
      (res) => res.url().includes("/api/pre-cursos/") && res.request().method() === "PATCH",
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

const ESCALA_BASICA = [
  "infraBasicaBanheiros",
  "infraBasicaEnergia",
  "infraBasicaSalaAula",
  "infraBasicaBiblioteca",
  "infraBasicaAcessibilidade",
  "infraBasicaLaboratorio",
  "infraBasicaAguaPotavel",
  "infraBasicaIluminacao",
  "infraBasicaConectividade",
];

const ESCALA_COMPLEMENTAR = [
  "infraComplSalaProfessores",
  "infraComplCopa",
  "infraComplAuditorio",
  "infraComplAudiovisual",
  "infraComplTecnologicos",
  "infraComplConvivencia",
  "infraComplEstacionamento",
  "infraComplAlimentacao",
];

// `omitirNomeInstituicao`: usado pelo teste do gate condicional (CA-04) -
// deixa só `publicoInstituicaoExecutoraNome` pendente para isolar a
// asserção, igual ao Independent Test da spec ("mantendo os demais campos
// obrigatórios completos").
async function preencherTodosOsCampos(
  page: Page,
  opcoes: { omitirNomeInstituicao?: boolean } = {},
) {
  await abrirBloco(page, 1);
  await selecionar(page, "campo-identifUf-select", "SP");
  await page.getByTestId("campo-identifMunicipio").fill("Cidade Teste");
  await page.getByTestId("campo-identifEntidadeResponsavel").fill("Entidade Teste");
  await page.getByTestId("campo-identifCoordenador").fill("Coordenador Teste");
  await page.getByTestId("campo-identifEmail").fill("coordenador@teste.com");
  await page.getByTestId("campo-identifTelefone").fill("11999999999");
  await fecharBloco(page, 1);

  await abrirBloco(page, 2);
  await page.getByTestId("campo-qualifEndereco").fill("Rua Teste, 123");
  await page.getByTestId("campo-qualifNomeCurso").fill("Curso de Turismo Teste");
  await selecionar(page, "campo-qualifVinculoPrograma-select", "Outro");
  await page.getByTestId("campo-qualifVinculoProgramaOutro").fill("Programa Teste");
  await marcarCheckbox(bloco(page, 2), "Sustentabilidade");
  await marcarCheckbox(bloco(page, 2), "Outra");
  await page.getByTestId("campo-qualifCaracteristicasOutra").fill("Outra característica");
  await selecionar(page, "campo-qualifModalidade-select", "Presencial");
  await selecionar(page, "campo-qualifRegiao-select", "Sudeste");
  await fecharBloco(page, 2);

  await abrirBloco(page, 3);
  await page.getByTestId("campo-planejDataInicioPrevista").fill("2026-01-10");
  await page.getByTestId("campo-planejDataTerminoPrevista").fill("2026-03-10");
  await page.getByTestId("campo-planejCargaHoraria").fill("40");
  await page.getByTestId("campo-planejNumTurmas").fill("2");
  await page.getByTestId("campo-planejNumAlunosPrevistos").fill("30");
  await page.getByTestId("campo-planejTaxaEvasaoEsperada").fill("10");
  await page.getByTestId("campo-planejObjetivo").fill("Objetivo do curso de teste");
  await fecharBloco(page, 3);

  await abrirBloco(page, 4);
  await marcarCheckbox(bloco(page, 4), "Jovens");
  await selecionar(page, "campo-publicoInstituicaoExecutora-select", "Empresa contratada");
  if (!opcoes.omitirNomeInstituicao) {
    await page.getByTestId("campo-publicoInstituicaoExecutoraNome").fill("Empresa Teste Ltda");
  }
  await fecharBloco(page, 4);

  await abrirBloco(page, 5);
  await marcarCheckbox(bloco(page, 5), "Poder público municipal");
  await fecharBloco(page, 5);

  await abrirBloco(page, 6);
  for (const chave of ESCALA_BASICA) {
    await selecionar(page, `campo-${chave}-select`, "3 - Regular");
  }
  await fecharBloco(page, 6);

  await abrirBloco(page, 7);
  for (const chave of ESCALA_COMPLEMENTAR) {
    await selecionar(page, `campo-${chave}-select`, "3 - Regular");
  }
  await fecharBloco(page, 7);

  await abrirBloco(page, 8);
  await marcarRadio(bloco(page, 8), "Sim");
  await selecionar(page, "campo-infraEspecificaDisponibilidade-select", "Disponível");
  await selecionar(page, "campo-infraEspecificaSuficiencia-select", "Suficiente");
  await selecionar(page, "campo-infraEspecificaManutencao-select", "Em bom estado");
  await fecharBloco(page, 8);

  await abrirBloco(page, 9);
  await marcarCheckbox(bloco(page, 9), "Formação acadêmica");
  await selecionar(page, "campo-docenteFormaContratacao-select", "Outra");
  await page.getByTestId("campo-docenteFormaContratacaoOutra").fill("Contratação especial");
  await marcarRadio(bloco(page, 9), "Graduação");
  await marcarCheckbox(bloco(page, 9), "Equidade de gênero na seleção");
  await fecharBloco(page, 9);

  await abrirBloco(page, 10);
  await marcarCheckbox(bloco(page, 10), "Outra");
  await page.getByTestId("campo-divulgacaoEstrategiasOutra").fill("Divulgação especial");
  await fecharBloco(page, 10);

  await abrirBloco(page, 11);
  await marcarCheckbox(bloco(page, 11), "SEBRAE");
  await fecharBloco(page, 11);

  await abrirBloco(page, 12);
  await marcarCheckbox(bloco(page, 12), "Outra");
  await page.getByTestId("campo-suporteEstrategiasOutra").fill("Apoio especial");
  await fecharBloco(page, 12);
}

test("GO salva um bloco parcial e o dado persiste após reload", async ({ page }) => {
  const { cdCurso } = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  });

  await login(page, CPF_GO_A);
  await page.goto(`/pre-cursos/${cdCurso}`);

  await abrirBloco(page, 1);
  await page.getByTestId("campo-identifMunicipio").fill("Cidade Rascunho");
  const resposta = await salvarRascunho(page);
  expect(resposta.ok()).toBe(true);
  await expect(page.getByTestId("erro-pre-curso")).toHaveCount(0);

  await page.reload();
  await abrirBloco(page, 1);
  await expect(page.getByTestId("campo-identifMunicipio")).toHaveValue("Cidade Rascunho");
});

test("encerramento bloqueado por campo condicional pendente referencia o campo", async ({
  page,
}) => {
  const { cdCurso } = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  });

  await login(page, CPF_GO_A);
  await page.goto(`/pre-cursos/${cdCurso}`);

  // Demais 55 campos completos (Independent Test da spec: "mantendo os
  // demais campos obrigatórios completos") - isola a asserção no único
  // campo que falta.
  await preencherTodosOsCampos(page, { omitirNomeInstituicao: true });

  const respostaSalvar = await salvarRascunho(page);
  expect(respostaSalvar.ok()).toBe(true);
  await expect(page.getByTestId("erro-pre-curso")).toHaveCount(0);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(false);

  await expect(page.getByTestId("lista-pendencias")).toBeVisible();
  await expect(page.getByTestId("pendencia-publicoInstituicaoExecutoraNome")).toBeVisible();
  await expect(page.getByTestId("lista-pendencias").locator("li")).toHaveCount(1);
});

test("GO preenche os 56 campos e encerra o pré-curso de forma irreversível", async ({ page }) => {
  const { cdCurso } = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  });

  await login(page, CPF_GO_A);
  await page.goto(`/pre-cursos/${cdCurso}`);

  await preencherTodosOsCampos(page);

  const respostaSalvar = await salvarRascunho(page);
  expect(respostaSalvar.ok()).toBe(true);
  await expect(page.getByTestId("erro-pre-curso")).toHaveCount(0);

  const respostaEncerrar = await encerrar(page);
  expect(respostaEncerrar.ok()).toBe(true);

  await expect(page.getByTestId("status-pre-curso")).toHaveText("Encerrado");
  await expect(page.getByTestId("lista-pendencias")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);

  await abrirBloco(page, 1);
  await expect(page.getByTestId("campo-identifMunicipio")).toBeDisabled();
});

test("pré-curso encerrado é somente leitura, sem botões de ação", async ({ page }) => {
  const { cdCurso } = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  });
  encerrarPreCursoFixture(cdCurso);

  await login(page, CPF_GO_A);
  await page.goto(`/pre-cursos/${cdCurso}`);

  await expect(page.getByTestId("status-pre-curso")).toHaveText("Encerrado");
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);

  await abrirBloco(page, 1);
  await expect(page.getByTestId("campo-identifMunicipio")).toBeDisabled();
});

test("VO visualiza os dados sem controles de edição", async ({ page }) => {
  const { cdCurso } = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  });

  await login(page, CPF_VO_A);
  await page.goto(`/pre-cursos/${cdCurso}`);

  await expect(page.getByTestId("form-pre-curso")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
});

test("GO de outro Ofertante tentando acessar diretamente recebe não encontrado", async ({
  page,
}) => {
  const { cdCurso } = criarPreCurso({
    cdOfertante: cdOfertanteA,
    cdVerba: cdVerbaA,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_A,
  });

  await login(page, CPF_GO_B);
  const res = await page.goto(`/pre-cursos/${cdCurso}`);

  expect(res?.status()).toBe(404);
});
