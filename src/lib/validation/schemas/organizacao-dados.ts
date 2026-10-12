// Tradução do corpo validado de `organizacaoSchema` para o `data` do Prisma.
//
// Os 6 campos organizacionais do GO são gravados por duas rotas:
// `PATCH /api/usuarios/me/organizacao` e
// `PATCH /api/usuarios/[documento]/organizacao`. Um mapeamento só, para que
// um campo novo não entre numa e seja esquecido na outra.
//
// A flag `dadosOrganizacionaisCompletos` NÃO entra aqui de propósito (AD-044):
// ela significa "o GO declarou", e só a rota `/me` pode ligá-la.
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
 * Tudo-ou-nada: `organizacaoSchema` exige os 6 no mesmo corpo (OGO-04), então
 * toda gravação substitui os 6 valores, nunca um merge parcial como o das
 * respostas de formulário.
 */
export function dadosOrganizacao(entrada: OrganizacaoInput) {
  return {
    nome: entrada.nome,
    responsavel: entrada.responsavel,
    email: entrada.email,
    telefone: entrada.telefone,
    uf: entrada.uf,
    municipio: entrada.municipio,
  };
}
