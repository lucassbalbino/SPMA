// e2e de POST /api/usuarios (T22 original; reescrito por T11/UGO). Cobre
// CA-AU-05, CA-AU-06, REQ-AU-08 (escopo resolvido no servidor) e o acesso
// sem sessão.
//
// Nota (seguranca-transversal, T15/T20): a rota exige CSRF (REQ-SEC-15),
// checado antes até da sessão/permissão (design.md). CA-AU-06 esperava 403
// por permissão negada; com CSRF ausente ele "passava" pelo mesmo status
// código por um motivo errado (interceptado pelo CSRF) - anexar
// `cabecalhosAutenticados` faz a checagem voltar a ser exercitada pelo
// motivo original (podeCriar). CA-SEC-15 é a exceção deliberada (prova a
// rejeição por CSRF ausente), então não pode anexar um token válido.
//
// Nota (UGO/AD-043): não existe mais `model Ofertante` autônomo - o GO É o
// próprio Ofertante, identificado por CNPJ. `criarOfertante`/`getOfertante`
// foram removidos de `helpers/db.ts` (T5); os GOs de fixture agora carregam
// `nome`/`uf` no próprio `upsertUsuario`, e "o Ofertante do GO" é
// simplesmente o CNPJ desse GO.
import { expect, test } from "@playwright/test";
import {
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
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

/**
 * Gera CNPJs válidos (módulo 11) e distintos a partir de um índice, todos
 * sem conta cadastrada até o teste os criar - mesmo padrão do gerador de CPF
 * de `e2e/login.spec.ts`, adaptado aos pesos cíclicos do CNPJ (`cnpj.ts`).
 */
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
  const base12 = `11${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO_CRIADOR = gerarCnpjValido(1);
const CNPJ_GO_ALHEIO = gerarCnpjValido(2);
const CNPJ_NOVO_GO_FORJADO = gerarCnpjValido(3);
const CNPJ_NOVO_GO_VALIDO = gerarCnpjValido(4);
const CNPJ_INEXISTENTE = gerarCnpjValido(5);
const CNPJ_NOVO_GO_SEM_VERBA = gerarCnpjValido(6);

const CPF_NOVO_AL = "30010020004";
const CPF_NOVO_VO = "30030040000";
const CPF_FORJADO_GT = "30040050009";
const CPF_SEM_SESSAO = "30050060007";
const CPF_SEM_CSRF = "30091002052";
const CPF_DUPLICADO = "30092003079";
const CPF_AM_CRIADOR = "70105006068";
const CPF_NOVO_VO_INEXISTENTE = "70206007000";
const CPF_NOVO_VO_TIPO_ERRADO = "70307008053";
const CPF_NOVO_AL_PELO_AM = "70601002024";
const CPF_NOVO_AL_SEM_CURSO = "70702003077";
const CPF_NOVO_AL_CURSO_ALHEIO = "70803004010";
const CPF_NOVO_AL_CURSO_INEXISTENTE = "70904005062";
// Documento existente mas de tipo AL - usado para provar que "existe mas não
// é GO" reprova igual a "não existe" (Done-when de T11).
const CPF_AL_TIPO_ERRADO = "70999000010";

const CPFS = [
  CNPJ_GO_CRIADOR,
  CNPJ_GO_ALHEIO,
  CNPJ_NOVO_GO_FORJADO,
  CNPJ_NOVO_GO_VALIDO,
  CNPJ_NOVO_GO_SEM_VERBA,
  CPF_NOVO_AL,
  CPF_NOVO_VO,
  CPF_FORJADO_GT,
  CPF_SEM_SESSAO,
  CPF_SEM_CSRF,
  CPF_DUPLICADO,
  CPF_AM_CRIADOR,
  CPF_NOVO_VO_INEXISTENTE,
  CPF_NOVO_VO_TIPO_ERRADO,
  CPF_NOVO_AL_PELO_AM,
  CPF_NOVO_AL_SEM_CURSO,
  CPF_NOVO_AL_CURSO_ALHEIO,
  CPF_NOVO_AL_CURSO_INEXISTENTE,
  CPF_AL_TIPO_ERRADO,
];

let cdCursoDoGo: number;
let cdCursoAlheio: number;

async function sessaoDoGo(): Promise<string> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", {
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
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
    data: { documento: CNPJ_GO_CRIADOR, senha: SENHA },
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
    data: { documento: CPF_AM_CRIADOR, senha: SENHA },
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

  // GOs de fixture: agora são o próprio Ofertante (nome/uf inline), sem
  // nenhuma tabela Ofertante separada para criar antes.
  upsertUsuario({
    cpf: CNPJ_GO_CRIADOR,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante do GO",
    uf: "SP",
  });
  upsertUsuario({
    cpf: CNPJ_GO_ALHEIO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Alheio",
    uf: "RJ",
  });
  upsertUsuario({ cpf: CPF_AM_CRIADOR, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_TIPO_ERRADO, tipo: "AL", senha: SENHA, primeiraVez: false });

  // Todo Aluno nasce matriculado (AVAL-01), então a criação de AL precisa de
  // um curso - um no Ofertante do GO criador e outro num Ofertante alheio,
  // para exercitar o escopo da matrícula (AVAL-05/06).
  const cdVerbaDoGo = criarVerba({ cdOfertante: CNPJ_GO_CRIADOR, vlVerba: 10000 }).cdVerba;
  const cdVerbaAlheia = criarVerba({ cdOfertante: CNPJ_GO_ALHEIO, vlVerba: 10000 }).cdVerba;
  cdCursoDoGo = criarPreCurso({
    cdOfertante: CNPJ_GO_CRIADOR,
    cdVerba: cdVerbaDoGo,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_CRIADOR,
  }).cdCurso;
  cdCursoAlheio = criarPreCurso({
    cdOfertante: CNPJ_GO_ALHEIO,
    cdVerba: cdVerbaAlheia,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO_CRIADOR,
  }).cdCurso;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([CNPJ_GO_CRIADOR, CNPJ_GO_ALHEIO, CNPJ_NOVO_GO_VALIDO]);
  // Verba.cdOfertante aponta direto para o GO (Usuario.documento, AD-043) e
  // não tem onDelete: Cascade - sem isto, deleteUsuarios falharia por FK.
  deleteVerbasPorOfertante([CNPJ_GO_CRIADOR, CNPJ_GO_ALHEIO, CNPJ_NOVO_GO_VALIDO]);
  deleteUsuarios(CPFS);
});

test("CA-AU-05: GO autenticado cria AL e a autoria fica registrada", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { documento: CPF_NOVO_AL, nome: "Aluno Novo", tipo: "AL", cdCurso: cdCursoDoGo },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  // Contrato HTTP passa a expor `documento`, não `cpf` (T11/T16).
  const corpo = await res.json();
  expect(corpo.usuario.documento).toBe(CPF_NOVO_AL);
  expect(corpo.usuario.cpf).toBeUndefined();

  // AVAL-01: o Aluno nasce matriculado, no mesmo passo.
  expect(getAvaliacao(CPF_NOVO_AL, cdCursoDoGo)?.status).toBe("EM_ANDAMENTO");

  const criado = getUsuario(CPF_NOVO_AL);
  expect(criado).not.toBeNull();
  expect(criado?.tipo).toBe("AL");
  // REQ-AU-07: quem criou e quando.
  expect(criado?.criadoPor).toBe(CNPJ_GO_CRIADOR);
  expect(new Date(criado!.dataCriacao).getTime()).toBeGreaterThan(0);
  // CA-AU-10: nenhum endpoint devolve senha ou hash.
  expect(await res.text()).not.toMatch(/senhaHash|\$argon2/i);

  await cliente.dispose();
});

test("CA-AU-06: GO que forja a criação de um GT recebe 403 e nada é criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: { documento: CPF_FORJADO_GT, nome: "GT Forjado", tipo: "GT" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_FORJADO_GT)).toBeNull();

  await cliente.dispose();
});

test("UGO-18: GO tentando criar outro GO recebe 403 e nada é criado (GO deixou de poder criar GO)", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const res = await cliente.post("/api/usuarios", {
    data: {
      documento: CNPJ_NOVO_GO_FORJADO,
      nome: "GO Forjado",
      tipo: "GO",
      uf: "SP",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CNPJ_NOVO_GO_FORJADO)).toBeNull();

  await cliente.dispose();
});

test("REQ-AU-08: GO criando VO herda o próprio ofertante, ignorando o payload", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const cliente = await novoCliente();

  const resVo = await cliente.post("/api/usuarios", {
    data: {
      documento: CPF_NOVO_VO,
      nome: "VO Novo",
      tipo: "VO",
      // Valor forjado: o servidor tem de ignorá-lo.
      cdOfertante: CNPJ_GO_ALHEIO,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(resVo.status()).toBe(201);
  expect(getUsuario(CPF_NOVO_VO)?.cdOfertante).toBe(CNPJ_GO_CRIADOR);
  expect(getUsuario(CPF_NOVO_VO)?.cdOfertante).not.toBe(CNPJ_GO_ALHEIO);

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
    data: { documento: CPF_SEM_SESSAO, nome: "Sem Sessão", tipo: "AL" },
    headers: {
      Cookie: `spma_csrf=${csrfArbitrario}`,
      "x-csrf-token": csrfArbitrario,
    },
  });

  const cookieInvalido = await novoCliente();
  const resCookieInvalido = await cookieInvalido.post("/api/usuarios", {
    data: { documento: CPF_SEM_SESSAO, nome: "Sem Sessão", tipo: "AL" },
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
    data: { documento: CPF_SEM_CSRF, nome: "Sem CSRF", tipo: "AL" },
    headers: cabecalhoCookie(idSessao),
  });

  expect(res.status()).toBe(403);
  expect(getUsuario(CPF_SEM_CSRF)).toBeNull();

  await cliente.dispose();
});

test("REQ-SEC-11: POST com documento já existente devolve erro genérico + idCorrelacao, nunca o erro cru do Prisma", async () => {
  const { idSessao, idCsrf } = await sessaoDoGoComCsrf();
  const headers = cabecalhosAutenticados(idSessao, idCsrf);

  const clientePrimeiro = await novoCliente();
  const primeiro = await clientePrimeiro.post("/api/usuarios", {
    data: { documento: CPF_DUPLICADO, nome: "Primeiro Cadastro", tipo: "AL", cdCurso: cdCursoDoGo },
    headers,
  });
  expect(primeiro.status()).toBe(201);

  // Mesmo documento de novo: viola a unicidade (`documento` é @id) -
  // exceção real do Prisma, não tratada na rota, capturada por
  // `comTratamentoDeErro`.
  const clienteSegundo = await novoCliente();
  const segundo = await clienteSegundo.post("/api/usuarios", {
    data: { documento: CPF_DUPLICADO, nome: "Segundo Cadastro", tipo: "AL", cdCurso: cdCursoDoGo },
    headers,
  });

  expect(segundo.status()).toBe(500);
  const corpo = await segundo.json();
  expect(corpo.erro).toBe("Erro interno. Contate o suporte informando o código.");
  expect(corpo.idCorrelacao).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  // Nunca o erro cru do Prisma (nome de constraint, classe do erro, etc.)
  // no corpo devolvido ao cliente.
  const texto = JSON.stringify(corpo);
  expect(texto).not.toMatch(/prisma/i);
  expect(texto).not.toMatch(/constraint/i);
  expect(texto).not.toMatch(/unique/i);

  await clientePrimeiro.dispose();
  await clienteSegundo.dispose();
});

test("UGO-01/UGO-07: AM cria GO com CNPJ válido + nome + uf + verba - 201, verba atrelada ao próprio GO recém-criado, sem Ofertante separado", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      documento: CNPJ_NOVO_GO_VALIDO,
      nome: "Novo GO Válido",
      tipo: "GO",
      uf: "MG",
      verba: { vlVerba: 12500.5, dtVerba: "2026-03-10" },
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(201);

  const criado = getUsuario(CNPJ_NOVO_GO_VALIDO);
  expect(criado?.tipo).toBe("GO");
  // O GO É o próprio Ofertante - o cdOfertante do seu próprio registro fica
  // null (não aponta para outro GO, design.md "Consequência de B1").
  expect(criado?.cdOfertante).toBeNull();

  // A verba tem de existir no banco, atrelada ao documento do PRÓPRIO GO
  // recém-criado - não a um Ofertante autônomo (que não existe mais).
  const corpo = await res.json();
  const verba = getVerba(corpo.verba.cdVerba);
  expect(verba?.cdOfertante).toBe(CNPJ_NOVO_GO_VALIDO);
  expect(Number(verba?.vlVerba)).toBe(12500.5);

  await cliente.dispose();
});

test("REQ-OV-08: AM criando GO sem verba recebe 400 e nem o usuário é criado", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      documento: CNPJ_NOVO_GO_SEM_VERBA,
      nome: "GO Sem Verba",
      tipo: "GO",
      uf: "SP",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).erro).toBe(
    "Gestor Ofertante exige um Ofertante e o valor da verba",
  );
  expect(getUsuario(CNPJ_NOVO_GO_SEM_VERBA)).toBeNull();

  await cliente.dispose();
});

test("CA-OV-05: AM criando VO com cdOfertante inexistente recebe 400 claro, não um 500 genérico", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      documento: CPF_NOVO_VO_INEXISTENTE,
      nome: "VO Ofertante Inexistente",
      tipo: "VO",
      cdOfertante: CNPJ_INEXISTENTE,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.erro).toBe("Ofertante informado não existe");
  expect(getUsuario(CPF_NOVO_VO_INEXISTENTE)).toBeNull();

  await cliente.dispose();
});

test("UGO-01: AM criando VO com cdOfertante apontando para um documento que existe mas é tipo AL recebe 400", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      documento: CPF_NOVO_VO_TIPO_ERRADO,
      nome: "VO Ofertante Tipo Errado",
      tipo: "VO",
      cdOfertante: CPF_AL_TIPO_ERRADO,
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.erro).toBe("Ofertante informado não existe");
  expect(getUsuario(CPF_NOVO_VO_TIPO_ERRADO)).toBeNull();

  await cliente.dispose();
});

test("AVAL-01: AM cria Aluno já matriculado num curso de qualquer Ofertante", async () => {
  const { idSessao, idCsrf } = await sessaoDoAmComCsrf();

  const cliente = await novoCliente();
  const res = await cliente.post("/api/usuarios", {
    data: {
      documento: CPF_NOVO_AL_PELO_AM,
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
    data: { documento: CPF_NOVO_AL_SEM_CURSO, nome: "Aluno Sem Curso", tipo: "AL" },
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
      documento: CPF_NOVO_AL_CURSO_ALHEIO,
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
      documento: CPF_NOVO_AL_CURSO_INEXISTENTE,
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
      documento: CPF_NOVO_AL_SEM_CURSO,
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
