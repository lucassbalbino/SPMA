// e2e da feature identidade-visual.
//
// T1 cobre os dois defeitos de base observados no tour visual de 2026-08-29
// (UI-20 e UI-21). Os dois são medidos por `getComputedStyle` em `/login` -
// a tela mais barata do sistema (sem sessão, sem banco) e já coberta por
// `login-page.spec.ts`. A verificação é do valor computado, não de inspeção
// visual: o defeito é justamente que o CSS escrito não chega a valer.
import { expect, test, type Page } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

async function logar(page: Page, cpf: string, senha: string) {
  const res = await page.request.post("/api/auth/login", { data: { cpf, senha } });
  expect(res.ok()).toBe(true);
}

test("UI-20: o corpo do documento renderiza na Geist, não na serifada de fallback", async ({
  page,
}) => {
  await page.goto("/login");

  const fontFamily = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );

  // A autorreferência `--font-sans: var(--font-sans)` invalida a variável, e
  // o navegador cai na família inicial (serifada). As duas metades do
  // critério são afirmadas separadamente (L-014): a fonte certa chegou E a
  // de fallback não é a que está valendo.
  expect(fontFamily).toContain("Geist");
  expect(fontFamily).not.toMatch(/Times|^serif$/i);
});

test("UI-21: as utilidades de espaçamento do Tailwind valem (CardContent tem padding lateral)", async ({
  page,
}) => {
  await page.goto("/login");

  const paddingLeft = await page.evaluate(() => {
    const conteudo = document.querySelector('[data-slot="card-content"]');
    if (!conteudo) {
      throw new Error("[data-slot=card-content] não encontrado em /login");
    }
    return getComputedStyle(conteudo).paddingLeft;
  });

  // `CardContent` declara `px-(--card-spacing)`. Enquanto o reset
  // `* { padding: 0 }` estiver fora de `@layer`, ele vence `@layer utilities`
  // e zera esse padding.
  expect(paddingLeft).not.toBe("0px");
});

// ---------------------------------------------------------------------------
// T5: casca comum das rotas protegidas (UI-01, UI-06, UI-07).
// ---------------------------------------------------------------------------

const SENHA = "SenhaValida123";
const CPF_CASCA = "50102030499";
const NOME_CASCA = "Fulana de Tal da Casca";
const CPF_PRIMEIRA_VEZ = "50102030570";
const CPF_GO_SEM_OFERTANTE = "50102030650";
const CPF_NOME_LONGO = "50102031460";
const NOME_LONGO =
  "Maria Aparecida Buarque de Hollanda Nascimento Vasconcelos Albuquerque";
const CPFS_CASCA = [
  CPF_CASCA,
  CPF_PRIMEIRA_VEZ,
  CPF_GO_SEM_OFERTANTE,
  CPF_NOME_LONGO,
];

test.describe("casca comum", () => {
  test.beforeAll(() => {
    deleteUsuarios(CPFS_CASCA);
    upsertUsuario({
      cpf: CPF_CASCA,
      nome: NOME_CASCA,
      tipo: "GT",
      senha: SENHA,
      primeiraVez: false,
    });
    upsertUsuario({
      cpf: CPF_PRIMEIRA_VEZ,
      tipo: "AL",
      senha: null,
      primeiraVez: true,
    });
    upsertUsuario({
      cpf: CPF_GO_SEM_OFERTANTE,
      tipo: "GO",
      senha: SENHA,
      primeiraVez: false,
      cdOfertante: null,
    });
    upsertUsuario({
      cpf: CPF_NOME_LONGO,
      nome: NOME_LONGO,
      tipo: "GT",
      senha: SENHA,
      primeiraVez: false,
    });
  });

  test.afterAll(() => {
    deleteUsuarios(CPFS_CASCA);
  });

  test("UI-01: o cabeçalho com a marca aparece em /painel e em /avaliacoes", async ({
    page,
  }) => {
    await logar(page, CPF_CASCA, SENHA);

    // Duas rotas diferentes: prova que o cabeçalho é da casca, não da página.
    await page.goto("/painel");
    await expect(page.getByTestId("casca-cabecalho")).toContainText("SPMA");

    await page.goto("/avaliacoes");
    await expect(page.getByTestId("casca-cabecalho")).toContainText("SPMA");
  });

  test("UI-01: o cabeçalho identifica o usuário logado por nome e sigla do perfil", async ({
    page,
  }) => {
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    const cabecalho = page.getByTestId("casca-cabecalho");
    await expect(cabecalho).toContainText(NOME_CASCA);
    await expect(cabecalho).toContainText("GT");
    // UI-01 exige os quatro elementos NO cabecalho, nao apenas na pagina.
    await expect(cabecalho.getByTestId("navegacao-perfil")).toHaveCount(1);
    await expect(cabecalho.getByRole("button", { name: "Sair" })).toHaveCount(1);
  });

  test("REQ-SEC-12: o CPF do usuário logado não aparece em lugar nenhum do documento", async ({
    page,
  }) => {
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    expect(await page.content()).not.toContain(CPF_CASCA);
  });

  test("UI-06: o conteudo fica num <main> unico, centralizado e de largura maxima", async ({
    page,
  }) => {
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    await expect(page.locator("main")).toHaveCount(1);
    // Em uma segunda rota tambem: o container e da casca, nao da pagina.
    await page.goto("/avaliacoes");
    await expect(page.locator("main")).toHaveCount(1);

    // Contar o <main> nao prova "centralizado e de largura maxima fixa".
    // Medir max-width e a simetria das margens prova.
    const medidas = await page.locator("main").evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);
      const caixa = elemento.getBoundingClientRect();
      return {
        maxWidth: estilo.maxWidth,
        paddingTop: estilo.paddingTop,
        folgaEsquerda: caixa.left,
        folgaDireita: document.documentElement.clientWidth - caixa.right,
      };
    });

    expect(medidas.maxWidth).not.toBe("none");
    expect(medidas.paddingTop).not.toBe("0px");
    expect(Math.abs(medidas.folgaEsquerda - medidas.folgaDireita)).toBeLessThanOrEqual(1);
    expect(medidas.folgaEsquerda).toBeGreaterThan(0);
  });

  test("UI-06: toda rota estatica tem um <main> unico e o mesmo espacamento vertical", async ({
    page,
  }) => {
    await logar(page, CPF_CASCA, SENHA);

    // "Contêiner único" e "mesmo espaçamento vertical em todas elas" sao
    // afirmacoes sobre o conjunto das telas - verificar duas nao as prova.
    // As 3 rotas dinamicas ficam de fora porque exigiriam fixture de curso.
    const rotas = [
      "/painel",
      "/usuarios/novo",
      "/pre-cursos",
      "/pre-cursos/novo",
      "/pos-cursos",
      "/pos-cursos/novo",
      "/avaliacoes",
      "/avaliacoes/novo",
    ];

    const espacamentos: string[] = [];
    for (const rota of rotas) {
      await page.goto(rota);
      await expect(page.locator("main")).toHaveCount(1);
      espacamentos.push(
        await page.locator("main").evaluate((e) => getComputedStyle(e).paddingTop),
      );
    }

    // py-8 = 2rem = 32px. Valor fixo, nao "diferente de zero": assim uma
    // troca de py-8 por py-2 tambem derruba o teste.
    expect(espacamentos).toEqual(rotas.map(() => "32px"));
  });

  test("UI-07: a 375px o cabeçalho continua visível e não há scroll horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    const cabecalho = page.getByTestId("casca-cabecalho");
    await expect(cabecalho).toBeVisible();
    await expect(menuDaCasca(page)).toBeVisible();

    // `globals.css` fixa `html, body { overflow-x: hidden }`, entao medir
    // `documentElement.scrollWidth` seria tautologia: a raiz nunca estoura.
    // O elemento que pode estourar e o proprio cabecalho.
    const medidas = await cabecalho.evaluate((elemento) => ({
      scrollWidth: elemento.scrollWidth,
      clientWidth: elemento.clientWidth,
    }));
    expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.clientWidth);

    // E nenhum item do menu pode passar da viewport.
    const larguraViewport = page.viewportSize()!.width;
    for (const link of await linksDoMenu(page).all()) {
      const caixa = await link.boundingBox();
      expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(larguraViewport);
    }
  });

  test("nome longo trunca com reticencias, sem quebrar o cabecalho", async ({ page }) => {
    await logar(page, CPF_NOME_LONGO, SENHA);
    await page.goto("/painel");

    const nome = page.getByTestId("casca-cabecalho").getByText(NOME_LONGO);
    const medidas = await nome.evaluate((elemento) => ({
      scrollWidth: elemento.scrollWidth,
      clientWidth: elemento.clientWidth,
      textOverflow: getComputedStyle(elemento).textOverflow,
    }));

    // Trunca de fato: o conteudo excede a caixa e o excesso vira reticencias.
    expect(medidas.scrollWidth).toBeGreaterThan(medidas.clientWidth);
    expect(medidas.textOverflow).toBe("ellipsis");
  });

  test("UI-07: a navegacao existe sem depender de JavaScript", async ({ browser }) => {
    // A exigencia da spec e literal: nada de drawer ou hamburguer que so
    // aparece com JS. Com JavaScript desligado os links continuam la.
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const pagina = await contexto.newPage();
    await logar(pagina, CPF_CASCA, SENHA);
    await pagina.goto("/painel");

    await expect(pagina.getByTestId("casca-cabecalho")).toBeVisible();
    const links = linksDoMenu(pagina);
    await expect(links).toHaveText([
      "Painel",
      "Novo usuário",
      "Pré-cursos",
      "Pós-cursos",
      "Avaliações",
    ]);
    await contexto.close();
  });

  test("as telas de onboarding não recebem a casca", async ({ page, browser }) => {
    // /primeiro-acesso e /cadastro-ofertante são o destino dos redirects do
    // layout protegido, então vivem em (onboarding) e por definição não têm
    // cabeçalho (edge case da spec).
    await logar(page, CPF_PRIMEIRA_VEZ, "qualquer");
    await page.goto("/primeiro-acesso");
    await expect(page).toHaveURL(/\/primeiro-acesso$/);
    await expect(page.getByTestId("casca-cabecalho")).toHaveCount(0);

    const contexto = await browser.newContext();
    const pageGo = await contexto.newPage();
    await logar(pageGo, CPF_GO_SEM_OFERTANTE, SENHA);
    await pageGo.goto("/cadastro-ofertante");
    await expect(pageGo).toHaveURL(/\/cadastro-ofertante$/);
    await expect(pageGo.getByTestId("casca-cabecalho")).toHaveCount(0);
    await contexto.close();
  });
});

// ---------------------------------------------------------------------------
// T6: menu de navegação por perfil (UI-01, UI-02, UI-03).
// ---------------------------------------------------------------------------

const CPF_NAV_GT = "50102030901";
const CPF_NAV_AL = "50102031037";
const CPF_NAV_VT = "50102031118";
const CPFS_NAV = [CPF_NAV_GT, CPF_NAV_AL, CPF_NAV_VT];

// Escopado no cabecalho de proposito: um localizador de documento acharia a
// nav mesmo que ela fosse renderizada fora da casca, e UI-01 exige que ela
// esteja DENTRO do cabecalho.
const menuDaCasca = (page: Page) =>
  page.getByTestId("casca-cabecalho").getByTestId("navegacao-perfil");

const linksDoMenu = (page: Page) => menuDaCasca(page).getByRole("link");

const botaoSair = (page: Page) =>
  page.getByTestId("casca-cabecalho").getByRole("button", { name: "Sair" });

test.describe("menu de navegação por perfil", () => {
  test.beforeAll(() => {
    deleteUsuarios(CPFS_NAV);
    upsertUsuario({ cpf: CPF_NAV_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CPF_NAV_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CPF_NAV_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
  });

  test.afterAll(() => {
    deleteUsuarios(CPFS_NAV);
  });

  test("UI-02: GT vê os 5 itens da tabela do design", async ({ page }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/painel");

    await expect(linksDoMenu(page)).toHaveText([
      "Painel",
      "Novo usuário",
      "Pré-cursos",
      "Pós-cursos",
      "Avaliações",
    ]);
  });

  test("UI-02: AL vê exatamente 2 itens, com o rótulo próprio da avaliação", async ({
    page,
  }) => {
    await logar(page, CPF_NAV_AL, SENHA);
    await page.goto("/painel");

    await expect(linksDoMenu(page)).toHaveText(["Painel", "Minha avaliação"]);
  });

  test("UI-02: AL não vê Pré-cursos nem Pós-cursos", async ({ page }) => {
    await logar(page, CPF_NAV_AL, SENHA);
    await page.goto("/painel");

    const menu = menuDaCasca(page);
    await expect(menu.getByRole("link", { name: "Pré-cursos" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Pós-cursos" })).toHaveCount(0);
  });

  test("UI-02: VT não vê Novo usuário", async ({ page }) => {
    await logar(page, CPF_NAV_VT, SENHA);
    await page.goto("/painel");

    const menu = menuDaCasca(page);
    await expect(menu.getByRole("link", { name: "Novo usuário" })).toHaveCount(0);
    // O menu renderizou: a ausência acima é do item, não do menu inteiro.
    await expect(menu.getByRole("link", { name: "Painel" })).toHaveCount(1);
  });

  test("UI-03: em /avaliacoes só o item de /avaliacoes tem aria-current=page", async ({
    page,
  }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/avaliacoes");

    const menu = menuDaCasca(page);
    await expect(menu.getByRole("link", { name: "Avaliações" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(menu.locator('a[aria-current="page"]')).toHaveCount(1);
  });

  test("UI-03: numa sub-rota o item da rota-pai continua marcado", async ({ page }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/avaliacoes/novo");

    const menu = menuDaCasca(page);
    await expect(menu.getByRole("link", { name: "Avaliações" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("UI-03: em cada rota, o item marcado e o correspondente aquela rota", async ({
    page,
  }) => {
    await logar(page, CPF_NAV_GT, SENHA);

    // UI-03 vale para toda rota que casa com um item, nao so /avaliacoes.
    // Inclui as rotas-filhas, onde quem deve ficar marcado e o item pai.
    const esperado: Array<[string, string]> = [
      ["/painel", "Painel"],
      ["/usuarios/novo", "Novo usuário"],
      ["/pre-cursos", "Pré-cursos"],
      ["/pre-cursos/novo", "Pré-cursos"],
      ["/pos-cursos", "Pós-cursos"],
      ["/pos-cursos/novo", "Pós-cursos"],
      ["/avaliacoes", "Avaliações"],
      ["/avaliacoes/novo", "Avaliações"],
    ];

    for (const [rota, rotulo] of esperado) {
      await page.goto(rota);
      const marcados = menuDaCasca(page).locator('a[aria-current="page"]');
      await expect(marcados).toHaveCount(1);
      await expect(marcados).toHaveText(rotulo);
    }
  });

  test("UI-01: dá para chegar em /pos-cursos pelo menu, sem digitar a URL", async ({
    page,
  }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/painel");

    await linksDoMenu(page).filter({ hasText: "Pós-cursos" }).click();

    await expect(page).toHaveURL(/\/pos-cursos$/);
  });

  test("navegar entre duas rotas pelo menu não produz erro de hidratação", async ({
    page,
  }) => {
    const erros: string[] = [];
    page.on("console", (mensagem) => {
      if (mensagem.type() === "error") {
        erros.push(mensagem.text());
      }
    });

    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/painel");
    await linksDoMenu(page).filter({ hasText: "Pré-cursos" }).click();
    await expect(page).toHaveURL(/\/pre-cursos$/);

    expect(erros.filter((e) => /hydrat|hidrat/i.test(e))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T7: saída de sessão pelo cabeçalho (UI-04, UI-05).
// ---------------------------------------------------------------------------

const CPF_SAIR = "50102031207";
const CPF_SAIR_FALHA = "50102031380";
const CPFS_SAIR = [CPF_SAIR, CPF_SAIR_FALHA];

test.describe("botão Sair", () => {
  test.beforeAll(() => {
    deleteUsuarios(CPFS_SAIR);
    upsertUsuario({ cpf: CPF_SAIR, tipo: "GT", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CPF_SAIR_FALHA, tipo: "GT", senha: SENHA, primeiraVez: false });
  });

  test.afterAll(() => {
    deleteUsuarios(CPFS_SAIR);
  });

  test("UI-04: sair leva a /login e o cookie anterior deixa de autenticar", async ({
    page,
    browser,
  }) => {
    await logar(page, CPF_SAIR, SENHA);
    await page.goto("/painel");

    const cookies = await page.context().cookies();
    const sessaoAntes = cookies.find((c) => c.name === "spma_sessao");
    expect(sessaoAntes).toBeDefined();

    await botaoSair(page).click();
    await expect(page).toHaveURL(/\/login$/);

    // A outra metade do critério: o cookie que valia antes não vale mais.
    const contexto = await browser.newContext();
    await contexto.addCookies([sessaoAntes!]);
    const pageAntiga = await contexto.newPage();
    await pageAntiga.goto("/painel");
    await expect(pageAntiga).toHaveURL(/\/login$/);
    await contexto.close();
  });

  test("UI-05: logout rejeitado mantém a página atual e exibe a falha", async ({
    page,
  }) => {
    await logar(page, CPF_SAIR_FALHA, SENHA);
    await page.goto("/painel");

    await page.route("**/api/auth/logout", (rota) =>
      rota.fulfill({ status: 403, contentType: "application/json", body: "{}" }),
    );

    await botaoSair(page).click();

    await expect(page.getByTestId("erro-sair")).toBeVisible();
    await expect(page).toHaveURL(/\/painel$/);
  });

  test("UI-05: falha de rede no logout mantem a pagina e exibe a falha", async ({
    page,
  }) => {
    await logar(page, CPF_SAIR_FALHA, SENHA);
    await page.goto("/painel");

    // O ramo do catch: a requisicao nem chega a ter status.
    await page.route("**/api/auth/logout", (rota) => rota.abort());

    await botaoSair(page).click();

    await expect(page.getByTestId("erro-sair")).toBeVisible();
    await expect(page).toHaveURL(/\/painel$/);
  });

  test("logout que responde 401 conclui em /login (edge case do clique duplo)", async ({
    page,
  }) => {
    await logar(page, CPF_SAIR_FALHA, SENHA);
    await page.goto("/painel");

    await page.route("**/api/auth/logout", (rota) =>
      rota.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
    );

    await botaoSair(page).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
