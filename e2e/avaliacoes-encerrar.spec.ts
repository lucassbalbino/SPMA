// e2e de POST /api/avaliacoes/[cpf]/[cdCurso]/encerrar
// (AVAL-12, AVAL-13, AVAL-15, AVAL-16, AVAL-17, AVAL-18, AVAL-19).
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
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
const CPF_GO = "60000164410";
const CPF_AL = "60000178128";
const CPFS = [CPF_GO, CPF_AL];

let cdOfertante: number;
let cdVerba: number;

async function logarComCsrf(cpf: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) throw new Error(`Login não emitiu sessão/CSRF para ${cpf}`);
  return { idSessao, idCsrf };
}

// As 19 chaves de Parte 1 completas.
const PARTE_1_COMPLETA = {
  avalPessoalEstado: "SP",
  avalPessoalMunicipio: "Ubatuba",
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

// As 22 chaves de Parte 2 exigidas quando avalParticipConcluiuCurso="Sim".
const PARTE_2_COMPLETA_CONCLUIU = {
  avalParticipConcluiuCurso: "Sim",
  avalParticipPercentualFrequencia: 90,
  avalCursoDinamicasInclusao: 5,
  avalCursoMaterialDidatico: 4,
  avalCursoConteudo: 5,
  avalCursoClareza: 4,
  avalCursoConhecimentoInstrutores: 5,
  avalCursoOrganizacao: 4,
  avalCursoInfraestruturaBasica: 3,
  avalCursoInfraestruturaSalaAula: 3,
  avalAprendizAmpliacaoConhecimento: "Sim, totalmente",
  avalAprendizAtendimentoExpectativas: "Atendeu totalmente",
  avalAprendizSensacaoPreparo: "Sim, me sinto totalmente preparado(a)",
  avalContinuidadeRetomadaEstudos: "Pretendo retomar em breve",
  avalMotivacoesPosPercepcoes: ["Maior autoconfiança"],
  avalOportunSituacaoTrabalho: "Empregado(a) na área de Turismo",
  avalOportunIntencaoAtuarTurismo: "Sim",
  avalEfetivEmprego: "Sim",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim",
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Sim",
  avalGeralRecomendaCurso: "Sim",
};

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Encerramento Avaliação", uf: "SP" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf(CPFS);
  deletePreCursosPorOfertante([cdOfertante]);
  deleteUsuarios(CPFS);
});

function criarCursoFixture(): number {
  return criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
}

test("AVAL-12: Parte 1 completa + Concluiu='Não' + motivo -> 200, ENCERRADO, mesmo com as 22 restantes vazias", async () => {
  const cdCurso = criarCursoFixture();
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: {
      ...PARTE_1_COMPLETA,
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Falta de tempo"],
    },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();
  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacao.status).toBe("ENCERRADO");
  expect(corpo.avaliacao.dataEncerramento).not.toBeNull();

  await cliente.dispose();
});

test("AVAL-13: Parte 1 completa + Concluiu='Sim' com as 22 preenchidas -> 200, ENCERRADO", async () => {
  const cdCurso = criarCursoFixture();
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_COMPLETA, ...PARTE_2_COMPLETA_CONCLUIU },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();
  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.avaliacao.status).toBe("ENCERRADO");
  expect(corpo.avaliacao.dataEncerramento).not.toBeNull();

  const persistida = getAvaliacao(CPF_AL, cdCurso);
  expect(persistida?.status).toBe("ENCERRADO");
  expect(persistida?.dataEncerramento).not.toBeNull();

  await cliente.dispose();
});

test("AVAL-16: Concluiu='Sim' com 1 das 22 chaves faltando -> 400, pendentes lista a chave, status permanece EM_ANDAMENTO", async () => {
  const cdCurso = criarCursoFixture();
  const { avalGeralNota: _omitido, ...semNota } = PARTE_2_COMPLETA_CONCLUIU;
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_COMPLETA, ...semNota },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();
  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.pendentes).toContain("avalGeralNota");

  const persistida = getAvaliacao(CPF_AL, cdCurso);
  expect(persistida?.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("AVAL-16: Parte 1 incompleta -> 400, pendentes lista as chaves de Parte 1 faltantes, status permanece EM_ANDAMENTO", async () => {
  const cdCurso = criarCursoFixture();
  const { avalPessoalMunicipio: _omitido, ...parte1Incompleta } = PARTE_1_COMPLETA;
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: false,
    respostas: parte1Incompleta,
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();
  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.pendentes).toContain("avalPessoalMunicipio");
  expect(corpo.pendentes).toContain("avalParticipConcluiuCurso");

  const persistida = getAvaliacao(CPF_AL, cdCurso);
  expect(persistida?.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("AVAL-19: segunda tentativa de encerrar uma avaliação já ENCERRADO recebe 409", async () => {
  const cdCurso = criarCursoFixture();
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_COMPLETA, ...PARTE_2_COMPLETA_CONCLUIU },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();
  await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});

test("AVAL-18: o GO que fez a matrícula não pode encerrar", async () => {
  const cdCurso = criarCursoFixture();
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_COMPLETA, ...PARTE_2_COMPLETA_CONCLUIU },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(403);

  const persistida = getAvaliacao(CPF_AL, cdCurso);
  expect(persistida?.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("AVAL-17/AVAL-19: PATCH após o encerramento recebe 409 (fecha o gate fim-a-fim com T5)", async () => {
  const cdCurso = criarCursoFixture();
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_COMPLETA, ...PARTE_2_COMPLETA_CONCLUIU },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();
  await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.patch(`/api/avaliacoes/${CPF_AL}/${cdCurso}`, {
    data: { avalGeralComentariosFinais: "Tentativa após encerrar" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});
