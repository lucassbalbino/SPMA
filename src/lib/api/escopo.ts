// Escopo de LEITURA por perfil, resolvido num lugar só.
//
// O mesmo `switch (usuario.tipo)` de 15 linhas estava copiado em 7 arquivos
// (as rotas de listagem de verbas, pré-cursos, pós-cursos e avaliações, mais
// as três telas de listagem equivalentes), cada cópia repetindo as duas
// regras que importam:
//
//   - AM/GT/VT têm alcance nacional (AD-012) e PODEM filtrar por Ofertante;
//   - GO/VO são presos ao próprio escopo e o filtro do cliente é IGNORADO,
//     nunca respeitado (`resolverEscopoOfertante`, T6/UGO-14).
//
// A segunda é uma regra de segurança: uma cópia que esquecesse de sobrepor o
// filtro do cliente vazaria dados de outro Ofertante. Com 7 cópias isso era
// uma questão de tempo, e nenhum teste unitário podia cobrir a regra em si -
// só o efeito dela em cada rota.
//
// Esta função devolve a DECISÃO, não a cláusula `where`: cada tabela endereça
// o Ofertante por um caminho diferente (`cdOfertante` direto no PreCurso/Verba,
// `preCurso.cdOfertante` no PosCurso, `curso.cdOfertante` na AvaliacaoAluno).
// Unificar o `where` acoplaria os quatro models; unificar a decisão não.
import type { TipoUsuario } from "../../generated/prisma/enums";
import { resolverEscopoOfertante } from "../auth/permissoes";

export type EscopoLeitura =
  /** Alcance nacional sem filtro: lista tudo. */
  | { tipo: "todos" }
  /** Preso a um Ofertante - por filtro informado (AM/GT/VT) ou por vínculo (GO/VO). */
  | { tipo: "ofertante"; cdOfertante: string }
  /** AL lê pela própria identidade, não por Ofertante (AD-012). */
  | { tipo: "proprioAluno"; cpf: string };

type UsuarioEscopo = {
  tipo: TipoUsuario;
  documento: string;
  cdOfertante: string | null;
};

/**
 * `cdOfertanteFiltro` é o `?cdOfertante=` da query - uma SUGESTÃO, honrada só
 * para quem tem alcance nacional. Para GO/VO o próprio vínculo prevalece
 * sempre.
 *
 * Um GO/VO sem escopo resolvido devolve `cdOfertante: ""`, que nunca casa com
 * um documento real: falha fechado (lista vazia), nunca aberto.
 */
export function escopoDeLeitura(
  usuario: UsuarioEscopo,
  cdOfertanteFiltro?: string | null,
): EscopoLeitura {
  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      return cdOfertanteFiltro
        ? { tipo: "ofertante", cdOfertante: cdOfertanteFiltro }
        : { tipo: "todos" };
    case "GO":
    case "VO":
      return { tipo: "ofertante", cdOfertante: resolverEscopoOfertante(usuario) ?? "" };
    case "AL":
      return { tipo: "proprioAluno", cpf: usuario.documento };
  }
}

/**
 * Cláusula `where` para os models cujo Ofertante está num caminho qualquer -
 * `(cd) => ({ cdOfertante: cd })` no PreCurso/Verba,
 * `(cd) => ({ preCurso: { cdOfertante: cd } })` no PosCurso.
 *
 * `semEscopoDeOfertante` é o que a tabela devolve para um AL, que não tem
 * escopo por Ofertante nenhum: as telas passam um filtro impossível (lista
 * vazia) e as rotas lançam 403 - comportamentos diferentes de propósito, cada
 * um decidido pelo chamador, não aqui.
 */
export function whereDeEscopo<W>(
  escopo: EscopoLeitura,
  porOfertante: (cdOfertante: string) => W,
  semEscopoDeOfertante: () => W,
): W | Record<string, never> {
  if (escopo.tipo === "todos") {
    return {};
  }

  if (escopo.tipo === "ofertante") {
    return porOfertante(escopo.cdOfertante);
  }

  return semEscopoDeOfertante();
}
