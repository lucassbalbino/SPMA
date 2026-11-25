// Quem vê qual painel do Power BI, com qual role e como qual identidade
// (dashboard-powerbi, AD-056).
//
// É a fonte única da autorização do dashboard: a rota `GET /api/powerbi/embed`
// recusa com 403 quem não tem painel ou identidade aqui, e o menu
// (`lib/ui/navegacao.ts`) acompanha esta tabela por teste. Esconder o módulo
// no menu continua sendo só conveniência (AD-033).
//
// Módulo puro: sem Prisma e sem `next/*`, como `permissoes.ts`.
import type { TipoUsuario } from "../../generated/prisma/enums";
import { resolverEscopoOfertante } from "../auth/permissoes";

export type Painel = "nacional" | "ofertante";

/** AM/GT/VT têm alcance nacional; GO/VO, o do Ofertante (AD-012). O AL não tem dashboard. */
export const PAINEL_POR_PERFIL: Record<TipoUsuario, Painel | null> = {
  AM: "nacional",
  GT: "nacional",
  VT: "nacional",
  GO: "ofertante",
  VO: "ofertante",
  AL: null,
};

/**
 * Role de RLS do modelo semântico, por painel. Hoje os dois usam a role
 * única validada pelo cliente; se ele criar roles por painel, muda aqui.
 * Fica no código, não no `.env`: é igual em todos os ambientes.
 */
export const ROLE_POR_PAINEL: Record<Painel, string> = {
  nacional: "segurança_SPMA",
  ofertante: "segurança_SPMA",
};

export function painelDoPerfil(tipo: TipoUsuario): Painel | null {
  return PAINEL_POR_PERFIL[tipo];
}

/**
 * O `username` enviado ao `GenerateToken`, que o RLS lê com `USERNAME()`.
 *
 * GO manda o próprio CNPJ e VO manda o CNPJ do GO vinculado
 * (`resolverEscopoOfertante`): assim o VO vê o mesmo recorte do GO, seja
 * qual for a role. AM/GT/VT mandam o próprio documento. `null` = sem
 * acesso (AL, ou VO sem GO).
 */
export function identidadePowerBi(usuario: {
  tipo: TipoUsuario;
  documento: string;
  cdOfertante: string | null;
}): string | null {
  if (!painelDoPerfil(usuario.tipo)) {
    return null;
  }

  if (usuario.tipo === "GO" || usuario.tipo === "VO") {
    return resolverEscopoOfertante(usuario);
  }

  return usuario.documento;
}
