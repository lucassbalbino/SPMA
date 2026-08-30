// /pos-cursos/novo (REQ-PO-01/02/03, tela).
//
// Server Component: carrega os Pré-Cursos do próprio Ofertante do GO que
// ainda não têm Pós-Curso (`posCurso: null`, back-relation já existente no
// schema - design.md) para popular o seletor. O servidor reavalia tudo de
// novo em POST /api/pos-cursos (AD-033), esta tela só evita que o GO
// escolha algo fora do próprio escopo ou já usado.
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoPosCursoForm } from "./NovoPosCursoForm";

export default async function NovoPosCursoPage() {
  const { usuario } = await requireSession();

  if (usuario.tipo !== "GO" || usuario.cdOfertante === null) {
    return (
      <>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Novo pós-curso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seu perfil não pode criar pós-cursos.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const preCursosElegiveis = await prisma.preCurso.findMany({
    where: { cdOfertante: usuario.cdOfertante, posCurso: null },
    orderBy: { cdCurso: "asc" },
    select: { cdCurso: true },
  });

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo pós-curso</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoPosCursoForm cdCursosElegiveis={preCursosElegiveis.map((p) => p.cdCurso)} />
        </CardContent>
      </Card>
    </>
  );
}
