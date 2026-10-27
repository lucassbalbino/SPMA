// Mapa de colunas das respostas (COL-03 a COL-08, COL-10).
//
// Cada pergunta dos questionários é uma coluna da tabela do próprio
// formulário, com o nome do questionário em papel (`P11`, `P7a`, `P25.1`).
// O código continua falando `{ chave: valor }` com o texto das opções; este
// módulo é o único lugar que traduz entre os dois vocabulários:
//
// - escolha única grava a LETRA da opção (`'b'`), que é a posição dela na
//   lista `OPCOES_*` - a mesma ordem do papel, conferida no design;
// - múltipla escolha vira uma coluna por opção (`P20a`, `P20b`...), `true`
//   para marcada e `false` para não marcada;
// - o resto grava o próprio valor, no tipo da coluna.
//
// Uma pergunta não respondida tem todas as suas colunas em `NULL`.
import * as aval from "../validation/schemas/avaliacao.schema";
import * as pessoal from "../validation/schemas/dados-pessoais.schema";
import * as pos from "../validation/schemas/pos-curso.schema";
import * as pre from "../validation/schemas/pre-curso.schema";

export type Formulario = "preCurso" | "posCurso" | "avaliacao" | "dadosPessoais";

export type Respostas = Record<string, unknown>;

type Escalar = "sigla" | "texto" | "inteiro" | "decimal" | "nota" | "data";

export type Entrada =
  | { chave: string; tipo: "unica"; coluna: string; opcoes: readonly string[] }
  | { chave: string; tipo: "multipla"; prefixo: string; opcoes: readonly string[] }
  | { chave: string; tipo: Escalar; coluna: string };

const unica = (chave: string, coluna: string, opcoes: readonly string[]): Entrada => ({
  chave,
  tipo: "unica",
  coluna,
  opcoes,
});

const multipla = (chave: string, prefixo: string, opcoes: readonly string[]): Entrada => ({
  chave,
  tipo: "multipla",
  prefixo,
  opcoes,
});

const escalar =
  (tipo: Escalar) =>
  (chave: string, coluna: string): Entrada => ({ chave, tipo, coluna });

const sigla = escalar("sigla");
const texto = escalar("texto");
const inteiro = escalar("inteiro");
const decimal = escalar("decimal");
const data = escalar("data");

/** Quadro de notas: cada linha é uma coluna `P<n>.<linha>`, na ordem do papel. */
const quadro = (numero: number, chaves: string[]): Entrada[] =>
  chaves.map((chave, i) => escalar("nota")(chave, `P${numero}.${i + 1}`));

export const MAPA: Record<Formulario, readonly Entrada[]> = {
  preCurso: [
    sigla("identifUf", "P1"),
    texto("identifMunicipio", "P2"),
    texto("identifEntidadeResponsavel", "P3"),
    texto("identifCoordenador", "P4"),
    texto("identifEmail", "P5"),
    texto("identifTelefone", "P6"),
    texto("qualifEndereco", "P7a"),
    texto("qualifMunicipio", "P7b"),
    sigla("qualifUf", "P7c"),
    unica("qualifOutrosMunicipios", "P7d", pre.OPCOES_SIM_NAO),
    texto("qualifOutrosMunicipiosQuais", "P7e"),
    texto("qualifNomeCurso", "P8"),
    unica("qualifVinculoPrograma", "P9", pre.OPCOES_SIM_NAO),
    texto("qualifVinculoProgramaQual", "P9Qual"),
    multipla("qualifCaracteristicas", "P10", pre.OPCOES_CARACTERISTICAS),
    texto("qualifCaracteristicasOutra", "P10Qual"),
    unica("qualifModalidade", "P11", pre.OPCOES_MODALIDADE),
    unica("qualifRegiao", "P12", pre.OPCOES_REGIAO),
    data("planejDataInicioPrevista", "P13"),
    data("planejDataTerminoPrevista", "P14"),
    inteiro("planejCargaHoraria", "P15"),
    inteiro("planejNumTurmas", "P16"),
    inteiro("planejNumAlunosPrevistos", "P17a"),
    data("planejDataInicioInscricao", "P17b"),
    data("planejDataTerminoInscricao", "P17c"),
    inteiro("planejNumVagas", "P17d"),
    decimal("planejTaxaEvasaoEsperada", "P18"),
    texto("planejObjetivo", "P19"),
    multipla("publicoPerfil", "P20", pre.OPCOES_PUBLICO_PERFIL),
    unica("publicoInstituicaoExecutora", "P21", pre.OPCOES_INSTITUICAO_EXECUTORA),
    texto("publicoInstituicaoExecutoraNome", "P21.1"),
    multipla("diagnosticoConsultas", "P22", pre.OPCOES_DIAGNOSTICO_CONSULTAS),
    ...quadro(23, [
      "infraBasicaBanheiros",
      "infraBasicaBebedouros",
      "infraBasicaEnergia",
      "infraBasicaSalaAula",
      "infraBasicaRecepcao",
      "infraBasicaBiblioteca",
      "infraBasicaMobiliario",
      "infraBasicaAcessibilidade",
      "infraBasicaLaboratorio",
    ]),
    ...quadro(24, [
      "infraComplSalaProfessores",
      "infraComplSalaGestores",
      "infraComplSalaEstudo",
      "infraComplCopa",
      "infraComplLanchonete",
      "infraComplAuditorio",
      "infraComplAudiovisual",
      "infraComplTecnologicos",
    ]),
    unica("infraEspecificaNecessidade", "P25", pre.OPCOES_INFRA_ESPECIFICA_NECESSIDADE),
    unica("infraEspecificaDisponibilidade", "P25.1", pre.OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE),
    unica("infraEspecificaSuficiencia", "P25.2", pre.OPCOES_SIM_NAO),
    unica("infraEspecificaManutencao", "P25.3", pre.OPCOES_SIM_NAO),
    multipla("docenteCriteriosSelecao", "P26", pre.OPCOES_DOCENTE_CRITERIOS),
    unica("docenteFormaContratacao", "P27", pre.OPCOES_DOCENTE_FORMA_CONTRATACAO),
    texto("docenteFormaContratacaoOutra", "P27Qual"),
    unica("docenteNivelFormacao", "P28", pre.OPCOES_DOCENTE_NIVEL_FORMACAO),
    unica("docentePoliticasReparacao", "P29", pre.OPCOES_SIM_NAO),
    multipla("divulgacaoEstrategias", "P30", pre.OPCOES_DIVULGACAO_ESTRATEGIAS),
    texto("divulgacaoEstrategiasOutra", "P30Qual"),
    multipla("parceriasEstabelecidas", "P31", pre.OPCOES_PARCERIAS),
    multipla("suporteEstrategias", "P32", pre.OPCOES_SUPORTE_ESTRATEGIAS),
    texto("suporteEstrategiasOutra", "P32Qual"),
  ],
  posCurso: [
    unica("posAcompanhProblemasEstudo", "P1", pos.OPCOES_PROBLEMAS_ESTUDO),
    unica("posAcompanhConceitosTrabalhados", "P2", pos.OPCOES_CONCEITOS_TRABALHADOS),
    unica("posAcompanhPlanoAcao", "P3", pos.OPCOES_PLANO_ACAO),
    unica("posAcompanhProvaSituacao", "P4", pos.OPCOES_PROVA_SITUACAO),
    unica("posAcompanhLicaoIndividual", "P5", pos.OPCOES_LICAO_INDIVIDUAL),
    multipla("posAcompanhMonitoramento", "P6", pos.OPCOES_MONITORAMENTO),
    data("posExecDataInicioReal", "P7"),
    data("posExecDataTerminoReal", "P8"),
    inteiro("posExecCargaHorariaRealizada", "P9"),
    texto("posExecDificuldadesEnfrentadas", "P10"),
    unica("posExecHouveAlteracaoPlanejamento", "P11", pos.OPCOES_SIM_NAO),
    texto("posExecAlteracaoDetalhe", "P12"),
    inteiro("posParticNumInscritos", "P13"),
    inteiro("posParticNumMatriculados", "P14"),
    inteiro("posParticNumConcluintes", "P15"),
    multipla("posParticMotivosAbandono", "P16", pos.OPCOES_MOTIVOS_ABANDONO),
    unica("posParticDemandaMaiorQueOferta", "P17", pos.OPCOES_SIM_NAO),
    unica("posParticIntencaoNovaOferta", "P18", pos.OPCOES_SIM_NAO),
    decimal("posFinValorTotal", "P19"),
    decimal("posFinValorProfessores", "P20"),
    decimal("posFinValorMateriais", "P21"),
    decimal("posFinValorInfraestrutura", "P22"),
    decimal("posFinValorBolsaPermanencia", "P23"),
    unica("posFinHouveDevolucaoRecursos", "P24", pos.OPCOES_SIM_NAO),
    unica("posFinNecessidadeAditivo", "P25", pos.OPCOES_SIM_NAO),
    multipla("posContEstrategias", "P26", pos.OPCOES_ESTRATEGIAS_CONTINUIDADE),
  ],
  avaliacao: [
    unica("avalExperienciaTrabalhoPrevio", "P14", aval.OPCOES_SIM_NAO),
    unica("avalExperienciaCursoAnterior", "P15", aval.OPCOES_SIM_NAO),
    unica("avalExperienciaTipoCursoAnterior", "P16", aval.OPCOES_TIPO_CURSO_ANTERIOR),
    multipla("avalMotivMotivosParticipacao", "P17", aval.OPCOES_MOTIVOS_PARTICIPACAO),
    unica("avalMotivFormaConhecimento", "P18", aval.OPCOES_FORMA_CONHECIMENTO),
    unica("avalExpectAtendimento", "P19", aval.OPCOES_SIM_PARCIAL_NAO),
    unica("avalExpectEmprego", "P20", aval.OPCOES_SIM_TALVEZ_NAO),
    unica("avalExpectRenda", "P21", aval.OPCOES_EXPECTATIVA_RENDA),
    unica("avalParticipConcluiuCurso", "P22", aval.OPCOES_SIM_NAO),
    multipla("avalParticipMotivoNaoConclusao", "P22.1", aval.OPCOES_MOTIVO_NAO_CONCLUSAO),
    unica("avalParticipPercentualFrequencia", "P23", aval.OPCOES_PERCENTUAL_FREQUENCIA),
    ...quadro(24, [
      "avalCursoDinamicasInclusao",
      "avalCursoMaterialDidatico",
      "avalCursoConteudo",
      "avalCursoClareza",
      "avalCursoConhecimentoInstrutores",
      "avalCursoOrganizacao",
      "avalCursoInfraestruturaBasica",
      "avalCursoInfraestruturaSalaAula",
    ]),
    unica("avalAprendizAmpliacaoConhecimento", "P25", aval.OPCOES_AMPLIACAO_CONHECIMENTO),
    unica("avalAprendizAtendimentoExpectativas", "P26", aval.OPCOES_SIM_PARCIAL_NAO),
    unica("avalAprendizSensacaoPreparo", "P27", aval.OPCOES_SIM_PARCIAL_NAO),
    multipla("avalMotivacoesPosPercepcoes", "P29", aval.OPCOES_MOTIVACOES_POS),
    escalar("nota")("avalGeralNota", "P35"),
    texto("avalGeralMelhoriasComunidade", "P36"),
    unica("avalGeralRecomendaCurso", "P37", aval.OPCOES_SIM_NAO),
    texto("avalGeralComentariosFinais", "P38"),
  ],
  dadosPessoais: [
    sigla("avalPessoalEstado", "P3"),
    texto("avalPessoalMunicipio", "P4"),
    unica("avalPessoalGenero", "P5", pessoal.OPCOES_GENERO),
    unica("avalPessoalFaixaEtaria", "P6", pessoal.OPCOES_FAIXA_ETARIA),
    unica("avalPessoalEscolaridade", "P7", pessoal.OPCOES_ESCOLARIDADE),
    unica("avalPessoalRacaEtnia", "P8", pessoal.OPCOES_RACA_ETNIA),
    unica("avalPessoalCondicaoPcd", "P9", pessoal.OPCOES_CONDICAO_PCD),
  ],
};

/** `0` → `a`, `1` → `b`... A letra é a posição da opção na lista. */
function letra(indice: number): string {
  return String.fromCharCode(97 + indice);
}

/** Nomes das colunas no banco de uma pergunta: um para escalar, um por opção para múltipla. */
export function colunasDaEntrada(entrada: Entrada): string[] {
  if (entrada.tipo === "multipla") {
    return entrada.opcoes.map((_, i) => `${entrada.prefixo}${letra(i)}`);
  }

  return [entrada.coluna];
}

/**
 * Nome do campo no Prisma para uma coluna: o identificador não aceita ponto,
 * então `P25.1` vira `p25_1` (o `@map` do schema guarda o nome real).
 */
export function campoPrisma(coluna: string): string {
  return `p${coluna.slice(1).replaceAll(".", "_")}`;
}

/** Todos os campos Prisma de resposta do formulário, na ordem do questionário. */
export function camposDeResposta(formulario: Formulario): string[] {
  return MAPA[formulario].flatMap(colunasDaEntrada).map(campoPrisma);
}

function entradaDaChave(formulario: Formulario, chave: string): Entrada {
  const entrada = MAPA[formulario].find((e) => e.chave === chave);

  if (!entrada) {
    throw new Error(`Chave sem coluna no formulário ${formulario}: ${chave}`);
  }

  return entrada;
}

function indiceDaOpcao(entrada: Entrada & { opcoes: readonly string[] }, valor: unknown): number {
  const indice = entrada.opcoes.indexOf(String(valor));

  if (indice < 0) {
    throw new Error(`Opção desconhecida para ${entrada.chave}: ${String(valor)}`);
  }

  return indice;
}

function valorDaColuna(entrada: Entrada, valor: unknown): unknown {
  switch (entrada.tipo) {
    case "unica":
      return letra(indiceDaOpcao(entrada, valor));
    case "sigla":
    case "texto":
      return String(valor);
    case "data":
      return new Date(`${String(valor)}T00:00:00.000Z`);
    default:
      return valor;
  }
}

/**
 * Campos Prisma a gravar para as chaves do patch. `null` limpa a pergunta:
 * todas as colunas dela viram `NULL` (COL-14). Chave ou opção que o mapa não
 * conhece lança - o Zod já as recusa antes, então chegar aqui é bug.
 */
export function paraColunas(formulario: Formulario, patch: Respostas): Respostas {
  const campos: Respostas = {};

  for (const [chave, valor] of Object.entries(patch)) {
    const entrada = entradaDaChave(formulario, chave);
    const colunas = colunasDaEntrada(entrada);

    if (valor === null || valor === undefined) {
      for (const coluna of colunas) campos[campoPrisma(coluna)] = null;
      continue;
    }

    if (entrada.tipo === "multipla") {
      const marcadas = new Set((valor as unknown[]).map((item) => indiceDaOpcao(entrada, item)));
      colunas.forEach((coluna, i) => {
        campos[campoPrisma(coluna)] = marcadas.has(i);
      });
      continue;
    }

    campos[campoPrisma(entrada.coluna)] = valorDaColuna(entrada, valor);
  }

  return campos;
}

function lerColuna(entrada: Entrada, valor: unknown): unknown {
  switch (entrada.tipo) {
    case "unica": {
      // Letra fora da lista (coluna gravada à mão, por exemplo) volta crua
      // em vez de sumir: a completude acusa a pergunta como inválida.
      const opcao = entrada.opcoes[String(valor).charCodeAt(0) - 97];
      return opcao ?? valor;
    }
    case "decimal":
      return Number(valor);
    case "data":
      return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
    default:
      return valor;
  }
}

/**
 * Remonta `{ chave: valor }` a partir do registro do formulário. Pergunta
 * com todas as colunas `NULL` não aparece no objeto. A múltipla escolha
 * volta na ordem do questionário, não na ordem em que foi marcada.
 */
export function deColunas(formulario: Formulario, registro: Respostas): Respostas {
  const respostas: Respostas = {};

  for (const entrada of MAPA[formulario]) {
    const valores = colunasDaEntrada(entrada).map((coluna) => registro[campoPrisma(coluna)]);

    if (valores.every((valor) => valor === null || valor === undefined)) continue;

    if (entrada.tipo === "multipla") {
      respostas[entrada.chave] = entrada.opcoes.filter((_, i) => valores[i] === true);
      continue;
    }

    respostas[entrada.chave] = lerColuna(entrada, valores[0]);
  }

  return respostas;
}
