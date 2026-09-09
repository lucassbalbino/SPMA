// /pre-cursos/novo (REQ-PC-01/02/03, tela).
//
// Server Component: carrega as Verbas elegíveis e o saldo disponível de cada
// uma (reuso de calcularSaldoVerba, já usada em POST /api/pre-cursos) para
// popular o seletor. A interatividade do formulário vive em
// `NovoPreCursoForm` (client component colocado) - o servidor reavalia tudo
// de novo em POST /api/pre-cursos (AD-033), esta tela só evita escolher algo
// fora do escopo.
//
// AD-040: além do GO (só as Verbas do próprio Ofertante), o AM também cria
// curso, para qualquer Ofertante (autoridade nacional, AD-012) - por isso a
// lista inclui o nome do Ofertante quando o criador é AM.
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { calcularSaldoVerba } from "@/lib/verba/saldo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoPreCursoForm } from "./NovoPreCursoForm";

export default async function NovoPreCursoPage() {
  const { usuario } = await requireSession();

  if (usuario.tipo !== "AM" && (usuario.tipo !== "GO" || usuario.cdOfertante === null)) {
    return (
      <>
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
      </>
    );
  }

  const verbas = await prisma.verba.findMany({
    where: usuario.tipo === "AM" ? {} : { cdOfertante: usuario.cdOfertante! },
    orderBy: { cdVerba: "asc" },
    include: { ofertante: { select: { nome: true } } },
  });

  const opcoesVerba = await Promise.all(
    verbas.map(async (verba) => {
      const { saldoDisponivel } = await calcularSaldoVerba(verba.cdVerba);
      return {
        cdVerba: verba.cdVerba,
        saldoDisponivel: saldoDisponivel.toNumber(),
        nomeOfertante: usuario.tipo === "AM" ? verba.ofertante.nome : undefined,
      };
    }),
  );

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo pré-curso</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoPreCursoForm opcoesVerba={opcoesVerba} />
        </CardContent>
      </Card>
    </>
  );
}
