// Tradução do corpo validado de `organizacaoSchema` para o `data` do Prisma.
//
// Os 6 campos organizacionais do GO eram mapeados à mão, com o mesmo
// `?? null` em cada opcional, em três lugares: `PATCH /api/usuarios/me/
// organizacao`, `PATCH /api/usuarios/[documento]/organizacao` e
// `POST /api/usuarios`. Três cópias de um mapeamento campo-a-campo é onde um
// campo novo entra em dois lugares e é esquecido no terceiro.
import type { OrganizacaoInput } from "./organizacao.schema";

/** Os 6 campos organizacionais, nunca `senhaHash` nem contadores de rate-limit. */
export const CAMPOS_ORGANIZACAO = {
  documento: true,
  nome: true,
  responsavel: true,
  email: true,
  telefone: true,
  uf: true,
  municipio: true,
} as const;

/**
 * `?? null` em todo opcional, de propósito: um campo ausente no corpo LIMPA o
 * valor anterior, em vez de preservá-lo. É o contrato tudo-ou-nada que o
 * `organizacaoSchema` impõe (ele exige `nome`/`uf` no mesmo corpo), não um
 * merge parcial como o das respostas de formulário.
 */
export function dadosOrganizacao(entrada: OrganizacaoInput) {
  return {
    nome: entrada.nome,
    responsavel: entrada.responsavel ?? null,
    email: entrada.email ?? null,
    telefone: entrada.telefone ?? null,
    uf: entrada.uf,
    municipio: entrada.municipio ?? null,
  };
}
