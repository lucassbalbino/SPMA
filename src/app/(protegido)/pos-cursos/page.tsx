// /pos-cursos (REQ-PO-12, tela).
//
// Listagem escopada por Ofertante: mesma regra de GET /api/pos-cursos,
// consultada direto via Prisma (Server Component só precisa da sessão via
// requireSession, sem passar por fetch interno - ver design.md). PosCurso
// não tem CD_Ofertante próprio - o filtro é aplicado via o PreCurso pai
// (relação).
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PosCursosPage() {
  const { usuario } = await requireSession();

  let where: { preCurso?: { cdOfertante?: number } } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = {};
      break;
    case "GO":
    case "VO":
      where = { preCurso: { cdOfertante: usuario.cdOfertante ?? -1 } };
      break;
    case "AL":
      where = { preCurso: { cdOfertante: -1 } };
      break;
  }

  const posCursos = await prisma.posCurso.findMany({
    where,
    orderBy: { cdCurso: "asc" },
  });

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pós-cursos</CardTitle>
          {usuario.tipo === "GO" && (
            <Button render={<Link href="/pos-cursos/novo">Novo pós-curso</Link>} />
          )}
        </CardHeader>
        <CardContent>
          {posCursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pós-curso cadastrado.</p>
          ) : (
            <ul data-testid="lista-pos-cursos" className="flex flex-col gap-2">
              {posCursos.map((posCurso) => (
                <li key={posCurso.cdCurso}>
                  <Link
                    href={`/pos-cursos/${posCurso.cdCurso}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span>Pós-curso #{posCurso.cdCurso}</span>
                    <span data-testid={`status-pos-curso-${posCurso.cdCurso}`}>
                      {posCurso.status === "ENCERRADO" ? "Encerrado" : "Em andamento"}
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
