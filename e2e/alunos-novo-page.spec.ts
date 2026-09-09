// e2e de /alunos/novo, pela UI real: a opção "Cadastrar aluno" aparece no
// menu de todo perfil que a cascata (AD-009) deixa criar um AL - hoje AM e
// GO - e a tela cadastra o Aluno já matriculado (AVAL-01).
//
// A ausência do item para GT/VT/VO/AL é conveniência de UI, não autorização:
// o último caso abre a URL direto com um GT logado e confere que a tela não
// oferece o formulário (o 403 da API já é coberto por usuarios.spec.ts).
import { expect, test, type Page } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getAvaliacao,
  getUsuario,
  upsertUsuario,
} from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GO = "60700070001";
const CPF_AM = "60701070129";
const CPF_GT = "60702070254";
const CPF_NOVO_ALUNO = "60703070380";
const CPF_ALUNO_SEM_CURSO = "60704070405";

const CPFS = [CPF_GO, CPF_AM, CPF_GT, CPF_NOVO_ALUNO, CPF_ALUNO_SEM_CURSO];

const menu = (page: Page) =>
  page.getByTestId("casca-cabecalho").getByTestId("navegacao-perfil");

let cdOfertanteDoGo: number;
let cdOfertanteAlheio: number;
let cdCursoDoGo: number;
let cdCursoAlheio: number;

async function logar(page: Page, cpf: string) {
  const login = await page.request.post("/api/auth/login", {
    data: { cpf, senha: SENHA },
  });
  expect(login.ok()).toBe(true);
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertanteDoGo = criarOfertante({ nome: "Ofertante do GO (alunos)", uf: "SP" })
    .cdOfertante;
  cdOfertanteAlheio = criarOfertante({ nome: "Ofertante alheio (alunos)", uf: "MG" })
    .cdOfertante;

  upsertUsuario({
    cpf: CPF_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteDoGo,
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });

  cdCursoDoGo = criarPreCurso({
    cdOfertante: cdOfertanteDoGo,
    cdVerba: criarVerba({ cdOfertante: cdOfertanteDoGo, vlVerba: 10000 }).cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;

  cdCursoAlheio = criarPreCurso({
    cdOfertante: cdOfertanteAlheio,
    cdVerba: criarVerba({ cdOfertante: cdOfertanteAlheio, vlVerba: 10000 }).cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_AM,
  }).cdCurso;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertanteDoGo, cdOfertanteAlheio]);
  deleteUsuarios(CPFS);
});

test("GO vê 'Cadastrar aluno' no menu e chega na tela pelo próprio menu", async ({
  page,
}) => {
  await logar(page, CPF_GO);
  await page.goto("/painel");

  await menu(page).getByRole("link", { name: "Cadastrar aluno" }).click();

  await expect(page).toHaveURL(/\/alunos\/novo$/);
  // `CardTitle` renderiza uma <div>, não um heading - o título é localizado
  // pelo slot do componente.
  await expect(page.locator('[data-slot="card-title"]')).toHaveText("Cadastrar aluno");
});

test("AM também vê 'Cadastrar aluno' - a cascata deixa o AM criar AL", async ({
  page,
}) => {
  await logar(page, CPF_AM);
  await page.goto("/painel");

  await expect(menu(page).getByRole("link", { name: "Cadastrar aluno" })).toHaveCount(1);
});

test("GT não vê a opção e, digitando a URL, não recebe formulário", async ({ page }) => {
  await logar(page, CPF_GT);
  await page.goto("/painel");

  await expect(menu(page).getByRole("link", { name: "Cadastrar aluno" })).toHaveCount(0);
  // O menu renderizou: a ausência acima é do item, não do menu inteiro.
  await expect(menu(page).getByRole("link", { name: "Novo usuário" })).toHaveCount(1);

  await page.goto("/alunos/novo");
  await expect(page.getByTestId("aviso-sem-permissao")).toBeVisible();
  await expect(page.getByTestId("campo-cpf-aluno")).toHaveCount(0);
});

test("GO cadastra um Aluno pela tela e ele nasce matriculado (AVAL-01)", async ({
  page,
}) => {
  await logar(page, CPF_GO);
  await page.goto("/alunos/novo");

  // AVAL-05/06: o seletor só oferece cursos do Ofertante do próprio GO.
  const opcoes = await page.locator("select#cdCurso option").allTextContents();
  expect(opcoes).toEqual(["Selecione", `Curso #${cdCursoDoGo}`]);

  await page.getByLabel("CPF").fill(CPF_NOVO_ALUNO);
  await page.getByLabel("Nome").fill("Aluna Cadastrada Pela Tela");
  await page.locator("select#cdCurso").selectOption(String(cdCursoDoGo));

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Cadastrar aluno" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_ALUNO);
  expect(criado?.tipo).toBe("AL");
  expect(criado?.criadoPor).toBe(CPF_GO);
  expect(criado?.cdOfertante).toBeNull();
  expect(getAvaliacao(CPF_NOVO_ALUNO, cdCursoDoGo)?.status).toBe("EM_ANDAMENTO");
});

test("sem curso escolhido o cadastro nem sai da tela (AVAL-01)", async ({ page }) => {
  await logar(page, CPF_GO);
  await page.goto("/alunos/novo");

  await page.getByLabel("CPF").fill(CPF_ALUNO_SEM_CURSO);
  await page.getByLabel("Nome").fill("Aluno Sem Curso");
  await page.getByRole("button", { name: "Cadastrar aluno" }).click();

  await expect(page.getByTestId("erro-novo-aluno")).toHaveText("Curso é obrigatório");
  expect(getUsuario(CPF_ALUNO_SEM_CURSO)).toBeNull();
});

test("AM enxerga no seletor os cursos de qualquer Ofertante (escopo nacional)", async ({
  page,
}) => {
  await logar(page, CPF_AM);
  await page.goto("/alunos/novo");

  const opcoes = await page.locator("select#cdCurso option").allTextContents();
  expect(opcoes).toContain(`Curso #${cdCursoDoGo}`);
  expect(opcoes).toContain(`Curso #${cdCursoAlheio}`);
});
