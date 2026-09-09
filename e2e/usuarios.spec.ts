// e2e de POST /api/usuarios (T22). Cobre CA-AU-05, CA-AU-06, REQ-AU-08
// (escopo resolvido no servidor) e o acesso sem sessão.
//
// Nota (seguranca-transversal, T15/T20): a rota exige CSRF (REQ-SEC-15),
// checado antes até da sessão/permissão (design.md). CA-AU-06 esperava 403
// por permissão negada; com CSRF ausente ele "passava" pelo mesmo status
// código por um motivo errado (interceptado pelo CSRF) - anexar
// `cabecalhosAutenticados` faz a checagem voltar a ser exercitada pelo
// motivo original (podeCriar). CA-SEC-15 é a exceção deliberada (prova a
// rejeição por CSRF ausente), então não pode anexar um token válido.
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getAvaliacao,
  getUsuario,
  getVerba,
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

const CPF_GO_CRIADOR = "20080090095";
const CPF_NOVO_AL = "30010020004";
const CPF_NOVO_GO = "30020030002";
const CPF_NOVO_VO = "30030040000";
const CPF_FORJADO_GT = "30040050009";
const CPF_SEM_SESSAO = "30050060007";
const CPF_SEM_CSRF = "30091002052";
const CPF_DUPLICADO = "30092003079";
const CPF_AM_CRIADOR = "70105006068";
const CPF_NOVO_GO_OFERTANTE_VALIDO = "70206007000";
const CPF_NOVO_GO_OFERTANTE_INVALIDO = "70307008053";
const CPF_NOVO_GO_SEM_VERBA = "70408009004";
const CPF_NOVO_GO_VERBA_PELO_GO = "70509000010";
const CPF_NOVO_AL_PELO_AM = "70601002024";
const CPF_NOVO_AL_SEM_CURSO = "70702003077";
const CPF_NOVO_AL_CURSO_ALHEIO = "70803004010";
const CPF_NOVO_AL_CURSO_INEXISTENTE = "70904005062";

const CPFS = [
  CPF_GO_CRIADOR,
  CPF_NOVO_AL,
  CPF_NOVO_GO,
  CPF_NOVO_VO,
  CPF_FORJADO_GT,
  CPF_SEM_SESSAO,
  CPF_SEM_CSRF,
  CPF_DUPLICADO,
  CPF_AM_CRIADOR,
  CPF_NOVO_GO_OFERTANTE_VALIDO,
  CPF_NOVO_GO_OFERTANTE_INVALIDO,
  CPF_NOVO_GO_SEM_VERBA,
  CPF_NOVO_GO_VERBA_PELO_GO,
  CPF_NOVO_AL_PELO_AM,
  CPF_NOVO_AL_SEM_CURSO,
  CPF_NOVO_AL_CURSO_ALHEIO,
  CPF_NOVO_AL_CURSO_INEXISTENTE,
];

let cdOfertanteDoGo: number;
let cdOfertanteAlheio: number;
let cdCursoDoGo: number;
let cdCursoAlheio: number;

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

/** Mesmo login de `sessaoDoGo`, mas também devolve o token de CSRF emitido. */
async function sessaoDoGoComCsrf(): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_GO_CRIADOR, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) {
    throw new Error("Login do GO criador não emitiu sessão/CSRF");
  }
  return { idSessao, idCsrf };
}

/** Login do AM criador com CSRF, usado nos testes de REQ-OV-04. */
async function sessaoDoAmComCsrf(): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { cpf: CPF_AM_CRIADOR, senha: SENHA },
  });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) {
    throw new Error("Login do AM criador não emitiu sessão/CSRF");
  }
  return { idSessao, idCsrf };
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
  upsertUsuario({ cpf: CPF_AM_CRIADOR, tipo: "AM", senha: SENHA, primeiraVez: false });

  // Todo Aluno nasce matriculado (AVAL-01), então a criação de AL precisa de
  // um curso - um no Ofertante do GO criador e outro num Ofertante alheio,
  // para exercitar o escopo da matrícula (AVAL-05/06).
  const cdVerbaDoGo = criarVerba({ cdOfertante: cdOfertanteDoGo, vlVerba: 10000 }).cdVerba;
  const cdVerbaAlheia = criarVerba({ cdOfertante: cdOfertanteAlheio, vlVerba: 10000 }).cdVerba;
  cdCursoDoGo = criarPreCurso({
    cdOfertante: cdOfertanteDoGo,
    cdVerba: cdVerbaDoGo,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_CRIADOR,
  }).cdCurso;
  cdCursoAlheio = criarPreCurso({
    cdOfertante: cdOfertanteAlheio,
    cdVerba: cdVerbaAlheia,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO_CRIADOR,
  }).cdCurso;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertanteDoGo, cdOfertanteAlheio]);
  deleteUsuarios(CPFS);
});

test("CA-AU-05: GO autenticado cria AL e a autoria fica registrada", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { cpf: CPF_NOVO_AL, nome: "Aluno Novo", tipo: "AL", cdCurso: cdCursoDoGo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  // AVAL-01: o Aluno nasce matriculado, no mesmo passo.
  expect(getAvaliacao(CPF_NOVO_AL, cdCursoDoGo)?.status).toBe("EM_ANDAMENTO");

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
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { cpf: CPF_FORJADO_GT, nome: "GT Forjado", tipo: "GT" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_FORJADO_GT)).toBeNull();

  await cliente.dispose();
});

test("REQ-AU-08: GO criando GO/VO herda o próprio ofertante, ignorando o payload", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const resGo = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_GO,
      nome: "GO Novo",
      tipo: "GO",
      // Valor forjado: o servidor tem de ignorá-lo.
      cdOfertante: cdOfertanteAlheio,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const resVo = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_VO,
      nome: "VO Novo",
      tipo: "VO",
      cdOfertante: cdOfertanteAlheio,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
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
  // REQ-SEC-15: CSRF é checado antes da sessão, então mesmo este cenário de
  // sessão ausente/inválida precisa de um par CSRF autoconsistente
  // (cookie == header) para alcançar a checagem de sessão que este teste
  // prova - double-submit não tem estado no servidor, então o valor não
  // precisa vir de um login real.
  const csrfArbitrario = "csrf-arbitrario-sem-sessao";

  const semCookie = await novoCliente();
  const resSemCookie = await semCookie.post("/api/usuarios", {
    data: { cpf: CPF_SEM_SESSAO, nome: "Sem Sessão", tipo: "AL" },
    headers: {
      Cookie: `spma_csrf=${csrfArbitrario}`,
      "x-csrf-token": csrfArbitrario,
    },
  });

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/usuarios", {
    data: { cpf: CPF_SEM_SESSAO, nome: "Sem Sessão", tipo: "AL" },
    headers: cabecalhosAutenticados(
      "00000000-0000-4000-8000-000000000000",
      csrfArbitrario,
    ),
  });

  expect(resSemCookie.status()).toBe(401);
  expect(resCookieInvalido.status()).toBe(401);
  expect(getUsuario(CPF_SEM_SESSAO)).toBeNull();

  await semCookie.dispose();
  await cookieInvalido.dispose();
});

test("CA-SEC-15: POST sem token CSRF válido é rejeitado com 403, nenhum usuário criado", async () => {
  const idSessao = await sessaoDoGo();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { cpf: CPF_SEM_CSRF, nome: "Sem CSRF", tipo: "AL" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_SEM_CSRF)).toBeNull();

  await cliente.dispose();
});

// A unicidade de `cpf` (@id) é tratada na rota: 409 com mensagem acionável,
// em vez do 500 genérico que esta violação produzia quando era exceção não
// tratada. REQ-SEC-11 não perde cobertura - `comTratamentoDeErro` continua
// montado nesta rota (a corrida entre dois POSTs simultâneos com o mesmo CPF
// ainda cai nele) e o 500 genérico + idCorrelacao é provado diretamente em
// `src/lib/errors/api-error.test.ts`. A metade de segurança do caso, que o
// corpo nunca carregue o erro cru do Prisma, segue afirmada aqui.
test("POST com CPF já existente devolve 409 com mensagem clara, nunca o erro cru do Prisma", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const headers = cabecalhosAutenticados(idSessao, idCsrf);

  const clientePrimeiro = await novoCliente();
  const primeiro = await clientePrimeiro.post("/api/usuarios", {
    data: { cpf: CPF_DUPLICADO, nome: "Primeiro Cadastro", tipo: "AL", cdCurso: cdCursoDoGo },
    headers,
  });
  expect(primeiro.status()).toBe(201);

  const clienteSegundo = await novoCliente();
  const segundo = await clienteSegundo.post("/api/usuarios", {
    data: { cpf: CPF_DUPLICADO, nome: "Segundo Cadastro", tipo: "AL", cdCurso: cdCursoDoGo },
    headers,
  });

  expect(segundo.status()).toBe(409);
  const corpo = await segundo.json();
  expect(corpo.erro).toBe("Já existe um usuário com este CPF");
  // 409 é erro previsto, não falha interna: nada de id de correlação.
  expect(corpo.idCorrelacao).toBeUndefined();
  // Nunca o erro cru do Prisma (nome de constraint, classe do erro, etc.)
  // no corpo devolvido ao cliente.
  const texto = JSON.stringify(corpo);
  expect(texto).not.toMatch(/prisma/i);
  expect(texto).not.toMatch(/constraint/i);
  expect(texto).not.toMatch(/unique/i);

  // O primeiro cadastro continua intacto - a segunda tentativa não sobrescreve.
  expect(getUsuario(CPF_DUPLICADO)?.nome).toBe("Primeiro Cadastro");

  await clientePrimeiro.dispose();
  await clienteSegundo.dispose();
});

test("REQ-OV-04/REQ-OV-08: AM criando GO com cdOfertante existente grava usuário e verba no mesmo passo", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_GO_OFERTANTE_VALIDO,
      nome: "Novo GO Ofertante Válido",
      tipo: "GO",
      cdOfertante: cdOfertanteAlheio,
      verba: { vlVerba: 12500.5, dtVerba: "2026-03-10" },
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  expect(getUsuario(CPF_NOVO_GO_OFERTANTE_VALIDO)?.cdOfertante).toBe(cdOfertanteAlheio);

  // A verba tem de existir no banco, no Ofertante do GO recém-criado - a
  // resposta HTTP sozinha não prova a persistência.
  const corpo = await res.json();
  const verba = getVerba(corpo.verba.cdVerba);
  expect(verba?.cdOfertante).toBe(cdOfertanteAlheio);
  expect(Number(verba?.vlVerba)).toBe(12500.5);

  await cliente.dispose();
});

test("REQ-OV-08: AM criando GO sem verba recebe 400 e nem o usuário é criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_GO_SEM_VERBA,
      nome: "GO Sem Verba",
      tipo: "GO",
      cdOfertante: cdOfertanteAlheio,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe(
    "Gestor Ofertante exige um Ofertante e o valor da verba",
  );
  expect(getUsuario(CPF_NOVO_GO_SEM_VERBA)).toBeNull();

  await cliente.dispose();
});

test("REQ-OV-08: GO não cria verba de carona na criação de outro GO - 403 e nada criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_GO_VERBA_PELO_GO,
      nome: "GO Com Verba Forjada",
      tipo: "GO",
      verba: { vlVerba: 999 },
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_NOVO_GO_VERBA_PELO_GO)).toBeNull();

  await cliente.dispose();
});

test("CA-OV-05: AM criando GO com cdOfertante inexistente recebe 400 claro, não um 500 genérico", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_GO_OFERTANTE_INVALIDO,
      nome: "Novo GO Ofertante Inválido",
      tipo: "GO",
      cdOfertante: 999999999,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.erro).toBe("Ofertante informado não existe");
  expect(getUsuario(CPF_NOVO_GO_OFERTANTE_INVALIDO)).toBeNull();

  await cliente.dispose();
});

test("AVAL-01: AM cria Aluno já matriculado num curso de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_AL_PELO_AM,
      nome: "Aluno Criado Pelo AM",
      tipo: "AL",
      // Curso de um Ofertante que não é o do AM (que não tem nenhum, AD-012).
      cdCurso: cdCursoAlheio,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);
  expect(getUsuario(CPF_NOVO_AL_PELO_AM)?.tipo).toBe("AL");
  expect(getAvaliacao(CPF_NOVO_AL_PELO_AM, cdCursoAlheio)?.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("AVAL-01: criar Aluno sem curso recebe 400 e o usuário não é criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: { cpf: CPF_NOVO_AL_SEM_CURSO, nome: "Aluno Sem Curso", tipo: "AL" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe("Curso é obrigatório para Aluno");
  expect(getUsuario(CPF_NOVO_AL_SEM_CURSO)).toBeNull();

  await cliente.dispose();
});

test("AVAL-05/06: GO criando Aluno em curso de outro Ofertante recebe 403, nada criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_AL_CURSO_ALHEIO,
      nome: "Aluno Curso Alheio",
      tipo: "AL",
      cdCurso: cdCursoAlheio,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_NOVO_AL_CURSO_ALHEIO)).toBeNull();
  expect(getAvaliacao(CPF_NOVO_AL_CURSO_ALHEIO, cdCursoAlheio)).toBeNull();

  await cliente.dispose();
});

test("criar Aluno com cdCurso inexistente recebe 404 e nada é criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_AL_CURSO_INEXISTENTE,
      nome: "Aluno Curso Inexistente",
      tipo: "AL",
      cdCurso: 999999999,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(404);
  expect((await res.json()).erro).toBe("Curso não encontrado");
  expect(getUsuario(CPF_NOVO_AL_CURSO_INEXISTENTE)).toBeNull();

  await cliente.dispose();
});

test("curso informado na criação de quem não é Aluno é rejeitado com 400", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      cpf: CPF_NOVO_AL_SEM_CURSO,
      nome: "VO Com Curso",
      tipo: "VO",
      cdCurso: cdCursoDoGo,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe("Curso só se aplica à criação de Aluno");
  expect(getUsuario(CPF_NOVO_AL_SEM_CURSO)).toBeNull();

  await cliente.dispose();
});
