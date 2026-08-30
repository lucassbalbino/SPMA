// As regras condicionais do questionário do Aluno: 4 perguntas reveladas
// por outra pergunta (Q12, Q16, Q22.1, Q30.j) e o gate de bloco "Concluiu o
// curso?" (Q22), que governa as 22 chaves de Q24 a Q38.
//
// Fonte única das condições: `completude.ts` (exigência), `AvaliacaoForm.tsx`
// (`visivelSe` e o bloqueio das chaves de "apenas para quem concluiu") e a
// limpeza de órfãs do encerramento leem daqui.
import {
  SITUACAO_TRABALHO_OUTRA,
  type RespostasAvaliacao,
  type RespostasAvaliacaoParcial,
} from "../validation/schemas/avaliacao.schema";
import {
  condicaoDe,
  pendenciasDasRegras,
  semOrfas,
  type RegraCondicional,
} from "../validation/condicionais";

// Q12 e Q16 - Parte 1.
export const REGRAS_CONDICIONAIS_PARTE_1: readonly RegraCondicional<RespostasAvaliacaoParcial>[] =
  [
    {
      chave: "avalProfissAtividadeEspecifica",
      dependeDe: ["avalProfissAtuaTurismo"],
      exigidaQuando: (dados) => dados.avalProfissAtuaTurismo === "Sim",
    },
    {
      chave: "avalExperienciaTipoCursoAnterior",
      dependeDe: ["avalExperienciaCursoAnterior"],
      exigidaQuando: (dados) => dados.avalExperienciaCursoAnterior === "Sim",
    },
  ];

// Q22.1 e Q30.j - Parte 2.
export const REGRAS_CONDICIONAIS_PARTE_2: readonly RegraCondicional<RespostasAvaliacaoParcial>[] =
  [
    {
      chave: "avalParticipMotivoNaoConclusao",
      dependeDe: ["avalParticipConcluiuCurso"],
      exigidaQuando: (dados) => dados.avalParticipConcluiuCurso === "Não",
    },
    {
      chave: "avalOportunSituacaoTrabalhoOutra",
      dependeDe: ["avalOportunSituacaoTrabalho"],
      exigidaQuando: (dados) =>
        dados.avalOportunSituacaoTrabalho === SITUACAO_TRABALHO_OUTRA,
    },
  ];

export const REGRAS_CONDICIONAIS_AVALIACAO = [
  ...REGRAS_CONDICIONAIS_PARTE_1,
  ...REGRAS_CONDICIONAIS_PARTE_2,
] as const satisfies readonly RegraCondicional<RespostasAvaliacaoParcial>[];

export type ChaveCondicionalAvaliacao =
  (typeof REGRAS_CONDICIONAIS_AVALIACAO)[number]["chave"];

export function condicaoAvaliacao(chave: ChaveCondicionalAvaliacao) {
  return condicaoDe(REGRAS_CONDICIONAIS_AVALIACAO, chave);
}

// AVAL-12/13: as chaves que o cabeçalho "Avaliação do curso (apenas para
// quem concluiu)" governa - Q24 a Q37 (21 exigidas), mais Q30.j
// (`avalOportunSituacaoTrabalhoOutra`, condicional dentro de Q30) e Q38
// (comentário livre, opcional): as "22 chaves condicionais" da spec contando
// o par Q30/Q30.j como um. Q22, Q22.1 e Q23 ficam FORA: são do bloco
// "Participação", que todo aluno responde.
export const CHAVES_SOMENTE_CONCLUINTE = [
  "avalCursoDinamicasInclusao",
  "avalCursoMaterialDidatico",
  "avalCursoConteudo",
  "avalCursoClareza",
  "avalCursoConhecimentoInstrutores",
  "avalCursoOrganizacao",
  "avalCursoInfraestruturaBasica",
  "avalCursoInfraestruturaSalaAula",
  "avalAprendizAmpliacaoConhecimento",
  "avalAprendizAtendimentoExpectativas",
  "avalAprendizSensacaoPreparo",
  "avalContinuidadeRetomadaEstudos",
  "avalMotivacoesPosPercepcoes",
  "avalOportunSituacaoTrabalho",
  "avalOportunSituacaoTrabalhoOutra",
  "avalOportunIntencaoAtuarTurismo",
  "avalEfetivEmprego",
  "avalEfetivAumentoRenda",
  "avalEfetivMelhoriaPadraoVida",
  "avalGeralNota",
  "avalGeralMelhoriasComunidade",
  "avalGeralRecomendaCurso",
  "avalGeralComentariosFinais",
] as const satisfies readonly (keyof RespostasAvaliacao)[];

// O gate só se aplica de fato quando o aluno JÁ declarou não ter concluído.
// Enquanto Q22 está em branco, nada é descartado.
export function naoConcluiuDeclarado(respostas: RespostasAvaliacaoParcial): boolean {
  return respostas.avalParticipConcluiuCurso === "Não";
}

export function pendenciasCondicionaisParte1(respostas: unknown): string[] {
  return pendenciasDasRegras(
    REGRAS_CONDICIONAIS_PARTE_1,
    (respostas ?? {}) as RespostasAvaliacaoParcial,
  );
}

export function pendenciasCondicionaisParte2(respostas: unknown): string[] {
  return pendenciasDasRegras(
    REGRAS_CONDICIONAIS_PARTE_2,
    (respostas ?? {}) as RespostasAvaliacaoParcial,
  );
}

// Descarta as respostas que a própria avaliação tornou inaplicáveis: as
// condicionais órfãs (Q12/Q16/Q22.1/Q30.j) e, quando o aluno declarou não
// ter concluído, as 22 chaves de "apenas para quem concluiu".
//
// Chamada só no ENCERRAMENTO. No PATCH os valores são preservados de
// propósito - é edge case explícito da spec (`avalParticipConcluiuCurso`
// alterado de "Sim" para "Não" numa gravação posterior preserva o que já
// estava salvo), para o aluno poder corrigir Q22 sem perder o que
// respondeu.
export function normalizarCondicionaisAvaliacao(
  respostas: unknown,
): RespostasAvaliacaoParcial {
  const dados = (respostas ?? {}) as RespostasAvaliacaoParcial;
  const gate = naoConcluiuDeclarado(dados) ? CHAVES_SOMENTE_CONCLUINTE : [];

  return semOrfas(REGRAS_CONDICIONAIS_AVALIACAO, dados, gate);
}
