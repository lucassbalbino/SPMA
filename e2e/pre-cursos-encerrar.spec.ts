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

// Os 56 campos do Dicionário de Campos (spec.md), incluindo os 9
// condicionais, todos aplicáveis nesta fixture.
const RESPOSTA_COMPLETA = {
  identifUf: "SP",
  identifMunicipio: "Campinas",
  identifEntidadeResponsavel: "Secretaria Municipal de Turismo",
  identifCoordenador: "Maria Silva",
  identifEmail: "maria@example.com",
  identifTelefone: "19999990000",
  qualifEndereco: "Rua das Flores, 100",
  qualifNomeCurso: "Guia de Turismo Local",
  qualifVinculoPrograma: "Outro",
  qualifVinculoProgramaOutro: "Programa municipal específico",
  qualifCaracteristicas: ["Sustentabilidade", "Outra"],
  qualifCaracteristicasOutra: "Foco em turismo de aventura",
  qualifModalidade: "Presencial",
  qualifRegiao: "Sudeste",
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
  diagnosticoConsultas: ["Poder público municipal"],
  infraBasicaBanheiros: 5,
  infraBasicaEnergia: 5,
  infraBasicaSalaAula: 5,
  infraBasicaBiblioteca: 5,
  infraBasicaAcessibilidade: 5,
  infraBasicaLaboratorio: 5,
  infraBasicaAguaPotavel: 5,
  infraBasicaIluminacao: 5,
  infraBasicaConectividade: 5,
  infraComplSalaProfessores: 4,
  infraComplCopa: 4,
  infraComplAuditorio: 4,
  infraComplAudiovisual: 4,
  infraComplTecnologicos: 4,
  infraComplConvivencia: 4,
  infraComplEstacionamento: 4,
  infraComplAlimentacao: 4,
  infraEspecificaNecessidade: "Sim",
  infraEspecificaDisponibilidade: "Disponível",
  infraEspecificaSuficiencia: "Suficiente",
  infraEspecificaManutencao: "Em bom estado",
  docenteCriteriosSelecao: ["Formação acadêmica"],
  docenteFormaContratacao: "Outra",
  docenteFormaContratacaoOutra: "Cooperativa de professores",
  docenteNivelFormacao: "Graduação",
  docentePoliticasReparacao: ["Nenhuma política aplicada"],
  divulgacaoEstrategias: ["Redes sociais", "Outra"],
  divulgacaoEstrategiasOutra: "Carro de som",
  parceriasEstabelecidas: ["Prefeitura municipal"],
  suporteEstrategias: ["Auxílio transporte", "Outra"],
  suporteEstrategiasOutra: "Apoio psicológico",
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
