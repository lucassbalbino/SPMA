// Proxy do Next.js 16 (runtime Node.js por padrão) - nonce + CSP por
// requisição (REQ-SEC-16) + redirect leve por presença de cookie, só UX. NÃO
// é a autoridade: não consulta o banco, não valida a sessão. Isso vive em
// requireSession()/requirePrimeiroAcessoConcluido()/requireOfertanteVinculado()
// nos layouts `(protegido)` e `(onboarding)`, reavaliados a cada request
// (REQ-SEC-14, ver design.md).
//
// Por isso importa o nome do cookie de `./lib/auth/session-cookie` (módulo
// sem nenhuma dependência de Prisma), nunca de `./lib/auth/session` - esse
// último importa `lib/db/prisma.ts`, que instancia um PrismaClient no
// top-level do módulo, o que arrastaria um cliente de banco para dentro do
// proxy mesmo sem nenhuma chamada de fato.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { COOKIE_SESSAO } from "@/lib/auth/session-cookie";

// Mesmas 4 rotas que o matcher cobria antes do CSP exigir um matcher amplo
// (receita oficial do Next para nonce - ver design.md Tech Decisions). A
// checagem de cookie-presença agora é restrita por pathname aqui dentro, não
// mais pelo matcher, para o CSP/nonce poder ser aplicado a qualquer página
// (incluindo /login).
const ROTAS_PROTEGIDAS = [
  "/painel",
  "/usuarios",
  "/primeiro-acesso",
  "/cadastro-ofertante",
];

function precisaSessao(pathname: string): boolean {
  return ROTAS_PROTEGIDAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

export function proxy(request: NextRequest) {
  // Nonce por requisição + CSP (receita oficial do Next para App Router,
  // node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
  // 'unsafe-eval' só em dev: React usa eval para reconstruir stacks de erro
  // do servidor no console do navegador; não é necessário em produção.
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, " ")
    .trim();

  if (
    precisaSessao(request.nextUrl.pathname) &&
    !request.cookies.has(COOKIE_SESSAO)
  ) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set(
      "Content-Security-Policy",
      contentSecurityPolicyHeaderValue,
    );
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  );

  return response;
}

export const config = {
  matcher: [
    {
      // Todas as rotas de página, excluindo API, assets estáticos e
      // prefetches do next/link (receita oficial do Next).
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
