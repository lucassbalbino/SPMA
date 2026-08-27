import { describe, expect, it } from "vitest";
import { validarCompletudePreCurso } from "./completude";

// Fixture com os 56 campos preenchidos, incluindo os 9 condicionais - base
// para os testes abaixo (spread + override/omissão).
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

  infraBasicaBanheiros: 0,
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
      infraEspecificaNecessidade: "Não",
    });

    expect(resultado.completo).toBe(true);
    expect(resultado.pendentes).toEqual([]);
  });

  it("qualifVinculoPrograma='Outro' sem qualifVinculoProgramaOutro -> pendente", () => {
    const { qualifVinculoProgramaOutro: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("qualifVinculoProgramaOutro");
  });

  it("qualifCaracteristicas com 'Outra' sem qualifCaracteristicasOutra -> pendente", () => {
    const { qualifCaracteristicasOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("qualifCaracteristicasOutra");
  });

  it("docenteFormaContratacao='Outra' sem docenteFormaContratacaoOutra -> pendente", () => {
    const { docenteFormaContratacaoOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("docenteFormaContratacaoOutra");
  });

  it("divulgacaoEstrategias com 'Outra' sem divulgacaoEstrategiasOutra -> pendente", () => {
    const { divulgacaoEstrategiasOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("divulgacaoEstrategiasOutra");
  });

  it("suporteEstrategias com 'Outra' sem suporteEstrategiasOutra -> pendente", () => {
    const { suporteEstrategiasOutra: _omitido, ...semOutro } = RESPOSTA_COMPLETA;
    const resultado = validarCompletudePreCurso(semOutro);

    expect(resultado.completo).toBe(false);
    expect(resultado.pendentes).toContain("suporteEstrategiasOutra");
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
