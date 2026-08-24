// Limite de tentativas de login por conta (REQ-AU-11 / AD-028).
//
// 5 falhas consecutivas de senha para o mesmo CPF bloqueiam a conta por 15
// minutos. Um login bem-sucedido zera o contador. O limite por IP
// (REQ-SEC-03) é escopo da feature `seguranca-transversal` e não entra aqui.
import { prisma } from "../db/prisma";

export const MAX_TENTATIVAS = 5;
export const BLOQUEIO_MS = 15 * 60 * 1000;

/**
 * Conta bloqueada é a que tem `bloqueadoAte` no futuro. Função pura: recebe o
 * usuário já carregado para não custar uma consulta extra em quem já o leu.
 */
export function estaBloqueado(usuario: { bloqueadoAte: Date | null }): boolean {
  return usuario.bloqueadoAte !== null && usuario.bloqueadoAte.getTime() > Date.now();
}

/**
 * Registra uma falha de senha. Ao atingir MAX_TENTATIVAS, aplica o bloqueio.
 * CPF inexistente é no-op: quem chama responde erro genérico de qualquer
 * forma (REQ-AU-04) e não deve quebrar por isso.
 */
export async function registrarFalha(cpf: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { cpf },
    select: { tentativasFalhas: true },
  });

  if (!usuario) {
    return;
  }

  const tentativas = usuario.tentativasFalhas + 1;

  await prisma.usuario.update({
    where: { cpf },
    data: {
      tentativasFalhas: tentativas,
      ...(tentativas >= MAX_TENTATIVAS
        ? { bloqueadoAte: new Date(Date.now() + BLOQUEIO_MS) }
        : {}),
    },
  });
}

/** Login bem-sucedido: zera contador e libera a conta (REQ-AU-11). */
export async function resetarTentativas(cpf: string): Promise<void> {
  await prisma.usuario.updateMany({
    where: { cpf },
    data: { tentativasFalhas: 0, bloqueadoAte: null },
  });
}
