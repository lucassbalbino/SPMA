// e2e de POST /api/ofertantes (T23) - auto-cadastro do Ofertante pelo GO
// sem vínculo (REQ-AU-09).
//
// Nota (seguranca-transversal, T16/T20): a rota exige CSRF (REQ-SEC-15),
// checado antes até da sessão/permissão (design.md). "perfil diferente de
// GO" esperava 403 por permissão negada; com CSRF ausente ele "passava"
// pelo mesmo código de status por um motivo errado (interceptado pelo
// CSRF) - anexar `cabecalhosAutenticados` faz a checagem voltar a ser
// exercitada pelo motivo original (`usuario.tipo !== "GO"`). CA-SEC-15 é a
// exceção deliberada (prova a rejeição por CSRF ausente), então não pode
// anexar um token válido.
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  deleteUsuarios,
  getOfertante,
  getUsuario,
  listarOfertantesPorNome,
  upsertUsuario,
} from "./helpers/db";
import {
  cabecalhoCookie,
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GO_SEM_OFERTANTE = "30060070005";
const CPF_GO_COM_OFERTANTE = "30070080003";
const CPF_ALUNO = "30080090001";
const CPF_GO_SEM_CSRF = "30095001069";
const CPF_AM = "30104005009";
const CPF_GT = "30204006007";
const CPF_GO_LISTAGEM = "30304007005";

const NOME_OFERTANTE_NOVO = "Ofertante Auto Cadastrado";
const NOME_OFERTANTE_DUPLICADO = "Ofertante Duplicado";
const NOME_OFERTANTE_DE_ALUNO = "Ofertante De Aluno";
const NOME_OFERTANTE_SEM_CSRF = "Ofertante Sem Csrf";
const NOME_OFERTANTE_POR_AM = "Ofertante Pre Cadastrado Por Am";
const NOME_OFERTANTE_POR_GT = "Ofertante Pre Cadastrado Por Gt";

const CPFS = [
  CPF_GO_SEM_OFERTANTE,
  CPF_GO_COM_OFERTANTE,
  CPF_ALUNO,
  CPF_GO_SEM_CSRF,
  CPF_AM,
  CPF_GT,
  CPF_GO_LISTAGEM,
];

let cdOfertanteExistente: number;
let cdOfertanteListagem: number;

async function logar(cpf: string): Promise<string> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  const id = idSessaoDaResposta(res);
  await cliente.dispose();

  if (!id) throw new Error(`Login não emitiu sessão para ${cpf}`);
  return id;
}

/** Mesmo login de `logar`, mas também devolve o token de CSRF emitido. */
async function logarComCsrf(
  cpf: string,
): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) {
    throw new Error(`Login não emitiu sessão/CSRF para ${cpf}`);
  }
  return { idSessao, idCsrf };
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  cdOfertanteExistente = criarOfertante({
    nome: "Ofertante Já Vinculado",
    uf: "MG",
  }).cdOfertante;

  upsertUsuario({
    cpf: CPF_GO_SEM_OFERTANTE,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: null,
  });
  upsertUsuario({
    cpf: CPF_GO_COM_OFERTANTE,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteExistente,
  });
  upsertUsuario({
    cpf: CPF_ALUNO,
    tipo: "AL",
    senha: SENHA,
    primeiraVez: false,
  });
  upsertUsuario({
    cpf: CPF_GO_SEM_CSRF,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: null,
  });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });

  cdOfertanteListagem = criarOfertante({
    nome: "Ofertante Da Listagem",
    uf: "RJ",
  }).cdOfertante;
  upsertUsuario({
    cpf: CPF_GO_LISTAGEM,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteListagem,
  });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("GO sem ofertante cadastra o seu e passa a ter cdOfertante preenchido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_SEM_OFERTANTE);
  expect(getUsuario(CPF_GO_SEM_OFERTANTE)?.cdOfertante).toBeNull();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: NOME_OFERTANTE_NOVO, uf: "SP", municipio: "Santos" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  const cdOfertante = getUsuario(CPF_GO_SEM_OFERTANTE)?.cdOfertante;
  expect(cdOfertante).not.toBeNull();
  // O Ofertante criado é mesmo o que ficou vinculado ao usuário.
  expect(getOfertante(cdOfertante!)?.nome).toBe(NOME_OFERTANTE_NOVO);

  await cliente.dispose();
});

test("GO que já tem ofertante recebe 409 e o vínculo não muda", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_COM_OFERTANTE);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: NOME_OFERTANTE_DUPLICADO, uf: "BA" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  expect(getUsuario(CPF_GO_COM_OFERTANTE)?.cdOfertante).toBe(cdOfertanteExistente);
  expect(listarOfertantesPorNome(NOME_OFERTANTE_DUPLICADO)).toHaveLength(0);

  await cliente.dispose();
});

test("perfil diferente de GO recebe 403 e nada é criado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_ALUNO);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: NOME_OFERTANTE_DE_ALUNO, uf: "PR" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(listarOfertantesPorNome(NOME_OFERTANTE_DE_ALUNO)).toHaveLength(0);
  expect(getUsuario(CPF_ALUNO)?.cdOfertante).toBeNull();

  await cliente.dispose();
});

test("sem sessão válida retorna 401 e nada é criado", async () => {
  // REQ-SEC-15: CSRF é checado antes da sessão, então mesmo este cenário de
  // sessão ausente precisa de um par CSRF autoconsistente (cookie == header)
  // para alcançar a checagem de sessão que este teste prova - double-submit
  // não tem estado no servidor, então o valor não precisa vir de um login
  // real.
  const csrfArbitrario = "csrf-arbitrario-sem-sessao";

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: "Ofertante Sem Sessao", uf: "RS" },
    headers: {
      Cookie: `spma_csrf=${csrfArbitrario}`,
      "x-csrf-token": csrfArbitrario,
    },
  });

  expect(res.status()).toBe(401);
  expect(listarOfertantesPorNome("Ofertante Sem Sessao")).toHaveLength(0);

  await cliente.dispose();
});

test("CA-SEC-15: POST sem token CSRF válido é rejeitado com 403, nenhum ofertante criado", async () => {
  const idSessao = await logar(CPF_GO_SEM_CSRF);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: NOME_OFERTANTE_SEM_CSRF, uf: "SC" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(403);
  expect(listarOfertantesPorNome(NOME_OFERTANTE_SEM_CSRF)).toHaveLength(0);
  expect(getUsuario(CPF_GO_SEM_CSRF)?.cdOfertante).toBeNull();

  await cliente.dispose();
});

test("CA-OV-01: AM pré-cadastra um Ofertante sem se vincular a ele", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: NOME_OFERTANTE_POR_AM, uf: "MG" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  expect(listarOfertantesPorNome(NOME_OFERTANTE_POR_AM)).toHaveLength(1);
  // AM não tem cdOfertante - o pré-cadastro não vincula ninguém.
  expect(getUsuario(CPF_AM)?.cdOfertante).toBeNull();

  await cliente.dispose();
});

test("CA-OV-01: GT pré-cadastra um Ofertante sem se vincular a ele", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { nome: NOME_OFERTANTE_POR_GT, uf: "RS" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  expect(listarOfertantesPorNome(NOME_OFERTANTE_POR_GT)).toHaveLength(1);
  expect(getUsuario(CPF_GT)?.cdOfertante).toBeNull();

  await cliente.dispose();
});

test("CA-OV-02: pré-cadastro administrativo sem nome é rejeitado com 400", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AM);

  const cliente = await novoCliente();
  const res = await cliente.post("/api/ofertantes", {
    data: { uf: "MG" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);

  await cliente.dispose();
});

test("CA-OV-07: GT lista todos os Ofertantes (inclui o da listagem de teste)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GT);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/ofertantes", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(
    corpo.ofertantes.some((o: { cdOfertante: number }) => o.cdOfertante === cdOfertanteListagem),
  ).toBe(true);

  await cliente.dispose();
});

test("CA-OV-07: GO vinculado ao Ofertante A lista só o Ofertante A", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_LISTAGEM);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/ofertantes", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.ofertantes).toHaveLength(1);
  expect(corpo.ofertantes[0].cdOfertante).toBe(cdOfertanteListagem);

  await cliente.dispose();
});

test("listagem: Aluno não tem acesso (403)", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_ALUNO);

  const cliente = await novoCliente();
  const res = await cliente.get("/api/ofertantes", {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});
