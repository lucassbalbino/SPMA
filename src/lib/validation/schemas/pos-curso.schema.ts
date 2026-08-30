import { z } from "zod";
import { multiplaComExclusiva } from "../multipla";

// Criação do pós-curso (REQ-PO-01).
export const criarPosCursoSchema = z.object({
  cdCurso: z.number().int().positive({ message: "Curso é obrigatório" }),
});

export type CriarPosCursoInput = z.infer<typeof criarPosCursoSchema>;

// ---- Constantes de opções ----
//
// Transcritas de `docs/Questionario_do_Gestor_Pos_Curso.md` (a numeração das
// perguntas fica nos comentários). O arquivo fonte reúne dois momentos de
// coleta - "FORMULÁRIO – DURANTE O CURSO" (Q1-Q6) e "FORMULÁRIO PÓS-CURSO"
// (Q7-Q26) - num único registro de Pós-Curso, como já modelado.
// Reexportadas para a UI montar Select/RadioGroup/checkboxes sem duplicar a
// lista (AD-004: schema único, cliente e servidor).

export const OPCOES_SIM_NAO = ["Sim", "Não"] as const;

// Q1 - problemas de estudo (desafios) definidos.
export const OPCOES_PROBLEMAS_ESTUDO = [
  "Sim, foram definidos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.",
  "Sim, foram definidos pelos Docentes, porém, sem a participação da Coordenação Didática-Pedagógica.",
  "Não, não foram definidos pelos Docentes.",
  "Não se aplica.",
] as const;

// Q2 - conceitos das dimensões econômica, ambiental e sociocultural.
export const OPCOES_CONCEITOS_TRABALHADOS = [
  "Sim, foram detalhados os conceitos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.",
  "Sim, foram detalhados os conceitos pelos Docentes, porém, não conjunto com a Coordenação Didático-Pedagógica.",
  "Não, não foram detalhados os conceitos pelos Docentes.",
  "Não se aplica.",
] as const;

// Q3 - Plano de Ação (situações práticas-vivenciais).
export const OPCOES_PLANO_ACAO = [
  "Sim, o Plano de Ação foi definido pelos Docentes em conjunto com a Coordenação Didático-Pedagógica responsável.",
  "Sim, o Plano de Ação foi definido pelos Docentes, porém, não em conjunto com a Coordenação Didático-Pedagógica.",
  "Não, o Plano de Ação não foi definido pelos Docentes.",
  "Não se aplica.",
] as const;

// Q4 - "Prova Situação" (avaliação cognitiva do primeiro dia).
export const OPCOES_PROVA_SITUACAO = [
  "Sim, foi elaborada pelos Docentes, e foi devidamente realizada pelos alunos no primeiro dia de aula e ao longo do curso.",
  "Sim, foi elaborada pelos Docentes, mas só foi realizada pelos alunos no primeiro dia de aula.",
  "Não, não foi devidamente elaborada pelos Docentes.",
  "Não se aplica.",
] as const;

// Q5 - "Lição Individual" (prova de encerramento).
export const OPCOES_LICAO_INDIVIDUAL = [
  "Sim, foi realizada.",
  "Não foi realizada.",
  "Não se aplica.",
] as const;

// Q6 - ações de monitoramento (múltipla, opção f excludente).
export const EXCLUSIVA_MONITORAMENTO =
  "Nenhuma ação de monitoramento foi realizada durante o desenvolvimento do Curso/Ação de Qualificação.";

export const OPCOES_MONITORAMENTO = [
  "Reuniões periódicas com alunos.",
  "Reuniões periódicas com professores/instrutores.",
  "Acompanhamento individualizado (quando necessário) com alunos.",
  "Reuniões de acompanhamento com parceiros.",
  "Acompanhamento de registros administrativos periódicos, em que conste o número de egressos, as taxas mensais de evasão, e os respectivos motivos atestados.",
  EXCLUSIVA_MONITORAMENTO,
] as const;

// Q16 - motivos atestados para o abandono. Seleção MÚLTIPLA: o enunciado do
// questionário fonte está no plural ("Principais motivos") e a pergunta
// equivalente do questionário do Aluno (Q22.1) vem marcada explicitamente
// como MÚLTIPLA ESCOLHA. Supera o AD-025, que havia travado este campo como
// seleção única quando a lista real ainda não existia (ver AD-036). A lista
// é idêntica à do formulário do Aluno, de propósito: permite cruzar a visão
// do gestor com a do aluno sobre o mesmo curso.
export const OPCOES_MOTIVOS_ABANDONO = [
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

// Q26 - estratégias de continuidade E ampliação (múltipla, opção f
// excludente). O questionário fonte faz UMA pergunta cobrindo os dois temas;
// o dicionário derivado anterior tinha inventado duas perguntas separadas.
export const EXCLUSIVA_CONTINUIDADE =
  "Não foi adotada nenhuma estratégia de continuidade e ampliação.";

export const OPCOES_ESTRATEGIAS_CONTINUIDADE = [
  "Estabelecimento de parcerias junto a entidades públicas.",
  "Estabelecimento de parcerias junto a entidades privadas.",
  "Estabelecimento de parcerias junto a instituições de ensino superior (IES), públicas e/ou privadas, visando projetos de extensão conjuntos.",
  "Integração do Curso a projetos e/ou programas desenvolvidos no território.",
  "Participação em editais voltados ao financiamento de propostas técnicas na área de educação, inclusão social, desenvolvimento local e/ou turismo.",
  EXCLUSIVA_CONTINUIDADE,
] as const;

// Valor monetário: nunca negativo (edge case, spec.md).
const valorMonetario = z.number().min(0);

// ---- Forma das 26 chaves do questionário ----
//
// O único campo condicional (`posExecAlteracaoDetalhe`, Q12, REQ-PO-07) fica
// `.optional()` aqui: a FORMA dele é validada em toda gravação, mas a
// obrigatoriedade condicional é responsabilidade exclusiva de
// `validarCompletudePosCurso` (src/lib/pos-curso/completude.ts), não deste
// schema. `.partial()` (usado no PATCH) torna as 25 chaves restantes também
// opcionais, sem alterar a validação de forma de cada uma quando presente.
export const respostasPosCursoSchema = z.object({
  // Durante o curso - Acompanhamento Pedagógico (Q1-Q6)
  posAcompanhProblemasEstudo: z.enum(OPCOES_PROBLEMAS_ESTUDO),
  posAcompanhConceitosTrabalhados: z.enum(OPCOES_CONCEITOS_TRABALHADOS),
  posAcompanhPlanoAcao: z.enum(OPCOES_PLANO_ACAO),
  posAcompanhProvaSituacao: z.enum(OPCOES_PROVA_SITUACAO),
  posAcompanhLicaoIndividual: z.enum(OPCOES_LICAO_INDIVIDUAL),
  posAcompanhMonitoramento: multiplaComExclusiva(
    OPCOES_MONITORAMENTO,
    EXCLUSIVA_MONITORAMENTO,
  ),

  // Execução (Q7-Q12)
  posExecDataInicioReal: z.iso.date(),
  posExecDataTerminoReal: z.iso.date(),
  posExecCargaHorariaRealizada: z.number().int().positive(),
  posExecDificuldadesEnfrentadas: z.string().min(1),
  posExecHouveAlteracaoPlanejamento: z.enum(OPCOES_SIM_NAO),
  posExecAlteracaoDetalhe: z.string().min(1).optional(),

  // Participação (Q13-Q18)
  posParticNumInscritos: z.number().int().min(0),
  posParticNumMatriculados: z.number().int().min(0),
  posParticNumConcluintes: z.number().int().min(0),
  posParticMotivosAbandono: z.array(z.enum(OPCOES_MOTIVOS_ABANDONO)).min(1),
  posParticDemandaMaiorQueOferta: z.enum(OPCOES_SIM_NAO),
  posParticIntencaoNovaOferta: z.enum(OPCOES_SIM_NAO),

  // Financeiro (Q19-Q25)
  posFinValorTotal: valorMonetario,
  posFinValorProfessores: valorMonetario,
  posFinValorMateriais: valorMonetario,
  posFinValorInfraestrutura: valorMonetario,
  posFinValorBolsaPermanencia: valorMonetario,
  posFinHouveDevolucaoRecursos: z.enum(OPCOES_SIM_NAO),
  posFinNecessidadeAditivo: z.enum(OPCOES_SIM_NAO),

  // Ações para Continuidade do Curso (Q26)
  posContEstrategias: multiplaComExclusiva(
    OPCOES_ESTRATEGIAS_CONTINUIDADE,
    EXCLUSIVA_CONTINUIDADE,
  ),
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
