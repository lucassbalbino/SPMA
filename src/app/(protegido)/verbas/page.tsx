// /verbas - tela de verbas (gestao-de-verbas, AD-046).
//
// A verba deixou de nascer junto do GO: é aqui que AM/GT a criam, para
// qualquer GO, quantas forem precisas (1 GO : N verbas). GO e VO veem as do
// próprio escopo, só para leitura. VT e AL não leem verba (`podeLerVerba`).
//
// Server Component: a lista sai de `listarVerbasDoEscopo`, a mesma consulta
// de GET /api/verbas, então a tela e a API não divergem no escopo nem no
// saldo. Esconder ou mostrar partes da tela é conveniência: as rotas
// reavaliam a permissão a cada request (AD-033).
import { podeLerVerba, requireSession } from "@/lib/auth/guards";
import { listarVerbasDoEscopo } from "@/lib/verba/consulta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListaVerbas } from "./ListaVerbas";

export default async function VerbasPage() {
  const { usuario } = await requireSession();

  if (!podeLerVerba(usuario.tipo)) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verbas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Seu perfil não tem acesso a verbas.</p>
        </CardContent>
      </Card>
    );
  }

  const verbas = await listarVerbasDoEscopo(usuario);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verbas</CardTitle>
      </CardHeader>
      <CardContent>
        <ListaVerbas
          verbas={verbas.map((verba) => ({
            cdVerba: verba.cdVerba,
            cdOfertante: verba.cdOfertante,
            nomeOfertante: verba.nomeOfertante,
            vlVerba: verba.vlVerba.toNumber(),
            saldoDisponivel: verba.saldoDisponivel.toNumber(),
            // `DT_Verba` é DATE: meia-noite UTC, então o recorte ISO é o dia.
            dtVerba: verba.dtVerba ? verba.dtVerba.toISOString().slice(0, 10) : null,
          }))}
        />
      </CardContent>
    </Card>
  );
}
