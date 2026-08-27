// Decide, em dois níveis, se uma AvaliacaoAluno pode avançar/encerrar.
//
// `respostasAvaliacaoSchema` (avaliacao.schema.ts) só valida FORMA - todas as
// 44 chaves são `.optional()` lá. A obrigatoriedade condicional vive
// inteiramente aqui, como funções puras, sem `.superRefine` encadeado no
// schema base: o Zod pula o callback de `superRefine` quando o schema base
// já tem qualquer issue, o que faria pendências condicionais nunca
// aparecerem enquanto o formulário ainda está pouco preenchido - lição
// registrada em `.specs/LESSONS.md` a partir do que aconteceu em
// `formulario-pre-curso`.
import { respostasAvaliacaoSchema } from "../validation/schemas/avaliacao.schema";

// As 17 chaves de Parte 1 sempre-obrigatórias (as 19 chaves da Parte 1 menos
// os 2 condicionais, checados à parte por `pendenciasCondicionaisParte1`).
const parte1SchemaBase = respostasAvaliacaoSchema.pick({
  avalPessoalEstado: true,
  avalPessoalMunicipio: true,
  avalPessoalGenero: true,
  avalPessoalFaixaEtaria: true,
  avalPessoalEscolaridade: true,
  avalPessoalRacaEtnia: true,
  avalPessoalCondicaoPcd: true,
  avalProfissCondicaoTrabalho: true,
  avalProfissAtuaTurismo: true,
  avalProfissFaixaRenda: true,
  avalExperienciaTrabalhoPrevio: true,
  avalExperienciaCursoAnterior: true,
  avalMotivMotivosParticipacao: true,
  avalMotivFormaConhecimento: true,
  avalExpectAtendimento: true,
  avalExpectEmprego: true,
  avalExpectRenda: true,
}).required();

// Seção 6.3 (Campos Condicionais): revelados só quando o campo condicionante
// é "Sim".
function pendenciasCondicionaisParte1(dados: Record<string, unknown>): string[] {
  const pendentes: string[] = [];

  if (dados.avalProfissAtuaTurismo === "Sim" && !dados.avalProfissAtividadeEspecifica) {
    pendentes.push("avalProfissAtividadeEspecifica");
  }

  if (
    dados.avalExperienciaCursoAnterior === "Sim" &&
    !dados.avalExperienciaTipoCursoAnterior
  ) {
    pendentes.push("avalExperienciaTipoCursoAnterior");
  }

  return pendentes;
}

// As 22 chaves de Parte 2 exigidas só quando avalParticipConcluiuCurso="Sim"
// (AVAL-13, seção 6.3: "libera toda a Parte 2 de avaliação").
const parte2SchemaQuandoConcluiu = respostasAvaliacaoSchema.pick({
  avalParticipPercentualFrequencia: true,
  avalCursoDinamicasInclusao: true,
  avalCursoMaterialDidatico: true,
  avalCursoConteudo: true,
  avalCursoClareza: true,
  avalCursoConhecimentoInstrutores: true,
  avalCursoOrganizacao: true,
  avalCursoInfraestruturaBasica: true,
  avalCursoInfraestruturaSalaAula: true,
  avalAprendizAmpliacaoConhecimento: true,
  avalAprendizAtendimentoExpectativas: true,
  avalAprendizSensacaoPreparo: true,
  avalContinuidadeRetomadaEstudos: true,
  avalMotivacoesPosPercepcoes: true,
  avalOportunSituacaoTrabalho: true,
  avalOportunIntencaoAtuarTurismo: true,
  avalEfetivEmprego: true,
  avalEfetivAumentoRenda: true,
  avalEfetivMelhoriaPadraoVida: true,
  avalGeralNota: true,
  avalGeralMelhoriasComunidade: true,
  avalGeralRecomendaCurso: true,
}).required();

const parte2SchemaQuandoNaoConcluiu = respostasAvaliacaoSchema
  .pick({ avalParticipMotivoNaoConclusao: true })
  .required();

export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

function dados(respostas: unknown): Record<string, unknown> {
  return typeof respostas === "object" && respostas !== null
    ? (respostas as Record<string, unknown>)
    : {};
}

function issuesParaPendentes(resultado: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  if (resultado.success) {
    return [];
  }

  return resultado.error!.issues.map((issue) => issue.path.join("."));
}

// AD-023/RN-13: gate Parte 1 → Parte 2. Recomputado a cada PATCH (AVAL-08).
export function validarCompletudeParte1(respostas: unknown): ResultadoCompletude {
  const pendentesBase = issuesParaPendentes(parte1SchemaBase.safeParse(respostas));
  const pendentes = [
    ...new Set([...pendentesBase, ...pendenciasCondicionaisParte1(dados(respostas))]),
  ];

  return { completo: pendentes.length === 0, pendentes };
}

// AVAL-12/13: gate interno "Concluiu o curso?" - só avaliado no encerramento.
export function validarCompletudeParte2(respostas: unknown): ResultadoCompletude {
  const concluiuCurso = dados(respostas).avalParticipConcluiuCurso;

  if (concluiuCurso !== "Sim" && concluiuCurso !== "Não") {
    return { completo: false, pendentes: ["avalParticipConcluiuCurso"] };
  }

  if (concluiuCurso === "Não") {
    const pendentes = issuesParaPendentes(
      parte2SchemaQuandoNaoConcluiu.safeParse(respostas),
    );
    return { completo: pendentes.length === 0, pendentes };
  }

  const pendentes = issuesParaPendentes(parte2SchemaQuandoConcluiu.safeParse(respostas));
  return { completo: pendentes.length === 0, pendentes };
}

// Usada só no encerramento (AVAL-15/16) - une as pendências de Parte 1 e
// Parte 2. Em uso normal a Parte 1 já está completa antes de a Parte 2 ser
// alcançável (AVAL-10), mas o encerramento reavalia as duas de forma
// independente, sem assumir esse histórico.
export function validarCompletudeAvaliacao(respostas: unknown): ResultadoCompletude {
  const parte1 = validarCompletudeParte1(respostas);
  const parte2 = validarCompletudeParte2(respostas);
  const pendentes = [...new Set([...parte1.pendentes, ...parte2.pendentes])];

  return { completo: pendentes.length === 0, pendentes };
}
