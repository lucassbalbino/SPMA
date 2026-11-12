// e2e das rotas de API da gestão de usuários: POST /api/usuarios/consulta,
// PATCH /api/usuarios e POST /api/usuarios/resetar-senha.
//
// Só a LIGAÇÃO de cada rota (tasks.md, Test Coverage Matrix): contrato 200,
// CSRF ausente, um 403 de autorização, um 400 de forma e o documento só no
// corpo (GU-48). Escopo, matriz, paginação e propagação da troca de
// documento já estão provados em integração, na camada de serviço
// (`src/lib/usuarios/*.integration.test.ts`); não se repetem aqui.
//
// Prefixo "53" para CPFs e CNPJs: espaço de numeração próprio deste spec
// (os arquivos rodam em paralelo contra o mesmo `spma_test`, ver
// `playwright.config.ts`). A integração usa "48"/"49".
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarDadosPessoais,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  getUsuario,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import {
  BASE_URL,
  cabecalhoCookie,
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

function calcularDigitoVerificador(digitos: number[]): number {
  const pesoInicial = digitos.length + 1;
  const soma = digitos.reduce(
    (acc, digito, index) => acc + digito * (pesoInicial - index),
    0,
  );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** CPF válido (módulo 11) no espaço "53" deste spec. */
function gerarCpfValido(indice: number): string {
  const base9 = `53000${String(indice).padStart(4, "0")}`;
  const digitos = base9.split("").map(Number);
  const d1 = calcularDigitoVerificador(digitos);
  const d2 = calcularDigitoVerificador([...digitos, d1]);
  return `${base9}${d1}${d2}`;
}

/** `52998224725` → `529.982.247-25`: o jeito que um gestor digitaria. */
function comPontuacao(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

const CPF_GT = gerarCpfValido(1);
const CPF_VT = gerarCpfValido(2);
const CPF_VT_BUSCADO = gerarCpfValido(3);
const CPF_VO_DO_GO_A = gerarCpfValido(4);
const CPF_VO_DO_GO_B = gerarCpfValido(5);
const CPF_AM = gerarCpfValido(6);
const CPF_VT_RESETADO = gerarCpfValido(7);

const gerarCnpjValido = geradorDeCnpj("53");
const CNPJ_GO_A = gerarCnpjValido(1);
const CNPJ_GO_B = gerarCnpjValido(2);

const NOME_VO_DO_GO_B = "GU-E2E API VO do GO B";

const DOCUMENTOS = [
  CPF_GT,
  CPF_VT,
  CPF_VT_BUSCADO,
  CPF_VO_DO_GO_A,
  CPF_VO_DO_GO_B,
  CNPJ_GO_A,
  CNPJ_GO_B,
  CPF_AM,
  CPF_VT_RESETADO,
];

async function login(documento: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { documento, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) {
    throw new Error(`Login de ${documento} não emitiu sessão/CSRF`);
  }
  return { idSessao, idCsrf };
}

test.beforeAll(() => {
  deleteUsuarios(DOCUMENTOS);

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VT_BUSCADO, tipo: "VT", nome: "GU-E2E API VT Buscado" });

  upsertUsuario({ cpf: CNPJ_GO_A, tipo: "GO", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CNPJ_GO_B, tipo: "GO", senha: SENHA, primeiraVez: false });
  upsertUsuario({
    cpf: CPF_VO_DO_GO_A,
    tipo: "VO",
    cdOfertante: CNPJ_GO_A,
    nome: "GU-E2E API VO do GO A",
  });
  upsertUsuario({
    cpf: CPF_VO_DO_GO_B,
    tipo: "VO",
    cdOfertante: CNPJ_GO_B,
    nome: NOME_VO_DO_GO_B,
  });

  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VT_RESETADO, tipo: "VT", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteUsuarios(DOCUMENTOS);
});

test.describe("POST /api/usuarios/consulta", () => {
  test("GU-16: GT recebe 200 com o contrato da página", async () => {
    const { idSessao, idCsrf } = await login(CPF_GT);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/consulta", {
      data: { pagina: 1 },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(200);
    const corpo = await res.json();
    expect(Object.keys(corpo).sort()).toEqual(["pagina", "total", "totalPaginas", "usuarios"]);
    expect(corpo.pagina).toBe(1);
    expect(corpo.usuarios.length).toBeGreaterThan(0);
    expect(corpo.usuarios.length).toBeLessThanOrEqual(20);
    expect(corpo.totalPaginas).toBe(Math.max(1, Math.ceil(corpo.total / 20)));
    expect(Object.keys(corpo.usuarios[0]).sort()).toEqual([
      "documento",
      "editavel",
      "email",
      "nome",
      "tipo",
    ]);

    await cliente.dispose();
  });

  test("GU-48: a busca por CPF vai só no corpo, e a URL fica sem query string", async () => {
    const { idSessao, idCsrf } = await login(CPF_GT);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/consulta", {
      data: { pagina: 1, busca: comPontuacao(CPF_VT_BUSCADO) },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.url()).toBe(`${BASE_URL}/api/usuarios/consulta`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({
      usuarios: [
        {
          documento: CPF_VT_BUSCADO,
          nome: "GU-E2E API VT Buscado",
          email: null,
          tipo: "VT",
          editavel: true,
        },
      ],
      total: 1,
      pagina: 1,
      totalPaginas: 1,
    });

    await cliente.dispose();
  });

  test("GU-20: sem o token CSRF responde 403", async () => {
    const { idSessao } = await login(CPF_GT);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/consulta", {
      data: { pagina: 1 },
      headers: cabecalhoCookie(idSessao),
    });

    expect(res.status()).toBe(403);

    await cliente.dispose();
  });

  test("GU-19: VT recebe 403 Acesso negado", async () => {
    const { idSessao, idCsrf } = await login(CPF_VT);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/consulta", {
      data: { pagina: 1 },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ erro: "Acesso negado" });

    await cliente.dispose();
  });

  test("GU-17: chave fora do contrato responde 400", async () => {
    const { idSessao, idCsrf } = await login(CPF_GT);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/consulta", {
      data: { pagina: 1, cpf: CPF_VT_BUSCADO },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(400);

    await cliente.dispose();
  });
});

test.describe("PATCH /api/usuarios", () => {
  test("GU-24: GO corrige o nome do próprio VO, e o banco grava", async () => {
    const { idSessao, idCsrf } = await login(CNPJ_GO_A);
    const cliente = await novoCliente();

    const res = await cliente.patch("/api/usuarios", {
      data: { documentoAtual: comPontuacao(CPF_VO_DO_GO_A), nome: "GU-E2E API VO Corrigido" },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.url()).toBe(`${BASE_URL}/api/usuarios`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({
      usuario: {
        documento: CPF_VO_DO_GO_A,
        nome: "GU-E2E API VO Corrigido",
        email: null,
        tipo: "VO",
      },
    });
    expect(getUsuario(CPF_VO_DO_GO_A)?.nome).toBe("GU-E2E API VO Corrigido");

    await cliente.dispose();
  });

  test("GU-27: GO editando o VO de outro GO recebe 403, e o banco não muda", async () => {
    const { idSessao, idCsrf } = await login(CNPJ_GO_A);
    const cliente = await novoCliente();

    const res = await cliente.patch("/api/usuarios", {
      data: { documentoAtual: CPF_VO_DO_GO_B, nome: "GU-E2E API Forjado" },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({
      erro: "Você não tem permissão para editar este usuário",
    });
    expect(getUsuario(CPF_VO_DO_GO_B)?.nome).toBe(NOME_VO_DO_GO_B);

    await cliente.dispose();
  });

  test("GU-29: sem o token CSRF responde 403, e o banco não muda", async () => {
    const { idSessao } = await login(CNPJ_GO_B);
    const cliente = await novoCliente();

    const res = await cliente.patch("/api/usuarios", {
      data: { documentoAtual: CPF_VO_DO_GO_B, nome: "GU-E2E API Sem CSRF" },
      headers: cabecalhoCookie(idSessao),
    });

    expect(res.status()).toBe(403);
    expect(getUsuario(CPF_VO_DO_GO_B)?.nome).toBe(NOME_VO_DO_GO_B);

    await cliente.dispose();
  });

  test("GU-30: chave fora do contrato (tipo) responde 400, e o banco não muda", async () => {
    const { idSessao, idCsrf } = await login(CNPJ_GO_B);
    const cliente = await novoCliente();

    const res = await cliente.patch("/api/usuarios", {
      data: { documentoAtual: CPF_VO_DO_GO_B, nome: "GU-E2E API Com Tipo", tipo: "AL" },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(400);
    const persistido = getUsuario(CPF_VO_DO_GO_B);
    expect(persistido?.nome).toBe(NOME_VO_DO_GO_B);
    expect(persistido?.tipo).toBe("VO");

    await cliente.dispose();
  });
});

test.describe("POST /api/usuarios/resetar-senha", () => {
  test("GU-41: AM reseta um VT, que volta a entrar com a senha em branco", async () => {
    const { idSessao, idCsrf } = await login(CPF_AM);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/resetar-senha", {
      data: { documento: comPontuacao(CPF_VT_RESETADO) },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.url()).toBe(`${BASE_URL}/api/usuarios/resetar-senha`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const resetado = getUsuario(CPF_VT_RESETADO);
    expect(resetado?.senhaHash).toBeNull();
    expect(resetado?.primeiraVez).toBe(true);

    // PASB-01: sem senha, o login aceita a senha em branco e leva ao 1º acesso.
    const resLogin = await cliente.post("/api/auth/login", {
      data: { documento: CPF_VT_RESETADO, senha: "" },
    });
    expect(resLogin.status()).toBe(200);
    expect((await resLogin.json()).proximaRota).toBe("/primeiro-acesso");

    await cliente.dispose();
  });

  test("GU-43: GT resetando um AM recebe 403, e a senha do AM continua", async () => {
    const { idSessao, idCsrf } = await login(CPF_GT);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/resetar-senha", {
      data: { documento: CPF_AM },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({
      erro: "Você não tem permissão para editar este usuário",
    });
    expect(getUsuario(CPF_AM)?.senhaHash).not.toBeNull();

    await cliente.dispose();
  });

  test("GU-44: sem o token CSRF responde 403, e a senha do alvo continua", async () => {
    const { idSessao } = await login(CPF_AM);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/resetar-senha", {
      data: { documento: CPF_GT },
      headers: cabecalhoCookie(idSessao),
    });

    expect(res.status()).toBe(403);
    expect(getUsuario(CPF_GT)?.senhaHash).not.toBeNull();

    await cliente.dispose();
  });

  test("GU-44/GU-47: corpo com senha responde 400, e a senha do alvo continua", async () => {
    const { idSessao, idCsrf } = await login(CPF_AM);
    const cliente = await novoCliente();

    const res = await cliente.post("/api/usuarios/resetar-senha", {
      data: { documento: CPF_GT, senha: "SenhaDoGestor123" },
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });

    expect(res.status()).toBe(400);
    expect(getUsuario(CPF_GT)?.senhaHash).not.toBeNull();

    await cliente.dispose();
  });
});

// RU-30 a RU-33 (doc 13): excluir um aluno cadastrado por engano. O alvo vai
// no corpo, como no reset de senha (GU-48, AD-029). Documentos próprios
// (índices 20+), para não cruzar com os usuários dos blocos acima.
test.describe("POST /api/usuarios/excluir", () => {
  const CNPJ_GO_DONO = gerarCnpjValido(20);
  const CNPJ_GO_ALHEIO = gerarCnpjValido(21);
  const CPF_AM_EXCLUSAO = gerarCpfValido(20);
  const CPF_AL_VAZIO = gerarCpfValido(21);
  const CPF_AL_COM_DADOS = gerarCpfValido(22);
  const CPF_VT_ALVO = gerarCpfValido(23);
  const CPF_INEXISTENTE = gerarCpfValido(24);
  const DOCS = [CNPJ_GO_DONO, CNPJ_GO_ALHEIO, CPF_AM_EXCLUSAO, CPF_AL_VAZIO, CPF_AL_COM_DADOS, CPF_VT_ALVO];

  function limpar() {
    deleteAvaliacoesPorCpf([CPF_AL_VAZIO, CPF_AL_COM_DADOS]);
    deletePreCursosPorOfertante([CNPJ_GO_DONO]);
    deleteVerbasPorOfertante([CNPJ_GO_DONO]);
    deleteUsuarios([...DOCS, CPF_INEXISTENTE]);
  }

  test.beforeAll(() => {
    limpar();
    upsertUsuario({ cpf: CNPJ_GO_DONO, tipo: "GO", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CNPJ_GO_ALHEIO, tipo: "GO", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CPF_AM_EXCLUSAO, tipo: "AM", senha: SENHA, primeiraVez: false });
    upsertUsuario({ cpf: CPF_VT_ALVO, tipo: "VT" });
    upsertUsuario({ cpf: CPF_AL_VAZIO, tipo: "AL" });
    upsertUsuario({ cpf: CPF_AL_COM_DADOS, tipo: "AL" });

    const { cdVerba } = criarVerba({ cdOfertante: CNPJ_GO_DONO, vlVerba: 1000 });
    const { cdCurso } = criarPreCurso({
      cdOfertante: CNPJ_GO_DONO,
      cdVerba,
      vlCursoAlocado: 10,
      criadoPor: CNPJ_GO_DONO,
    });
    criarAvaliacao({ cpf: CPF_AL_VAZIO, cdCurso });
    criarAvaliacao({ cpf: CPF_AL_COM_DADOS, cdCurso });
    criarDadosPessoais(CPF_AL_COM_DADOS, {
      avalPessoalEstado: "SP",
      avalPessoalMunicipio: "São Paulo, SP",
      avalPessoalGenero: "Masculino",
      avalPessoalFaixaEtaria: "36 a 50 anos",
      avalPessoalEscolaridade: "Ensino superior completo",
      avalPessoalRacaEtnia: "Branco",
      avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
    });
  });

  test.afterAll(limpar);

  async function excluir(quem: string, documento: string, comCsrf = true) {
    const { idSessao, idCsrf } = await login(quem);
    const cliente = await novoCliente();
    const res = await cliente.post("/api/usuarios/excluir", {
      data: { documento },
      headers: comCsrf ? cabecalhosAutenticados(idSessao, idCsrf) : cabecalhoCookie(idSessao),
    });
    const corpo = await res.json().catch(() => null);
    await cliente.dispose();
    return { status: res.status(), corpo };
  }

  test("RU-31: aluno com dados pessoais -> 409 com a mensagem e ele continua", async () => {
    const { status, corpo } = await excluir(CNPJ_GO_DONO, CPF_AL_COM_DADOS);

    expect(status).toBe(409);
    expect(corpo).toEqual({ erro: "Este aluno já tem dados preenchidos e não pode ser excluído." });
    expect(getUsuario(CPF_AL_COM_DADOS)).not.toBeNull();
  });

  test("RU-32: alvo que não é Aluno -> 400 e ele continua", async () => {
    const { status, corpo } = await excluir(CPF_AM_EXCLUSAO, CPF_VT_ALVO);

    expect(status).toBe(400);
    expect(corpo).toEqual({ erro: "Só é possível excluir aluno." });
    expect(getUsuario(CPF_VT_ALVO)).not.toBeNull();
  });

  test("RU-33: GO de outro ofertante -> 403 e o aluno continua", async () => {
    const { status, corpo } = await excluir(CNPJ_GO_ALHEIO, CPF_AL_VAZIO);

    expect(status).toBe(403);
    expect(corpo).toEqual({ erro: "Você não tem permissão para editar este usuário" });
    expect(getUsuario(CPF_AL_VAZIO)).not.toBeNull();
  });

  test("RU-33: AM com alvo inexistente -> 404", async () => {
    const { status } = await excluir(CPF_AM_EXCLUSAO, CPF_INEXISTENTE);

    expect(status).toBe(404);
  });

  test("sem o token de CSRF -> 403 e o aluno continua", async () => {
    const { status } = await excluir(CNPJ_GO_DONO, CPF_AL_VAZIO, false);

    expect(status).toBe(403);
    expect(getUsuario(CPF_AL_VAZIO)).not.toBeNull();
  });

  // Por último: é o único que apaga o aluno vazio.
  test("RU-30: o GO do curso exclui o aluno sem dados -> 200 e ele some", async () => {
    const { status, corpo } = await excluir(CNPJ_GO_DONO, CPF_AL_VAZIO);

    expect(status).toBe(200);
    expect(corpo).toEqual({ ok: true });
    expect(getUsuario(CPF_AL_VAZIO)).toBeNull();
  });
});
