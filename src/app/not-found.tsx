// 404 próprio (REQ-SEC-16). Existe por causa do CSP: o not-found padrão do
// Next é prerenderizado no build, e um HTML estático não tem como carregar o
// nonce gerado por requisição em `src/proxy.ts` - os scripts saíam sem
// atributo e o navegador bloqueava tudo, deixando a página 404 quebrada no
// console. `connection()` força a renderização dinâmica, como em
// `(public)/login/page.tsx`.
import { connection } from "next/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NaoEncontrado() {
  await connection();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            O endereço acessado não existe ou foi removido.
          </p>
          <Button render={<Link href="/painel">Voltar ao início</Link>} />
        </CardContent>
      </Card>
    </main>
  );
}
