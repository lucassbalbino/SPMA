// Double-submit cookie para CSRF (REQ-SEC-15) - sem estado no servidor, sem
// tabela nova. O cookie precisa ser legível por JS (por isso NÃO httpOnly,
// ao contrário do cookie de sessão em `lib/auth/session.ts`): o cliente lê o
// valor e o ecoa de volta no header `x-csrf-token` em toda mutação: um
// atacante em outra origem consegue disparar a requisição (o navegador anexa
// o cookie automaticamente), mas não consegue ler o cookie para montar o
// header, então a requisição forjada não tem como bater com o valor
// esperado.
import { cookies } from "next/headers";
import { randomUUID, timingSafeEqual } from "node:crypto";

export const COOKIE_CSRF = "spma_csrf";

/** Gera um novo token, grava no cookie e devolve o valor gerado. */
export async function setCookieCSRF(): Promise<string> {
  const token = randomUUID();

  (await cookies()).set(COOKIE_CSRF, token, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return token;
}

/**
 * Compara o cookie da requisição atual com o header `x-csrf-token` em tempo
 * constante. `timingSafeEqual` lança se os buffers tiverem tamanhos
 * diferentes, por isso o tamanho é checado antes - nunca deixa a exceção
 * escapar como um bug em vez de um simples "não bateu".
 */
export async function verificarCSRF(request: Request): Promise<boolean> {
  const cookieToken = (await cookies()).get(COOKIE_CSRF)?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) {
    return false;
  }

  const bufCookie = Buffer.from(cookieToken);
  const bufHeader = Buffer.from(headerToken);

  if (bufCookie.length !== bufHeader.length) {
    return false;
  }

  return timingSafeEqual(bufCookie, bufHeader);
}

/** Usado no logout, junto da remoção do cookie de sessão. */
export async function limparCookieCSRF(): Promise<void> {
  (await cookies()).delete(COOKIE_CSRF);
}
