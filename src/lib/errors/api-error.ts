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
const PADRAO_CPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;

function mascararCPFsNoTexto(texto: string): string {
  return texto.replace(PADRAO_CPF, (cpfEncontrado) => mascararCPF(cpfEncontrado));
}

/**
 * Higher-order wrapper para Route Handlers. Captura qualquer exceção não
 * tratada, loga no servidor com CPF mascarado e devolve ao cliente apenas o
 * erro genérico + id de correlação - nunca a mensagem/stack original.
 */
export function comTratamentoDeErro<
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
