// Decide se um pós-curso pode ser encerrado (REQ-PO-09/10). Única função
// que aplica a regra condicional (REQ-PO-07) além da obrigatoriedade plena
// dos 26 campos do Dicionário de Campos.
//
// As 25 chaves sempre-obrigatórias e a 1 condicional são checadas em
// paralelo, sem encadear a segunda como `.superRefine` no schema base: o
// Zod pula o callback de `superRefine` quando o schema base já produziu
// qualquer issue, o que faria a pendência condicional nunca aparecer
// enquanto o formulário ainda está pouco preenchido (o estado normal de um
// preenchimento incremental) - lição registrada em `.specs/LESSONS.md` a
// partir do que aconteceu em `formulario-pre-curso`.
import { respostasPosCursoSchema } from "../validation/schemas/pos-curso.schema";

// REQ-PO-07 (seção 5.2 do documento fonte).
function pendenciasCondicionais(respostas: unknown): string[] {
  const dados = (
    typeof respostas === "object" && respostas !== null ? respostas : {}
  ) as Record<string, unknown>;

  if (dados.posExecHouveAlteracaoPlanejamento === "Sim" && !dados.posExecAlteracaoDetalhe) {
    return ["posExecAlteracaoDetalhe"];
  }

  return [];
}

export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

export function validarCompletudePosCurso(respostas: unknown): ResultadoCompletude {
  const resultadoBase = respostasPosCursoSchema.safeParse(respostas);
  const pendentesBase = resultadoBase.success
    ? []
    : resultadoBase.error.issues.map((issue) => issue.path.join("."));

  const pendentes = [...new Set([...pendentesBase, ...pendenciasCondicionais(respostas)])];

  return { completo: pendentes.length === 0, pendentes };
}
