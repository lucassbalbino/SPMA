// /pos-cursos (REQ-PO-12, tela).
//
// Listagem escopada por Ofertante: mesma regra de GET /api/pos-cursos,
// consultada direto via Prisma (Server Component só precisa da sessão via
// requireSession, sem passar por fetch interno - ver design.md). O
// Ofertante é do curso (`TB_Curso`, AD-052) - o filtro vai pela relação. O escopo em si vem de `escopoDeLeitura`, a mesma função que a
// rota usa. Antes de o pré-curso ser encerrado o pós-curso continua listado,
// como "Aguardando Cadastro de Formação" (AD-050).
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import { prisma } from "@/lib/db/prisma";
import { nomeDaFormacao } from "@/lib/cursos/nome";
import { posCursoLiberado } from "@/lib/pos-curso/liberacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PosCursosPage() {
  const { usuario } = await requireSession();

  const posCursos = await prisma.posCurso.findMany({
    where: whereDeEscopo(
      escopoDeLeitura(usuario),
      (cdOfertante) => ({ curso: { cdOfertante } }),
      // AL não tem escopo por Ofertante (AD-012) - lista vazia, não 403.
      () => ({ curso: { cdOfertante: "" } }),
    ),
    // O nome da formação é a P8 do pré (RU-11).
    include: { curso: { select: { preCurso: { select: { status: true, p8: true } } } } },
    orderBy: { cdCurso: "asc" },
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Avaliação de Formação</CardTitle>
      </CardHeader>
      <CardContent>
        {posCursos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p>
        ) : (
          <ul data-testid="lista-pos-cursos" className="flex flex-col gap-2">
            {posCursos.map((posCurso) => (
              <li key={posCurso.cdCurso}>
                <Link
                  href={`/pos-cursos/${posCurso.cdCurso}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <span>{nomeDaFormacao(posCurso.curso.preCurso?.p8, posCurso.cdCurso)}</span>
                  <span data-testid={`status-pos-curso-${posCurso.cdCurso}`}>
                    {posCurso.status === "ENCERRADO"
                      ? "Encerrado"
                      : posCursoLiberado(posCurso.curso.preCurso)
                        ? "Em andamento"
                        : "Aguardando Cadastro de Formação"}
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
