// e2e de GET/PATCH /api/avaliacoes/[cpf]/[cdCurso] (AVAL-07, AVAL-08, AVAL-09,
// AVAL-10, AVAL-11, AVAL-14, AVAL-17 parte gravação, AVAL-20, AVAL-21, AVAL-23).
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  encerrarAvaliacaoFixture,
  getAvaliacao,
  upsertUsuario,
} from "./helpers/db";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";

const CPF_GT = "60000000060";
const CPF_GO = "60000013714";
const CPF_GO_2 = "60000027421";
const CPF_VO = "60000041173";
const CPF_AM = "60000054828";
const CPF_VT = "60000150703";
const CPF_AL_PROGRESSIVO = "60000068535";
const CPF_AL_GATE_FECHADO = "60000082287";
const CPF_AL_ENCERRADA = "60000095931";
const CPF_AL_ACESSO = "60000109665";
const CPF_AL_OUTRO = "60000123307";
const CPF_AL_PRESERVA = "60000424773";

const CPFS = [
  CPF_GT,
  CPF_GO,
  CPF_GO_2,
  CPF_VO,
  CPF_AM,
  CPF_VT,
  CPF_AL_PROGRESSIVO,
  CPF_AL_GATE_FECHADO,
  CPF_AL_ENCERRADA,
  CPF_AL_ACESSO,
  CPF_AL_OUTRO,
  CPF_AL_PRESERVA,
];

// Os 2 primeiros campos de Parte 1 (usados na gravação parcial inicial).
const PARTE_1_INICIO = {
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "Ubatuba",
};

// As 17 chaves restantes de Parte 1 (completam as 19 no total).
const PARTE_1_RESTANTE = {
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "25 a 34 anos",
  avalPessoalEscolaridade: "Médio completo",
  avalPessoalRacaEtnia: "Parda",
  avalPessoalCondicaoPcd: "Não",
  avalProfissCondicaoTrabalho: "Desempregado(a)",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Recepção em pousada local",
  avalProfissFaixaRenda: "Até 1 salário mínimo",
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Curso livre",
  avalMotivMotivosParticipacao: ["Geração de renda"],
  avalMotivFormaConhecimento: "Redes sociais",
  avalExpectAtendimento: "Atendeu totalmente",
  avalExpectEmprego: "Atendeu parcialmente",
  avalExpectRenda: "Superou minhas expectativas",
};

let cdOfertante: number;
let cdOfertante2: number;
let cdCurso: number;

async function logarComCsrf(cpf: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) throw new Error(`Login não emitiu sessão/CSRF para ${cpf}`);
  return { idSessao, idCsrf };
}

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Avaliação Id Teste", uf: "SP" }).cdOfertante;
  cdOfertante2 = criarOfertante({ nome: "Ofertante Avaliação Id Teste 2", uf: "RJ" }).cdOfertante;
  const cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({
    cpf: CPF_GO_2,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    cdOfertante: cdOfertante2,
  });
  upsertUsuario({ cpf: CPF_VO, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_AM, tipo: "AM", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_VT, tipo: "VT", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_PROGRESSIVO, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_GATE_FECHADO, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_ENCERRADA, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_ACESSO, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_OUTRO, tipo: "AL", senha: SENHA, primeiraVez: false });
  upsertUsuario({ cpf: CPF_AL_PRESERVA, tipo: "AL", senha: SENHA, primeiraVez: false });

  cdCurso = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;

  criarAvaliacao({ cpf: CPF_AL_PROGRESSIVO, cdCurso });
  criarAvaliacao({ cpf: CPF_AL_GATE_FECHADO, cdCurso });
  criarAvaliacao({ cpf: CPF_AL_ENCERRADA, cdCurso });
  encerrarAvaliacaoFixture(CPF_AL_ENCERRADA, cdCurso);
  criarAvaliacao({ cpf: CPF_AL_ACESSO, cdCurso });
  criarAvaliacao({
    cpf: CPF_AL_PRESERVA,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_INICIO, ...PARTE_1_RESTANTE },
  });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertante, cdOfertante2]);
  deleteUsuarios(CPFS);
});

test("AVAL-07: Aluno grava um bloco parcial de Parte 1 -> 200, parte1Completa permanece false", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_PROGRESSIVO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_PROGRESSIVO}/${cdCurso}`, {
    data: PARTE_1_INICIO,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacao.parte1Completa).toBe(false);
  expect(corpo.avaliacao.respostas).toEqual(PARTE_1_INICIO);

  await cliente.dispose();
});

test("AVAL-08: Aluno completa as 19 chaves de Parte 1 -> 200, parte1Completa=true", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_PROGRESSIVO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_PROGRESSIVO}/${cdCurso}`, {
    data: PARTE_1_RESTANTE,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacao.parte1Completa).toBe(true);

  const persistida = getAvaliacao(CPF_AL_PROGRESSIVO, cdCurso);
  expect(persistida?.parte1Completa).toBe(true);

  await cliente.dispose();
});

test("AVAL-11: com Parte 1 completa, gravação de 1 chave de Parte 2 isolada -> 200", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_PROGRESSIVO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_PROGRESSIVO}/${cdCurso}`, {
    data: { avalParticipConcluiuCurso: "Sim" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacao.respostas.avalParticipConcluiuCurso).toBe("Sim");

  await cliente.dispose();
});

test("AVAL-14: gravação parcial de Parte 2 sem preencher tudo é aceita enquanto EM_ANDAMENTO", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_PROGRESSIVO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_PROGRESSIVO}/${cdCurso}`, {
    data: { avalParticipPercentualFrequencia: 80 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacao.respostas.avalParticipPercentualFrequencia).toBe(80);
  expect(corpo.avaliacao.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("edge case: Concluiu='Sim'->'Não' preserva os valores já salvos das 22 chaves condicionais", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_PRESERVA);

  const cliente = await novoCliente();
  const resPreenche = await cliente.patch(`/api/avaliacoes/${CPF_AL_PRESERVA}/${cdCurso}`, {
    data: { avalParticipConcluiuCurso: "Sim", avalCursoDinamicasInclusao: 5 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(resPreenche.status()).toBe(200);

  const resMuda = await cliente.patch(`/api/avaliacoes/${CPF_AL_PRESERVA}/${cdCurso}`, {
    data: { avalParticipConcluiuCurso: "Não" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(resMuda.status()).toBe(200);
  const corpo = await resMuda.json();
  expect(corpo.avaliacao.respostas.avalParticipConcluiuCurso).toBe("Não");
  expect(corpo.avaliacao.respostas.avalCursoDinamicasInclusao).toBe(5);

  const persistida = getAvaliacao(CPF_AL_PRESERVA, cdCurso);
  expect(persistida?.respostas?.avalCursoDinamicasInclusao).toBe(5);

  await cliente.dispose();
});

test("AVAL-10: chave de Parte 2 rejeitada com 400 enquanto parte1Completa resultante é false, nada persistido", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_GATE_FECHADO);
  const antes = getAvaliacao(CPF_AL_GATE_FECHADO, cdCurso);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_GATE_FECHADO}/${cdCurso}`, {
    data: { avalParticipConcluiuCurso: "Sim" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getAvaliacao(CPF_AL_GATE_FECHADO, cdCurso);
  expect(depois?.respostas).toEqual(antes?.respostas);
  expect(depois?.parte1Completa).toBe(false);

  await cliente.dispose();
});

test("AVAL-10: mesmo misturando 1 chave de Parte 1 no PATCH, nada é persistido se o resultado ainda não completa a Parte 1", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_GATE_FECHADO);
  const antes = getAvaliacao(CPF_AL_GATE_FECHADO, cdCurso);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_GATE_FECHADO}/${cdCurso}`, {
    data: { avalPessoalEstado: "SP", avalParticipConcluiuCurso: "Sim" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const depois = getAvaliacao(CPF_AL_GATE_FECHADO, cdCurso);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("AVAL-17: gravação em avaliação já ENCERRADO é rejeitada com 409, dado inalterado", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_ENCERRADA);
  const antes = getAvaliacao(CPF_AL_ENCERRADA, cdCurso);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_ENCERRADA}/${cdCurso}`, {
    data: PARTE_1_INICIO,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);
  const depois = getAvaliacao(CPF_AL_ENCERRADA, cdCurso);
  expect(depois?.respostas).toEqual(antes?.respostas);

  await cliente.dispose();
});

test("AVAL-09: o GO que fez a matrícula não pode gravar", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    data: PARTE_1_INICIO,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AVAL-09: outro Aluno (CPF diferente) não pode gravar", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_OUTRO);

  const cliente = await novoCliente();
  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    data: PARTE_1_INICIO,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AVAL-20: o próprio Aluno consulta a própria avaliação -> 200", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_ACESSO);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);

  await cliente.dispose();
});

test("AVAL-20: outro Aluno consultando recebe 403", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL_OUTRO);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AVAL-21: GO/VO do Ofertante do curso consultam -> 200", async () => {
  const { idSessao: idSessaoGo, idCsrf: idCsrfGo } = await logarComCsrf(CPF_GO);
  const clienteGo = await novoCliente();
  const resGo = await clienteGo.get(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    headers: cabecalhosAutenticados(idSessaoGo, idCsrfGo),
  });
  expect(resGo.status()).toBe(200);
  await clienteGo.dispose();

  const { idSessao: idSessaoVo, idCsrf: idCsrfVo } = await logarComCsrf(CPF_VO);
  const clienteVo = await novoCliente();
  const resVo = await clienteVo.get(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    headers: cabecalhosAutenticados(idSessaoVo, idCsrfVo),
  });
  expect(resVo.status()).toBe(200);
  await clienteVo.dispose();
});

test("AVAL-21/AVAL-23: GO/VO de outro Ofertante recebem 403", async () => {
  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO_2);

  const cliente = await novoCliente();
  const res = await cliente.get(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  await cliente.dispose();
});

test("AVAL-21: AM/GT/VT consultam qualquer avaliação -> 200", async () => {
  for (const cpf of [CPF_AM, CPF_GT, CPF_VT]) {
    const { idSessao, idCsrf } = await logarComCsrf(cpf);
    const cliente = await novoCliente();
    const res = await cliente.get(`/api/avaliacoes/${CPF_AL_ACESSO}/${cdCurso}`, {
      headers: cabecalhosAutenticados(idSessao, idCsrf),
    });
    expect(res.status()).toBe(200);
    await cliente.dispose();
  }
});
