// Erro genérico + id de correlação nas rotas de API (REQ-SEC-11), com log
// mascarado (REQ-SEC-12) no servidor. Envolve o `export async function
// POST(...)` cru de cada rota: `export const POST = comTratamentoDeErro(async
// (...) => {...})`. Nenhuma rota trata exceção sozinha - qualquer uma não
// prevista aqui vira 500 genérico em vez de vazar mensagem/stack ao cliente.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mascararCPF } from "../log/mask";

// CPF em formato cru (11 dígitos) ou pontuado (000.000.000-00) - o mesmo
// padrão reconhecível em qualquer texto livre de mensagem de erro/stack.
//
// UGO-12/AD-043 (correção pós-Verifier, ranked gap #4): sem os limites de
// dígito `(?<!\d)`/`(?!\d)`, este padrão casava com os primeiros 11 dígitos
// de qualquer sequência mais longa - inclusive um CNPJ de 14 dígitos (que a
// spec exige NÃO mascarar, por identificar pessoa jurídica, não física), que
// acabava parcialmente mascarado (11 primeiros dígitos viravam máscara, os 3
// últimos ficavam expostos soltos) em vez de sair intacto do log. Os limites
// garantem que só um run de dígitos com exatamente o comprimento de CPF casa.
const PADRAO_CPF = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g;

function mascararCPFsNoTexto(texto: string): string {
  return texto.replace(PADRAO_CPF, (cpfEncontrado) => mascararCPF(cpfEncontrado));
}

/**
 * Higher-order wrapper para Route Handlers. Captura qualquer exceção não
 * tratada, loga no servidor com CPF mascarado e devolve ao cliente apenas o
 * erro genérico + id de correlação - nunca a mensagem/stack original.
 */
// `any[]` é necessário aqui: a assinatura de um Route Handler varia (com ou
// sem `{ params }`), e só `any[]` deixa `H` ser inferido a partir de qualquer
// uma delas sem quebrar a variância de parâmetros de função do TypeScript.
export function comTratamentoDeErro<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  H extends (...args: any[]) => Promise<Response>,
>(handler: H): H {
  return (async (...args: Parameters<H>) => {
    try {
      return await handler(...args);
    } catch (erro) {
      const idCorrelacao = randomUUID();
      const detalhe =
        erro instanceof Error ? (erro.stack ?? erro.message) : String(erro);

      console.error(idCorrelacao, mascararCPFsNoTexto(detalhe));

      return NextResponse.json(
        {
          erro: "Erro interno. Contate o suporte informando o código.",
          idCorrelacao,
        },
        { status: 500 },
      );
    }
  }) as H;
}
