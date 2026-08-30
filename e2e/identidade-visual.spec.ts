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
const CPFS_CASCA = [CPF_CASCA, CPF_PRIMEIRA_VEZ, CPF_GO_SEM_OFERTANTE];

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
  });

  test("REQ-SEC-12: o CPF do usuário logado não aparece em lugar nenhum do documento", async ({
    page,
  }) => {
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    expect(await page.content()).not.toContain(CPF_CASCA);
  });

  test("UI-06: a tela protegida tem exatamente um <main>", async ({ page }) => {
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    await expect(page.locator("main")).toHaveCount(1);
  });

  test("UI-07: a 375px o cabeçalho continua visível e não há scroll horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await logar(page, CPF_CASCA, SENHA);
    await page.goto("/painel");

    await expect(page.getByTestId("casca-cabecalho")).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
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

const linksDoMenu = (page: Page) =>
  page.getByTestId("navegacao-perfil").getByRole("link");

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

    const menu = page.getByTestId("navegacao-perfil");
    await expect(menu.getByRole("link", { name: "Pré-cursos" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Pós-cursos" })).toHaveCount(0);
  });

  test("UI-02: VT não vê Novo usuário", async ({ page }) => {
    await logar(page, CPF_NAV_VT, SENHA);
    await page.goto("/painel");

    const menu = page.getByTestId("navegacao-perfil");
    await expect(menu.getByRole("link", { name: "Novo usuário" })).toHaveCount(0);
    // O menu renderizou: a ausência acima é do item, não do menu inteiro.
    await expect(menu.getByRole("link", { name: "Painel" })).toHaveCount(1);
  });

  test("UI-03: em /avaliacoes só o item de /avaliacoes tem aria-current=page", async ({
    page,
  }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/avaliacoes");

    const menu = page.getByTestId("navegacao-perfil");
    await expect(menu.getByRole("link", { name: "Avaliações" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(menu.locator('a[aria-current="page"]')).toHaveCount(1);
  });

  test("UI-03: numa sub-rota o item da rota-pai continua marcado", async ({ page }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/avaliacoes/novo");

    const menu = page.getByTestId("navegacao-perfil");
    await expect(menu.getByRole("link", { name: "Avaliações" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("UI-01: dá para chegar em /pos-cursos pelo menu, sem digitar a URL", async ({
    page,
  }) => {
    await logar(page, CPF_NAV_GT, SENHA);
    await page.goto("/painel");

    await page.getByTestId("navegacao-perfil").getByRole("link", { name: "Pós-cursos" }).click();

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
    await page.getByTestId("navegacao-perfil").getByRole("link", { name: "Pré-cursos" }).click();
    await expect(page).toHaveURL(/\/pre-cursos$/);

    expect(erros.filter((e) => /hydrat|hidrat/i.test(e))).toEqual([]);
  });
});
