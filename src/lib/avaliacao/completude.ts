// Decide, em dois níveis, se uma AvaliacaoAluno pode avançar/encerrar.
//
// `respostasAvaliacaoSchema` (avaliacao.schema.ts) só valida FORMA - todas as
// 45 chaves são `.optional()` lá. A obrigatoriedade condicional vive
// inteiramente aqui, como funções puras, sem `.superRefine` encadeado no
// schema base: o Zod pula o callback de `superRefine` quando o schema base
// já tem qualquer issue, o que faria pendências condicionais nunca
// aparecerem enquanto o formulário ainda está pouco preenchido - lição
// registrada em `.specs/LESSONS.md` a partir do que aconteceu em
// `formulario-pre-curso`.
//
// As condições em si (Q12, Q16, Q22.1, Q30.j e o gate de Q22) ficam em
// `condicionais.ts`, compartilhadas com a tela e com a limpeza de órfãs do
// encerramento.
import { respostasAvaliacaoSchema } from "../validation/schemas/avaliacao.schema";
import {
  pendenciasCondicionaisParte1,
  pendenciasCondicionaisParte2,
} from "./condicionais";

// As 17 chaves de Parte 1 sempre-obrigatórias (as 19 chaves da Parte 1 menos
// os 2 condicionais, checados à parte pelas regras de `condicionais.ts`).
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

// Q22 e Q23 são do bloco "Participação", que todo aluno responde - o gate
// "Concluiu o curso?" só começa a valer em Q24, cujo cabeçalho no papel diz
// "Avaliação do curso (apenas para quem concluiu)".
const parte2SchemaSempre = respostasAvaliacaoSchema
  .pick({
    avalParticipConcluiuCurso: true,
    avalParticipPercentualFrequencia: true,
  })
  .required();

// As 21 chaves de Q24 a Q37, exigidas só quando
// avalParticipConcluiuCurso="Sim" (AVAL-13). Q38
// (`avalGeralComentariosFinais`) fica de fora: é comentário livre opcional.
const parte2SchemaQuandoConcluiu = respostasAvaliacaoSchema.pick({
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
    ...new Set([...pendentesBase, ...pendenciasCondicionaisParte1(respostas)]),
  ];

  return { completo: pendentes.length === 0, pendentes };
}

// AVAL-12/13: gate interno "Concluiu o curso?" - só avaliado no encerramento.
// As duas condicionais da Parte 2 (Q22.1, exigida quando o aluno NÃO
// concluiu; Q30.j, exigida quando Q30="Outra") vêm da mesma tabela de regras
// nos dois ramos - cada uma se aplica só no ramo em que sua condição vale.
export function validarCompletudeParte2(respostas: unknown): ResultadoCompletude {
  const brutos = dados(respostas);
  const concluiuCurso = brutos.avalParticipConcluiuCurso;

  const pendentesSempre = issuesParaPendentes(parte2SchemaSempre.safeParse(respostas));

  if (concluiuCurso !== "Sim" && concluiuCurso !== "Não") {
    return {
      completo: false,
      pendentes: [...new Set(["avalParticipConcluiuCurso", ...pendentesSempre])],
    };
  }

  if (concluiuCurso === "Não") {
    const pendentes = [
      ...new Set([...pendentesSempre, ...pendenciasCondicionaisParte2(respostas)]),
    ];
    return { completo: pendentes.length === 0, pendentes };
  }

  const pendentes = [
    ...new Set([
      ...pendentesSempre,
      ...issuesParaPendentes(parte2SchemaQuandoConcluiu.safeParse(respostas)),
      ...pendenciasCondicionaisParte2(respostas),
    ]),
  ];

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
