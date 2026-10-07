// /avaliacoes (AVAL-22, tela).
//
// Listagem escopada: AM/GT/VT veem todas, GO/VO só as do próprio Ofertante
// (via o PreCurso vinculado - AvaliacaoAluno não tem CD_Ofertante próprio),
// Aluno só a(s) própria(s) (via o próprio CPF). O escopo vem de
// `escopoDeLeitura`, a mesma função que GET /api/avaliacoes usa.
import Link from "next/link";
import { podeCriarCursoOuMatricular, requireSession } from "@/lib/auth/guards";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AvaliacoesPage() {
  const { usuario } = await requireSession();
  const escopo = escopoDeLeitura(usuario);

  const avaliacoes = await prisma.avaliacaoAluno.findMany({
    // Única listagem em que o ramo sem escopo de Ofertante filtra por
    // identidade (o Aluno vê a própria avaliação) em vez de não ver nada.
    where: whereDeEscopo<Prisma.AvaliacaoAlunoWhereInput>(
      escopo,
      (cdOfertante) => ({ curso: { cdOfertante } }),
      () => ({ cpf: escopo.tipo === "proprioAluno" ? escopo.cpf : "" }),
    ),
    orderBy: [{ cdCurso: "asc" }, { cpf: "asc" }],
  });

  // Mesma regra da rota de matrícula (AVAL-05/06: AM também matricula), em
  // vez de um `tipo === "GO"` escrito à mão.
  const podeMatricular = podeCriarCursoOuMatricular(usuario.tipo);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Avaliações do Aluno</CardTitle>
        {podeMatricular && (
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
  );
}
