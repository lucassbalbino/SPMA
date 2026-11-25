// e2e de /relatorios (dashboard-powerbi). Só o que a unidade não prova: a
// página monta no navegador e o AL vê o aviso de sem acesso. O `.env.test`
// desliga o Power BI (`SPMA_TENANT_ID=""`), então o endpoint responde 503 e
// a tela diz que o dashboard está indisponível, sem chamar a Microsoft.
// Status, identidade e renovação estão nos testes unitários da rota e de
// `lib/powerbi`.
import { expect, test, type Page } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";
const CPF_GT = "47000010037";
const CPF_AL = "47000020008";

const CPFS = [CPF_GT, CPF_AL];

async function logar(page: Page, cpf: string) {
  const res = await page.request.post("/api/auth/login", { data: { documento: cpf, senha: SENHA } });
  expect(res.ok()).toBe(true);
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false, nome: "Gestora Relatórios" });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("PBI-01/PBI-12: o GT vê o título e o contêiner e, sem configuração, o aviso de indisponível", async ({
  page,
}) => {
  await logar(page, CPF_GT);

  // O desligamento do `.env.test` vale no servidor de verdade (PBI-15).
  const api = await page.request.get("/api/powerbi/embed");
  expect(api.status()).toBe(503);
  expect(await api.json()).toEqual({ erro: "Dashboard não configurado" });

  await page.goto("/relatorios");

  await expect(page.getByRole("heading", { level: 1, name: "Visualização de Relatórios" })).toBeVisible();
  await expect(page.getByTestId("relatorio-powerbi")).toBeVisible();
  await expect(page.getByTestId("relatorio-status")).toHaveText(
    "Dashboard indisponível. Entre novamente ou tente mais tarde.",
  );
});

test("PBI-08: o AL vê que o perfil não tem acesso, sem o contêiner do relatório", async ({ page }) => {
  await logar(page, CPF_AL);
  await page.goto("/relatorios");

  await expect(page.getByText("Seu perfil não tem acesso a relatórios.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("relatorio-powerbi")).toHaveCount(0);
});
