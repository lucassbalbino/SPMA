// /relatorios - Visualização de Relatórios (dashboard-powerbi, AD-056).
//
// O relatório do Power BI do cliente, embutido com o RLS aplicado pela
// identidade da sessão. Quem pode ver sai do catálogo
// (`lib/powerbi/catalogo.ts`), o mesmo que a rota `GET /api/powerbi/embed`
// usa para recusar com 403: esconder a tela aqui é conveniência, a rota é a
// autoridade (AD-033).
//
// Sem tela de referência no design system: título e relatório dentro do
// <main> da casca, com os tokens `spma-*` que já existem.
import { requireSession } from "@/lib/auth/guards";
import { painelDoPerfil } from "@/lib/powerbi/catalogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PainelPowerBi } from "./PainelPowerBi";

export default async function RelatoriosPage() {
  const { usuario } = await requireSession();

  if (!painelDoPerfil(usuario.tipo)) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Seu perfil não tem acesso a relatórios.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="relatorios-titulo" className="flex flex-col gap-4">
      <h1 id="relatorios-titulo" className="text-spma-heading-lg text-spma-ink-900">
        Visualização de Relatórios
      </h1>
      <PainelPowerBi />
    </section>
  );
}
