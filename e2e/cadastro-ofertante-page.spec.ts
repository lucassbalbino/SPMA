// e2e de /cadastro-ofertante (T13/UGO), pela UI real. Cobre UGO-01..04: GO
// com dados organizacionais incompletos é barrado, completa via
// PATCH /api/usuarios/me/organizacao, e passa a acessar o restante do
// sistema. Sem `model Ofertante` separado (AD-043) - os dados persistem
// direto no próprio GO.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";

const SENHA = "SenhaValida123";

function calcularDvCnpj(digitos: number[]): number {
  let soma = 0;
  let peso = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += digitos[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCnpjValido(indice: number): string {
  const base12 = `24${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO_INCOMPLETO = gerarCnpjValido(1);
const NOME_ORGANIZACAO = "Organizacao via UI";

test.beforeAll(() => {
  deleteUsuarios([CNPJ_GO_INCOMPLETO]);
  // GO recém-criado, ainda sem nome/uf (dados organizacionais pendentes) -
  // `requireOfertanteVinculado` (T6) barra qualquer rota protegida até isso
  // ser completado.
  upsertUsuario({
    cpf: CNPJ_GO_INCOMPLETO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
  });
});

test.afterAll(() => {
  deleteUsuarios([CNPJ_GO_INCOMPLETO]);
});

test("UGO-01/02: GO com dados organizacionais incompletos é barrado, completa pela UI e passa a acessar o restante do sistema", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_INCOMPLETO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  // Barrado: qualquer outra rota protegida redireciona para cá (já provado
  // em e2e/protegido-layout.spec.ts para o guard em si); aqui confirmamos
  // que a própria página de cadastro está acessível para o GO pendente.
  await page.goto("/cadastro-ofertante");
  await expect(page).toHaveURL(/\/cadastro-ofertante$/);
  // O fixture sempre preenche um `nome` padrão (placeholder de teste); é a
  // ausência de `uf` que faz `requireOfertanteVinculado` (T6) considerar os
  // dados organizacionais incompletos e redirecionar para cá.
  expect(getUsuario(CNPJ_GO_INCOMPLETO)?.uf).toBeNull();

  await page.getByLabel("Nome").fill(NOME_ORGANIZACAO);
  await page.getByLabel("UF").fill("SP");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios/me/organizacao")),
    page.getByRole("button", { name: "Cadastrar" }).click(),
  ]);
  expect(resposta.ok()).toBe(true);

  const usuario = getUsuario(CNPJ_GO_INCOMPLETO);
  expect(usuario?.nome).toBe(NOME_ORGANIZACAO);
  expect(usuario?.uf).toBe("SP");

  // Liberado: o guard de ofertante não barra mais - /painel deixa de
  // redirecionar para /cadastro-ofertante.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel$/);
});

test("UGO-01 AC4: GO com dados já completos que tenta submeter de novo recebe 409, dados inalterados", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_INCOMPLETO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  const antes = getUsuario(CNPJ_GO_INCOMPLETO);
  expect(antes?.nome).toBe(NOME_ORGANIZACAO);

  const res = await page.request.patch("/api/usuarios/me/organizacao", {
    data: { nome: "Tentativa De Recadastro", uf: "RJ" },
    headers: { "x-csrf-token": await lerCsrfDoContexto(page) },
  });

  expect(res.status()).toBe(409);
  const depois = getUsuario(CNPJ_GO_INCOMPLETO);
  expect(depois?.nome).toBe(NOME_ORGANIZACAO);
  expect(depois?.uf).toBe("SP");
});

/** Lê o cookie CSRF já emitido pelo login para ecoar no header double-submit. */
async function lerCsrfDoContexto(page: import("@playwright/test").Page): Promise<string> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find((c) => c.name === "spma_csrf");
  if (!csrf) throw new Error("Cookie CSRF não encontrado - login não emitiu o token");
  return csrf.value;
}
