// As 9 regras condicionais do questionário de pré-curso (REQ-PC-07: Q21.1,
// REQ-PC-08: Q25.1/25.2/25.3, REQ-PC-09: os 5 campos "Qual?/Quais?").
//
// Fonte única das condições: `completude.ts` (exigência no encerramento),
// `PreCursoForm.tsx` (visibilidade na tela) e a limpeza de órfãs do
// encerramento leem daqui - nenhuma reescreve a condição.
import {
  CARACTERISTICAS_OUTRO,
  DIVULGACAO_OUTROS_CANAIS,
  DOCENTE_OUTRO_SISTEMA_SELETIVO,
  INFRA_ESPECIFICA_NECESSARIA,
  SUPORTE_OUTROS,
  type RespostasPreCursoParcial,
} from "../validation/schemas/pre-curso.schema";
import {
  condicaoDe,
  pendenciasDasRegras,
  semOrfas,
  type RegraCondicional,
} from "../validation/condicionais";

// Q21.1 do questionário fonte: as duas opções de Q21 que envolvem um
// terceiro na execução exigem o nome dele.
export const INSTITUICOES_QUE_EXIGEM_NOME: readonly string[] = [
  "Empresa contratada",
  "Parceria entre Entidade Responsável e Entidade Executora",
];

export const REGRAS_CONDICIONAIS_PRE_CURSO: readonly RegraCondicional<RespostasPreCursoParcial>[] =
  [
    // REQ-PC-07 (Q21.1)
    {
      chave: "publicoInstituicaoExecutoraNome",
      dependeDe: ["publicoInstituicaoExecutora"],
      exigidaQuando: (dados) =>
        INSTITUICOES_QUE_EXIGEM_NOME.includes(dados.publicoInstituicaoExecutora ?? ""),
    },

    // REQ-PC-08 (Q25.1/25.2/25.3, reveladas por Q25)
    {
      chave: "infraEspecificaDisponibilidade",
      dependeDe: ["infraEspecificaNecessidade"],
      exigidaQuando: (dados) =>
        dados.infraEspecificaNecessidade === INFRA_ESPECIFICA_NECESSARIA,
    },
    {
      chave: "infraEspecificaSuficiencia",
      dependeDe: ["infraEspecificaNecessidade"],
      exigidaQuando: (dados) =>
        dados.infraEspecificaNecessidade === INFRA_ESPECIFICA_NECESSARIA,
    },
    {
      chave: "infraEspecificaManutencao",
      dependeDe: ["infraEspecificaNecessidade"],
      exigidaQuando: (dados) =>
        dados.infraEspecificaNecessidade === INFRA_ESPECIFICA_NECESSARIA,
    },

    // REQ-PC-09 - os 5 campos "Qual?/Quais?" (Q9, Q10.k, Q27.c, Q30.i, Q32.i)
    {
      chave: "qualifVinculoProgramaQual",
      dependeDe: ["qualifVinculoPrograma"],
      exigidaQuando: (dados) => dados.qualifVinculoPrograma === "Sim",
    },
    {
      chave: "qualifCaracteristicasOutra",
      dependeDe: ["qualifCaracteristicas"],
      exigidaQuando: (dados) =>
        (dados.qualifCaracteristicas ?? []).includes(CARACTERISTICAS_OUTRO),
    },
    {
      chave: "docenteFormaContratacaoOutra",
      dependeDe: ["docenteFormaContratacao"],
      exigidaQuando: (dados) =>
        dados.docenteFormaContratacao === DOCENTE_OUTRO_SISTEMA_SELETIVO,
    },
    {
      chave: "divulgacaoEstrategiasOutra",
      dependeDe: ["divulgacaoEstrategias"],
      exigidaQuando: (dados) =>
        (dados.divulgacaoEstrategias ?? []).includes(DIVULGACAO_OUTROS_CANAIS),
    },
    {
      chave: "suporteEstrategiasOutra",
      dependeDe: ["suporteEstrategias"],
      exigidaQuando: (dados) => (dados.suporteEstrategias ?? []).includes(SUPORTE_OUTROS),
    },
  ];

export type ChaveCondicionalPreCurso =
  (typeof REGRAS_CONDICIONAIS_PRE_CURSO)[number]["chave"];

// Condição de uma regra, para a UI usar como `visivelSe`.
export function condicaoPreCurso(chave: ChaveCondicionalPreCurso) {
  return condicaoDe(REGRAS_CONDICIONAIS_PRE_CURSO, chave);
}

export function pendenciasCondicionaisPreCurso(respostas: unknown): string[] {
  return pendenciasDasRegras(
    REGRAS_CONDICIONAIS_PRE_CURSO,
    (respostas ?? {}) as RespostasPreCursoParcial,
  );
}

// Descarta respostas de perguntas que a resposta-mãe tornou inaplicáveis
// (ex.: Q9="Não" com Q9.Qual preenchido de uma escolha anterior). Chamada no
// ENCERRAMENTO, não no PATCH: durante o preenchimento o Gestor pode ir e
// voltar entre as alternativas, e apagar a cada gravação perderia o que ele
// tinha escrito antes de decidir.
export function normalizarCondicionaisPreCurso(respostas: unknown): RespostasPreCursoParcial {
  return semOrfas(
    REGRAS_CONDICIONAIS_PRE_CURSO,
    (respostas ?? {}) as RespostasPreCursoParcial,
  );
}
