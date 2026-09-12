import { TipoUsuario } from "../../generated/prisma/enums";

/**
 * Matriz de autorização de criação em cascata (REQ-AU-05/06).
 * AM cria qualquer tipo; GT cria GT/VT/GO; GO cria VO/AL; VT/VO/AL não criam ninguém.
 *
 * GO deixou de poder criar outro GO (UGO-18/AD-043): sem `model Ofertante`
 * separado, um GO É o próprio Ofertante (identificado pelo próprio CNPJ) -
 * "GO cria GO" hoje produziria dois GOs para a mesma organização, exatamente
 * o cenário que a unificação 1 GO = 1 CNPJ elimina por construção.
 */
export const TIPOS_PERMITIDOS: Record<TipoUsuario, TipoUsuario[]> = {
  AM: [
    TipoUsuario.AM,
    TipoUsuario.GT,
    TipoUsuario.VT,
    TipoUsuario.GO,
    TipoUsuario.VO,
    TipoUsuario.AL,
  ],
  GT: [TipoUsuario.GT, TipoUsuario.VT, TipoUsuario.GO],
  VT: [],
  GO: [TipoUsuario.VO, TipoUsuario.AL],
  VO: [],
  AL: [],
};

export function podeCriar(criador: TipoUsuario, alvo: TipoUsuario): boolean {
  return TIPOS_PERMITIDOS[criador].includes(alvo);
}

interface CriadorComEscopo {
  tipo: TipoUsuario;
  cdOfertante: string | null;
}

/**
 * Resolve o cdOfertante do usuário sendo criado (REQ-AU-08).
 * GO sempre cria dentro do próprio cdOfertante, ignorando qualquer valor
 * informado pelo cliente. AM/GT informam explicitamente o cdOfertante
 * quando o alvo é VO (GO deixou de poder criar GO, UGO-18). Alvos
 * AM/GT/VT/AL não têm cdOfertante.
 *
 * `criador.cdOfertante` aqui é sempre o escopo de Ofertante JÁ RESOLVIDO do
 * criador (AD-043) - para um GO isso é o próprio `documento`/CNPJ
 * (`resolverEscopoOfertante`, `guards.ts`), não o campo bruto do banco (que
 * fica null para um GO). Resolver esse valor a partir da sessão é
 * responsabilidade do chamador desta função, não desta função.
 */
export function resolverOfertante(
  criador: CriadorComEscopo,
  alvoTipo: TipoUsuario,
  cdOfertanteInformado?: string,
): string | null {
  if (alvoTipo !== TipoUsuario.GO && alvoTipo !== TipoUsuario.VO) {
    return null;
  }

  if (criador.tipo === TipoUsuario.GO) {
    return criador.cdOfertante;
  }

  return cdOfertanteInformado ?? null;
}
