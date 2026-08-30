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
  avalPessoalMunicipio: "Ubatuba - SP",
  avalPessoalGenero: "Feminino",
  avalPessoalFaixaEtaria: "26 a 35 anos",
  avalPessoalEscolaridade: "Ensino médio completo",
  avalPessoalRacaEtnia: "Pardo",
  avalPessoalCondicaoPcd: "Não sou uma Pessoa com Deficiência.",
  avalProfissCondicaoTrabalho: "Desempregado",
  avalProfissAtuaTurismo: "Sim",
  avalProfissAtividadeEspecifica: "Alojamento (meios de hospedagem)",
  avalProfissFaixaRenda: "Até 01 salário mínimo",
  avalExperienciaTrabalhoPrevio: "Não",
  avalExperienciaCursoAnterior: "Sim",
  avalExperienciaTipoCursoAnterior: "Atualização profissional",
  avalMotivMotivosParticipacao: ["Conseguir um emprego/trabalho"],
  avalMotivFormaConhecimento: "pelas Redes Sociais",
  avalExpectAtendimento: "Sim",
  avalExpectEmprego: "Talvez",
  avalExpectRenda: "Média",
};

// As 21 chaves de Q24 a Q37 exigidas quando avalParticipConcluiuCurso="Sim",
// mais as 2 do bloco "Participação" (Q22 e Q23), que todo aluno responde.
const PARTE_2_COMPLETA_CONCLUIU = {
  avalParticipConcluiuCurso: "Sim",
  avalParticipPercentualFrequencia: "76% a 100%",
  avalCursoDinamicasInclusao: 5,
  avalCursoMaterialDidatico: 4,
  avalCursoConteudo: 5,
  avalCursoClareza: 4,
  avalCursoConhecimentoInstrutores: 5,
  avalCursoOrganizacao: 4,
  avalCursoInfraestruturaBasica: 3,
  avalCursoInfraestruturaSalaAula: 3,
  avalAprendizAmpliacaoConhecimento: "Ampliou / Melhorou",
  avalAprendizAtendimentoExpectativas: "Sim",
  avalAprendizSensacaoPreparo: "Parcialmente",
  avalContinuidadeRetomadaEstudos: "Sim, ao ensino técnico",
  avalMotivacoesPosPercepcoes: ["tem condições de atuar na área do Turismo"],
  avalOportunSituacaoTrabalho:
    "Consegui um emprego, com carteira assinada, na área de Turismo.",
  avalOportunIntencaoAtuarTurismo: "Sim",
  avalEfetivEmprego: "Sim",
  avalEfetivAumentoRenda: "Sim",
  avalEfetivMelhoriaPadraoVida: "Sim, parcialmente",
  avalGeralNota: 9,
  avalGeralMelhoriasComunidade: "Mais gente da comunidade trabalhando com receptivo",
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
      avalParticipMotivoNaoConclusao: ["Problemas pessoais/familiares"],
      avalParticipPercentualFrequencia: "Até 25%",
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

test("Concluiu='Sim'->'Não': o PATCH preserva as respostas de concluinte, o encerramento as descarta", async () => {
  const cdCurso = criarCursoFixture();
  criarAvaliacao({
    cpf: CPF_AL,
    cdCurso,
    parte1Completa: true,
    respostas: { ...PARTE_1_COMPLETA, ...PARTE_2_COMPLETA_CONCLUIU },
  });

  const { idSessao, idCsrf } = await logarComCsrf(CPF_AL);
  const cliente = await novoCliente();

  // Edge case da spec: a gravação posterior preserva o que já estava salvo.
  const resPatch = await cliente.patch(`/api/avaliacoes/${CPF_AL}/${cdCurso}`, {
    data: {
      avalParticipConcluiuCurso: "Não",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(resPatch.status()).toBe(200);
  expect(getAvaliacao(CPF_AL, cdCurso)?.respostas?.avalGeralNota).toBeDefined();

  // O encerramento é que fecha o registro sem a contradição.
  const res = await cliente.post(`/api/avaliacoes/${CPF_AL}/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const respostas = getAvaliacao(CPF_AL, cdCurso)?.respostas;
  expect(getAvaliacao(CPF_AL, cdCurso)?.status).toBe("ENCERRADO");
  expect(respostas?.avalParticipConcluiuCurso).toBe("Não");
  expect(respostas?.avalParticipMotivoNaoConclusao).toEqual(["Dificuldades financeiras"]);
  expect(respostas).not.toHaveProperty("avalGeralNota");
  expect(respostas).not.toHaveProperty("avalCursoConteudo");
  expect(respostas).not.toHaveProperty("avalOportunSituacaoTrabalho");
  // Q23 (frequência) e a Parte 1 continuam: não são "apenas para quem concluiu"
  expect(respostas?.avalParticipPercentualFrequencia).toBeDefined();
  expect(respostas?.avalPessoalMunicipio).toBeDefined();

  await cliente.dispose();
});
