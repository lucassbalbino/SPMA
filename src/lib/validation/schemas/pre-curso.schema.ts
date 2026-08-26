import { z } from "zod";

// Criação do pré-curso (REQ-PC-01).
export const criarPreCursoSchema = z.object({
  cdVerba: z.number().int().positive({ message: "Verba é obrigatória" }),
  vlCursoAlocado: z.number().positive({ message: "Valor alocado deve ser positivo" }),
});

export type CriarPreCursoInput = z.infer<typeof criarPreCursoSchema>;

// Escala de infraestrutura, Blocos 6/7 (RN-05, AD-019): 0=Não há
// disponibilidade .. 5=Ótimo.
const escalaInfraestrutura = z.number().int().min(0).max(5);

// ---- Constantes de opções (Dicionário de Campos, spec.md) ----
// Reexportadas para a UI montar Select/RadioGroup/checkboxes sem duplicar a
// lista (AD-004: schema único, cliente e servidor).

export const OPCOES_UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export const OPCOES_VINCULO_PROGRAMA = [
  "Plano Nacional de Turismo",
  "Programa Estadual de Qualificação",
  "Programa Municipal de Qualificação",
  "Outro",
] as const;

export const OPCOES_CARACTERISTICAS = [
  "Sustentabilidade",
  "Empreendedorismo",
  "Turismo de base comunitária",
  "Turismo rural",
  "Turismo cultural",
  "Acessibilidade e turismo inclusivo",
  "Outra",
] as const;

export const OPCOES_MODALIDADE = ["Presencial", "EAD", "Híbrida"] as const;

export const OPCOES_REGIAO = [
  "Norte",
  "Nordeste",
  "Centro-Oeste",
  "Sudeste",
  "Sul",
] as const;

export const OPCOES_PUBLICO_PERFIL = [
  "Jovens",
  "Mulheres",
  "Pessoas em situação de vulnerabilidade social",
  "Trabalhadores do setor de turismo",
  "Empreendedores locais",
  "Comunidade em geral",
] as const;

export const OPCOES_INSTITUICAO_EXECUTORA = [
  "Entidade responsável",
  "Empresa contratada",
  "Parceria entre Entidade Responsável e Entidade Executora",
] as const;

export const OPCOES_DIAGNOSTICO_CONSULTAS = [
  "Poder público municipal",
  "Poder público estadual",
  "Sociedade civil organizada",
  "Empresários locais do setor de turismo",
  "Comunidade local",
  "Instituições de ensino",
  "Nenhuma consulta realizada",
] as const;

export const OPCOES_INFRA_ESPECIFICA_NECESSIDADE = ["Sim", "Não"] as const;

export const OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE = [
  "Disponível",
  "Parcialmente disponível",
  "Indisponível",
] as const;

export const OPCOES_INFRA_ESPECIFICA_SUFICIENCIA = [
  "Suficiente",
  "Insuficiente",
] as const;

export const OPCOES_INFRA_ESPECIFICA_MANUTENCAO = [
  "Em bom estado",
  "Necessita manutenção",
  "Não aplicável",
] as const;

export const OPCOES_DOCENTE_CRITERIOS = [
  "Formação acadêmica",
  "Experiência prática no setor de turismo",
  "Experiência em docência",
  "Vínculo com a comunidade local",
  "Indicação de parceiros",
  "Processo seletivo público",
] as const;

export const OPCOES_DOCENTE_FORMA_CONTRATACAO = [
  "CLT",
  "Prestação de serviço (RPA/autônomo)",
  "Servidor público cedido",
  "Voluntariado",
  "Outra",
] as const;

export const OPCOES_DOCENTE_NIVEL_FORMACAO = [
  "Ensino médio",
  "Graduação",
  "Pós-graduação (lato sensu)",
  "Mestrado",
  "Doutorado",
] as const;

export const OPCOES_DOCENTE_POLITICAS_REPARACAO = [
  "Cotas para docentes negros",
  "Cotas para docentes indígenas",
  "Cotas para docentes com deficiência",
  "Equidade de gênero na seleção",
  "Nenhuma política aplicada",
] as const;

export const OPCOES_DIVULGACAO_ESTRATEGIAS = [
  "Redes sociais",
  "Rádio local",
  "Cartazes e panfletos impressos",
  "Divulgação em escolas",
  "Parcerias com associações locais",
  "Carro de som",
  "Outra",
] as const;

export const OPCOES_PARCERIAS = [
  "Prefeitura municipal",
  "Governo estadual",
  "SEBRAE",
  "Instituições de ensino",
  "Associações e cooperativas locais",
  "Empresas privadas do setor de turismo",
  "ONGs",
  "Nenhuma parceria estabelecida",
] as const;

export const OPCOES_SUPORTE_ESTRATEGIAS = [
  "Auxílio transporte",
  "Auxílio alimentação",
  "Material didático gratuito",
  "Apoio para documentação e deslocamento",
  "Articulação política para permanência do aluno",
  "Outra",
] as const;

// ---- Forma dos 56 campos do questionário (spec.md, Dicionário de Campos) ----
//
// Os 9 campos que só se tornam obrigatórios sob uma condição (instituição
// executora, equipamentos específicos, os 5 campos "Outro/Outra" - REQ-PC-07/
// 08/09) ficam `.optional()` aqui: a FORMA deles é validada em toda gravação,
// mas a obrigatoriedade condicional é responsabilidade exclusiva de
// `validarCompletudePreCurso` (src/lib/pre-curso/completude.ts), não deste
// schema. `.partial()` (usado no PATCH) torna as 47 chaves restantes também
// opcionais, sem alterar a validação de forma de cada uma quando presente.
export const respostasPreCursoSchema = z.object({
  // Bloco 1 - Identificação
  identifUf: z.enum(OPCOES_UF),
  identifMunicipio: z.string().min(1),
  identifEntidadeResponsavel: z.string().min(1),
  identifCoordenador: z.string().min(1),
  identifEmail: z.string().email(),
  identifTelefone: z.string().min(1),

  // Bloco 2 - Dados da Qualificação
  qualifEndereco: z.string().min(1),
  qualifNomeCurso: z.string().min(1),
  qualifVinculoPrograma: z.enum(OPCOES_VINCULO_PROGRAMA),
  qualifVinculoProgramaOutro: z.string().min(1).optional(),
  qualifCaracteristicas: z.array(z.enum(OPCOES_CARACTERISTICAS)).min(1),
  qualifCaracteristicasOutra: z.string().min(1).optional(),
  qualifModalidade: z.enum(OPCOES_MODALIDADE),
  qualifRegiao: z.enum(OPCOES_REGIAO),

  // Bloco 3 - Planejamento
  planejDataInicioPrevista: z.iso.date(),
  planejDataTerminoPrevista: z.iso.date(),
  planejCargaHoraria: z.number().int().positive(),
  planejNumTurmas: z.number().int().positive(),
  planejNumAlunosPrevistos: z.number().int().positive(),
  planejTaxaEvasaoEsperada: z.number().min(0).max(100),
  planejObjetivo: z.string().min(1),

  // Bloco 4 - Público-Alvo
  publicoPerfil: z.array(z.enum(OPCOES_PUBLICO_PERFIL)).min(1),
  publicoInstituicaoExecutora: z.enum(OPCOES_INSTITUICAO_EXECUTORA),
  publicoInstituicaoExecutoraNome: z.string().min(1).optional(),

  // Bloco 5 - Diagnóstico Pré-Curso
  diagnosticoConsultas: z.array(z.enum(OPCOES_DIAGNOSTICO_CONSULTAS)).min(1),

  // Bloco 6 - Infraestrutura Básica
  infraBasicaBanheiros: escalaInfraestrutura,
  infraBasicaEnergia: escalaInfraestrutura,
  infraBasicaSalaAula: escalaInfraestrutura,
  infraBasicaBiblioteca: escalaInfraestrutura,
  infraBasicaAcessibilidade: escalaInfraestrutura,
  infraBasicaLaboratorio: escalaInfraestrutura,
  infraBasicaAguaPotavel: escalaInfraestrutura,
  infraBasicaIluminacao: escalaInfraestrutura,
  infraBasicaConectividade: escalaInfraestrutura,

  // Bloco 7 - Infraestrutura Complementar
  infraComplSalaProfessores: escalaInfraestrutura,
  infraComplCopa: escalaInfraestrutura,
  infraComplAuditorio: escalaInfraestrutura,
  infraComplAudiovisual: escalaInfraestrutura,
  infraComplTecnologicos: escalaInfraestrutura,
  infraComplConvivencia: escalaInfraestrutura,
  infraComplEstacionamento: escalaInfraestrutura,
  infraComplAlimentacao: escalaInfraestrutura,

  // Bloco 8 - Infraestrutura Específica
  infraEspecificaNecessidade: z.enum(OPCOES_INFRA_ESPECIFICA_NECESSIDADE),
  infraEspecificaDisponibilidade: z
    .enum(OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE)
    .optional(),
  infraEspecificaSuficiencia: z
    .enum(OPCOES_INFRA_ESPECIFICA_SUFICIENCIA)
    .optional(),
  infraEspecificaManutencao: z
    .enum(OPCOES_INFRA_ESPECIFICA_MANUTENCAO)
    .optional(),

  // Bloco 9 - Corpo Docente
  docenteCriteriosSelecao: z.array(z.enum(OPCOES_DOCENTE_CRITERIOS)).min(1),
  docenteFormaContratacao: z.enum(OPCOES_DOCENTE_FORMA_CONTRATACAO),
  docenteFormaContratacaoOutra: z.string().min(1).optional(),
  docenteNivelFormacao: z.enum(OPCOES_DOCENTE_NIVEL_FORMACAO),
  docentePoliticasReparacao: z
    .array(z.enum(OPCOES_DOCENTE_POLITICAS_REPARACAO))
    .min(1),

  // Bloco 10 - Divulgação
  divulgacaoEstrategias: z.array(z.enum(OPCOES_DIVULGACAO_ESTRATEGIAS)).min(1),
  divulgacaoEstrategiasOutra: z.string().min(1).optional(),

  // Bloco 11 - Parcerias
  parceriasEstabelecidas: z.array(z.enum(OPCOES_PARCERIAS)).min(1),

  // Bloco 12 - Suporte ao Aluno
  suporteEstrategias: z.array(z.enum(OPCOES_SUPORTE_ESTRATEGIAS)).min(1),
  suporteEstrategiasOutra: z.string().min(1).optional(),
});

export type RespostasPreCurso = z.infer<typeof respostasPreCursoSchema>;

// Forma usada em PATCH (gravação parcial, REQ-PC-04/05/06): todas as chaves
// tornam-se opcionais, mas a FORMA de cada uma continua validada quando
// presente.
export const respostasPreCursoParcialSchema = respostasPreCursoSchema.partial();

export type RespostasPreCursoParcial = z.infer<
  typeof respostasPreCursoParcialSchema
>;
