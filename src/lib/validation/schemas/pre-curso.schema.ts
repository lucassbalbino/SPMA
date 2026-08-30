import { z } from "zod";
import { multiplaComExclusiva } from "../multipla";

// Criação do pré-curso (REQ-PC-01).
export const criarPreCursoSchema = z.object({
  cdVerba: z.number().int().positive({ message: "Verba é obrigatória" }),
  vlCursoAlocado: z.number().positive({ message: "Valor alocado deve ser positivo" }),
});

export type CriarPreCursoInput = z.infer<typeof criarPreCursoSchema>;

// Escala das perguntas 23 e 24 do questionário fonte (RN-05, AD-019):
// 0=Não há disponibilidade, 1=Péssimo, 2=Ruim, 3=Regular, 4=Bom, 5=Ótimo.
const escalaInfraestrutura = z.number().int().min(0).max(5);

// ---- Constantes de opções ----
//
// Transcritas de `docs/Questionario_do_Gestor_Pre_Curso.md` (a numeração das
// perguntas fica nos comentários). Reexportadas para a UI montar
// Select/RadioGroup/checkboxes sem duplicar a lista (AD-004: schema único,
// cliente e servidor). Os prefixos "a)", "b)" e as lacunas "____" do papel
// não entram no valor armazenado; a parte "Qual?/Quais?" vira o campo
// condicional de texto livre correspondente.

export const OPCOES_UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export const OPCOES_SIM_NAO = ["Sim", "Não"] as const;

// Q10 - características contempladas (múltipla, opção "Outro. Qual?").
export const CARACTERISTICAS_OUTRO = "Outro";

export const OPCOES_CARACTERISTICAS = [
  "Alojamento (recepcionista / camareiro(a) / copeiro(a) / outros)",
  "Agenciamento e Operação",
  "Serviços de Alimentação (bartender / auxiliar de cozinha / outros)",
  "Transporte (Terrestre, Aquaviário ou Aéreo)",
  "Aluguel de Transportes",
  "Guiamento de Turismo / Condução de Turismo",
  "Ecoturismo / Turismo de Natureza",
  "Turismo de Base Comunitária",
  "Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)",
  "Eventos",
  CARACTERISTICAS_OUTRO,
] as const;

// Q11 - modalidade.
export const OPCOES_MODALIDADE = [
  "Presencial",
  "À distância (online)",
  "Híbrido (parte presencial parte à distância)",
] as const;

// Q12 - região de realização. O questionário fonte pergunta o TIPO de zona,
// não a macrorregião do país.
export const OPCOES_REGIAO = [
  "Zona Urbana",
  "Zona Periurbana",
  "Zona Rural",
  "Zona Natural",
] as const;

// Q20 - perfil do público-alvo (múltipla). A opção "Outro" do papel não vem
// acompanhada de "Qual?", então não abre campo condicional.
export const OPCOES_PUBLICO_PERFIL = [
  "Jovens",
  "Mulheres",
  "Idosos",
  "Pessoas com Deficiência (PCDs)",
  "Representantes de Comunidades Originárias (quilombolas, indígenas, outras)",
  "Representantes da Comunidade LGBTQIA+",
  "Desempregados",
  "Trabalhadores(as) do Turismo",
  "Empreendedores Locais",
  "Comunidade Turística (gestores públicos, setor empresarial e sociedade civil)",
  "Outro",
] as const;

// Q21 - instituição executora. As duas últimas revelam Q21.1 (REQ-PC-07).
export const OPCOES_INSTITUICAO_EXECUTORA = [
  "Atores da Rede de Base Territorial",
  "Própria Entidade",
  "Empresa contratada",
  "Parceria entre Entidade Responsável e Entidade Executora",
] as const;

// Q22 - consultas prévias a atores territoriais (múltipla, opção h excludente).
export const EXCLUSIVA_DIAGNOSTICO =
  "Não foram realizadas consultas individuais prévias e/ou reuniões com nenhum dos representantes dos grupos de atores locais.";

export const OPCOES_DIAGNOSTICO_CONSULTAS = [
  "Setor Produtivo (Empresários do Turismo): associação empresarial, sindicato patronal ou outros.",
  "Sociedade Civil Organizada: associações, sindicatos, colônias, cooperativas ou outros.",
  "Terceiro Setor: ONGs, OSCIPs, Convention & Visitors Bureau ou outros.",
  "IES: Universidades, Faculdades, Institutos ou outros.",
  "Sistema de Ensino Médio: escolas públicas e privadas.",
  "Poder Público: Secretarias, Prefeitura ou outros.",
  "Instância de Governança: Conselhos, Fóruns, Diretorias ou outros.",
  EXCLUSIVA_DIAGNOSTICO,
] as const;

// Q25 - necessidade de equipamentos específicos. A primeira opção revela
// Q25.1/25.2/25.3 (REQ-PC-08).
export const INFRA_ESPECIFICA_NECESSARIA =
  "Sim, alguns equipamentos específicos são necessários";

export const OPCOES_INFRA_ESPECIFICA_NECESSIDADE = [
  INFRA_ESPECIFICA_NECESSARIA,
  "Não, apenas equipamentos básicos",
] as const;

// Q25.1 - situação dos equipamentos específicos.
export const OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE = [
  "Não há disponibilidade desses equipamentos",
  "Há disponibilidade, porém, não em sua totalidade",
  "Há disponibilidade de todos os equipamentos, porém, encontram-se em condições insatisfatórias",
  "Há disponibilidade de todos os equipamentos, em condições satisfatórias",
] as const;

// Q26 - avaliação da trajetória do docente (múltipla, opção h excludente).
export const EXCLUSIVA_DOCENTE_CRITERIOS =
  "Não foi realizada a avaliação da trajetória profissional e do histórico de formação do(a) candidato(a).";

export const OPCOES_DOCENTE_CRITERIOS = [
  "Análise do Currículo (Vitae ou Lattes).",
  "Análise de experiência prévia no mercado.",
  "Análise dos documentos comprobatórios.",
  "Realização de prova de conhecimento específico.",
  "Realização de prova didática (aula ministrada).",
  "Realização de entrevista (presencial ou remota).",
  "Indicação de outros profissionais do setor.",
  EXCLUSIVA_DOCENTE_CRITERIOS,
] as const;

// Q27 - forma de contratação. A última revela o campo "Qual?" (REQ-PC-09).
export const DOCENTE_OUTRO_SISTEMA_SELETIVO = "Outro sistema seletivo";

export const OPCOES_DOCENTE_FORMA_CONTRATACAO = [
  "Edital Público.",
  "Indicação.",
  DOCENTE_OUTRO_SISTEMA_SELETIVO,
] as const;

// Q28 - nível de formação dos professores/instrutores.
export const OPCOES_DOCENTE_NIVEL_FORMACAO = [
  "Mestres de Ofícios.",
  "Graduação incompleta.",
  "Graduação completa.",
  "Pós-Graduação incompleta.",
  "Pós-Graduação completa.",
] as const;

// Q30 - estratégias de divulgação (múltipla). Tem simultaneamente uma opção
// excludente (h) e uma que revela campo condicional (i).
export const EXCLUSIVA_DIVULGACAO = "Não foram adotadas estratégias de divulgação do Curso.";
export const DIVULGACAO_OUTROS_CANAIS = "Divulgação via outros canais";

export const OPCOES_DIVULGACAO_ESTRATEGIAS = [
  "Linguagem condizente com o público-alvo que se espera atingir.",
  "Clareza na exposição das informações sobre o Curso.",
  "Divulgação via redes sociais (Facebook, Instagram, X, LinkedIn).",
  "Divulgação via listas de e-mails.",
  "Divulgação via panfletos, folders e cartazes.",
  "Divulgação via chamadas no rádio e em programas de TV locais, jornais e revistas.",
  "Divulgação via carro de som.",
  EXCLUSIVA_DIVULGACAO,
  DIVULGACAO_OUTROS_CANAIS,
] as const;

// Q31 - parcerias locais (múltipla, opção h excludente).
export const EXCLUSIVA_PARCERIAS = "Não foram estabelecidas parcerias para realização do Curso.";

export const OPCOES_PARCERIAS = [
  "Disponibilização de espaço físico para realização de aulas práticas e/ou vivência de campo.",
  "Disponibilização de profissionais para realização de palestras e relatos sobre o dia a dia na função que atua.",
  "Concessão ou empréstimo de materiais e/ou de equipamentos.",
  "Viabilização de oportunidades de primeiro emprego e de estágios para jovens, adultos e/ou idosos.",
  "Viabilização de meios de transporte.",
  "Viabilização de alimentos e insumos que ajudem a compor o lanche (coffee break) coletivo, no intervalo das aulas.",
  "Contribuição financeira, por meio de bolsas de estudo (auxílio ao aluno).",
  EXCLUSIVA_PARCERIAS,
] as const;

// Q32 - suporte ao aluno (múltipla). Tem uma opção que revela campo
// condicional (i) e uma excludente (j).
export const EXCLUSIVA_SUPORTE =
  "Não foram adotadas estratégias logísticas, políticas ou financeiras de suporte ao aluno.";
export const SUPORTE_OUTROS = "Outros";

export const OPCOES_SUPORTE_ESTRATEGIAS = [
  "Estratégias Logísticas: deslocamento dos Docentes até os grupamentos comunitários de difícil acesso/zonas rurais.",
  "Estratégias Logísticas: viabilização de meios de transportes seguros.",
  "Estratégias Financeiras: auxílio financeiro para alimentação.",
  "Estratégias Financeiras: auxílio financeiro para transporte público.",
  "Estratégias Financeiras: auxílio financeiro para combustível.",
  "Estratégias Financeiras: auxílio financeiro para creche.",
  "Estratégias Políticas: articulação e alinhamento das propostas educacionais do Curso com políticas públicas (locais, distritais e/ou estaduais).",
  "Estratégias Políticas: parcerias com os setores público e/ou privado, visando a disponibilização de meios de transporte, seguros e gratuitos.",
  SUPORTE_OUTROS,
  EXCLUSIVA_SUPORTE,
] as const;

// ---- Forma das 56 chaves do questionário ----
//
// Os 9 campos que só se tornam obrigatórios sob uma condição (Q21.1,
// Q25.1/25.2/25.3 e os 5 campos "Qual?/Quais?" - REQ-PC-07/08/09) ficam
// `.optional()` aqui: a FORMA deles é validada em toda gravação, mas a
// obrigatoriedade condicional é responsabilidade exclusiva de
// `validarCompletudePreCurso` (src/lib/pre-curso/completude.ts), não deste
// schema. `.partial()` (usado no PATCH) torna as 47 chaves restantes também
// opcionais, sem alterar a validação de forma de cada uma quando presente.
export const respostasPreCursoSchema = z.object({
  // Seção 1 - Identificação (Q1-Q6)
  identifUf: z.enum(OPCOES_UF),
  identifMunicipio: z.string().min(1),
  identifEntidadeResponsavel: z.string().min(1),
  identifCoordenador: z.string().min(1),
  identifEmail: z.string().email(),
  identifTelefone: z.string().min(1),

  // Seção 2 - Dados da Qualificação Profissional (Q7-Q12)
  qualifEndereco: z.string().min(1),
  qualifNomeCurso: z.string().min(1),
  qualifVinculoPrograma: z.enum(OPCOES_SIM_NAO),
  qualifVinculoProgramaQual: z.string().min(1).optional(),
  qualifCaracteristicas: z.array(z.enum(OPCOES_CARACTERISTICAS)).min(1),
  qualifCaracteristicasOutra: z.string().min(1).optional(),
  qualifModalidade: z.enum(OPCOES_MODALIDADE),
  qualifRegiao: z.enum(OPCOES_REGIAO),

  // Seção 3 - Planejamento (Q13-Q19)
  planejDataInicioPrevista: z.iso.date(),
  planejDataTerminoPrevista: z.iso.date(),
  planejCargaHoraria: z.number().int().positive(),
  planejNumTurmas: z.number().int().positive(),
  planejNumAlunosPrevistos: z.number().int().positive(),
  planejTaxaEvasaoEsperada: z.number().min(0).max(100),
  planejObjetivo: z.string().min(1),

  // Seção 4 - Público-Alvo (Q20, Q21, Q21.1)
  publicoPerfil: z.array(z.enum(OPCOES_PUBLICO_PERFIL)).min(1),
  publicoInstituicaoExecutora: z.enum(OPCOES_INSTITUICAO_EXECUTORA),
  publicoInstituicaoExecutoraNome: z.string().min(1).optional(),

  // Diagnóstico Pré-Curso (Q22)
  diagnosticoConsultas: multiplaComExclusiva(
    OPCOES_DIAGNOSTICO_CONSULTAS,
    EXCLUSIVA_DIAGNOSTICO,
  ),

  // Infraestrutura Básica (Q23 - 9 linhas, escala 0-5)
  infraBasicaBanheiros: escalaInfraestrutura,
  infraBasicaBebedouros: escalaInfraestrutura,
  infraBasicaEnergia: escalaInfraestrutura,
  infraBasicaSalaAula: escalaInfraestrutura,
  infraBasicaRecepcao: escalaInfraestrutura,
  infraBasicaBiblioteca: escalaInfraestrutura,
  infraBasicaMobiliario: escalaInfraestrutura,
  infraBasicaAcessibilidade: escalaInfraestrutura,
  infraBasicaLaboratorio: escalaInfraestrutura,

  // Infraestrutura Complementar (Q24 - 8 linhas, escala 0-5)
  infraComplSalaProfessores: escalaInfraestrutura,
  infraComplSalaGestores: escalaInfraestrutura,
  infraComplSalaEstudo: escalaInfraestrutura,
  infraComplCopa: escalaInfraestrutura,
  infraComplLanchonete: escalaInfraestrutura,
  infraComplAuditorio: escalaInfraestrutura,
  infraComplAudiovisual: escalaInfraestrutura,
  infraComplTecnologicos: escalaInfraestrutura,

  // Infraestrutura Específica (Q25, Q25.1, Q25.2, Q25.3)
  infraEspecificaNecessidade: z.enum(OPCOES_INFRA_ESPECIFICA_NECESSIDADE),
  infraEspecificaDisponibilidade: z
    .enum(OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE)
    .optional(),
  infraEspecificaSuficiencia: z.enum(OPCOES_SIM_NAO).optional(),
  infraEspecificaManutencao: z.enum(OPCOES_SIM_NAO).optional(),

  // Corpo Docente (Q26-Q29)
  docenteCriteriosSelecao: multiplaComExclusiva(
    OPCOES_DOCENTE_CRITERIOS,
    EXCLUSIVA_DOCENTE_CRITERIOS,
  ),
  docenteFormaContratacao: z.enum(OPCOES_DOCENTE_FORMA_CONTRATACAO),
  docenteFormaContratacaoOutra: z.string().min(1).optional(),
  docenteNivelFormacao: z.enum(OPCOES_DOCENTE_NIVEL_FORMACAO),
  docentePoliticasReparacao: z.enum(OPCOES_SIM_NAO),

  // Divulgação (Q30)
  divulgacaoEstrategias: multiplaComExclusiva(
    OPCOES_DIVULGACAO_ESTRATEGIAS,
    EXCLUSIVA_DIVULGACAO,
  ),
  divulgacaoEstrategiasOutra: z.string().min(1).optional(),

  // Parcerias e Sensibilização (Q31)
  parceriasEstabelecidas: multiplaComExclusiva(OPCOES_PARCERIAS, EXCLUSIVA_PARCERIAS),

  // Suporte ao Aluno (Q32)
  suporteEstrategias: multiplaComExclusiva(OPCOES_SUPORTE_ESTRATEGIAS, EXCLUSIVA_SUPORTE),
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

// Edge case da spec (planejamento): término anterior ao início é rejeitado
// na gravação (400), não só no encerramento. Só se aplica quando as duas
// datas estão presentes no estado final (a gravação parcial pode legitimamente
// setar uma data antes da outra) - por isso a rota de PATCH chama isto
// contra o JSON já mesclado (existente + patch), não contra o corpo bruto
// da requisição. Comparação lexicográfica é válida porque `z.iso.date()`
// garante o formato `YYYY-MM-DD`.
export function ordemDatasValida(dados: {
  planejDataInicioPrevista?: string;
  planejDataTerminoPrevista?: string;
}): boolean {
  if (!dados.planejDataInicioPrevista || !dados.planejDataTerminoPrevista) {
    return true;
  }

  return dados.planejDataTerminoPrevista >= dados.planejDataInicioPrevista;
}
