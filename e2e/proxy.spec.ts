// e2e de src/proxy.ts (T30): redirect por presença de cookie, sem sessão.
//
// Nota de cobertura: HTTP não distingue "o proxy redirecionou" de "o layout
// (protegido)/(onboarding) redirecionou" - ambos produzem o mesmo 307 para
// /login quando não há sessão, então "antes mesmo de renderizar o layout"
// não é uma asserção provável por fora. Evidência para essa parte fica na
// leitura de código: a ordem de execução documentada do Next.js 16 roda o
// Proxy antes das rotas de filesystem (node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/proxy.md, seção "Execution order").
import { expect, test } from "@playwright/test";

const ROTAS_PROTEGIDAS = [
  "/painel",
  "/usuarios/novo",
  "/primeiro-acesso",
  "/cadastro-ofertante",
];

for (const rota of ROTAS_PROTEGIDAS) {
  test(`sem cookie de sessão, ${rota} redireciona para /login`, async ({ page }) => {
    const resposta = await page.goto(rota);
    await expect(page).toHaveURL(/\/login$/);
    expect(resposta?.status()).toBe(200); // navegação segue o redirect; status final é o da página de login
  });
}

test("requisição sem cookie a uma rota protegida recebe redirect (307) sem seguir automaticamente", async ({
  request,
}) => {
  const resposta = await request.get("/painel", { maxRedirects: 0 });
  expect(resposta.status()).toBe(307);
  expect(resposta.headers()["location"]).toMatch(/\/login$/);
});
