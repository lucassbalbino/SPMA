import { describe, expect, it } from "vitest";
import { validarCompletudePreCurso } from "./completude";

// Fixture com os 56 campos preenchidos, incluindo os 9 condicionais - base
// para os testes abaixo (spread + override/omissão). Valores transcritos
// literalmente de `docs/Questionario_do_Gestor_Pre_Curso.md`, sem importar
// as constantes de opções do schema: o teste tem de quebrar se alguém
// renomear uma opção só no código de produção.
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
  planejObjetivo: "Qualificar guias locais para atuação em roteiros de base comunitária",

  publicoPerfil: ["Jovens", "Mulheres"],
  publicoInstituicaoExecutora: "Empresa contratada",
  publicoInstituicaoExecutoraNome: "Turismo & Cia Ltda",

  diagnosticoConsultas: ["Poder Público: Secretarias, Prefeitura ou outros."],

  infraBasicaBanheiros: 0,
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

describe("validarCompletudePreCurso", () => {
  it("os 56 campos completos e nenhum condicional disparado -> completo=true, pendentes=[]", () => {
    const resultado = validarCompletudePreCurso(RESPOSTA_COMPLETA);

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("item de infraestrutura com valor 0 é tratado como preenchido, não como pendência", () => {
    const resultado = validarCompletudePreCurso(RESPOSTA_COMPLETA);

    expect(resultado.pendentes).not.toContain("infraBasicaBanheiros");
    expect(resultado.completo).toBe(true);
  });

  it("instituição executora 'Empresa contratada' sem o nome -> pendente e incompleto (CA-04)", () => {
    const { publicoInstituicaoExecutoraNome: _omitido, ...semNome } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semNome);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("publicoInstituicaoExecutoraNome");
  });

  it("equipamentos específicos necessários sem as 3 perguntas condicionais -> as 3 chaves pendentes", () => {
    const {
      infraEspecificaDisponibilidade: _a,
      infraEspecificaSuficiencia: _b,
      infraEspecificaManutencao: _c,
      ...semCondicionais
    } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semCondicionais);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toEqual(
      expect.arrayContaining([
        "infraEspecificaDisponibilidade",
        "infraEspecificaSuficiencia",
        "infraEspecificaManutencao",
      ]),
    );
  });

  it("equipamentos específicos não necessários -> as 3 perguntas condicionais não aparecem em pendentes mesmo vazias", () => {
    const {
      infraEspecificaDisponibilidade: _a,
      infraEspecificaSuficiencia: _b,
      infraEspecificaManutencao: _c,
      ...base
    } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso({
      ...base,
      infraEspecificaNecessidade: "Não, apenas equipamentos básicos",
    });

    expect(resultado.completo).toBe(true);
    expect(resultado.pendentes).toEqual([]);
  });

  it("Q9='Sim' sem qualifVinculoProgramaQual -> pendente", () => {
    const { qualifVinculoProgramaQual: _omitido, ...semQual } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semQual);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("qualifVinculoProgramaQual");
  });

  it("Q9='Não' não exige qualifVinculoProgramaQual", () => {
    const { qualifVinculoProgramaQual: _omitido, ...base } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso({
      ...base,
      qualifVinculoPrograma: "Não",
    });

    expect(resultado.completo).toBe(true);
    expect(resultado.pendentes).toEqual([]);
  });

  it("qualifCaracteristicas com 'Outro' sem qualifCaracteristicasOutra -> pendente", () => {
    const { qualifCaracteristicasOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("qualifCaracteristicasOutra");
  });

  it("docenteFormaContratacao='Outro sistema seletivo' sem docenteFormaContratacaoOutra -> pendente", () => {
    const { docenteFormaContratacaoOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("docenteFormaContratacaoOutra");
  });

  it("divulgacaoEstrategias com 'Divulgação via outros canais' sem divulgacaoEstrategiasOutra -> pendente", () => {
    const { divulgacaoEstrategiasOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("divulgacaoEstrategiasOutra");
  });

  it("suporteEstrategias com 'Outros' sem suporteEstrategiasOutra -> pendente", () => {
    const { suporteEstrategiasOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("suporteEstrategiasOutra");
  });

  it("opção excludente sozinha é aceita (Q22 'Não foram realizadas consultas...')", () => {
    const resultado = validarCompletudePreCurso({
      ...RESPOSTA_COMPLETA,
      diagnosticoConsultas: [
        "Não foram realizadas consultas individuais prévias e/ou reuniões com nenhum dos representantes dos grupos de atores locais.",
      ],
    });

    expect(resultado).toEqual({ completo: true, pendentes: [] });
  });

  it("opção excludente combinada com outra -> pendente (contradição rejeitada)", () => {
    const resultado = validarCompletudePreCurso({
      ...RESPOSTA_COMPLETA,
      diagnosticoConsultas: [
        "Poder Público: Secretarias, Prefeitura ou outros.",
        "Não foram realizadas consultas individuais prévias e/ou reuniões com nenhum dos representantes dos grupos de atores locais.",
      ],
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("diagnosticoConsultas");
  });

  it("campo sempre-obrigatório ausente (não condicional) também aparece em pendentes", () => {
    const { qualifNomeCurso: _omitido, ...semCampo } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semCampo);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("qualifNomeCurso");
  });

  it("pendência condicional aparece mesmo com a maioria dos outros campos sempre-obrigatórios também ausentes (preenchimento bem no início)", () => {
    // Regressão: `validarCompletudePreCurso` chegou a delegar a regra
    // condicional a um `.superRefine` sobre o schema base - o Zod pula esse
    // callback quando o schema base já tem qualquer issue, então com vários
    // campos ausentes ao mesmo tempo (o estado normal de um preenchimento
    // incremental) a pendência condicional nunca aparecia até o resto do
    // formulário estar quase completo.
    const resultado = validarCompletudePreCurso({
      publicoInstituicaoExecutora: "Empresa contratada",
    });

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("publicoInstituicaoExecutoraNome");
  });
});
