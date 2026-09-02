// /login (REQ-AU-01, REQ-AU-03, REQ-AU-04).
//
// `connection()` obriga a renderização dinâmica desta rota. Sem ela o Next
// prerenderiza /login no build e o CSP por nonce (REQ-SEC-16, emitido em
// `src/proxy.ts`) quebra em produção: o nonce é gerado por requisição, mas o
// HTML estático foi gerado quando não existia requisição nenhuma, então os
// scripts do Next saem sem o atributo e o navegador os bloqueia. É a regra
// que a doc do Next enuncia em
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md:
// "To use a nonce, your page must be dynamically rendered."
//
// Em `next dev` toda rota já é dinâmica - por isso a falha só aparecia no
// ambiente publicado.
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  await connection();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
