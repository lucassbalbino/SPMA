// e2e de POST /api/auth/login (T19).
// Cobre CA-AU-01, CA-AU-02 (gatilho), CA-AU-03, CA-AU-04, CA-AU-08,
// CA-AU-09 e CA-AU-10 contra o servidor real e o banco `spma_test`.
import { expect, test } from "@playwright/test";
import {
  deleteTentativasIp,
  deleteUsuarios,
  getSessao,
  getUsuario,
  upsertUsuario,
} from "./helpers/db";
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
const CPF_TIMING = "20090010019";

// IPs dedicados aos testes que fazem várias chamadas de falha de login
// (REQ-SEC-03) - nunca usados por nenhuma outra chamada neste arquivo, para
// não empurrar o bucket "desconhecido" (usado pelos demais testes, que não
// enviam x-forwarded-for) além do limite e bloquear o resto da suíte.
const IP_TESTE_BLOQUEIO = "198.51.100.77";
const IP_TESTE_TIMING = "198.51.100.78";

/**
 * Gera CPFs válidos (módulo 11) e distintos, todos sem conta cadastrada -
 * usados só para acumular falhas de IP sem tocar no limite por CPF
 * (REQ-SEC-01/02, module à parte).
 */
function calcularDigitoVerificador(digitos: number[]): number {
  const pesoInicial = digitos.length + 1;
  const soma = digitos.reduce(
    (acc, digito, index) => acc + digito * (pesoInicial - index),
    0,
  );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCpfValidoESemConta(indice: number): string {
  const base9 = `40000${String(indice).padStart(4, "0")}`;
  const digitos = base9.split("").map(Number);
  const d1 = calcularDigitoVerificador(digitos);
  const d2 = calcularDigitoVerificador([...digitos, d1]);
  return `${base9}${d1}${d2}`;
}

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
  CPF_TIMING,
];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  deleteTentativasIp([IP_TESTE_BLOQUEIO, IP_TESTE_TIMING]);
  for (const cpf of [
    CPF_COM_SENHA,
    CPF_SENHA_ERRADA,
    CPF_BLOQUEIO,
    CPF_RESET_CONTADOR,
    CPF_ROTACAO,
    CPF_TIMING,
  ]) {
    upsertUsuario({ cpf, tipo: "AL", senha: SENHA, primeiraVez: false });
  }
  // Conta criada mas ainda sem senha definida (fluxo de 1º acesso).
  upsertUsuario({ cpf: CPF_PRIMEIRO_ACESSO, tipo: "AL", senha: null });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
  deleteTentativasIp([IP_TESTE_BLOQUEIO, IP_TESTE_TIMING]);
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
  // Verifier iteração 3: a checagem de hash acima já cobre o corpo inteiro,
  // mas a de senha em texto puro só olhava corpo.usuario - um vazamento em
  // qualquer outro lugar da resposta passaria batido. Alinhando as duas.
  expect(texto).not.toContain(SENHA);
  expect(corpo.usuario).not.toHaveProperty("senhaHash");
  expect(corpo.usuario).not.toHaveProperty("senha");

  await cliente.dispose();
});

test("REQ-SEC-15: login bem-sucedido também emite o cookie de CSRF (double-submit)", async () => {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_COM_SENHA, senha: SENHA },
  });

  const cookies = cookiesDaResposta(res);
  const linhaCsrf = cookies
    .split("\n")
    .find((linha) => linha.startsWith("spma_csrf="));

  expect(linhaCsrf).toBeDefined();
  // Ao contrário do cookie de sessão, o de CSRF não pode ser httpOnly - o
  // cliente precisa lê-lo para ecoar no header x-csrf-token nas mutações.
  expect(linhaCsrf).not.toMatch(/HttpOnly/i);
  expect(linhaCsrf).toMatch(/Secure/i);
  expect(linhaCsrf).toMatch(/SameSite=Lax/i);

  await cliente.dispose();
});

test("CA-SEC-04: tempo de resposta é da mesma ordem de grandeza para CPF inexistente e para senha errada (normalização de tempo)", async () => {
  // Tolerância generosa (design.md): o que a normalização de tempo precisa
  // provar é que CPF inexistente não responde quase instantâneo enquanto
  // senha errada paga o custo de um argon2.verify - não uma igualdade
  // milimétrica. Duas medidas isoladas são ruidosas demais (jitter de SO/
  // event loop faz uma chamada avulsa variar 10x+ sem relação com o código),
  // então: (1) mediana de várias amostras em vez de uma só, (2) as duas
  // condições intercaladas na mesma iteração (não um bloco de N seguido do
  // outro bloco de N) para que aquecimento/desaquecimento do processo afete
  // as duas igualmente em vez de só a que roda por último, e (3) um único
  // cliente reaproveitado para não pagar o custo de criar um contexto novo a
  // cada chamada como uma variável a mais.
  const AMOSTRAS = 8;

  function mediana(valores: number[]): number {
    const ordenados = [...valores].sort((a, b) => a - b);
    return ordenados[Math.floor(ordenados.length / 2)];
  }

  // x-forwarded-for dedicado (IP_TESTE_TIMING): isola as 16 chamadas de
  // falha deste teste do bucket "desconhecido" que os demais testes
  // (sem esse header) compartilham - sem isso, o rate-limit por IP
  // (REQ-SEC-03) bloquearia o resto da suíte antes do fim do arquivo.
  const cliente = await novoCliente();
  const duracoesSenhaErrada: number[] = [];
  const duracoesInexistente: number[] = [];

  for (let i = 0; i < AMOSTRAS; i++) {
    const inicioA = Date.now();
    await cliente.post("/api/auth/login", {
      data: { cpf: CPF_TIMING, senha: SENHA_ERRADA },
      headers: { "x-forwarded-for": IP_TESTE_TIMING },
    });
    duracoesSenhaErrada.push(Date.now() - inicioA);

    const inicioB = Date.now();
    await cliente.post("/api/auth/login", {
      data: { cpf: CPF_INEXISTENTE, senha: SENHA },
      headers: { "x-forwarded-for": IP_TESTE_TIMING },
    });
    duracoesInexistente.push(Date.now() - inicioB);
  }
  await cliente.dispose();

  const medianaSenhaErrada = mediana(duracoesSenhaErrada);
  const medianaInexistente = mediana(duracoesInexistente);

  const razao = medianaInexistente / Math.max(medianaSenhaErrada, 1);
  expect(razao).toBeGreaterThan(0.2);
  expect(razao).toBeLessThan(5);
});

test("CA-SEC-03: IP com falhas acima do limite recebe cooldown mesmo com credenciais corretas", async () => {
  // 20 falhas de credencial vindas do mesmo IP, com CPFs distintos, válidos
  // e sem conta - não tocam no limite por CPF (REQ-SEC-01/02), só no do IP.
  for (let i = 0; i < 20; i++) {
    const cliente = await novoCliente();
    const res = await cliente.post("/api/auth/login", {
      data: { cpf: gerarCpfValidoESemConta(i), senha: "SenhaQualquer123" },
      headers: { "x-forwarded-for": IP_TESTE_BLOQUEIO },
    });
    expect(res.status()).toBe(401);
    await cliente.dispose();
  }

  // A 21ª tentativa, agora com credenciais corretas de uma conta real, ainda
  // é recusada: é o IP que está em cooldown, não a conta.
  const clienteFinal = await novoCliente();
  const resFinal = await clienteFinal.post("/api/auth/login", {
    data: { cpf: CPF_COM_SENHA, senha: SENHA },
    headers: { "x-forwarded-for": IP_TESTE_BLOQUEIO },
  });

  expect(resFinal.status()).toBe(401);
  expect(await resFinal.json()).toEqual(ERRO_GENERICO);
  expect(idSessaoDaResposta(resFinal)).toBeNull();

  await clienteFinal.dispose();
});
