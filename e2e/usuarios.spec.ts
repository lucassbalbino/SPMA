// e2e de POST /api/usuarios (T22). Cobre CA-AU-05, CA-AU-06, REQ-AU-08
// (escopo resolvido no servidor) e o acesso sem sessão.
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  deleteUsuarios,
  getUsuario,
  upsertUsuario,
} from "./helpers/db";
import { cabecalhoCookie, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GO_CRIADOR = "20080090095";
const CPF_NOVO_AL = "30010020004";
const CPF_NOVO_GO = "30020030002";
const CPF_NOVO_VO = "30030040000";
const CPF_FORJADO_GT = "30040050009";
const CPF_SEM_SESSAO = "30050060007";

const CPFS = [
  CPF_GO_CRIADOR,
  CPF_NOVO_AL,
  CPF_NOVO_GO,
  CPF_NOVO_VO,
  CPF_FORJADO_GT,
  CPF_SEM_SESSAO,
];

let cdOfertanteDoGo: number;
let cdOfertanteAlheio: number;

async function sessaoDoGo(): Promise<string> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_GO_CRIADOR, senha: SENHA },
  });
  const id = idSessaoDaResposta(res);
  await cliente.dispose();

  if (!id) throw new Error("Login do GO criador não emitiu sessão");
  return id;
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  cdOfertanteDoGo = criarOfertante({ nome: "Ofertante do GO", uf: "SP" }).cdOfertante;
  cdOfertanteAlheio = criarOfertante({ nome: "Ofertante Alheio", uf: "RJ" }).cdOfertante;

  upsertUsuario({
    cpf: CPF_GO_CRIADOR,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertanteDoGo,
  });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-AU-05: GO autenticado cria AL e a autoria fica registrada", async () => {
  const idSessao = await sessaoDoGo();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { cpf: CPF_NOVO_AL, nome: "Aluno Novo", tipo: "AL" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(201);

  const criado = getUsuario(CPF_NOVO_AL);
  expect(criado).not.toBeNull();
  expect(criado?.tipo).toBe("AL");
  // REQ-AU-07: quem criou e quando.
  expect(criado?.criadoPor).toBe(CPF_GO_CRIADOR);
  expect(new Date(criado!.dataCriacao).getTime()).toBeGreaterThan(0);
  // CA-AU-10: nenhum endpoint devolve senha ou hash.
  expect(await res.text()).not.toMatch(/senhaHash|\$argon2/i);

  await cliente.dispose();
});

test("CA-AU-06: GO que forja a criação de um GT recebe 403 e nada é criado", async () => {
  const idSessao = await sessaoDoGo();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { cpf: CPF_FORJADO_GT, nome: "GT Forjado", tipo: "GT" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_FORJADO_GT)).toBeNull();

  await cliente.dispose();
});

test("REQ-AU-08: GO criando GO/VO herda o próprio ofertante, ignorando o payload", async () => {
  const idSessao = await sessaoDoGo();
  const cliente = await novoCliente();

  const resGo = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_GO,
      nome: "GO Novo",
      tipo: "GO",
      // Valor forjado: o servidor tem de ignorá-lo.
      cdOfertante: cdOfertanteAlheio,
    },
    headers: cabecalhoCookie(idSessao),
  });

  const resVo = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_VO,
      nome: "VO Novo",
      tipo: "VO",
      cdOfertante: cdOfertanteAlheio,
    },
    headers: cabecalhoCookie(idSessao),
  });

  expect(resGo.status()).toBe(201);
  expect(resVo.status()).toBe(201);

  expect(getUsuario(CPF_NOVO_GO)?.cdOfertante).toBe(cdOfertanteDoGo);
  expect(getUsuario(CPF_NOVO_GO)?.cdOfertante).not.toBe(cdOfertanteAlheio);
  expect(getUsuario(CPF_NOVO_VO)?.cdOfertante).toBe(cdOfertanteDoGo);
  expect(getUsuario(CPF_NOVO_VO)?.cdOfertante).not.toBe(cdOfertanteAlheio);

  await cliente.dispose();
});

test("sem sessão válida retorna 401 e não cria usuário", async () => {
  const semCookie = await novoCliente();
  const resSemCookie = await semCookie.post("/api/usuarios", {
    data: { cpf: CPF_SEM_SESSAO, nome: "Sem Sessão", tipo: "AL" },
  });

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/usuarios", {
    data: { cpf: CPF_SEM_SESSAO, nome: "Sem Sessão", tipo: "AL" },
    headers: cabecalhoCookie("00000000-0000-4000-8000-000000000000"),
  });

  expect(resSemCookie.status()).toBe(401);
  expect(resCookieInvalido.status()).toBe(401);
  expect(getUsuario(CPF_SEM_SESSAO)).toBeNull();

  await semCookie.dispose();
  await cookieInvalido.dispose();
});
