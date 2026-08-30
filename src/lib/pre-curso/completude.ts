// Decide se um pré-curso pode ser encerrado (REQ-PC-10, CA-05/CA-11 do
// documento fonte). Única função que aplica as 3 regras condicionais
// (REQ-PC-07/08/09) além da obrigatoriedade plena dos 56 campos do
// questionário fonte (`docs/Questionario_do_Gestor_Pre_Curso.md`) - a rota
// de encerramento (T7) não reimplementa nada disso, só chama
// `validarCompletudePreCurso`.
//
// As 9 chaves condicionais (REQ-PC-07: 1, REQ-PC-08: 3, REQ-PC-09: 5) vêm de
// `condicionais.ts`, que também alimenta a visibilidade na tela e a limpeza
// de órfãs do encerramento - as outras 47 chaves sempre-obrigatórias já são
// checadas por `respostasPreCursoSchema.safeParse`. As duas checagens rodam
// em PARALELO, sem encadear a condicional como `.superRefine` no schema
// base: o Zod PULA o callback de `superRefine` quando o schema base já
// produziu qualquer issue (confirmado empiricamente) - com mais de 1 dos 47
// campos sempre-obrigatórios ausentes ao mesmo tempo (o estado normal de um
// preenchimento incremental), as 3 regras condicionais nunca chegavam a
// rodar e ficavam fora de `pendentes`.
import { respostasPreCursoSchema } from "../validation/schemas/pre-curso.schema";
import { pendenciasCondicionaisPreCurso } from "./condicionais";

export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

export function validarCompletudePreCurso(respostas: unknown): ResultadoCompletude {
  const resultadoBase = respostasPreCursoSchema.safeParse(respostas);
  const pendentesBase = resultadoBase.success
    ? []
    : resultadoBase.error.issues.map((issue) => issue.path.join("."));

  const pendentes = [
    ...new Set([...pendentesBase, ...pendenciasCondicionaisPreCurso(respostas)]),
  ];

  return { completo: pendentes.length === 0, pendentes };
}
