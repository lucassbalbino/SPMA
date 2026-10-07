// O corpo compartilhado das rotas que GRAVAM respostas parcialmente
// (PATCH de pré-curso, pós-curso, avaliação e dados pessoais).
//
// As quatro repetiam a mesma dança de merge raso:
//
//   1. ler o estado atual (FORA da transação - ver `ISOLAMENTO_RESPOSTAS`);
//   2. mesclar o patch sobre ele para obter o estado RESULTANTE;
//   3. validar contra o RESULTANTE, não contra o corpo do PATCH (é o que faz
//      "uma data neste PATCH, a outra num anterior" ser avaliado junto);
//   4. numa transação: gravar o patch e reler o registro-pai e as respostas;
//   5. responder com o estado relido do BANCO, nunca com o mesclado em
//      memória - é isso que garante que o cliente veja o que ficou
//      persistido de fato.
//
// O passo 3 é a razão de centralizar: validar o corpo do PATCH em vez do
// estado resultante é um erro silencioso (passa nos casos fáceis, falha no
// preenchimento incremental, que é o uso normal), e estava protegido apenas
// por cada autor repetir a ordem certa. Aqui a ordem é a única possível.
import { prisma } from "../db/prisma";
import {
  gravarRespostas,
  lerRespostas,
  lerRespostasParaApi,
  ISOLAMENTO_RESPOSTAS,
  type AlvoRespostas,
  type ClienteRespostas,
  type Respostas,
} from "./repositorio";

export interface OpcoesPatch<R> {
  alvo: AlvoRespostas;
  /** Só as chaves enviadas - é o que define o merge raso (RESP-01, RESP-03). */
  patch: Respostas;
  /**
   * Validação do estado RESULTANTE. Deve lançar `ErroHttp` para recusar;
   * roda ANTES da transação, então uma recusa não grava nada - nem as chaves
   * válidas que vieram no mesmo corpo (RESP-10).
   *
   * Omitir é o caso de quem já precisou do estado mesclado por conta própria
   * (`PATCH /api/avaliacoes/...` calcula `parte1Completa` a partir dele): sem
   * esta função nenhuma leitura extra acontece aqui, então o estado atual é
   * lido uma vez só, não duas.
   */
  validarMesclado?: (mescladas: Respostas) => void;
  /** Relê/atualiza o registro-pai dentro da mesma transação do merge. */
  gravarRegistro: (tx: ClienteRespostas) => Promise<R>;
}

export async function aplicarPatchRespostas<R>({
  alvo,
  patch,
  validarMesclado,
  gravarRegistro,
}: OpcoesPatch<R>): Promise<{ registro: R; respostas: Respostas | null }> {
  if (validarMesclado) {
    const respostasAtuais = await lerRespostas(prisma, alvo);
    validarMesclado({ ...respostasAtuais, ...patch });
  }

  return prisma.$transaction(async (tx) => {
    await gravarRespostas(tx, alvo, patch);

    return {
      registro: await gravarRegistro(tx),
      respostas: await lerRespostasParaApi(tx, alvo),
    };
  }, ISOLAMENTO_RESPOSTAS);
}
