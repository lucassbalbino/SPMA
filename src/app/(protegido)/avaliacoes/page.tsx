// /avaliacoes (AVAL-22, tela).
//
// Listagem escopada: AM/GT/VT veem todas, GO/VO só as do próprio Ofertante
// (via o PreCurso vinculado - AvaliacaoAluno não tem CD_Ofertante próprio),
// Aluno só a(s) própria(s) (via o próprio CPF).
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AvaliacoesPage() {
  const { usuario } = await requireSession();

  let where: { curso?: { cdOfertante?: number }; cpf?: string } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = {};
      break;
    case "GO":
    case "VO":
      where = { curso: { cdOfertante: usuario.cdOfertante ?? -1 } };
      break;
    case "AL":
      where = { cpf: usuario.cpf };
      break;
  }

  const avaliacoes = await prisma.avaliacaoAluno.findMany({
    where,
    orderBy: [{ cdCurso: "asc" }, { cpf: "asc" }],
  });

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Avaliações do Aluno</CardTitle>
          {usuario.tipo === "GO" && (
            <Button render={<Link href="/avaliacoes/novo">Matricular aluno</Link>} />
          )}
        </CardHeader>
        <CardContent>
          {avaliacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação cadastrada.</p>
          ) : (
            <ul data-testid="lista-avaliacoes" className="flex flex-col gap-2">
              {avaliacoes.map((avaliacao) => (
                <li key={`${avaliacao.cpf}-${avaliacao.cdCurso}`}>
                  <Link
                    href={`/avaliacoes/${avaliacao.cpf}/${avaliacao.cdCurso}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span>
                      Avaliação #{avaliacao.cdCurso} - CPF {avaliacao.cpf}
                    </span>
                    <span data-testid={`status-avaliacao-${avaliacao.cpf}-${avaliacao.cdCurso}`}>
                      {avaliacao.status === "ENCERRADO" ? "Encerrado" : "Em andamento"}
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
