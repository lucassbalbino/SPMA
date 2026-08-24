// e2e de POST /api/auth/login (T19).
// Cobre CA-AU-01, CA-AU-02 (gatilho), CA-AU-03, CA-AU-04, CA-AU-08,
// CA-AU-09 e CA-AU-10 contra o servidor real e o banco `spma_test`.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getSessao, getUsuario, upsertUsuario } from "./helpers/db";
import {
  cookiesDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";
const SENHA_ERRADA = "SenhaErrada123";

const CPF_COM_SENHA = "12345678062";
const CPF_PRIMEIRO_ACESSO = "98765432029";
const CPF_SENHA_ERRADA = "20010020098";
const CPF_BLOQUEIO = "10120230364";
const CPF_RESET_CONTADOR = "20020030096";
const CPF_ROTACAO = "20030040094";

// Válido por módulo 11, mas sem conta no banco (CA-AU-04).
const CPF_INEXISTENTE = "70780890906";
// Dígito verificador inválido (CA-AU-03).
const CPF_INVALIDO = "12345678901";

const ERRO_GENERICO = { erro: "CPF ou senha inválidos" };

const CPFS = [
  CPF_COM_SENHA,
  CPF_PRIMEIRO_ACESSO,
  CPF_SENHA_ERRADA,
  CPF_BLOQUEIO,
  CPF_RESET_CONTADOR,
  CPF_ROTACAO,
  CPF_INEXISTENTE,
];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  for (const cpf of [
    CPF_COM_SENHA,
    CPF_SENHA_ERRADA,
    CPF_BLOQUEIO,
    CPF_RESET_CONTADOR,
    CPF_ROTACAO,
  ]) {
    upsertUsuario({ cpf, tipo: "AL", senha: SENHA, primeiraVez: false });
  }
  // Conta criada mas ainda sem senha definida (fluxo de 1º acesso).
  upsertUsuario({ cpf: CPF_PRIMEIRO_ACESSO, tipo: "AL", senha: null });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-AU-01: CPF e senha corretos autenticam e emitem cookie de sessão protegido", async () => {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_COM_SENHA, senha: SENHA },
  });

  expect(res.status()).toBe(200);

  const cookies = cookiesDaResposta(res);
  expect(cookies).toContain("spma_sessao=");
  expect(cookies).toMatch(/HttpOnly/i);
  expect(cookies).toMatch(/Secure/i);
  expect(cookies).toMatch(/SameSite=Lax/i);

  // A sessão emitida existe de fato no banco, ligada a este CPF.
  const idSessao = idSessaoDaResposta(res);
  expect(idSessao).not.toBeNull();
  expect(getSessao(idSessao!)?.cpfUsuario).toBe(CPF_COM_SENHA);

  await cliente.dispose();
});

test("CA-AU-02 (gatilho): conta sem senha definida cria sessão e sinaliza 1º acesso", async () => {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_PRIMEIRO_ACESSO, senha: "qualquer" },
  });

  expect(res.status()).toBe(200);

  const corpo = await res.json();
  expect(corpo.primeiroAcesso).toBe(true);
  expect(corpo.proximaRota).toBe("/primeiro-acesso");

  const idSessao = idSessaoDaResposta(res);
  expect(idSessao).not.toBeNull();
  expect(getSessao(idSessao!)?.cpfUsuario).toBe(CPF_PRIMEIRO_ACESSO);

  await cliente.dispose();
});

test("CA-AU-03: CPF com dígito verificador inválido é rejeitado como CPF inválido", async () => {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_INVALIDO, senha: SENHA },
  });

  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ erro: "CPF inválido" });
  // Erro de formato, não de credencial: não pode virar o erro genérico.
  expect(res.status()).not.toBe(401);
  // Nenhuma sessão emitida.
  expect(idSessaoDaResposta(res)).toBeNull();

  await cliente.dispose();
});

test("CA-AU-04: CPF inexistente e senha errada produzem resposta indistinguível", async () => {
  const clienteA = await novoCliente();
  const inexistente = await clienteA.post("/api/auth/login", {
    data: { cpf: CPF_INEXISTENTE, senha: SENHA },
  });

  const clienteB = await novoCliente();
  const senhaErrada = await clienteB.post("/api/auth/login", {
    data: { cpf: CPF_SENHA_ERRADA, senha: SENHA_ERRADA },
  });

  expect(inexistente.status()).toBe(401);
  expect(senhaErrada.status()).toBe(inexistente.status());
  expect(await senhaErrada.text()).toBe(await inexistente.text());
  expect(await inexistente.json()).toEqual(ERRO_GENERICO);
  // Nenhuma das duas revela existência de conta via cookie.
  expect(idSessaoDaResposta(inexistente)).toBeNull();
  expect(idSessaoDaResposta(senhaErrada)).toBeNull();

  await clienteA.dispose();
  await clienteB.dispose();
});

test("CA-AU-08: após 5 falhas a conta é bloqueada mesmo com a senha correta", async () => {
  const cliente = await novoCliente();

  for (let i = 0; i < 5; i++) {
    const falha = await cliente.post("/api/auth/login", {
      data: { cpf: CPF_BLOQUEIO, senha: SENHA_ERRADA },
    });
    expect(falha.status()).toBe(401);
  }

  const comSenhaCorreta = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_BLOQUEIO, senha: SENHA },
  });

  expect(comSenhaCorreta.status()).toBe(401);
  expect(await comSenhaCorreta.json()).toEqual(ERRO_GENERICO);
  expect(idSessaoDaResposta(comSenhaCorreta)).toBeNull();

  // O bloqueio está registrado na conta, com prazo no futuro.
  const usuario = getUsuario(CPF_BLOQUEIO);
  expect(usuario?.bloqueadoAte).not.toBeNull();
  expect(new Date(usuario!.bloqueadoAte!).getTime()).toBeGreaterThan(Date.now());

  await cliente.dispose();
});

test("CA-AU-08: login bem-sucedido zera o contador de falhas", async () => {
  const cliente = await novoCliente();

  for (let i = 0; i < 2; i++) {
    await cliente.post("/api/auth/login", {
      data: { cpf: CPF_RESET_CONTADOR, senha: SENHA_ERRADA },
    });
  }
  expect(getUsuario(CPF_RESET_CONTADOR)?.tentativasFalhas).toBe(2);

  const sucesso = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_RESET_CONTADOR, senha: SENHA },
  });

  expect(sucesso.status()).toBe(200);
  expect(getUsuario(CPF_RESET_CONTADOR)?.tentativasFalhas).toBe(0);

  await cliente.dispose();
});

test("CA-AU-09: login rotaciona o id de sessão e invalida o anterior", async () => {
  const clienteA = await novoCliente();
  const primeiro = await clienteA.post("/api/auth/login", {
    data: { cpf: CPF_ROTACAO, senha: SENHA },
  });
  const idAnterior = idSessaoDaResposta(primeiro);
  expect(idAnterior).not.toBeNull();

  const clienteB = await novoCliente();
  const segundo = await clienteB.post("/api/auth/login", {
    data: { cpf: CPF_ROTACAO, senha: SENHA },
    headers: { Cookie: `spma_sessao=${idAnterior}` },
  });
  const idNovo = idSessaoDaResposta(segundo);

  expect(segundo.status()).toBe(200);
  expect(idNovo).not.toBeNull();
  expect(idNovo).not.toBe(idAnterior);
  // O identificador anterior deixa de existir - não é mais aceitável.
  expect(getSessao(idAnterior!)).toBeNull();
  expect(getSessao(idNovo!)?.cpfUsuario).toBe(CPF_ROTACAO);

  await clienteA.dispose();
  await clienteB.dispose();
});

test("CA-AU-10: resposta de login não expõe senha nem hash", async () => {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_COM_SENHA, senha: SENHA },
  });

  const texto = await res.text();
  const corpo = JSON.parse(texto);

  expect(texto).not.toContain("$argon2");
  expect(texto).not.toMatch(/senhaHash/i);
  expect(corpo.usuario).not.toHaveProperty("senhaHash");
  expect(corpo.usuario).not.toHaveProperty("senha");

  await cliente.dispose();
});
