// e2e de /usuarios, a "Gestão de usuários", pela UI real. Era o e2e de
// /usuarios/novo (T29); a criação mudou de endereço (GU-01/GU-03) e o antigo
// redireciona (GU-02). Cobre CA-AU-05 (GO logado só vê
// GO/VO/AL como opções de tipo e cria um AL já matriculado), REQ-OV-08 (AM
// logado informa os dados organizacionais do GO e a verba no mesmo
// formulário) e AVAL-01 (curso obrigatório na criação do Aluno).
//
// UGO-14/AD-043: sem `model Ofertante` separado, criar um GO deixa de ser
// "escolher um Ofertante já cadastrado" - o próprio GO informa CNPJ+UF (T15).
// A lista de GOs existentes passa a servir só para vincular um VO a um deles.
import { expect, test, type Page } from "@playwright/test";
import {
  criarAvaliacao,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  getAvaliacao,
  getUsuario,
  getVerba,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("27");

const CNPJ_GO_CRIADOR = gerarCnpjValido(1);
const CPF_NOVO_AL = "40310041090";
const CPF_AM_CRIADOR = "40320042006";
const CNPJ_NOVO_GO = gerarCnpjValido(2);
const CPF_NOVO_VO = "40350045020";
const CPF_NOVO_AL_SEM_CURSO = "40440044049";

const NOME_GO_EXISTENTE = "GO Já Cadastrado (T29)";

const CPFS = [
  CNPJ_GO_CRIADOR,
  CPF_NOVO_AL,
  CPF_AM_CRIADOR,
  CNPJ_NOVO_GO,
  CPF_NOVO_VO,
  CPF_NOVO_AL_SEM_CURSO,
];

let cdCursoDoGo: number;

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteVerbasPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO_CRIADOR,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: NOME_GO_EXISTENTE,
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_AM_CRIADOR, tipo: "AM", senha: SENHA, primeiraVez: false });

  // AVAL-01: sem curso no Ofertante do GO não há como criar um Aluno pela UI.
  const cdVerba = criarVerba({ cdOfertante: CNPJ_GO_CRIADOR, vlVerba: 10000 }).cdVerba;
  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO_CRIADOR,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_CRIADOR,
  }).cdCurso;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteVerbasPorOfertante([CNPJ_GO_CRIADOR, CNPJ_NOVO_GO]);
  deleteUsuarios(CPFS);
});

test("CA-AU-05: GO logado só vê VO/AL como opções e consegue criar um AL pela UI", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/usuarios$/);

  const opcoes = await page.locator("select#tipo option").allTextContents();
  // As opções mostram o tipo por extenso, depois do "Selecione" inicial.
  expect(opcoes).toEqual(["Selecione", "Visualizador Ofertante", "Aluno"]);

  // O campo de documento só aparece depois de escolher o tipo.
  await page.locator("select#tipo").selectOption("AL");
  await page.getByLabel("CPF").fill(CPF_NOVO_AL);
  await page.getByLabel("Nome").fill("Aluno Criado Pela UI");
  await page.locator("select#cdCurso").selectOption(String(cdCursoDoGo));

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_AL);
  expect(criado?.tipo).toBe("AL");
  expect(criado?.criadoPor).toBe(CNPJ_GO_CRIADOR);
  expect(getAvaliacao(CPF_NOVO_AL, cdCursoDoGo)?.status).toBe("EM_ANDAMENTO");
});

test("GO logado não vê os campos de Ofertante/verba (não gere verba)", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");
  await page.locator("select#tipo").selectOption("VO");

  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await expect(page.locator("#vlVerba")).toHaveCount(0);
});

test("OGO-09/OGO-12: AM logado cria um GO só com CNPJ, nome e verba - a tela não pede nenhum dado organizacional", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");

  // OGO-13: para os outros tipos o E-mail continua sendo pedido.
  await page.locator("select#tipo").selectOption("VO");
  await expect(page.locator("#email")).toBeVisible();

  // OGO-12: com GO, só CNPJ, nome e verba. Nada de Ofertante existente, nem
  // E-mail, UF, Responsável, Telefone ou Município.
  await page.locator("select#tipo").selectOption("GO");
  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  for (const campo of ["email", "uf", "responsavel", "telefone", "municipio"]) {
    await expect(page.locator(`#${campo}`)).toHaveCount(0);
  }
  await expect(page.locator("#vlVerba")).toBeVisible();

  // Com GO selecionado o campo de documento é rotulado "CNPJ".
  await page.getByLabel("CNPJ").fill(CNPJ_NOVO_GO);
  await page.getByLabel("Nome").fill("GO Criado Pela UI");
  await page.getByLabel("Valor da verba").fill("7500");
  await page.getByLabel("Data da verba").fill("2026-04-20");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CNPJ_NOVO_GO);
  expect(criado?.tipo).toBe("GO");
  expect(criado?.nome).toBe("GO Criado Pela UI");
  expect(criado?.cdOfertante).toBeNull();
  expect(criado?.criadoPor).toBe(CPF_AM_CRIADOR);

  const verba = getVerba((await resposta.json()).verba.cdVerba);
  expect(verba?.cdOfertante).toBe(CNPJ_NOVO_GO);
  expect(Number(verba?.vlVerba)).toBe(7500);
});

test("UGO-14: AM logado vincula um VO a um GO existente, escolhido de uma lista", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");

  // O seletor de Ofertante só existe depois de escolher o tipo VO.
  await expect(page.locator("select#cdOfertante")).toHaveCount(0);
  await page.locator("select#tipo").selectOption("VO");
  await expect(page.locator("select#cdOfertante")).toBeVisible();

  await page.getByLabel("CPF").fill(CPF_NOVO_VO);
  await page.getByLabel("Nome").fill("VO Criado Pela UI");
  await page.locator("select#cdOfertante").selectOption({ label: NOME_GO_EXISTENTE });

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios")),
    page.getByRole("button", { name: "Criar usuário" }).click(),
  ]);
  expect(resposta.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_VO);
  expect(criado?.tipo).toBe("VO");
  expect(criado?.cdOfertante).toBe(CNPJ_GO_CRIADOR);
  expect(criado?.criadoPor).toBe(CPF_AM_CRIADOR);
});

test("REQ-OV-08 (equivalente/UGO-14): AM que tenta criar VO sem escolher o Ofertante é barrado antes do envio", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");
  await page.locator("select#tipo").selectOption("VO");
  await page.getByLabel("CPF").fill("40360046037");
  await page.getByLabel("Nome").fill("VO Sem Ofertante");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("Ofertante é obrigatório")).toBeVisible();
});

test("AVAL-01: o GO só vê no seletor os cursos do próprio Ofertante e não envia sem escolher um", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios");

  // O seletor de curso só existe para o tipo AL.
  await page.locator("select#tipo").selectOption("VO");
  await expect(page.locator("select#cdCurso")).toHaveCount(0);

  await page.locator("select#tipo").selectOption("AL");
  const opcoes = await page.locator("select#cdCurso option").allTextContents();
  expect(opcoes).toEqual(["Selecione", `Curso #${cdCursoDoGo}`]);

  await page.getByLabel("CPF").fill(CPF_NOVO_AL_SEM_CURSO);
  await page.getByLabel("Nome").fill("Aluno Sem Curso");
  await page.getByRole("button", { name: "Criar usuário" }).click();

  await expect(page.getByText("Curso é obrigatório")).toBeVisible();
  expect(getUsuario(CPF_NOVO_AL_SEM_CURSO)).toBeNull();
});

test("GU-02: abrir /usuarios/novo termina em /usuarios com o formulário de criação", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/usuarios/novo");

  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.locator("select#tipo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar usuário" })).toBeVisible();
});

// --- Lista da Gestão de usuários (GU-06..GU-15, GU-49) ---------------------
//
// Prefixo "54" para CPFs e CNPJs: espaço de numeração próprio desta lista
// (`e2e/usuarios-gestao.spec.ts` usa "53", a integração "48"/"49").
//
// Os nomes buscados não têm dígito. Desde a regra nova de GU-11 (busca com
// letra compara só o nome) isso deixou de ser necessário, mas não muda nada.

function calcularDigitoVerificadorCpf(digitos: number[]): number {
  const pesoInicial = digitos.length + 1;
  const soma = digitos.reduce(
    (acc, digito, index) => acc + digito * (pesoInicial - index),
    0,
  );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCpfLista(indice: number): string {
  const base9 = `54000${String(indice).padStart(4, "0")}`;
  const digitos = base9.split("").map(Number);
  const d1 = calcularDigitoVerificadorCpf(digitos);
  const d2 = calcularDigitoVerificadorCpf([...digitos, d1]);
  return `${base9}${d1}${d2}`;
}

const CNPJ_GO_LISTA = geradorDeCnpj("54")(1);
const CPF_VO_LISTA = gerarCpfLista(1);
const CPF_AL_LISTA = gerarCpfLista(2);
const CPF_GT_LISTA = gerarCpfLista(3);
const CPF_VT_SEM_LISTA = gerarCpfLista(4);
const CPF_CRIADO_PELA_LISTA = gerarCpfLista(5);

const NOME_VO_LISTA = "GU-E2E Lista VO";
const EMAIL_VO_LISTA = "vo.lista@exemplo.com";
const NOME_AL_LISTA = "GU-E2E Lista Matriculado";
const EMAIL_AL_LISTA = "aluno.lista@exemplo.com";

// 21 VTs: uma página cheia (20) e mais um, para "Página 1 de 2" (GU-13/14).
const PAGINADOS = "ABCDEFGHIJKLMNOPQRSTU".split("").map((letra, i) => ({
  documento: gerarCpfLista(100 + i),
  nome: `GU-E2E Listagem Paginada ${letra}`,
}));

const DOCUMENTOS_LISTA = [
  CNPJ_GO_LISTA,
  CPF_VO_LISTA,
  CPF_AL_LISTA,
  CPF_GT_LISTA,
  CPF_VT_SEM_LISTA,
  CPF_CRIADO_PELA_LISTA,
  ...PAGINADOS.map((paginado) => paginado.documento),
];

async function entrar(page: Page, documento: string) {
  const login = await page.request.post("/api/auth/login", {
    data: { documento, senha: SENHA },
  });
  expect(login.ok()).toBe(true);
}

const linhas = (page: Page) => page.getByTestId("lista-usuarios").getByRole("listitem");
const chips = (page: Page) =>
  page.getByRole("group", { name: "Filtrar por tipo" }).getByRole("button");

test.describe("lista da Gestão de usuários", () => {
  test.beforeAll(async () => {
    // ~10 fixtures por processo `tsx`, mais 21 criações pela API: passa do
    // timeout padrão de um hook.
    test.setTimeout(120_000);

    deleteAvaliacoesPorCpf([CPF_AL_LISTA]);
    deletePreCursosPorOfertante([CNPJ_GO_LISTA]);
    deleteVerbasPorOfertante([CNPJ_GO_LISTA]);
    deleteUsuarios(DOCUMENTOS_LISTA);

    upsertUsuario({ cpf: CNPJ_GO_LISTA, tipo: "GO", senha: SENHA, primeiraVez: false });
    upsertUsuario({
      cpf: CPF_VO_LISTA,
      tipo: "VO",
      cdOfertante: CNPJ_GO_LISTA,
      nome: NOME_VO_LISTA,
      email: EMAIL_VO_LISTA,
    });
    upsertUsuario({ cpf: CPF_AL_LISTA, tipo: "AL", nome: NOME_AL_LISTA, email: EMAIL_AL_LISTA });
    // GU-05: o Aluno entra no escopo do GO pela matrícula num curso dele.
    const cdVerba = criarVerba({ cdOfertante: CNPJ_GO_LISTA, vlVerba: 1000 }).cdVerba;
    const { cdCurso } = criarPreCurso({
      cdOfertante: CNPJ_GO_LISTA,
      cdVerba,
      vlCursoAlocado: 100,
      criadoPor: CNPJ_GO_LISTA,
    });
    criarAvaliacao({ cpf: CPF_AL_LISTA, cdCurso });

    upsertUsuario({ cpf: CPF_GT_LISTA, tipo: "GT", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CPF_VT_SEM_LISTA, tipo: "VT", senha: SENHA, primeiraVez: false });

    // Os 21 VTs saem pela API de criação: um processo `tsx` por fixture
    // custaria cerca de um minuto só aqui.
    const cliente = await novoCliente();
    const login = await cliente.post("/api/auth/login", {
      data: { documento: CPF_GT_LISTA, senha: SENHA },
    });
    const idSessao = idSessaoDaResposta(login);
    const idCsrf = idCsrfDaResposta(login);
    if (!idSessao || !idCsrf) throw new Error("Login do GT da lista não emitiu sessão/CSRF");

    for (const { documento, nome } of PAGINADOS) {
      const res = await cliente.post("/api/usuarios", {
        data: { documento, nome, tipo: "VT" },
        headers: cabecalhosAutenticados(idSessao, idCsrf),
      });
      expect(res.status()).toBe(201);
    }
    await cliente.dispose();
  });

  test.afterAll(() => {
    deleteAvaliacoesPorCpf([CPF_AL_LISTA]);
    deletePreCursosPorOfertante([CNPJ_GO_LISTA]);
    deleteVerbasPorOfertante([CNPJ_GO_LISTA]);
    deleteUsuarios(DOCUMENTOS_LISTA);
  });

  test("GU-07/GU-09: GO vê os chips do seu escopo e cada linha com nome, documento, tipo e e-mail", async ({
    page,
  }) => {
    await entrar(page, CNPJ_GO_LISTA);
    await page.goto("/usuarios");

    await expect(chips(page)).toHaveText(["Todos", "Visualizador Ofertante", "Aluno"]);

    // GU-05: o escopo de um GO recém-criado é exatamente o VO e o Aluno dele.
    await expect(linhas(page)).toHaveCount(2);

    const vo = linhas(page).filter({ hasText: NOME_VO_LISTA });
    await expect(vo).toContainText(CPF_VO_LISTA);
    await expect(vo).toContainText("Visualizador Ofertante");
    await expect(vo).toContainText(EMAIL_VO_LISTA);

    const aluno = linhas(page).filter({ hasText: NOME_AL_LISTA });
    await expect(aluno).toContainText(CPF_AL_LISTA);
    await expect(aluno).toContainText("Aluno");
    await expect(aluno).toContainText(EMAIL_AL_LISTA);
  });

  test("GU-11..GU-15/GU-49: GT busca, pagina e filtra, e a URL continua /usuarios", async ({
    page,
  }) => {
    await entrar(page, CPF_GT_LISTA);
    await page.goto("/usuarios");

    const busca = page.getByLabel("Buscar usuários");
    const anterior = page.getByRole("button", { name: "Anterior" });
    const proxima = page.getByRole("button", { name: "Próxima" });

    await busca.fill("Listagem Paginada");
    await expect(linhas(page).first()).toContainText("GU-E2E Listagem Paginada A");
    await expect(linhas(page)).toHaveCount(20);
    await expect(linhas(page).filter({ hasNotText: "GU-E2E Listagem Paginada" })).toHaveCount(0);
    await expect(page.getByText("Página 1 de 2", { exact: true })).toBeVisible();
    await expect(anterior).toBeDisabled();

    await proxima.click();
    await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page)).toContainText("GU-E2E Listagem Paginada U");
    await expect(proxima).toBeDisabled();
    await expect(anterior).toBeEnabled();

    // GU-15: trocar o chip volta à página 1, mantendo a busca.
    await chips(page).filter({ hasText: "Visualizador Turismo" }).click();
    await expect(page.getByText("Página 1 de 2", { exact: true })).toBeVisible();
    await expect(linhas(page).first()).toContainText("GU-E2E Listagem Paginada A");

    // GU-15: alterar a busca também volta à página 1.
    await proxima.click();
    await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
    await busca.fill("Listagem Paginada T");
    await expect(page.getByText("Página 1 de 1", { exact: true })).toBeVisible();
    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page)).toContainText("GU-E2E Listagem Paginada T");

    // GU-12
    await busca.fill("Listagem Paginada Inexistente");
    await expect(page.getByText("Nenhum usuário encontrado.")).toBeVisible();
    await expect(linhas(page)).toHaveCount(0);

    // GU-49: nada disso foi para a URL.
    expect(page.url()).toMatch(/\/usuarios$/);
  });

  test("GU-08: criar pelo formulário recarrega a lista, com o filtro mantido, sem recarregar a página", async ({
    page,
  }) => {
    await entrar(page, CPF_GT_LISTA);
    await page.goto("/usuarios");
    // Um recarregamento de página apagaria esta marca.
    await page.evaluate(() => {
      (window as unknown as { semRecarga: boolean }).semRecarga = true;
    });

    await page.getByLabel("Buscar usuários").fill("Criado Pela Lista");
    await expect(page.getByText("Nenhum usuário encontrado.")).toBeVisible();

    await page.locator("select#tipo").selectOption("VT");
    await page.getByLabel("CPF").fill(CPF_CRIADO_PELA_LISTA);
    await page.getByLabel("Nome").fill("GU-E2E Criado Pela Lista");
    await page.getByRole("button", { name: "Criar usuário" }).click();

    await expect(linhas(page)).toHaveCount(1);
    await expect(linhas(page)).toContainText("GU-E2E Criado Pela Lista");
    expect(getUsuario(CPF_CRIADO_PELA_LISTA)?.tipo).toBe("VT");
    expect(
      await page.evaluate(() => (window as unknown as { semRecarga?: boolean }).semRecarga),
    ).toBe(true);
  });

  test("GU-06: VT abre /usuarios e não vê lista", async ({ page }) => {
    await entrar(page, CPF_VT_SEM_LISTA);
    await page.goto("/usuarios");

    // A página renderizou: o aviso do formulário está lá.
    await expect(page.getByText("Seu perfil não pode criar usuários.")).toBeVisible();
    await expect(page.getByTestId("lista-usuarios")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Filtrar por tipo" })).toHaveCount(0);
    await expect(page.getByText(/Página \d+ de \d+/)).toHaveCount(0);
    await expect(page.getByText("Nenhum usuário encontrado.")).toHaveCount(0);
  });
});

// --- Edição na própria linha (GU-22, GU-23, GU-31, GU-40, GU-45, GU-46) -----

const CPF_GT_EDICAO = gerarCpfLista(300);
const CPF_VT_EDICAO = gerarCpfLista(301);
const CPF_AM_EDICAO = gerarCpfLista(302);
const CPF_VT_OCUPADO = gerarCpfLista(303);
const CNPJ_GO_EDICAO = geradorDeCnpj("54")(2);
const CPF_VT_SEM_NOME = gerarCpfLista(304);

const DOCUMENTOS_EDICAO = [
  CPF_GT_EDICAO,
  CPF_VT_EDICAO,
  CPF_AM_EDICAO,
  CPF_VT_OCUPADO,
  CNPJ_GO_EDICAO,
  CPF_VT_SEM_NOME,
];

test.describe("edição na linha da Gestão de usuários", () => {
  test.beforeAll(async () => {
    test.setTimeout(60_000);

    deleteUsuarios(DOCUMENTOS_EDICAO);
    upsertUsuario({
      cpf: CPF_GT_EDICAO,
      tipo: "GT",
      senha: SENHA,
      primeiraVez: false,
      nome: "GU-E2E Edicao GT",
    });
    upsertUsuario({
      cpf: CPF_VT_EDICAO,
      tipo: "VT",
      senha: SENHA,
      primeiraVez: false,
      nome: "GU-E2E Edicao VT",
      email: "vt.edicao@exemplo.com",
    });
    upsertUsuario({ cpf: CPF_AM_EDICAO, tipo: "AM", nome: "GU-E2E Edicao AM" });
    upsertUsuario({ cpf: CPF_VT_OCUPADO, tipo: "VT", nome: "GU-E2E Edicao Ocupado" });
    upsertUsuario({ cpf: CNPJ_GO_EDICAO, tipo: "GO", nome: "GU-E2E Edicao GO" });
    upsertUsuario({ cpf: CPF_VT_SEM_NOME, tipo: "VT", nome: null });
  });

  test.afterAll(() => {
    deleteUsuarios(DOCUMENTOS_EDICAO);
  });

  /** GT logado, com a lista já filtrada pelos fixtures desta seção. */
  async function abrirListaDoGT(page: Page) {
    await entrar(page, CPF_GT_EDICAO);
    await page.goto("/usuarios");
    await page.getByLabel("Buscar usuários").fill("Edicao");
    await expect(linhas(page)).toHaveCount(5);
  }

  // A linha sai pelo documento, que aparece nela mesmo em edição.
  const linhaDe = (page: Page, documento: string) =>
    linhas(page).filter({ hasText: documento });

  test("GU-22: GT vê Editar na linha de um VT, e não na de um AM nem na própria", async ({
    page,
  }) => {
    await abrirListaDoGT(page);

    const editar = { name: "Editar" };
    await expect(linhaDe(page, CPF_VT_EDICAO).getByRole("button", editar)).toHaveCount(1);
    await expect(linhaDe(page, CPF_AM_EDICAO).getByRole("button", editar)).toHaveCount(0);
    await expect(linhaDe(page, CPF_GT_EDICAO).getByRole("button", editar)).toHaveCount(0);
  });

  test("GU-23/GU-31: editar o nome do VT fecha a linha e mostra o nome novo", async ({
    page,
  }) => {
    await abrirListaDoGT(page);
    const linha = linhaDe(page, CPF_VT_EDICAO);

    await linha.getByRole("button", { name: "Editar" }).click();
    await expect(linha.getByLabel("Nome")).toHaveValue("GU-E2E Edicao VT");
    await expect(linha.getByLabel("E-mail")).toHaveValue("vt.edicao@exemplo.com");
    await expect(linha.getByLabel("CPF")).toHaveValue(CPF_VT_EDICAO);
    await expect(linha.getByRole("button", { name: "Cancelar" })).toBeVisible();
    await expect(linha.getByRole("button", { name: "Resetar senha" })).toBeVisible();

    await linha.getByLabel("Nome").fill("GU-E2E Edicao VT Renomeado");
    await linha.getByRole("button", { name: "Salvar" }).click();

    await expect(linha).toContainText("GU-E2E Edicao VT Renomeado");
    await expect(linha.getByRole("button", { name: "Salvar" })).toHaveCount(0);
    await expect(linha.getByRole("textbox")).toHaveCount(0);
    expect(getUsuario(CPF_VT_EDICAO)?.nome).toBe("GU-E2E Edicao VT Renomeado");
  });

  test("GU-31: trocar o CPF por um já cadastrado mostra o erro na linha, que segue aberta", async ({
    page,
  }) => {
    await abrirListaDoGT(page);
    const linha = linhaDe(page, CPF_VT_EDICAO);

    await linha.getByRole("button", { name: "Editar" }).click();
    await linha.getByLabel("CPF").fill(CPF_VT_OCUPADO);
    await linha.getByRole("button", { name: "Salvar" }).click();

    await expect(linha).toContainText("Documento já cadastrado");
    await expect(linha.getByRole("button", { name: "Salvar" })).toBeVisible();
    await expect(linha.getByLabel("CPF")).toHaveValue(CPF_VT_OCUPADO);
    expect(getUsuario(CPF_VT_EDICAO)?.tipo).toBe("VT");
    expect(getUsuario(CPF_VT_OCUPADO)?.nome).toBe("GU-E2E Edicao Ocupado");
  });

  test("GU-40: o documento é CNPJ de 14 dígitos para GO e CPF de 11 para VT, só dígitos", async ({
    page,
  }) => {
    await abrirListaDoGT(page);

    const go = linhaDe(page, CNPJ_GO_EDICAO);
    await go.getByRole("button", { name: "Editar" }).click();
    await expect(go.getByLabel("CPF")).toHaveCount(0);
    // Digitado tecla a tecla, como o gestor faria: pontuação e excesso caem.
    await go.getByLabel("CNPJ").fill("");
    await go.getByLabel("CNPJ").pressSequentially("11.222.333/0001-8199");
    await expect(go.getByLabel("CNPJ")).toHaveValue("11222333000181");
    await expect(go.getByLabel("CNPJ")).toHaveAttribute("maxlength", "14");
    await go.getByRole("button", { name: "Cancelar" }).click();

    const vt = linhaDe(page, CPF_VT_EDICAO);
    await vt.getByRole("button", { name: "Editar" }).click();
    await expect(vt.getByLabel("CNPJ")).toHaveCount(0);
    await vt.getByLabel("CPF").fill("");
    await vt.getByLabel("CPF").pressSequentially("123.456.789-0123");
    await expect(vt.getByLabel("CPF")).toHaveValue("12345678901");
    await expect(vt.getByLabel("CPF")).toHaveAttribute("maxlength", "11");
  });

  test("edge case: corrigir só o e-mail de um usuário sem nome grava o e-mail sem exigir nome", async ({
    page,
  }) => {
    await entrar(page, CPF_GT_EDICAO);
    await page.goto("/usuarios");
    await page.getByLabel("Buscar usuários").fill(CPF_VT_SEM_NOME);
    await expect(linhas(page)).toHaveCount(1);
    const linha = linhaDe(page, CPF_VT_SEM_NOME);

    await linha.getByRole("button", { name: "Editar" }).click();
    await linha.getByLabel("E-mail").fill("sem.nome@exemplo.com");
    await linha.getByRole("button", { name: "Salvar" }).click();

    await expect(linha).toContainText("sem.nome@exemplo.com");
    await expect(linha.getByRole("button", { name: "Salvar" })).toHaveCount(0);
    const persistido = getUsuario(CPF_VT_SEM_NOME);
    expect(persistido?.email).toBe("sem.nome@exemplo.com");
    expect(persistido?.nome).toBeNull();
  });

  test("GU-45/GU-46: resetar a senha pede confirmação na linha e depois avisa", async ({
    page,
  }) => {
    await abrirListaDoGT(page);
    const linha = linhaDe(page, CPF_VT_EDICAO);

    await linha.getByRole("button", { name: "Editar" }).click();
    await linha.getByRole("button", { name: "Resetar senha" }).click();

    // GU-45: até confirmar, nada foi enviado.
    await expect(linha.getByRole("button", { name: "Confirmar reset" })).toBeVisible();
    await expect(linha.getByRole("button", { name: "Cancelar" })).toBeVisible();
    expect(getUsuario(CPF_VT_EDICAO)?.senhaHash).not.toBeNull();

    await linha.getByRole("button", { name: "Confirmar reset" }).click();

    await expect(
      linha.getByText(
        "Senha resetada. No próximo acesso, o usuário entra com a senha em branco.",
        { exact: true },
      ),
    ).toBeVisible();
    const resetado = getUsuario(CPF_VT_EDICAO);
    expect(resetado?.senhaHash).toBeNull();
    expect(resetado?.primeiraVez).toBe(true);
    // GU-49: editar e resetar também não tocam a URL.
    expect(page.url()).toMatch(/\/usuarios$/);
  });
});
