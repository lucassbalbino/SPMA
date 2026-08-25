// Proxy do Next.js 16 (runtime Node.js por padrão) - redirect leve por
// presença de cookie, só UX. NÃO é a autoridade: não consulta o banco, não
// valida a sessão. Isso vive em requireSession()/requirePrimeiroAcessoConcluido()/
// requireOfertanteVinculado() nos layouts `(protegido)` e `(onboarding)`,
// reavaliados a cada request (REQ-SEC-14, ver design.md).
//
// Por isso importa o nome do cookie de `./lib/auth/session-cookie` (módulo
// sem nenhuma dependência de Prisma), nunca de `./lib/auth/session` - esse
// último importa `lib/db/prisma.ts`, que instancia um PrismaClient no
// top-level do módulo, o que arrastaria um cliente de banco para dentro do
// proxy mesmo sem nenhuma chamada de fato.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/session-cookie";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(COOKIE_SESSAO)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/painel/:path*",
    "/usuarios/:path*",
    "/primeiro-acesso",
    "/cadastro-ofertante",
  ],
};
