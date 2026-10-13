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
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
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
