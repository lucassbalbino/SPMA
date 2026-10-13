// Regras puras da paginação e dos chips de tipo da gestão de usuários.
// Sem Prisma, para a tela (cliente) e o serviço (servidor) importarem o
// mesmo número.
import { TipoUsuario } from "../../generated/prisma/enums";

/**
 * Tamanho fixo da página (GU-13). Fixo no servidor de propósito: um tamanho
 * escolhido pelo cliente permitiria pedir a base inteira de uma vez.
 */
export const TAMANHO_PAGINA = 20;

/**
 * `max(1, ceil(total / 20))` (GU-16). Uma lista vazia ainda tem a página 1,
 * para a tela mostrar "Página 1 de 1" em vez de "Página 1 de 0".
 */
export function totalPaginas(total: number): number {
  return Math.max(1, Math.ceil(total / TAMANHO_PAGINA));
}

/**
 * Tipos com chip próprio acima da lista (GU-09): AM e GT enxergam os seis,
 * o GO só os que entram no escopo dele (VO e AL, GU-05), e VT/VO/AL não têm
 * lista (GU-06).
 */
export function tiposVisiveis(tipo: TipoUsuario): TipoUsuario[] {
  switch (tipo) {
    case "AM":
    case "GT":
      return Object.values(TipoUsuario);
    case "GO":
      return [TipoUsuario.VO, TipoUsuario.AL];
    case "VT":
    case "VO":
    case "AL":
      return [];
  }
}
