// e2e de POST /api/auth/primeiro-acesso (T20). Cobre CA-AU-02 e os erros
// listados no task: sem sessão válida e senha fora da política mínima.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import { cabecalhoCookie, idSessaoDaResposta, novoCliente } from "./helpers/http";

const NOVA_SENHA = "NovaSenha123";

const CPF_DEFINE_SENHA = "20040050092";
const CPF_SEM_SESSAO = "20050060090";
const CPF_SENHA_CURTA = "20060070099";

const CPFS = [CPF_DEFINE_SENHA, CPF_SEM_SESSAO, CPF_SENHA_CURTA];

/** Loga uma conta em 1º acesso (senhaHash null) e devolve o id da sessão. */
async function abrirSessaoDePrimeiroAcesso(cpf: string): Promise<string> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf, senha: "irrelevante" },
  });
  const idSessao = idSessaoDaResposta(res);
  await cliente.dispose();

  if (!idSessao) {
    throw new Error(`Login de 1º acesso não emitiu sessão para ${cpf}`);
  }
  return idSessao;
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  for (const cpf of CPFS) {
    upsertUsuario({ cpf, tipo: "AL", senha: null, primeiraVez: true });
  }
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-AU-02: define a senha, desativa primeiraVez e passa a autenticar com ela", async () => {
  const idSessao = await abrirSessaoDePrimeiroAcesso(CPF_DEFINE_SENHA);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(200);
  // CA-AU-10: nem a senha em texto puro nem o hash aparecem na resposta -
  // este é o único endpoint da feature que recebe uma senha em texto puro
  // e também devolve dados de usuário (validation.md, iterações 1 e 2).
  const corpoResposta = await res.text();
  expect(corpoResposta).not.toMatch(/senhaHash|\$argon2/i);
  expect(corpoResposta).not.toContain(NOVA_SENHA);

  const usuario = getUsuario(CPF_DEFINE_SENHA);
  expect(usuario?.primeiraVez).toBe(false);
  expect(usuario?.senhaHash).not.toBeNull();
  expect(usuario?.senhaHash).toContain("$argon2");

  // A senha gravada é realmente a informada: agora ela autentica pelo login,
  // e a conta deixou de ser tratada como 1º acesso.
  const clienteLogin = await novoCliente();
  const login = await clienteLogin.post("/api/auth/login", {
    data: { cpf: CPF_DEFINE_SENHA, senha: NOVA_SENHA },
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).primeiroAcesso).toBe(false);

  await cliente.dispose();
  await clienteLogin.dispose();
});

test("sem sessão válida retorna 401 e não altera nenhum usuário", async () => {
  const antes = getUsuario(CPF_SEM_SESSAO);

  const semCookie = await novoCliente();
  const resSemCookie = await semCookie.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
  });

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/auth/primeiro-acesso", {
    data: { senha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA },
    headers: cabecalhoCookie("00000000-0000-4000-8000-000000000000"),
  });

  expect(resSemCookie.status()).toBe(401);
  expect(resCookieInvalido.status()).toBe(401);

  const depois = getUsuario(CPF_SEM_SESSAO);
  expect(depois?.senhaHash).toBeNull();
  expect(depois?.primeiraVez).toBe(true);
  expect(depois?.senhaHash).toBe(antes?.senhaHash ?? null);

  await semCookie.dispose();
  await cookieInvalido.dispose();
});

test("senha com menos de 8 caracteres é rejeitada e primeiraVez continua true", async () => {
  const idSessao = await abrirSessaoDePrimeiroAcesso(CPF_SENHA_CURTA);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/primeiro-acesso", {
    data: { senha: "Curta1", confirmacaoSenha: "Curta1" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(400);

  const usuario = getUsuario(CPF_SENHA_CURTA);
  expect(usuario?.primeiraVez).toBe(true);
  expect(usuario?.senhaHash).toBeNull();

  await cliente.dispose();
});
