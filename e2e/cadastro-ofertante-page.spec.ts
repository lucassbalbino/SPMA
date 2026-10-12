// e2e de /cadastro-ofertante (T13/UGO), pela UI real. Cobre UGO-01..04: GO
// com dados organizacionais incompletos é barrado, completa via
// PATCH /api/usuarios/me/organizacao, e passa a acessar o restante do
// sistema. Sem `model Ofertante` separado (AD-043) - os dados persistem
// direto no próprio GO.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import {
  cabecalhoCookie,
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

const gerarCnpjValido = geradorDeCnpj("24");

// CPF válido por módulo 11, mesmo algoritmo usado em e2e/login.spec.ts, com
// prefixo próprio ("41") para não colidir com o CPF de nenhum outro arquivo
// do suite paralelizado.
function calcularDvCpf(digitos: number[]): number {
  const pesoInicial = digitos.length + 1;
  const soma = digitos.reduce(
    (acc, digito, index) => acc + digito * (pesoInicial - index),
    0,
  );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCpfValido(indice: number): string {
  const base9 = `41${String(indice).padStart(7, "0")}`;
  const digitos = base9.split("").map(Number);
  const d1 = calcularDvCpf(digitos);
  const d2 = calcularDvCpf([...digitos, d1]);
  return `${base9}${d1}${d2}`;
}

const CNPJ_GO_INCOMPLETO = gerarCnpjValido(1);
const CNPJ_GO_GUARDS = gerarCnpjValido(2);
const CNPJ_GO_INVALIDO = gerarCnpjValido(3);
const CNPJ_GO_NOME_DA_CRIACAO = gerarCnpjValido(4);
const CNPJ_GO_SEM_NOME = gerarCnpjValido(5);
const NOME_DA_CRIACAO = "Nome Dado Pelo AM";
const CPF_AM_GUARDS = gerarCpfValido(1);
const NOME_ORGANIZACAO = "Organizacao via UI";

const DOCUMENTOS = [
  CNPJ_GO_INCOMPLETO,
  CNPJ_GO_GUARDS,
  CNPJ_GO_INVALIDO,
  CNPJ_GO_NOME_DA_CRIACAO,
  CNPJ_GO_SEM_NOME,
  CPF_AM_GUARDS,
];

/** Os 6 dados organizacionais e a flag, para comparar antes/depois. */
function estadoOrganizacional(documento: string) {
  const usuario = getUsuario(documento);
  return {
    nome: usuario?.nome,
    responsavel: usuario?.responsavel,
    email: usuario?.email,
    telefone: usuario?.telefone,
    uf: usuario?.uf,
    municipio: usuario?.municipio,
    dadosOrganizacionaisCompletos: usuario?.dadosOrganizacionaisCompletos,
  };
}

test.beforeAll(() => {
  deleteUsuarios(DOCUMENTOS);
  // GO que ainda não declarou os dados organizacionais (flag false) -
  // `requireDadosOrganizacionaisCompletos` barra qualquer rota protegida até
  // ele enviar o formulário (OGO-01).
  upsertUsuario({
    cpf: CNPJ_GO_INCOMPLETO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    dadosOrganizacionaisCompletos: false,
  });
  // GO pendente com dados antigos, para provar que um envio inválido não
  // toca em nenhum deles (OGO-04).
  upsertUsuario({
    cpf: CNPJ_GO_INVALIDO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    dadosOrganizacionaisCompletos: false,
    nome: "Ofertante pendente (invalido)",
    email: "antigo@exemplo.dev",
    responsavel: "Responsavel antigo",
    telefone: "11 1111-1111",
    uf: "MG",
    municipio: "Uberaba",
  });
  // Fixtures dos testes de guard abaixo (401/403/403-CSRF) - a rota
  // substituída (`POST /api/ofertantes`) tinha essa cobertura; a nova
  // (`PATCH /api/usuarios/me/organizacao`) ficou sem ela até esta correção
  // (achado pelo Verifier independente, ranked gap #3).
  upsertUsuario({
    cpf: CNPJ_GO_GUARDS,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante já completo (guards)",
    uf: "SP",
  });
  upsertUsuario({ cpf: CPF_AM_GUARDS, tipo: "AM", senha: SENHA, primeiraVez: false });
  // OGO-02/OGO-19: o nome que o AM deu na criação.
  upsertUsuario({
    cpf: CNPJ_GO_NOME_DA_CRIACAO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    dadosOrganizacionaisCompletos: false,
    nome: NOME_DA_CRIACAO,
  });
  // OGO-20: GO sem nome no banco.
  upsertUsuario({
    cpf: CNPJ_GO_SEM_NOME,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    dadosOrganizacionaisCompletos: false,
    nome: null,
  });
});

/** Preenche os 5 campos que não são o nome. */
async function preencherOutrosCinco(page: import("@playwright/test").Page): Promise<void> {
  await page.getByLabel("Responsável").fill("Responsavel Da Organizacao");
  await page.getByLabel("E-mail").fill("organizacao@exemplo.dev");
  await page.getByLabel("Telefone").fill("11 4000-0003");
  await page.getByLabel("UF").fill("RJ");
  await page.getByLabel("Município").fill("Niteroi");
}

test.afterAll(() => {
  deleteUsuarios(DOCUMENTOS);
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
  // É a flag, e não campo nulo, que mantém o GO pendente (AD-044).
  expect(getUsuario(CNPJ_GO_INCOMPLETO)?.dadosOrganizacionaisCompletos).toBe(false);

  // OGO-04: os 6 campos são obrigatórios.
  await page.getByLabel("Nome").fill(NOME_ORGANIZACAO);
  await page.getByLabel("Responsável").fill("Responsavel via UI");
  await page.getByLabel("E-mail").fill("ui@exemplo.dev");
  await page.getByLabel("Telefone").fill("11 4000-0002");
  await page.getByLabel("UF").fill("SP");
  await page.getByLabel("Município").fill("Santos");

  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios/me/organizacao")),
    page.getByRole("button", { name: "Cadastrar" }).click(),
  ]);
  expect(resposta.ok()).toBe(true);

  // OGO-03: os 6 valores gravados E a flag ligada - o 200 sozinho não prova
  // o estado resultante (L-014).
  expect(estadoOrganizacional(CNPJ_GO_INCOMPLETO)).toEqual({
    nome: NOME_ORGANIZACAO,
    responsavel: "Responsavel via UI",
    email: "ui@exemplo.dev",
    telefone: "11 4000-0002",
    uf: "SP",
    municipio: "Santos",
    dadosOrganizacionaisCompletos: true,
  });

  // Liberado: o guard de ofertante não barra mais - /painel deixa de
  // redirecionar para /cadastro-ofertante.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/painel$/);
});

test("OGO-04: GO pendente que envia um dos 6 campos vazio recebe 400 e nada é gravado, nem a flag", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_INVALIDO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  const antes = estadoOrganizacional(CNPJ_GO_INVALIDO);

  const res = await page.request.patch("/api/usuarios/me/organizacao", {
    data: {
      nome: "Nome Novo",
      responsavel: "Responsavel Novo",
      email: "novo@exemplo.dev",
      telefone: "",
      uf: "RJ",
      municipio: "Niteroi",
    },
    headers: { "x-csrf-token": await lerCsrfDoContexto(page) },
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe("Telefone é obrigatório");
  expect(estadoOrganizacional(CNPJ_GO_INVALIDO)).toEqual(antes);
  expect(antes.dadosOrganizacionaisCompletos).toBe(false);
});

test("OGO-05/OGO-17: GO que já concluiu e envia de novo recebe 409, os 6 dados e a flag inalterados", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_INCOMPLETO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  const antes = estadoOrganizacional(CNPJ_GO_INCOMPLETO);
  expect(antes.dadosOrganizacionaisCompletos).toBe(true);

  // Corpo completo e válido: o 409 tem de vir de "já concluiu", não da forma.
  const res = await page.request.patch("/api/usuarios/me/organizacao", {
    data: {
      nome: "Tentativa De Recadastro",
      responsavel: "Outro Responsavel",
      email: "outro@exemplo.dev",
      telefone: "21 5000-0000",
      uf: "RJ",
      municipio: "Niteroi",
    },
    headers: { "x-csrf-token": await lerCsrfDoContexto(page) },
  });

  expect(res.status()).toBe(409);
  expect(estadoOrganizacional(CNPJ_GO_INCOMPLETO)).toEqual(antes);
});

test("OGO-02/OGO-19: o campo Nome abre com o nome da criação e, enviado sem alteração, é gravado igual", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_NOME_DA_CRIACAO, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/cadastro-ofertante");
  await expect(page.getByLabel("Nome")).toHaveValue(NOME_DA_CRIACAO);

  await preencherOutrosCinco(page);
  const [resposta] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/usuarios/me/organizacao")),
    page.getByRole("button", { name: "Cadastrar" }).click(),
  ]);
  expect(resposta.status()).toBe(200);

  const usuario = getUsuario(CNPJ_GO_NOME_DA_CRIACAO);
  expect(usuario?.nome).toBe(NOME_DA_CRIACAO);
  expect(usuario?.dadosOrganizacionaisCompletos).toBe(true);
});

test("OGO-20: GO sem nome no banco vê o campo vazio, e enviar sem preencher mostra o erro e não grava nada", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_SEM_NOME, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/cadastro-ofertante");
  await expect(page.getByLabel("Nome")).toHaveValue("");

  const antes = estadoOrganizacional(CNPJ_GO_SEM_NOME);
  await preencherOutrosCinco(page);
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await expect(page.getByText("Nome é obrigatório")).toBeVisible();
  expect(estadoOrganizacional(CNPJ_GO_SEM_NOME)).toEqual(antes);
  expect(antes.nome).toBeNull();
  expect(antes.dadosOrganizacionaisCompletos).toBe(false);
});

test("OGO-17: GO que já concluiu e digita /cadastro-ofertante na URL vê a tela", async ({ page }) => {
  expect(getUsuario(CNPJ_GO_GUARDS)?.dadosOrganizacionaisCompletos).toBe(true);
  const login = await page.request.post("/api/auth/login", {
    data: { documento: CNPJ_GO_GUARDS, senha: SENHA },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/cadastro-ofertante");
  await expect(page).toHaveURL(/\/cadastro-ofertante$/);
  await expect(page.getByRole("button", { name: "Cadastrar" })).toBeVisible();
});

test("OGO-18: sem sessão, /cadastro-ofertante redireciona para /login", async ({ page }) => {
  await page.goto("/cadastro-ofertante");
  await expect(page).toHaveURL(/\/login$/);
});

// Cobertura de guard que `POST /api/ofertantes` (rota substituída, AD-043)
// tinha e `PATCH /api/usuarios/me/organizacao` ainda não tinha (ranked gap #3
// do Verifier independente): sem sessão, sessão de um tipo que não é GO, e
// sem CSRF válido. Direto pela API (não pela UI) - mesmo padrão de
// e2e/organizacao.spec.ts e e2e/primeiro-acesso.spec.ts para este tipo de
// asserção de guard.
test("guard: sem sessão retorna 401 e não altera nenhum dado", async () => {
  const semSessao = await novoCliente();
  const res = await semSessao.patch("/api/usuarios/me/organizacao", {
    data: { nome: "Invasor", uf: "RJ" },
    // REQ-SEC-15: CSRF é checado antes da sessão - par autoconsistente
    // arbitrário para alcançar a checagem de sessão que este teste prova.
    headers: { Cookie: "spma_csrf=csrf-arbitrario", "x-csrf-token": "csrf-arbitrario" },
  });

  expect(res.status()).toBe(401);
  expect(getUsuario(CNPJ_GO_GUARDS)?.nome).toBe("Ofertante já completo (guards)");

  await semSessao.dispose();
});

test("guard: sessão de tipo que não é GO retorna 403 (área é exclusiva do GO, reforçado no backend)", async () => {
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { documento: CPF_AM_GUARDS, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(login);
  const idCsrf = idCsrfDaResposta(login);
  await clienteLogin.dispose();
  if (!idSessao || !idCsrf) throw new Error("Login do AM não emitiu sessão/CSRF");

  const cliente = await novoCliente();
  const res = await cliente.patch("/api/usuarios/me/organizacao", {
    data: { nome: "Tentativa de AM", uf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("guard: CSRF ausente retorna 403 antes de checar sessão ou tipo, dados inalterados", async () => {
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { documento: CNPJ_GO_GUARDS, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(login);
  await clienteLogin.dispose();
  if (!idSessao) throw new Error("Login do GO não emitiu sessão");

  const cliente = await novoCliente();
  const res = await cliente.patch("/api/usuarios/me/organizacao", {
    data: { nome: "Tentativa sem CSRF", uf: "RJ" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CNPJ_GO_GUARDS)?.nome).toBe("Ofertante já completo (guards)");

  await cliente.dispose();
});

/** Lê o cookie CSRF já emitido pelo login para ecoar no header double-submit. */
async function lerCsrfDoContexto(page: import("@playwright/test").Page): Promise<string> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find((c) => c.name === "spma_csrf");
  if (!csrf) throw new Error("Cookie CSRF não encontrado - login não emitiu o token");
  return csrf.value;
}
