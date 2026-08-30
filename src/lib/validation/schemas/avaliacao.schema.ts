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

// ---- Constantes de opções ----
//
// Transcritas de `docs/Questionario_do_Aluno_1.md` (a numeração das perguntas
// fica nos comentários; Q1-Q21 = Parte 1, Q22-Q38 = Parte 2). Reexportadas
// para a UI montar Select/RadioGroup/checkboxes sem duplicar a lista (AD-004:
// schema único, cliente e servidor). Q1 (nome) e Q2 (CPF) não são chaves
// deste JSON: vêm do cadastro do Usuário e da chave primária da avaliação.

export const OPCOES_SIM_NAO = ["Sim", "Não"] as const;

// Q5 - gênero.
export const OPCOES_GENERO = ["Feminino", "Masculino", "Prefiro não informar"] as const;

// Q6 - faixa etária.
export const OPCOES_FAIXA_ETARIA = [
  "Até 18 anos",
  "19 a 25 anos",
  "26 a 35 anos",
  "36 a 50 anos",
  "Acima de 50 anos",
] as const;

// Q7 - nível de escolaridade.
export const OPCOES_ESCOLARIDADE = [
  "Sem escolaridade",
  "Ensino fundamental incompleto",
  "Ensino fundamental completo",
  "Ensino médio incompleto",
  "Ensino médio completo",
  "Ensino técnico",
  "Ensino superior incompleto",
  "Ensino superior completo",
  "Pós-graduação incompleta",
  "Pós-graduação completa",
] as const;

// Q8 - cor/raça/etnia.
export const OPCOES_RACA_ETNIA = ["Branco", "Negro", "Pardo", "Amarelo", "Indígena"] as const;

// Q9 - condição de PCD. Note que NÃO é Sim/Não: o questionário fonte pede o
// tipo da deficiência na mesma pergunta.
export const OPCOES_CONDICAO_PCD = [
  "Não sou uma Pessoa com Deficiência.",
  "Sim, tenho deficiência física (paralisias, amputações, ausência de membros, lesões nervosas ou musculares, etc.)",
  "Sim, tenho deficiência auditiva.",
  "Sim, tenho deficiência visual.",
  "Sim, tenho deficiência intelectual/mental.",
] as const;

// Q10 - condição atual de trabalho.
export const OPCOES_CONDICAO_TRABALHO = [
  "Estagiário(a).",
  "Microempreendedor Individual (MEI)",
  "Pessoa Jurídica – PJ (empresário)",
  "Profissional Liberal",
  "Trabalhador(a) Autônomo/Freelancer",
  "Trabalhador(a) Informal (sem vínculo contratual)",
  "Trabalhador(a) Formal (CLT)",
  "Estudante",
  "Desempregado",
] as const;

// Q12 - atividade de Turismo em que atua (condicional de Q11).
export const OPCOES_ATIVIDADE_TURISMO = [
  "Serviços de Alimentação",
  "Alojamento (meios de hospedagem)",
  "Transporte (aéreo, terrestre, aquaviário)",
  "Aluguel de Transportes",
  "Cultura e Lazer (atrações turísticas, museus, parques)",
  "Agências de Viagem e Operadoras",
  "Eventos",
  "Guiamento e Condução",
  "Turismo de Base Comunitária",
  "Outro",
] as const;

// Q13 - faixa de renda mensal.
export const OPCOES_FAIXA_RENDA = [
  "Sem renda",
  "Até 01 salário mínimo",
  "Entre 01 e 03 salários mínimos",
  "Entre 03 e 05 salários mínimos",
  "Entre 05 e 07 salários mínimos",
  "Entre 07 e 10 salários mínimos",
  "Acima de 10 salários mínimos",
] as const;

// Q16 - tipo de curso anterior na área (condicional de Q15).
export const OPCOES_TIPO_CURSO_ANTERIOR = [
  "Atualização profissional",
  "Técnico",
  "Tecnológico-Superior",
  "Graduação",
  "Especialização / MBA",
  "Mestrado/Doutorado",
  "Outro.",
] as const;

// Q17 - motivos para participar (múltipla, até 3).
export const OPCOES_MOTIVOS_PARTICIPACAO = [
  "Conseguir um emprego/trabalho",
  "Melhorar ou complementar a minha renda/me emancipar financeiramente",
  "Abrir o meu próprio negócio",
  "Melhor a minha qualificação profissional",
  "Aplicar o conhecimento adquirido",
  "Contribuir com o turismo no meu território",
] as const;

// Q18 - como ficou sabendo do curso.
export const OPCOES_FORMA_CONHECIMENTO = [
  "pela Prefeitura Municipal",
  "pelas Redes Sociais",
  "pela comunidade",
  "por indicação de amigo(s)",
  "pelo rádio/tv local",
  "por carro de som",
  "por panfletos / outdoors",
  "Outro",
] as const;

// Q19 e Q26 - expectativa atendida.
export const OPCOES_SIM_PARCIAL_NAO = ["Sim", "Parcialmente", "Não"] as const;

// Q20 - expectativa de trabalho/ascensão.
export const OPCOES_SIM_TALVEZ_NAO = ["Sim", "Talvez", "Não"] as const;

// Q21 - expectativa de melhoria de renda.
export const OPCOES_EXPECTATIVA_RENDA = ["Nenhuma", "Baixa", "Média", "Alta"] as const;

// Q22.1 - motivos de não conclusão (múltipla). Lista idêntica à do Q16 do
// questionário do Gestor (pós-curso), de propósito: permite cruzar a visão do
// aluno com a do gestor sobre o mesmo curso. Marcada explicitamente como
// MÚLTIPLA ESCOLHA no papel - supera o AD-025 (ver AD-036).
export const OPCOES_MOTIVO_NAO_CONCLUSAO = [
  "Falta de motivação/interesse",
  "Dificuldades financeiras",
  "Dificuldades de aprendizagem",
  "Problemas pessoais/familiares",
  "Não ter com quem deixar o(s) filho(s)",
  "Horário inapropriado das aulas",
  "Impeditivos no trabalho (Ex: chefe não liberou)",
  "Local muito distante de casa",
  "Professores/Instrutores não qualificados",
  "Outro",
] as const;

// Q23 - percentual de aulas frequentadas. Faixas, não número livre.
export const OPCOES_PERCENTUAL_FREQUENCIA = [
  "Até 25%",
  "26% a 50%",
  "51% a 75%",
  "76% a 100%",
] as const;

// Q25 - conhecimento após a conclusão.
export const OPCOES_AMPLIACAO_CONHECIMENTO = [
  "Ampliou / Melhorou",
  "Não ampliou / Não Melhorou",
  "Indiferente",
] as const;

// Q28 - retomada dos estudos.
export const OPCOES_RETOMADA_ESTUDOS = [
  "Sim, a educação básica",
  "Sim, ao ensino fundamental",
  "Sim, ao ensino médio",
  "Sim, ao ensino técnico",
  "Sim, ao ensino superior",
  "Sim, a outras formações profissionais",
  "Não",
] as const;

// Q29 - motivações após o curso (múltipla).
export const OPCOES_MOTIVACOES_POS = [
  "tem condições de atuar na área do Turismo",
  "desenvolveu novas percepções de mundo",
  "se sente motivado(a) a retomar os estudos",
  "se sente motivado(a) a melhor as suas condições de vida",
  "se sente motivado(a) a combater práticas de violência (física, psicológica, moral, sexual ou patrimonial) contra você",
  "melhorou as suas percepções/ações sobre as mudanças climáticas",
] as const;

// Q30 - situação de trabalho após a conclusão. A última opção revela o campo
// condicional "Quais?".
export const SITUACAO_TRABALHO_OUTRA = "Outra";

export const OPCOES_SITUACAO_TRABALHO = [
  "Consegui um emprego, com carteira assinada, na área de Turismo.",
  "Consegui um emprego, sem carteira assinada, na área de Turismo.",
  "Consegui um emprego, com carteira assinada, fora da área de Turismo.",
  "Consegui um emprego, sem carteira assinada, fora da área de Turismo.",
  "Estou trabalhando por conta própria (autônomo).",
  "Estou trabalhando como MEI (próprio negócio).",
  "Continuo na posição em que estava a trabalhar antes do curso.",
  "Estou desempregado.",
  "Estou estudando.",
  SITUACAO_TRABALHO_OUTRA,
] as const;

// Q34 - melhoria do padrão de vida.
export const OPCOES_MELHORIA_PADRAO_VIDA = [
  "Sim, totalmente",
  "Sim, parcialmente",
  "Não",
] as const;

// Escala de Avaliação do Curso, Q24 (AD-020): 1=Péssimo .. 5=Ótimo, sem "não
// há disponibilidade" (diferente da escala de infraestrutura do Pré-Curso).
// A tabela do papel lista as colunas de Ótimo a Péssimo; o valor armazenado
// segue crescente, e é a UI que apresenta na ordem do papel.
export const escalaAvaliacaoCurso = z.number().int().min(1).max(5);

// ---- Forma das 45 chaves do questionário (19 na Parte 1, 26 na Parte 2) ----
//
// Diferente do Pré-Curso/Pós-Curso, TODAS as chaves ficam `.optional()`
// aqui: a maior parte da Parte 2 só é exigida quando
// `avalParticipConcluiuCurso="Sim"`, então "a maioria required, poucos
// condicionais opcionais" inverteria a proporção real. A obrigatoriedade
// (Parte 1 sempre; Parte 2 condicional ao gate) é 100% responsabilidade de
// `src/lib/avaliacao/completude.ts` - ver design.md Approach Exploration §2.
export const respostasAvaliacaoSchema = z.object({
  // Parte 1 - Dados Pessoais (Q3-Q9; Q1 nome e Q2 CPF vêm do Usuário)
  avalPessoalEstado: z.enum(OPCOES_UF).optional(),
  avalPessoalMunicipio: z.string().min(1).optional(),
  avalPessoalGenero: z.enum(OPCOES_GENERO).optional(),
  avalPessoalFaixaEtaria: z.enum(OPCOES_FAIXA_ETARIA).optional(),
  avalPessoalEscolaridade: z.enum(OPCOES_ESCOLARIDADE).optional(),
  avalPessoalRacaEtnia: z.enum(OPCOES_RACA_ETNIA).optional(),
  avalPessoalCondicaoPcd: z.enum(OPCOES_CONDICAO_PCD).optional(),

  // Parte 1 - Situação Profissional (Q10-Q13)
  avalProfissCondicaoTrabalho: z.enum(OPCOES_CONDICAO_TRABALHO).optional(),
  avalProfissAtuaTurismo: z.enum(OPCOES_SIM_NAO).optional(),
  avalProfissAtividadeEspecifica: z.enum(OPCOES_ATIVIDADE_TURISMO).optional(),
  avalProfissFaixaRenda: z.enum(OPCOES_FAIXA_RENDA).optional(),

  // Parte 1 - Experiência (Q14-Q16)
  avalExperienciaTrabalhoPrevio: z.enum(OPCOES_SIM_NAO).optional(),
  avalExperienciaCursoAnterior: z.enum(OPCOES_SIM_NAO).optional(),
  avalExperienciaTipoCursoAnterior: z.enum(OPCOES_TIPO_CURSO_ANTERIOR).optional(),

  // Parte 1 - Motivação (Q17-Q18)
  avalMotivMotivosParticipacao: z
    .array(z.enum(OPCOES_MOTIVOS_PARTICIPACAO))
    .min(1)
    .max(3)
    .optional(),
  avalMotivFormaConhecimento: z.enum(OPCOES_FORMA_CONHECIMENTO).optional(),

  // Parte 1 - Expectativas (Q19-Q21)
  avalExpectAtendimento: z.enum(OPCOES_SIM_PARCIAL_NAO).optional(),
  avalExpectEmprego: z.enum(OPCOES_SIM_TALVEZ_NAO).optional(),
  avalExpectRenda: z.enum(OPCOES_EXPECTATIVA_RENDA).optional(),

  // Parte 2 - Participação (Q22, Q22.1, Q23)
  avalParticipConcluiuCurso: z.enum(OPCOES_SIM_NAO).optional(),
  avalParticipMotivoNaoConclusao: z
    .array(z.enum(OPCOES_MOTIVO_NAO_CONCLUSAO))
    .min(1)
    .optional(),
  avalParticipPercentualFrequencia: z.enum(OPCOES_PERCENTUAL_FREQUENCIA).optional(),

  // Parte 2 - Avaliação do Curso (Q24, 8 linhas em escala 1-5, AD-020)
  avalCursoDinamicasInclusao: escalaAvaliacaoCurso.optional(),
  avalCursoMaterialDidatico: escalaAvaliacaoCurso.optional(),
  avalCursoConteudo: escalaAvaliacaoCurso.optional(),
  avalCursoClareza: escalaAvaliacaoCurso.optional(),
  avalCursoConhecimentoInstrutores: escalaAvaliacaoCurso.optional(),
  avalCursoOrganizacao: escalaAvaliacaoCurso.optional(),
  avalCursoInfraestruturaBasica: escalaAvaliacaoCurso.optional(),
  avalCursoInfraestruturaSalaAula: escalaAvaliacaoCurso.optional(),

  // Parte 2 - Aprendizado (Q25-Q27)
  avalAprendizAmpliacaoConhecimento: z.enum(OPCOES_AMPLIACAO_CONHECIMENTO).optional(),
  avalAprendizAtendimentoExpectativas: z.enum(OPCOES_SIM_PARCIAL_NAO).optional(),
  avalAprendizSensacaoPreparo: z.enum(OPCOES_SIM_PARCIAL_NAO).optional(),

  // Parte 2 - Continuidade nos Estudos (Q28)
  avalContinuidadeRetomadaEstudos: z.enum(OPCOES_RETOMADA_ESTUDOS).optional(),

  // Parte 2 - Motivações após o Curso (Q29)
  avalMotivacoesPosPercepcoes: z.array(z.enum(OPCOES_MOTIVACOES_POS)).min(1).optional(),

  // Parte 2 - Oportunidades Reais de Trabalho e Emprego (Q30, Q30.j, Q31)
  avalOportunSituacaoTrabalho: z.enum(OPCOES_SITUACAO_TRABALHO).optional(),
  avalOportunSituacaoTrabalhoOutra: z.string().min(1).optional(),
  avalOportunIntencaoAtuarTurismo: z.enum(OPCOES_SIM_NAO).optional(),

  // Parte 2 - Efetivação no Emprego e Aumento da Renda (Q32-Q34)
  avalEfetivEmprego: z.enum(OPCOES_SIM_NAO).optional(),
  avalEfetivAumentoRenda: z.enum(OPCOES_SIM_NAO).optional(),
  avalEfetivMelhoriaPadraoVida: z.enum(OPCOES_MELHORIA_PADRAO_VIDA).optional(),

  // Parte 2 - Avaliação geral (Q35-Q38)
  avalGeralNota: z.number().int().min(0).max(10).optional(),
  avalGeralMelhoriasComunidade: z.string().min(1).optional(),
  avalGeralRecomendaCurso: z.enum(OPCOES_SIM_NAO).optional(),
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
