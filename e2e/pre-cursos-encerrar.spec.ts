// e2e de POST /api/pre-cursos/[id]/encerrar (REQ-PC-10, REQ-PC-11, REQ-PC-12).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getPreCurso,
  upsertUsuario,
} from "./helpers/db";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";
const CPF_GO = "51809000181";
const CPFS = [CPF_GO];

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

// As 56 chaves do questionário fonte
// (`docs/Questionario_do_Gestor_Pre_Curso.md`), incluindo os 9 condicionais,
// todos aplicáveis nesta fixture.
const RESPOSTA_COMPLETA = {
  identifUf: "SP",
  identifMunicipio: "Campinas",
  identifEntidadeResponsavel: "Secretaria Municipal de Turismo",
  identifCoordenador: "Maria Silva",
  identifEmail: "maria@example.com",
  identifTelefone: "19999990000",
  qualifEndereco: "Rua das Flores, 100",
  qualifNomeCurso: "Guia de Turismo Local",
  qualifVinculoPrograma: "Sim",
  qualifVinculoProgramaQual: "Plano Municipal de Qualificação em Turismo",
  qualifCaracteristicas: ["Guiamento de Turismo / Condução de Turismo", "Outro"],
  qualifCaracteristicasOutra: "Turismo de aventura",
  qualifModalidade: "Presencial",
  qualifRegiao: "Zona Urbana",
  planejDataInicioPrevista: "2026-03-01",
  planejDataTerminoPrevista: "2026-06-01",
  planejCargaHoraria: 120,
  planejNumTurmas: 2,
  planejNumAlunosPrevistos: 40,
  planejTaxaEvasaoEsperada: 10,
  planejObjetivo: "Qualificar guias locais",
  publicoPerfil: ["Jovens", "Mulheres"],
  publicoInstituicaoExecutora: "Empresa contratada",
  publicoInstituicaoExecutoraNome: "Turismo & Cia Ltda",
  diagnosticoConsultas: ["Poder Público: Secretarias, Prefeitura ou outros."],
  infraBasicaBanheiros: 5,
  infraBasicaBebedouros: 5,
  infraBasicaEnergia: 5,
  infraBasicaSalaAula: 5,
  infraBasicaRecepcao: 5,
  infraBasicaBiblioteca: 5,
  infraBasicaMobiliario: 5,
  infraBasicaAcessibilidade: 5,
  infraBasicaLaboratorio: 5,
  infraComplSalaProfessores: 4,
  infraComplSalaGestores: 4,
  infraComplSalaEstudo: 4,
  infraComplCopa: 4,
  infraComplLanchonete: 4,
  infraComplAuditorio: 4,
  infraComplAudiovisual: 4,
  infraComplTecnologicos: 4,
  infraEspecificaNecessidade: "Sim, alguns equipamentos específicos são necessários",
  infraEspecificaDisponibilidade:
    "Há disponibilidade de todos os equipamentos, em condições satisfatórias",
  infraEspecificaSuficiencia: "Sim",
  infraEspecificaManutencao: "Sim",
  docenteCriteriosSelecao: ["Análise do Currículo (Vitae ou Lattes)."],
  docenteFormaContratacao: "Outro sistema seletivo",
  docenteFormaContratacaoOutra: "Chamamento público simplificado",
  docenteNivelFormacao: "Graduação completa.",
  docentePoliticasReparacao: "Sim",
  divulgacaoEstrategias: ["Divulgação via carro de som.", "Divulgação via outros canais"],
  divulgacaoEstrategiasOutra: "Mensagens em grupos de WhatsApp de bairro",
  parceriasEstabelecidas: ["Concessão ou empréstimo de materiais e/ou de equipamentos."],
  suporteEstrategias: ["Estratégias Financeiras: auxílio financeiro para creche.", "Outros"],
  suporteEstrategiasOutra: "Empréstimo de uniformes",
};

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Encerramento Teste", uf: "SP" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante]);
  deleteUsuarios(CPFS);
});

test("REQ-PC-10/CA-04: encerramento com campo obrigatório faltando é rejeitado com 400 e a pendência listada", async () => {
  const cdCurso = criarPreCurso({ cdOfertante, cdVerba, vlCursoAlocado: 100, criadoPor: CPF_GO }).cdCurso;
  const { qualifNomeCurso: _omitido, ...respostaIncompleta } = RESPOSTA_COMPLETA;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: respostaIncompleta,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/pre-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.pendentes).toContain("qualifNomeCurso");

  const persistido = getPreCurso(cdCurso);
  expect(persistido?.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("REQ-PC-11/CA-05: encerramento com todos os 56 campos completos -> 200, ENCERRADO, dataEncerramento preenchida", async () => {
  const cdCurso = criarPreCurso({ cdOfertante, cdVerba, vlCursoAlocado: 100, criadoPor: CPF_GO }).cdCurso;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/pre-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.preCurso.status).toBe("ENCERRADO");
  expect(corpo.preCurso.dataEncerramento).not.toBeNull();

  const persistido = getPreCurso(cdCurso);
  expect(persistido?.status).toBe("ENCERRADO");
  expect(persistido?.dataEncerramento).not.toBeNull();

  await cliente.dispose();
});

test("REQ-PC-12: segunda tentativa de encerrar um pré-curso já ENCERRADO recebe 409", async () => {
  const cdCurso = criarPreCurso({ cdOfertante, cdVerba, vlCursoAlocado: 100, criadoPor: CPF_GO }).cdCurso;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  await cliente.post(`/api/pre-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/pre-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});

test("REQ-PC-12: PATCH após o encerramento recebe 409 (fecha o gate fim-a-fim com T6)", async () => {
  const cdCurso = criarPreCurso({ cdOfertante, cdVerba, vlCursoAlocado: 100, criadoPor: CPF_GO }).cdCurso;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  await cliente.post(`/api/pre-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: { identifUf: "RJ" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});

test("condicionais órfãs (Q9.Qual e Q25.1/25.2/25.3) são descartadas no encerramento", async () => {
  const cdCurso = criarPreCurso({ cdOfertante, cdVerba, vlCursoAlocado: 100, criadoPor: CPF_GO }).cdCurso;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();

  await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  // O Gestor volta atrás nas duas perguntas-mãe. A gravação preserva as
  // filhas (merge raso, REQ-PC-04); o descarte é no encerramento.
  await cliente.patch(`/api/pre-cursos/${cdCurso}`, {
    data: {
      qualifVinculoPrograma: "Não",
      infraEspecificaNecessidade: "Não, apenas equipamentos básicos",
    },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(getPreCurso(cdCurso)?.respostas?.infraEspecificaSuficiencia).toBeDefined();

  const res = await cliente.post(`/api/pre-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const respostas = getPreCurso(cdCurso)?.respostas;
  expect(getPreCurso(cdCurso)?.status).toBe("ENCERRADO");
  expect(respostas).not.toHaveProperty("qualifVinculoProgramaQual");
  expect(respostas).not.toHaveProperty("infraEspecificaDisponibilidade");
  expect(respostas).not.toHaveProperty("infraEspecificaSuficiencia");
  expect(respostas).not.toHaveProperty("infraEspecificaManutencao");
  // condicional ainda válida (Q10 segue com "Outro" marcado) permanece
  expect(respostas?.qualifCaracteristicasOutra).toBeDefined();

  await cliente.dispose();
});
