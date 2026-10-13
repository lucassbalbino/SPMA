// Leitura de usuários da gestão de usuários: o escopo de quem o editor
// enxerga e a consulta paginada da lista (design.md, "Consulta").
//
// A tela (página 1, renderizada no servidor) e a rota `POST
// /api/usuarios/consulta` chamam a mesma `consultarUsuarios`, e as mutações
// partem do mesmo `whereUsuariosVisiveis`: "quem vê" e "quem pode mexer" não
// têm como divergir.
import { Prisma } from "../../generated/prisma/client";
import type { TipoUsuario } from "../../generated/prisma/enums";
import { prisma } from "../db/prisma";
import {
  podeEditarUsuario,
  resolverEscopoOfertante,
  type UsuarioComEscopo,
} from "../auth/permissoes";
import { normalizarDocumento } from "../validation/documento";
import { TAMANHO_PAGINA, totalPaginas } from "./paginacao";

export type UsuarioListado = {
  documento: string;
  nome: string | null;
  email: string | null;
  tipo: TipoUsuario;
};

export type LinhaGestao = UsuarioListado & { editavel: boolean };

export type PaginaUsuarios = {
  usuarios: LinhaGestao[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

export type FiltroUsuarios = {
  pagina: number;
  tipo?: TipoUsuario;
  busca?: string;
};

// Só as 4 colunas da lista: nada de `senhaHash`, contadores de bloqueio ou
// dados organizacionais saindo para a tela.
const COLUNAS_LISTADAS = { documento: true, nome: true, email: true, tipo: true } as const;

/**
 * O único lugar que define "quem o editor enxerga" (GU-04/05/06).
 *
 * Não reaproveita `escopoDeLeitura`: lá o VT tem escopo nacional e o VO o do
 * próprio Ofertante, e aqui nenhum dos dois tem lista. O Aluno também entra
 * por outro caminho: pela matrícula em curso do GO, não por `cdOfertante`.
 *
 * `null` = sem acesso (VT, VO, AL). `{}` = todos (AM, GT).
 */
export function whereUsuariosVisiveis(
  editor: UsuarioComEscopo,
): Prisma.UsuarioWhereInput | null {
  switch (editor.tipo) {
    case "AM":
    case "GT":
      return {};
    case "GO": {
      // Para um GO, `resolverEscopoOfertante` é sempre o próprio CNPJ
      // (AD-043), nunca null: o tipo `string | null` vale para os 6 perfis.
      const cnpj = resolverEscopoOfertante(editor) as string;
      return {
        OR: [
          { tipo: "VO", cdOfertante: cnpj },
          { tipo: "AL", avaliacoes: { some: { curso: { cdOfertante: cnpj } } } },
        ],
      };
    }
    case "VT":
    case "VO":
    case "AL":
      return null;
  }
}

/**
 * Nome contém o texto OU documento contém os dígitos digitados (GU-11). O
 * `contains` não diferencia maiúsculas pela collation default do MySQL 8.4
 * (`utf8mb4_0900_ai_ci`), provado no teste de integração.
 */
function whereDaBusca(busca: string | undefined): Prisma.UsuarioWhereInput {
  if (!busca) {
    return {};
  }

  const digitos = normalizarDocumento(busca);

  return {
    OR: [
      { nome: { contains: busca } },
      ...(digitos ? [{ documento: { contains: digitos } }] : []),
    ],
  };
}

/**
 * Uma página da lista (GU-10/11/13/16/18). Só para editores com escopo:
 * quem chama já recusou VT/VO/AL (`whereUsuariosVisiveis === null`).
 *
 * Ordem `nome, documento`: o documento é único, então o desempate deixa as
 * páginas estáveis entre uma consulta e outra (GU-13). Uma página além da
 * última devolve `usuarios: []` com os totais reais (GU-18).
 */
export async function consultarUsuarios(
  editor: UsuarioComEscopo,
  filtro: FiltroUsuarios,
): Promise<PaginaUsuarios> {
  const escopo = whereUsuariosVisiveis(editor);

  if (escopo === null) {
    throw new Error(`consultarUsuarios chamado para um perfil sem lista (${editor.tipo})`);
  }

  const where: Prisma.UsuarioWhereInput = {
    AND: [escopo, filtro.tipo ? { tipo: filtro.tipo } : {}, whereDaBusca(filtro.busca)],
  };

  const [total, linhas] = await prisma.$transaction([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: COLUNAS_LISTADAS,
      orderBy: [{ nome: "asc" }, { documento: "asc" }],
      skip: (filtro.pagina - 1) * TAMANHO_PAGINA,
      take: TAMANHO_PAGINA,
    }),
  ]);

  return {
    usuarios: linhas.map((linha) => ({ ...linha, editavel: podeEditarUsuario(editor, linha) })),
    total,
    pagina: filtro.pagina,
    totalPaginas: totalPaginas(total),
  };
}
