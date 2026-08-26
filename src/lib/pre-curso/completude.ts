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

// `.superRefine` sobre o schema "cheio" (não-partial): os 47 campos sempre
// obrigatórios já são checados pelo próprio `respostasPreCursoSchema`; aqui
// só entram as 9 chaves condicionais (REQ-PC-07: 1, REQ-PC-08: 3, REQ-PC-09:
// 5) que o schema base deixa opcionais por padrão.
const respostasCompletasSchema = respostasPreCursoSchema.superRefine(
  (dados, ctx) => {
    // REQ-PC-07 (CA-04 do documento fonte)
    if (
      INSTITUICOES_QUE_EXIGEM_NOME.has(dados.publicoInstituicaoExecutora) &&
      !dados.publicoInstituicaoExecutoraNome
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["publicoInstituicaoExecutoraNome"],
        message:
          "Obrigatório quando a instituição executora é Empresa contratada ou Parceria",
      });
    }

    // REQ-PC-08
    if (dados.infraEspecificaNecessidade === "Sim") {
      if (!dados.infraEspecificaDisponibilidade) {
        ctx.addIssue({
          code: "custom",
          path: ["infraEspecificaDisponibilidade"],
          message: "Obrigatório quando há necessidade de equipamentos específicos",
        });
      }
      if (!dados.infraEspecificaSuficiencia) {
        ctx.addIssue({
          code: "custom",
          path: ["infraEspecificaSuficiencia"],
          message: "Obrigatório quando há necessidade de equipamentos específicos",
        });
      }
      if (!dados.infraEspecificaManutencao) {
        ctx.addIssue({
          code: "custom",
          path: ["infraEspecificaManutencao"],
          message: "Obrigatório quando há necessidade de equipamentos específicos",
        });
      }
    }

    // REQ-PC-09 - os 5 campos "Outro/Outra" do Dicionário de Campos.
    if (dados.qualifVinculoPrograma === "Outro" && !dados.qualifVinculoProgramaOutro) {
      ctx.addIssue({
        code: "custom",
        path: ["qualifVinculoProgramaOutro"],
        message: "Obrigatório quando o vínculo a programa é Outro",
      });
    }
    if (
      dados.qualifCaracteristicas.includes("Outra") &&
      !dados.qualifCaracteristicasOutra
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["qualifCaracteristicasOutra"],
        message: "Obrigatório quando as características incluem Outra",
      });
    }
    if (
      dados.docenteFormaContratacao === "Outra" &&
      !dados.docenteFormaContratacaoOutra
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["docenteFormaContratacaoOutra"],
        message: "Obrigatório quando a forma de contratação é Outra",
      });
    }
    if (
      dados.divulgacaoEstrategias.includes("Outra") &&
      !dados.divulgacaoEstrategiasOutra
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["divulgacaoEstrategiasOutra"],
        message: "Obrigatório quando as estratégias de divulgação incluem Outra",
      });
    }
    if (dados.suporteEstrategias.includes("Outra") && !dados.suporteEstrategiasOutra) {
      ctx.addIssue({
        code: "custom",
        path: ["suporteEstrategiasOutra"],
        message: "Obrigatório quando as estratégias de suporte incluem Outra",
      });
    }
  },
);

export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

export function validarCompletudePreCurso(respostas: unknown): ResultadoCompletude {
  const resultado = respostasCompletasSchema.safeParse(respostas);

  if (resultado.success) {
    return { completo: true, pendentes: [] };
  }

  const pendentes = [
    ...new Set(resultado.error.issues.map((issue) => issue.path.join("."))),
  ];

  return { completo: false, pendentes };
}
