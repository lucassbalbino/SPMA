// Repositório de respostas (RESP-01, RESP-03, RESP-04, RESP-19, RESP-21).
//
// Traduz entre o objeto `{ chave: valor }` que o domínio usa - completude,
// condicionais, schemas Zod e formulários React continuam vendo exatamente
// o mesmo objeto de sempre - e as linhas que o banco guarda.
//
// SPEC_DEVIATION: `design.md` esboça as assinaturas como
// `(tx, formulario, id)`. Aqui `formulario` e `id` viajam juntos num único
// `alvo` discriminado, porque a chave-pai da avaliação é composta e separar
// os dois parâmetros exigiria sobrecarga em cada uma das três funções sem
// nenhum ganho de expressividade.
// Reason: mesma informação, menos superfície e tipagem exata por formulário.
import { Prisma } from "../../generated/prisma/client";
import { respostasAvaliacaoSchema } from "../validation/schemas/avaliacao.schema";
import { respostasPosCursoSchema } from "../validation/schemas/pos-curso.schema";
import { respostasPreCursoSchema } from "../validation/schemas/pre-curso.schema";
import { classificarChave, desserializar, serializar } from "./forma";

/** Aceita tanto o client normal quanto o client de dentro de `$transaction`. */
export type ClienteRespostas = Prisma.TransactionClient;

export type AlvoRespostas =
  | { formulario: "preCurso"; cdCurso: number }
  | { formulario: "posCurso"; cdCurso: number }
  | { formulario: "avaliacao"; cpf: string; cdCurso: number };

export type Respostas = Record<string, unknown>;

const SCHEMAS = {
  preCurso: respostasPreCursoSchema,
  posCurso: respostasPosCursoSchema,
  avaliacao: respostasAvaliacaoSchema,
} as const;

type LinhaResposta = { chave: string; ordem: number; valor: string };

/** Filtro das linhas de um único registro de formulário. */
function filtroDoPai(alvo: AlvoRespostas) {
  return alvo.formulario === "avaliacao"
    ? { cpf: alvo.cpf, cdCurso: alvo.cdCurso }
    : { cdCurso: alvo.cdCurso };
}

async function buscarLinhas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
): Promise<LinhaResposta[]> {
  const orderBy = [{ chave: "asc" }, { ordem: "asc" }] as const;

  if (alvo.formulario === "preCurso") {
    return tx.respostaPreCurso.findMany({
      where: { cdCurso: alvo.cdCurso },
      orderBy: [...orderBy],
    });
  }

  if (alvo.formulario === "posCurso") {
    return tx.respostaPosCurso.findMany({
      where: { cdCurso: alvo.cdCurso },
      orderBy: [...orderBy],
    });
  }

  return tx.respostaAvaliacao.findMany({
    where: { cpf: alvo.cpf, cdCurso: alvo.cdCurso },
    orderBy: [...orderBy],
  });
}

async function apagarLinhas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  chaves: string[],
): Promise<void> {
  if (chaves.length === 0) return;

  if (alvo.formulario === "preCurso") {
    await tx.respostaPreCurso.deleteMany({
      where: { cdCurso: alvo.cdCurso, chave: { in: chaves } },
    });
    return;
  }

  if (alvo.formulario === "posCurso") {
    await tx.respostaPosCurso.deleteMany({
      where: { cdCurso: alvo.cdCurso, chave: { in: chaves } },
    });
    return;
  }

  await tx.respostaAvaliacao.deleteMany({
    where: { cpf: alvo.cpf, cdCurso: alvo.cdCurso, chave: { in: chaves } },
  });
}

async function inserirLinhas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  linhas: LinhaResposta[],
): Promise<void> {
  if (linhas.length === 0) return;

  const pai = filtroDoPai(alvo);
  const dados = linhas.map((linha) => ({ ...pai, ...linha }));

  if (alvo.formulario === "preCurso") {
    await tx.respostaPreCurso.createMany({
      data: dados as Prisma.RespostaPreCursoCreateManyInput[],
    });
    return;
  }

  if (alvo.formulario === "posCurso") {
    await tx.respostaPosCurso.createMany({
      data: dados as Prisma.RespostaPosCursoCreateManyInput[],
    });
    return;
  }

  await tx.respostaAvaliacao.createMany({
    data: dados as Prisma.RespostaAvaliacaoCreateManyInput[],
  });
}

// ─────────────────────────────────────────────────────────────
// API do repositório
// ─────────────────────────────────────────────────────────────

/**
 * Remonta o objeto de respostas a partir de linhas já carregadas. Separado de
 * `lerRespostas` porque as rotas de listagem trazem as linhas junto do
 * registro-pai (`include: { linhasResposta }`), numa consulta só, em vez de
 * uma ida ao banco por item da lista.
 */
export function montarRespostas(
  formulario: AlvoRespostas["formulario"],
  linhas: LinhaResposta[],
): Respostas {
  const itensPorChave = new Map<string, string[]>();

  for (const linha of linhas) {
    const itens = itensPorChave.get(linha.chave);
    if (itens) {
      itens.push(linha.valor);
    } else {
      itensPorChave.set(linha.chave, [linha.valor]);
    }
  }

  const schema = SCHEMAS[formulario];
  const respostas: Respostas = {};

  for (const [chave, itens] of itensPorChave) {
    respostas[chave] = desserializar(itens, classificarChave(schema, chave));
  }

  return respostas;
}

/**
 * Remonta o objeto de respostas a partir das linhas. Registro sem nenhuma
 * linha devolve `{}` (RESP-16). O tipo de cada valor vem da forma do schema
 * Zod; chave que o schema atual não conhece volta como texto (RESP-14).
 */
export async function lerRespostas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
): Promise<Respostas> {
  return montarRespostas(alvo.formulario, await buscarLinhas(tx, alvo));
}

/**
 * Forma do campo `respostas` no corpo das respostas HTTP: registro sem
 * nenhuma linha aparece como `null`, que é exatamente o que a coluna JSON
 * devolvia antes de ser dropada. É o que mantém o contrato da API idêntico
 * ao de antes da normalização (RESP-07 a RESP-12) - as três features que
 * dependem dele não mudaram nenhuma asserção.
 */
export function respostasOuNulo(respostas: Respostas): Respostas | null {
  return Object.keys(respostas).length === 0 ? null : respostas;
}

/** Açúcar para o caso mais comum nas rotas: ler do banco já na forma da API. */
export async function lerRespostasParaApi(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
): Promise<Respostas | null> {
  return respostasOuNulo(await lerRespostas(tx, alvo));
}

/**
 * Merge raso por chave (RESP-03): apaga as linhas das chaves presentes no
 * patch e insere as novas. É isso que faz uma lista que encolhe perder as
 * opções que saíram (RESP-04) e uma regravação idêntica manter uma linha só
 * (RESP-19). Chamar dentro de `$transaction` para que nada fique
 * meio-gravado (RESP-21).
 */
export async function gravarRespostas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  patch: Respostas,
): Promise<void> {
  const chaves = Object.keys(patch);

  if (chaves.length === 0) return;

  const linhas: LinhaResposta[] = [];

  for (const chave of chaves) {
    const valor = patch[chave];
    if (valor === undefined || valor === null) continue;

    serializar(valor).forEach((item, ordem) => {
      linhas.push({ chave, ordem, valor: item });
    });
  }

  await apagarLinhas(tx, alvo, chaves);
  await inserirLinhas(tx, alvo, linhas);
}

/**
 * Remove as chaves informadas. Usado pelo encerramento para descartar a
 * resposta condicional que não se aplica (AD-038, RESP-08).
 */
export async function apagarRespostas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  chaves: string[],
): Promise<void> {
  if (chaves.length === 0) return;

  await apagarLinhas(tx, alvo, chaves);
}
