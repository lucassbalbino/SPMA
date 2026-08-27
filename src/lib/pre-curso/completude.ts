// Decide se um pré-curso pode ser encerrado (REQ-PC-10, CA-05/CA-11 do
// documento fonte). Única função que aplica as 3 regras condicionais
// (REQ-PC-07/08/09) além da obrigatoriedade plena dos 56 campos do
// Dicionário de Campos - a rota de encerramento (T7) não reimplementa nada
// disso, só chama `validarCompletudePreCurso`.
import { respostasPreCursoSchema } from "../validation/schemas/pre-curso.schema";

const INSTITUICOES_QUE_EXIGEM_NOME = new Set([
  "Empresa contratada",
  "Parceria entre Entidade Responsável e Entidade Executora",
]);

// As 9 chaves condicionais (REQ-PC-07: 1, REQ-PC-08: 3, REQ-PC-09: 5) - as
// outras 47 chaves sempre-obrigatórias já são checadas por
// `respostasPreCursoSchema.safeParse`. Roda contra o objeto bruto (não o
// resultado do Zod): encadear isso como `.superRefine` no schema base
// parecia mais direto, mas o Zod PULA o callback de `superRefine` quando o
// schema base já produziu qualquer issue (confirmado empiricamente) - com
// mais de 1 dos 47 campos sempre-obrigatórios ausentes ao mesmo tempo (o
// estado normal de um preenchimento incremental), as 3 regras condicionais
// nunca chegavam a rodar e ficavam fora de `pendentes`. Rodar as duas
// checagens em paralelo e unir os resultados evita essa dependência do
// comportamento interno do Zod.
function pendenciasCondicionais(respostas: unknown): string[] {
  const dados = (
    typeof respostas === "object" && respostas !== null ? respostas : {}
  ) as Record<string, unknown>;
  const pendentes: string[] = [];

  // REQ-PC-07 (CA-04 do documento fonte)
  if (
    INSTITUICOES_QUE_EXIGEM_NOME.has(dados.publicoInstituicaoExecutora as string) &&
    !dados.publicoInstituicaoExecutoraNome
  ) {
    pendentes.push("publicoInstituicaoExecutoraNome");
  }

  // REQ-PC-08
  if (dados.infraEspecificaNecessidade === "Sim") {
    if (!dados.infraEspecificaDisponibilidade) {
      pendentes.push("infraEspecificaDisponibilidade");
    }
    if (!dados.infraEspecificaSuficiencia) {
      pendentes.push("infraEspecificaSuficiencia");
    }
    if (!dados.infraEspecificaManutencao) {
      pendentes.push("infraEspecificaManutencao");
    }
  }

  // REQ-PC-09 - os 5 campos "Outro/Outra" do Dicionário de Campos.
  if (dados.qualifVinculoPrograma === "Outro" && !dados.qualifVinculoProgramaOutro) {
    pendentes.push("qualifVinculoProgramaOutro");
  }
  if (
    Array.isArray(dados.qualifCaracteristicas) &&
    dados.qualifCaracteristicas.includes("Outra") &&
    !dados.qualifCaracteristicasOutra
  ) {
    pendentes.push("qualifCaracteristicasOutra");
  }
  if (dados.docenteFormaContratacao === "Outra" && !dados.docenteFormaContratacaoOutra) {
    pendentes.push("docenteFormaContratacaoOutra");
  }
  if (
    Array.isArray(dados.divulgacaoEstrategias) &&
    dados.divulgacaoEstrategias.includes("Outra") &&
    !dados.divulgacaoEstrategiasOutra
  ) {
    pendentes.push("divulgacaoEstrategiasOutra");
  }
  if (
    Array.isArray(dados.suporteEstrategias) &&
    dados.suporteEstrategias.includes("Outra") &&
    !dados.suporteEstrategiasOutra
  ) {
    pendentes.push("suporteEstrategiasOutra");
  }

  return pendentes;
}

export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

export function validarCompletudePreCurso(respostas: unknown): ResultadoCompletude {
  const resultadoBase = respostasPreCursoSchema.safeParse(respostas);
  const pendentesBase = resultadoBase.success
    ? []
    : resultadoBase.error.issues.map((issue) => issue.path.join("."));

  const pendentes = [...new Set([...pendentesBase, ...pendenciasCondicionais(respostas)])];

  return { completo: pendentes.length === 0, pendentes };
}
