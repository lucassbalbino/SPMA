// Repositório de respostas (COL-01, COL-02, COL-11 a COL-15, COL-30).
//
// Traduz entre o objeto `{ chave: valor }` que o domínio usa - completude,
// condicionais, schemas Zod e formulários React continuam vendo exatamente
// o mesmo objeto de sempre - e as colunas `P*` do registro do formulário
// (AD-051). A tradução chave ↔ coluna e texto ↔ letra vive em `colunas.ts`.
//
// SPEC_DEVIATION: `design.md` esboça as assinaturas como
// `(tx, formulario, id)`. Aqui `formulario` e `id` viajam juntos num único
// `alvo` discriminado, porque a chave-pai da avaliação é composta e separar
// os dois parâmetros exigiria sobrecarga em cada uma das três funções sem
// nenhum ganho de expressividade.
// Reason: mesma informação, menos superfície e tipagem exata por formulário.
import { Prisma } from "../../generated/prisma/client";
import { camposDeResposta, deColunas, paraColunas, type Formulario, type Respostas } from "./colunas";

export type { Respostas };

/** Aceita tanto o client normal quanto o client de dentro de `$transaction`. */
export type ClienteRespostas = Prisma.TransactionClient;

export type AlvoRespostas =
  | { formulario: "preCurso"; cdCurso: number }
  | { formulario: "posCurso"; cdCurso: number }
  | { formulario: "avaliacao"; cpf: string; cdCurso: number }
  // Dado pessoal do Aluno (PESSOAL-07): a chave-pai é o CPF sozinho, sem
  // curso - a coleta acontece antes de existir qualquer matrícula.
  | { formulario: "dadosPessoais"; cpf: string };

/**
 * Isolamento das transações que gravam respostas.
 *
 * Herdado do formato por linhas, em que o `DELETE ... WHERE chave IN (...)`
 * do merge raso trancava a lacuna do índice único e duas gravações
 * concorrentes no mesmo registro batiam em deadlock sob REPEATABLE READ.
 * Com as respostas em colunas a gravação é um `UPDATE` pela chave primária,
 * sem lacuna para trancar; READ COMMITTED segue sem custo, porque as rotas
 * calculam o merge com um `lerRespostas` que roda FORA da transação.
 */
export const ISOLAMENTO_RESPOSTAS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

/** `select` com todas as colunas de resposta do formulário. */
function selecaoDeRespostas(formulario: Formulario): Record<string, true> {
  return Object.fromEntries(camposDeResposta(formulario).map((campo) => [campo, true]));
}

/**
 * `omit` que traz de volta as colunas de resposta, desligadas por padrão no
 * client (`src/lib/db/prisma.ts`). Usado pelas rotas de listagem, que leem o
 * registro e as respostas numa consulta só.
 */
export function incluirRespostas(formulario: Formulario): Record<string, false> {
  return Object.fromEntries(camposDeResposta(formulario).map((campo) => [campo, false]));
}

/**
 * Separa as colunas de resposta do resto do registro: o registro volta sem
 * nenhum campo `P*` (o contrato HTTP não mudou) e as respostas voltam como
 * `{ chave: valor }`.
 */
export function separarRespostas<R extends object>(
  formulario: Formulario,
  registro: R,
): { registro: R; respostas: Respostas } {
  const campos = new Set(camposDeResposta(formulario));
  const resto = Object.fromEntries(
    Object.entries(registro).filter(([campo]) => !campos.has(campo)),
  );

  return { registro: resto as R, respostas: deColunas(formulario, registro as Respostas) };
}

async function buscarColunas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
): Promise<Respostas | null> {
  const select = selecaoDeRespostas(alvo.formulario);

  if (alvo.formulario === "preCurso") {
    return tx.preCurso.findUnique({ where: { cdCurso: alvo.cdCurso }, select });
  }

  if (alvo.formulario === "posCurso") {
    return tx.posCurso.findUnique({ where: { cdCurso: alvo.cdCurso }, select });
  }

  if (alvo.formulario === "dadosPessoais") {
    return tx.dadoPessoalAluno.findUnique({ where: { cpf: alvo.cpf }, select });
  }

  return tx.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf: alvo.cpf, cdCurso: alvo.cdCurso } },
    select,
  });
}

async function gravarColunas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  data: Respostas,
): Promise<void> {
  if (alvo.formulario === "preCurso") {
    await tx.preCurso.update({ where: { cdCurso: alvo.cdCurso }, data });
    return;
  }

  if (alvo.formulario === "posCurso") {
    await tx.posCurso.update({ where: { cdCurso: alvo.cdCurso }, data });
    return;
  }

  if (alvo.formulario === "dadosPessoais") {
    // A linha do Aluno nasce na primeira gravação dos dados pessoais.
    await tx.dadoPessoalAluno.upsert({
      where: { cpf: alvo.cpf },
      create: { cpf: alvo.cpf, ...data },
      update: data,
    });
    return;
  }

  await tx.avaliacaoAluno.update({
    where: { cpf_cdCurso: { cpf: alvo.cpf, cdCurso: alvo.cdCurso } },
    data,
  });
}

// ─────────────────────────────────────────────────────────────
// API do repositório
// ─────────────────────────────────────────────────────────────

/**
 * Remonta o objeto de respostas a partir das colunas. Registro sem nenhuma
 * resposta (ou inexistente) devolve `{}`.
 */
export async function lerRespostas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
): Promise<Respostas> {
  const registro = await buscarColunas(tx, alvo);

  return registro ? deColunas(alvo.formulario, registro) : {};
}

/**
 * Forma do campo `respostas` no corpo das respostas HTTP: registro sem
 * nenhuma resposta aparece como `null`, que é exatamente o que a coluna JSON
 * devolvia antes da normalização. É o que mantém o contrato da API idêntico
 * entre os formatos de armazenamento (COL-11).
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
 * Merge raso por chave (COL-12): grava só as colunas das chaves presentes no
 * patch, num único comando - uma lista que encolhe grava `false` nas opções
 * que saíram (COL-13) e `null` limpa a pergunta (COL-14). Chamar dentro de
 * `$transaction` junto da gravação do registro-pai (COL-30).
 */
export async function gravarRespostas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  patch: Respostas,
): Promise<void> {
  const data = paraColunas(alvo.formulario, patch);

  if (Object.keys(data).length === 0) return;

  await gravarColunas(tx, alvo, data);
}

/**
 * Limpa as chaves informadas. Usado pelo encerramento para descartar a
 * resposta condicional que não se aplica (AD-038, COL-15).
 */
export async function apagarRespostas(
  tx: ClienteRespostas,
  alvo: AlvoRespostas,
  chaves: string[],
): Promise<void> {
  await gravarRespostas(tx, alvo, Object.fromEntries(chaves.map((chave) => [chave, null])));
}
