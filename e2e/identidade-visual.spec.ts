// e2e da feature identidade-visual.
//
// T1 cobre os dois defeitos de base observados no tour visual de 2026-08-29
// (UI-20 e UI-21). Os dois são medidos por `getComputedStyle` em `/login` -
// a tela mais barata do sistema (sem sessão, sem banco) e já coberta por
// `login-page.spec.ts`. A verificação é do valor computado, não de inspeção
// visual: o defeito é justamente que o CSS escrito não chega a valer.
import { expect, test } from "@playwright/test";

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
