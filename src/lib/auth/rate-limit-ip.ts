// Limite de tentativas de login por IP de origem (REQ-SEC-03), independente
// do CPF. Mesma mecânica de `rate-limit.ts`, mas a linha em
// `TB_Tentativa_Login_Ip` não existe de antemão (ao contrário de `Usuario`,
// que já existe antes de qualquer tentativa) - por isso `registrarFalhaIp`
// faz upsert em vez de update-only.
import { prisma } from "../db/prisma";
import { BLOQUEIO_MS } from "./rate-limit";

export const MAX_TENTATIVAS_IP = 20;

/**
 * Extrai o IP do cliente do header `x-forwarded-for` (primeiro IP da lista,
 * em cadeias de proxy). Sem o header, degrada para um bucket único
 * `"desconhecido"` em vez de quebrar o login (ver design.md Riscos).
 */
export function obterIpCliente(request: Request): string {
  const header = request.headers.get("x-forwarded-for");

  if (!header) {
    return "desconhecido";
  }

  return header.split(",")[0].trim();
}

/** IP bloqueado é o que tem `bloqueadoAte` no futuro. */
export async function ipEstaBloqueado(ip: string): Promise<boolean> {
  const registro = await prisma.tentativaLoginIp.findUnique({
    where: { ip },
    select: { bloqueadoAte: true },
  });

  return (
    registro?.bloqueadoAte !== null &&
    registro?.bloqueadoAte !== undefined &&
    registro.bloqueadoAte.getTime() > Date.now()
  );
}

/**
 * Registra uma falha de login vinda desse IP. Ao atingir
 * MAX_TENTATIVAS_IP, aplica o bloqueio (mesmo BLOQUEIO_MS do limite por CPF).
 */
export async function registrarFalhaIp(ip: string): Promise<void> {
  const registro = await prisma.tentativaLoginIp.upsert({
    where: { ip },
    create: { ip, tentativas: 1 },
    update: { tentativas: { increment: 1 } },
    select: { tentativas: true },
  });

  if (registro.tentativas >= MAX_TENTATIVAS_IP) {
    await prisma.tentativaLoginIp.update({
      where: { ip },
      data: { bloqueadoAte: new Date(Date.now() + BLOQUEIO_MS) },
    });
  }
}
