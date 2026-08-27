// /pre-cursos/novo (REQ-PC-01/02/03, tela).
//
// Server Component: carrega as Verbas do Ofertante do GO autenticado e o
// saldo disponível de cada uma (reuso de calcularSaldoVerba, já usada em
// POST /api/pre-cursos) para popular o seletor. A interatividade do
// formulário vive em `NovoPreCursoForm` (client component colocado) - o
// servidor reavalia tudo de novo em POST /api/pre-cursos (AD-033), esta
// tela só evita que o GO escolha algo fora do próprio escopo.
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { calcularSaldoVerba } from "@/lib/verba/saldo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoPreCursoForm } from "./NovoPreCursoForm";

export default async function NovoPreCursoPage() {
  const { usuario } = await requireSession();

  if (usuario.tipo !== "GO" || usuario.cdOfertante === null) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Novo pré-curso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seu perfil não pode criar pré-cursos.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const verbas = await prisma.verba.findMany({
    where: { cdOfertante: usuario.cdOfertante },
    orderBy: { cdVerba: "asc" },
  });

  const opcoesVerba = await Promise.all(
    verbas.map(async (verba) => {
      const { saldoDisponivel } = await calcularSaldoVerba(verba.cdVerba);
      return { cdVerba: verba.cdVerba, saldoDisponivel: saldoDisponivel.toNumber() };
    }),
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo pré-curso</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoPreCursoForm opcoesVerba={opcoesVerba} />
        </CardContent>
      </Card>
    </main>
  );
}
