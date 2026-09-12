// e2e de /cadastro-ofertante (T13/UGO), pela UI real. Cobre UGO-01..04: GO
// com dados organizacionais incompletos é barrado, completa via
// PATCH /api/usuarios/me/organizacao, e passa a acessar o restante do
// sistema. Sem `model Ofertante` separado (AD-043) - os dados persistem
// direto no próprio GO.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cabecalhoCookie,
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

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
const CPF_AM_GUARDS = gerarCpfValido(1);
const NOME_ORGANIZACAO = "Organizacao via UI";

const DOCUMENTOS = [CNPJ_GO_INCOMPLETO, CNPJ_GO_GUARDS, CPF_AM_GUARDS];

test.beforeAll(() => {
  deleteUsuarios(DOCUMENTOS);
  // GO recém-criado, ainda sem nome/uf (dados organizacionais pendentes) -
  // `requireOfertanteVinculado` (T6) barra qualquer rota protegida até isso
  // ser completado.
  upsertUsuario({
    cpf: CNPJ_GO_INCOMPLETO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
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
});

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
