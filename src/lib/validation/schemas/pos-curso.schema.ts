import { z } from "zod";

// Criação do pós-curso (REQ-PO-01).
export const criarPosCursoSchema = z.object({
  cdCurso: z.number().int().positive({ message: "Curso é obrigatório" }),
});

export type CriarPosCursoInput = z.infer<typeof criarPosCursoSchema>;

// ---- Constantes de opções (Dicionário de Campos, spec.md) ----
// Reexportadas para a UI montar Select/RadioGroup/checkboxes sem duplicar a
// lista (AD-004: schema único, cliente e servidor).

export const OPCOES_PROBLEMAS_ESTUDO = [
  "Dificuldade de leitura e interpretação",
  "Dificuldade de concentração",
  "Baixa frequência às aulas",
  "Dificuldade de acesso a material didático",
  "Conflito entre estudo e trabalho",
  "Nenhum problema identificado",
] as const;

export const OPCOES_AVALIACAO_COGNITIVA = [
  "Prova escrita",
  "Trabalho prático",
  "Avaliação oral",
  "Portfólio",
  "Não foi realizada avaliação cognitiva",
] as const;

export const OPCOES_MONITORAMENTO = [
  "Reuniões periódicas com os alunos",
  "Acompanhamento individual",
  "Relatórios de frequência",
  "Feedback dos professores",
  "Nenhum monitoramento formal",
] as const;

export const OPCOES_DIFICULDADES_ENFRENTADAS = [
  "Evasão de alunos",
  "Problemas de infraestrutura",
  "Indisponibilidade de professores",
  "Questões climáticas",
  "Restrições orçamentárias",
  "Baixa adesão da comunidade",
  "Nenhuma dificuldade",
] as const;

export const OPCOES_HOUVE_ALTERACAO_PLANEJAMENTO = ["Sim", "Não"] as const;

// AD-025: seleção única (não múltipla).
export const OPCOES_MOTIVOS_ABANDONO = [
  "Dificuldades financeiras",
  "Conflito com trabalho",
  "Mudança de endereço",
  "Desmotivação",
  "Problemas de saúde",
  "Não houve abandono",
] as const;

export const OPCOES_RELACAO_DEMANDA_OFERTA = [
  "Demanda superou a oferta de vagas",
  "Demanda foi igual à oferta",
  "Demanda foi menor que a oferta",
] as const;

export const OPCOES_INTENCAO_NOVA_OFERTA = ["Sim", "Não", "Ainda não definido"] as const;

export const OPCOES_HOUVE_DEVOLUCAO_RECURSOS = ["Sim", "Não"] as const;

export const OPCOES_NECESSIDADE_ADITIVO = ["Sim", "Não"] as const;

export const OPCOES_ESTRATEGIAS_CONTINUIDADE = [
  "Nova turma no mesmo local",
  "Ampliação para outros municípios",
  "Parceria com instituição de ensino",
  "Criação de curso avançado",
  "Nenhuma estratégia definida",
] as const;

export const OPCOES_ESTRATEGIAS_AMPLIACAO = [
  "Busca de novos parceiros financiadores",
  "Aumento do número de vagas",
  "Diversificação de conteúdo",
  "Divulgação ampliada",
  "Nenhuma estratégia definida",
] as const;

// Valor monetário: nunca negativo (edge case, spec.md).
const valorMonetario = z.number().min(0);

// ---- Forma dos 26 campos do questionário (spec.md, Dicionário de Campos) ----
//
// O único campo condicional (`posExecAlteracaoDetalhe`, REQ-PO-07) fica
// `.optional()` aqui: a FORMA dele é validada em toda gravação, mas a
// obrigatoriedade condicional é responsabilidade exclusiva de
// `validarCompletudePosCurso` (src/lib/pos-curso/completude.ts), não deste
// schema. `.partial()` (usado no PATCH) torna as 25 chaves restantes também
// opcionais, sem alterar a validação de forma de cada uma quando presente.
export const respostasPosCursoSchema = z.object({
  // Bloco 1 - Acompanhamento Pedagógico
  posAcompanhProblemasEstudo: z.array(z.enum(OPCOES_PROBLEMAS_ESTUDO)).min(1),
  posAcompanhConceitosTrabalhados: z.string().min(1),
  posAcompanhPlanoAcao: z.string().min(1),
  posAcompanhAvaliacaoCognitiva: z.enum(OPCOES_AVALIACAO_COGNITIVA),
  posAcompanhMonitoramento: z.array(z.enum(OPCOES_MONITORAMENTO)).min(1),

  // Bloco 2 - Execução
  posExecDataInicioReal: z.iso.date(),
  posExecDataTerminoReal: z.iso.date(),
  posExecCargaHorariaRealizada: z.number().int().positive(),
  posExecDificuldadesEnfrentadas: z.array(z.enum(OPCOES_DIFICULDADES_ENFRENTADAS)).min(1),
  posExecHouveAlteracaoPlanejamento: z.enum(OPCOES_HOUVE_ALTERACAO_PLANEJAMENTO),
  posExecAlteracaoDetalhe: z.string().min(1).optional(),

  // Bloco 3 - Participação
  posParticNumInscritos: z.number().int().min(0),
  posParticNumMatriculados: z.number().int().min(0),
  posParticNumConcluintes: z.number().int().min(0),
  posParticMotivosAbandono: z.enum(OPCOES_MOTIVOS_ABANDONO),
  posParticRelacaoDemandaOferta: z.enum(OPCOES_RELACAO_DEMANDA_OFERTA),
  posParticIntencaoNovaOferta: z.enum(OPCOES_INTENCAO_NOVA_OFERTA),

  // Bloco 4 - Financeiro
  posFinValorTotalExecutado: valorMonetario,
  posFinValorDespesaDocentes: valorMonetario,
  posFinValorDespesaMaterialDidatico: valorMonetario,
  posFinValorDespesaInfraestrutura: valorMonetario,
  posFinHouveDevolucaoRecursos: z.enum(OPCOES_HOUVE_DEVOLUCAO_RECURSOS),
  posFinValorDevolvido: valorMonetario,
  posFinNecessidadeAditivo: z.enum(OPCOES_NECESSIDADE_ADITIVO),

  // Bloco 5 - Continuidade
  posContEstrategiasContinuidade: z.array(z.enum(OPCOES_ESTRATEGIAS_CONTINUIDADE)).min(1),
  posContEstrategiasAmpliacao: z.array(z.enum(OPCOES_ESTRATEGIAS_AMPLIACAO)).min(1),
});

export type RespostasPosCurso = z.infer<typeof respostasPosCursoSchema>;

// Forma usada em PATCH (gravação parcial, REQ-PO-04/05/06): todas as chaves
// tornam-se opcionais, mas a FORMA de cada uma continua validada quando
// presente.
export const respostasPosCursoParcialSchema = respostasPosCursoSchema.partial();

export type RespostasPosCursoParcial = z.infer<typeof respostasPosCursoParcialSchema>;

// Edge case da spec (Execução): término anterior ao início é rejeitado na
// gravação (400), não só no encerramento. Só se aplica quando as duas datas
// estão presentes no estado final (a gravação parcial pode legitimamente
// setar uma data antes da outra) - por isso a rota de PATCH chama isto
// contra o JSON já mesclado (existente + patch), não contra o corpo bruto
// da requisição. Comparação lexicográfica é válida porque `z.iso.date()`
// garante o formato `YYYY-MM-DD`. Função própria, não compartilhada com
// `ordemDatasValida` do Pré-Curso - ver design.md Tech Decisions.
export function datasReaisEmOrdem(dados: {
  posExecDataInicioReal?: string;
  posExecDataTerminoReal?: string;
}): boolean {
  if (!dados.posExecDataInicioReal || !dados.posExecDataTerminoReal) {
    return true;
  }

  return dados.posExecDataTerminoReal >= dados.posExecDataInicioReal;
}
