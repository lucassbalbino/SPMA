// O corpo compartilhado das três rotas de encerramento (pré-curso, pós-curso,
// avaliação do aluno).
//
// As três faziam, em sequência e palavra por palavra, os mesmos 6 passos:
//
//   1. ler as respostas atuais;
//   2. normalizar as condicionais que a resposta-mãe tornou inaplicáveis;
//   3. validar completude e devolver 400 + `pendentes` se faltar algo;
//   4. descobrir quais chaves sobraram órfãs depois da normalização;
//   5. numa transação: apagar as órfãs (RESP-08/AD-038) e gravar
//      ENCERRADO + `dataEncerramento`;
//   6. responder com o registro atualizado e as respostas na forma da API.
//
// O passo 4 é o que justifica centralizar: `Object.keys(atuais).filter(
// (c) => !(c in respostas))` estava escrito à mão três vezes, e é ele que
// decide o que é APAGADO de forma irreversível. Uma quarta cópia, num
// formulário futuro, é a oportunidade óbvia de errar esse filtro.
//
// O que varia entre os três fica nos parâmetros: o alvo, a normalização, a
// validação de completude e o `update` do registro-pai (cada um tem chave
// primária diferente - `cdCurso` nos cursos, `cpf_cdCurso` composto na
// avaliação).
import { prisma } from "../db/prisma";
import { erroHttp } from "../api/erro-http";
import {
  apagarRespostas,
  lerRespostas,
  respostasOuNulo,
  ISOLAMENTO_RESPOSTAS,
  type AlvoRespostas,
  type ClienteRespostas,
  type Respostas,
} from "./repositorio";

/** O que todo `validarCompletude*` do projeto devolve. */
export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

/** Os dois campos que o encerramento grava, iguais nos três formulários. */
type DadosEncerramento = { status: "ENCERRADO"; dataEncerramento: Date };

export interface OpcoesEncerramento<R> {
  alvo: AlvoRespostas;
  /** Descarta as respostas que a própria resposta-mãe tornou inaplicáveis. */
  normalizar: (respostas: Respostas) => Respostas;
  validarCompletude: (respostas: Respostas) => ResultadoCompletude;
  /** `update` do registro-pai, dentro da MESMA transação que apaga as órfãs. */
  encerrarRegistro: (tx: ClienteRespostas, data: DadosEncerramento) => Promise<R>;
}

/**
 * Valida, normaliza e encerra. Lança `ErroHttp` 400 com a lista de
 * `pendentes` quando o formulário ainda não está completo - antes de abrir
 * transação nenhuma, então um encerramento recusado não apaga nada.
 */
export async function encerrarFormulario<R>({
  alvo,
  normalizar,
  validarCompletude,
  encerrarRegistro,
}: OpcoesEncerramento<R>): Promise<{ registro: R; respostas: Respostas | null }> {
  const respostasAtuais = await lerRespostas(prisma, alvo);
  const respostas = normalizar(respostasAtuais);
  const { completo, pendentes } = validarCompletude(respostas);

  if (!completo) {
    throw erroHttp(400, "Existem campos obrigatórios pendentes", { pendentes });
  }

  // RESP-08/AD-038: as órfãs somem como linhas, na mesma transação que grava
  // ENCERRADO - nunca num passo separado que pudesse falhar sozinho.
  const orfas = Object.keys(respostasAtuais).filter((chave) => !(chave in respostas));

  const registro = await prisma.$transaction(async (tx) => {
    if (orfas.length > 0) {
      await apagarRespostas(tx, alvo, orfas);
    }

    return encerrarRegistro(tx, { status: "ENCERRADO", dataEncerramento: new Date() });
  }, ISOLAMENTO_RESPOSTAS);

  return { registro, respostas: respostasOuNulo(respostas) };
}
