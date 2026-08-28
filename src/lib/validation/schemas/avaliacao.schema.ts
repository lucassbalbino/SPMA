import { z } from "zod";
import { normalizarCPF, validarCPF } from "../cpf";
import { OPCOES_UF } from "./pre-curso.schema";

export { OPCOES_UF };

// Matrícula do Aluno num curso (AVAL-01).
export const matricularAlunoSchema = z.object({
  cpf: z
    .string()
    .refine(validarCPF, { message: "CPF inválido" })
    .transform(normalizarCPF),
  cdCurso: z.number().int().positive({ message: "Curso é obrigatório" }),
});

export type MatricularAlunoInput = z.infer<typeof matricularAlunoSchema>;

// ---- Constantes de opções (Dicionário de Campos, spec.md) ----
// Reexportadas para a UI montar Select/RadioGroup/checkboxes sem duplicar a
// lista (AD-004: schema único, cliente e servidor).

export const OPCOES_GENERO = [
  "Feminino",
  "Masculino",
  "Não binário",
  "Prefiro não informar",
] as const;

export const OPCOES_FAIXA_ETARIA = [
  "16 a 17 anos",
  "18 a 24 anos",
  "25 a 34 anos",
  "35 a 44 anos",
  "45 a 59 anos",
  "60 anos ou mais",
] as const;

export const OPCOES_ESCOLARIDADE = [
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
  "Pós-graduação",
] as const;

export const OPCOES_RACA_ETNIA = [
  "Branca",
  "Preta",
  "Parda",
  "Amarela",
  "Indígena",
  "Prefiro não informar",
] as const;

export const OPCOES_SIM_NAO = ["Sim", "Não"] as const;

export const OPCOES_CONDICAO_TRABALHO = [
  "Empregado(a) com carteira assinada",
  "Empregado(a) sem carteira assinada",
  "Autônomo(a)",
  "Desempregado(a)",
  "Estudante sem trabalho",
  "Aposentado(a)",
] as const;

export const OPCOES_FAIXA_RENDA = [
  "Sem renda",
  "Até 1 salário mínimo",
  "De 1 a 2 salários mínimos",
  "De 2 a 3 salários mínimos",
  "Acima de 3 salários mínimos",
] as const;

// AD-025: seleção única (não múltipla).
export const OPCOES_TIPO_CURSO_ANTERIOR = [
  "Curso livre",
  "Curso técnico",
  "Graduação",
  "Pós-graduação",
  "Curso de extensão",
] as const;

export const OPCOES_MOTIVOS_PARTICIPACAO = [
  "Geração de renda",
  "Qualificação profissional",
  "Interesse pessoal no setor de Turismo",
  "Exigência do mercado de trabalho",
  "Empreender no setor",
  "Indicação de terceiros",
  "Outro motivo",
] as const;

// AD-025: seleção única (não múltipla).
export const OPCOES_FORMA_CONHECIMENTO = [
  "Redes sociais",
  "Indicação de conhecidos",
  "Divulgação da Entidade Responsável",
  "Rádio ou TV local",
  "Cartazes ou panfletos",
  "Escola ou instituição de ensino",
  "Outra forma",
] as const;

export const OPCOES_EXPECTATIVA = [
  "Superou minhas expectativas",
  "Atendeu totalmente",
  "Atendeu parcialmente",
  "Não atendeu",
] as const;

export const OPCOES_MOTIVO_NAO_CONCLUSAO = [
  "Dificuldades financeiras",
  "Conflito com trabalho",
  "Mudança de endereço",
  "Problemas de saúde",
  "Falta de tempo",
  "Não se identificou com o curso",
  "Outro motivo",
] as const;

export const OPCOES_AMPLIACAO_CONHECIMENTO = [
  "Sim, totalmente",
  "Sim, parcialmente",
  "Não",
] as const;

export const OPCOES_SENSACAO_PREPARO = [
  "Sim, me sinto totalmente preparado(a)",
  "Parcialmente preparado(a)",
  "Não me sinto preparado(a)",
] as const;

// AD-025: seleção única, simplificação sem múltipla retomada.
export const OPCOES_RETOMADA_ESTUDOS = [
  "Sim, já retomei",
  "Pretendo retomar em breve",
  "Não pretendo retomar",
  "Ainda não decidi",
] as const;

export const OPCOES_MOTIVACOES_POS = [
  "Maior autoconfiança",
  "Vontade de empreender",
  "Interesse em continuar estudando",
  "Desejo de atuar no setor de Turismo",
  "Melhoria na renda familiar",
  "Nenhuma mudança percebida",
] as const;

// AD-025: seleção única (situação de trabalho pós-curso).
export const OPCOES_SITUACAO_TRABALHO = [
  "Empregado(a) na área de Turismo",
  "Empregado(a) fora da área de Turismo",
  "Autônomo(a) na área de Turismo",
  "Desempregado(a) buscando emprego",
  "Estudante sem trabalho",
] as const;

export const OPCOES_INTENCAO_ATUAR_TURISMO = [
  "Sim",
  "Não",
  "Ainda não decidi",
] as const;

export const OPCOES_EFETIVACAO = ["Sim", "Não", "Não se aplica"] as const;

export const OPCOES_MELHORIAS_COMUNIDADE = [
  "Sim",
  "Não",
  "Não sei avaliar",
] as const;

export const OPCOES_RECOMENDA_CURSO = ["Sim", "Não", "Talvez"] as const;

// Escala de Avaliação do Curso (AD-020): 1=Péssimo .. 5=Ótimo, sem "não há
// disponibilidade" (diferente da escala de infraestrutura do Pré-Curso).
export const escalaAvaliacaoCurso = z.number().int().min(1).max(5);

// ---- Forma das 44 chaves do questionário (spec.md, Dicionário de Campos) ----
//
// Diferente do Pré-Curso/Pós-Curso, TODAS as chaves ficam `.optional()`
// aqui: a maioria da Parte 2 (22 de 25 chaves) só é exigida quando
// `avalParticipConcluiuCurso="Sim"`, então "a maioria required, poucos
// condicionais opcionais" inverteria a proporção real. A obrigatoriedade
// (Parte 1 sempre; Parte 2 condicional ao gate) é 100% responsabilidade de
// `src/lib/avaliacao/completude.ts` - ver design.md Approach Exploration §2.
export const respostasAvaliacaoSchema = z.object({
  // Parte 1 - Dados Pessoais (Nome/CPF não são chaves aqui - vêm do Usuário)
  avalPessoalEstado: z.enum(OPCOES_UF).optional(),
  avalPessoalMunicipio: z.string().min(1).optional(),
  avalPessoalGenero: z.enum(OPCOES_GENERO).optional(),
  avalPessoalFaixaEtaria: z.enum(OPCOES_FAIXA_ETARIA).optional(),
  avalPessoalEscolaridade: z.enum(OPCOES_ESCOLARIDADE).optional(),
  avalPessoalRacaEtnia: z.enum(OPCOES_RACA_ETNIA).optional(),
  avalPessoalCondicaoPcd: z.enum(OPCOES_SIM_NAO).optional(),

  // Parte 1 - Situação Profissional
  avalProfissCondicaoTrabalho: z.enum(OPCOES_CONDICAO_TRABALHO).optional(),
  avalProfissAtuaTurismo: z.enum(OPCOES_SIM_NAO).optional(),
  avalProfissAtividadeEspecifica: z.string().min(1).optional(),
  avalProfissFaixaRenda: z.enum(OPCOES_FAIXA_RENDA).optional(),

  // Parte 1 - Experiência
  avalExperienciaTrabalhoPrevio: z.enum(OPCOES_SIM_NAO).optional(),
  avalExperienciaCursoAnterior: z.enum(OPCOES_SIM_NAO).optional(),
  avalExperienciaTipoCursoAnterior: z.enum(OPCOES_TIPO_CURSO_ANTERIOR).optional(),

  // Parte 1 - Motivação
  avalMotivMotivosParticipacao: z
    .array(z.enum(OPCOES_MOTIVOS_PARTICIPACAO))
    .min(1)
    .max(3)
    .optional(),
  avalMotivFormaConhecimento: z.enum(OPCOES_FORMA_CONHECIMENTO).optional(),

  // Parte 1 - Expectativas
  avalExpectAtendimento: z.enum(OPCOES_EXPECTATIVA).optional(),
  avalExpectEmprego: z.enum(OPCOES_EXPECTATIVA).optional(),
  avalExpectRenda: z.enum(OPCOES_EXPECTATIVA).optional(),

  // Parte 2 - Participação
  avalParticipConcluiuCurso: z.enum(OPCOES_SIM_NAO).optional(),
  avalParticipMotivoNaoConclusao: z
    .array(z.enum(OPCOES_MOTIVO_NAO_CONCLUSAO))
    .min(1)
    .optional(),
  avalParticipPercentualFrequencia: z.number().min(0).max(100).optional(),

  // Parte 2 - Avaliação do Curso (escala 1-5, AD-020)
  avalCursoDinamicasInclusao: escalaAvaliacaoCurso.optional(),
  avalCursoMaterialDidatico: escalaAvaliacaoCurso.optional(),
  avalCursoConteudo: escalaAvaliacaoCurso.optional(),
  avalCursoClareza: escalaAvaliacaoCurso.optional(),
  avalCursoConhecimentoInstrutores: escalaAvaliacaoCurso.optional(),
  avalCursoOrganizacao: escalaAvaliacaoCurso.optional(),
  avalCursoInfraestruturaBasica: escalaAvaliacaoCurso.optional(),
  avalCursoInfraestruturaSalaAula: escalaAvaliacaoCurso.optional(),

  // Parte 2 - Aprendizado
  avalAprendizAmpliacaoConhecimento: z.enum(OPCOES_AMPLIACAO_CONHECIMENTO).optional(),
  avalAprendizAtendimentoExpectativas: z.enum(OPCOES_EXPECTATIVA).optional(),
  avalAprendizSensacaoPreparo: z.enum(OPCOES_SENSACAO_PREPARO).optional(),

  // Parte 2 - Continuidade nos Estudos
  avalContinuidadeRetomadaEstudos: z.enum(OPCOES_RETOMADA_ESTUDOS).optional(),

  // Parte 2 - Motivações Pós-Curso
  avalMotivacoesPosPercepcoes: z.array(z.enum(OPCOES_MOTIVACOES_POS)).min(1).optional(),

  // Parte 2 - Oportunidades de Trabalho
  avalOportunSituacaoTrabalho: z.enum(OPCOES_SITUACAO_TRABALHO).optional(),
  avalOportunIntencaoAtuarTurismo: z.enum(OPCOES_INTENCAO_ATUAR_TURISMO).optional(),

  // Parte 2 - Efetivação e Renda
  avalEfetivEmprego: z.enum(OPCOES_EFETIVACAO).optional(),
  avalEfetivAumentoRenda: z.enum(OPCOES_EFETIVACAO).optional(),
  avalEfetivMelhoriaPadraoVida: z.enum(OPCOES_EFETIVACAO).optional(),

  // Parte 2 - Avaliação Geral
  avalGeralNota: z.number().int().min(0).max(10).optional(),
  avalGeralMelhoriasComunidade: z.enum(OPCOES_MELHORIAS_COMUNIDADE).optional(),
  avalGeralRecomendaCurso: z.enum(OPCOES_RECOMENDA_CURSO).optional(),
  avalGeralComentariosFinais: z.string().min(1).optional(),
});

export type RespostasAvaliacao = z.infer<typeof respostasAvaliacaoSchema>;

// Já totalmente opcional (ver acima) - exportado com esse nome só por
// simetria com os call sites de PATCH de `pre-curso.schema.ts`/`pos-curso.schema.ts`.
export const respostasAvaliacaoParcialSchema = respostasAvaliacaoSchema;

export type RespostasAvaliacaoParcial = z.infer<typeof respostasAvaliacaoParcialSchema>;

// As 19 chaves da Parte 1 (AD-023/RN-13) - usado pela rota de PATCH para
// classificar cada chave recebida como Parte 1 ou Parte 2 (AVAL-10).
export const CHAVES_PARTE_1 = [
  "avalPessoalEstado",
  "avalPessoalMunicipio",
  "avalPessoalGenero",
  "avalPessoalFaixaEtaria",
  "avalPessoalEscolaridade",
  "avalPessoalRacaEtnia",
  "avalPessoalCondicaoPcd",
  "avalProfissCondicaoTrabalho",
  "avalProfissAtuaTurismo",
  "avalProfissAtividadeEspecifica",
  "avalProfissFaixaRenda",
  "avalExperienciaTrabalhoPrevio",
  "avalExperienciaCursoAnterior",
  "avalExperienciaTipoCursoAnterior",
  "avalMotivMotivosParticipacao",
  "avalMotivFormaConhecimento",
  "avalExpectAtendimento",
  "avalExpectEmprego",
  "avalExpectRenda",
] as const satisfies readonly (keyof RespostasAvaliacao)[];
