import { TipoUsuario } from "../../generated/prisma/enums";

/**
 * Matriz de autorização de criação em cascata (REQ-AU-05/06).
 * AM cria qualquer tipo; GT cria GT/VT/GO; GO cria GO/VO/AL; VT/VO/AL não criam ninguém.
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
  GO: [TipoUsuario.GO, TipoUsuario.VO, TipoUsuario.AL],
  VO: [],
  AL: [],
};

export function podeCriar(criador: TipoUsuario, alvo: TipoUsuario): boolean {
  return TIPOS_PERMITIDOS[criador].includes(alvo);
}

interface CriadorComEscopo {
  tipo: TipoUsuario;
  cdOfertante: number | null;
}

/**
 * Resolve o cdOfertante do usuário sendo criado (REQ-AU-08).
 * GO sempre cria dentro do próprio cdOfertante, ignorando qualquer valor
 * informado pelo cliente. AM/GT informam explicitamente o cdOfertante
 * quando o alvo é GO/VO. Alvos AM/GT/VT/AL não têm cdOfertante.
 */
export function resolverOfertante(
  criador: CriadorComEscopo,
  alvoTipo: TipoUsuario,
  cdOfertanteInformado?: number,
): number | null {
  if (alvoTipo !== TipoUsuario.GO && alvoTipo !== TipoUsuario.VO) {
    return null;
  }

  if (criador.tipo === TipoUsuario.GO) {
    return criador.cdOfertante;
  }

  return cdOfertanteInformado ?? null;
}
