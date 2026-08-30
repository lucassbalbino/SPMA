// A única regra condicional do questionário de pós-curso (REQ-PO-07): Q12
// ("Se sim, por qual motivo? Qual alteração foi necessária?") só existe
// quando Q11 = "Sim".
//
// Fonte única da condição: `completude.ts` (exigência no encerramento),
// `PosCursoForm.tsx` (visibilidade na tela) e a limpeza de órfãs do
// encerramento leem daqui.
import type { RespostasPosCursoParcial } from "../validation/schemas/pos-curso.schema";
import {
  condicaoDe,
  pendenciasDasRegras,
  semOrfas,
  type RegraCondicional,
} from "../validation/condicionais";

export const REGRAS_CONDICIONAIS_POS_CURSO: readonly RegraCondicional<RespostasPosCursoParcial>[] =
  [
    {
      chave: "posExecAlteracaoDetalhe",
      dependeDe: ["posExecHouveAlteracaoPlanejamento"],
      exigidaQuando: (dados) => dados.posExecHouveAlteracaoPlanejamento === "Sim",
    },
  ];

export type ChaveCondicionalPosCurso =
  (typeof REGRAS_CONDICIONAIS_POS_CURSO)[number]["chave"];

export function condicaoPosCurso(chave: ChaveCondicionalPosCurso) {
  return condicaoDe(REGRAS_CONDICIONAIS_POS_CURSO, chave);
}

export function pendenciasCondicionaisPosCurso(respostas: unknown): string[] {
  return pendenciasDasRegras(
    REGRAS_CONDICIONAIS_POS_CURSO,
    (respostas ?? {}) as RespostasPosCursoParcial,
  );
}

// Descarta o detalhe da alteração quando Q11 acabou em "Não" (ver a nota
// equivalente em `src/lib/pre-curso/condicionais.ts`): chamada no
// ENCERRAMENTO, não no PATCH.
export function normalizarCondicionaisPosCurso(respostas: unknown): RespostasPosCursoParcial {
  return semOrfas(
    REGRAS_CONDICIONAIS_POS_CURSO,
    (respostas ?? {}) as RespostasPosCursoParcial,
  );
}
