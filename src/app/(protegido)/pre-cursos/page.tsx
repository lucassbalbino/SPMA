// /pre-cursos (REQ-PC-14, tela).
//
// Listagem escopada por Ofertante: mesma regra de GET /api/pre-cursos,
// consultada direto via Prisma (Server Component só precisa da sessão via
// requireSession, sem passar por fetch interno - ver design.md). O escopo em
// si vem de `escopoDeLeitura`, a mesma função que a rota usa.
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PreCursosPage() {
  const { usuario } = await requireSession();

  const preCursos = await prisma.preCurso.findMany({
    where: whereDeEscopo(
      escopoDeLeitura(usuario),
      (cdOfertante) => ({ cdOfertante }),
      // AL não tem escopo por Ofertante (AD-012); "" nunca casa com um
      // documento real, então a lista sai vazia em vez de 403 - numa TELA,
      // diferente da rota, uma lista vazia é a resposta útil.
      () => ({ cdOfertante: "" }),
    ),
    orderBy: { cdCurso: "asc" },
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Pré-cursos</CardTitle>
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
  );
}
