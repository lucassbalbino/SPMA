// /pre-cursos (REQ-PC-14, tela).
//
// Listagem escopada por Ofertante: mesma regra de GET /api/pre-cursos,
// consultada direto via Prisma (Server Component só precisa da sessão via
// requireSession, sem passar por fetch interno - ver design.md).
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PreCursosPage() {
  const { usuario } = await requireSession();

  let where: { cdOfertante?: number } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = {};
      break;
    case "GO":
    case "VO":
      where = { cdOfertante: usuario.cdOfertante ?? -1 };
      break;
    case "AL":
      where = { cdOfertante: -1 };
      break;
  }

  const preCursos = await prisma.preCurso.findMany({
    where,
    orderBy: { cdCurso: "asc" },
  });

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pré-cursos</CardTitle>
          {usuario.tipo === "GO" && (
            <Button render={<Link href="/pre-cursos/novo">Novo pré-curso</Link>} />
          )}
        </CardHeader>
        <CardContent>
          {preCursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pré-curso cadastrado.</p>
          ) : (
            <ul data-testid="lista-pre-cursos" className="flex flex-col gap-2">
              {preCursos.map((preCurso) => (
                <li key={preCurso.cdCurso}>
                  <Link
                    href={`/pre-cursos/${preCurso.cdCurso}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span>Pré-curso #{preCurso.cdCurso}</span>
                    <span data-testid={`status-pre-curso-${preCurso.cdCurso}`}>
                      {preCurso.status === "ENCERRADO" ? "Encerrado" : "Em andamento"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
