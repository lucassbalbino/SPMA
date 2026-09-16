// /avaliacoes/novo (AVAL-01 a 05, tela).
//
// Server Component: carrega os cursos do próprio Ofertante do GO para
// popular o seletor. O servidor reavalia tudo de novo em POST /api/avaliacoes
// (AD-033) - esta tela só evita que o GO escolha um curso fora do próprio
// escopo.
import { requireSession, resolverEscopoOfertante } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatricularAlunoForm } from "./MatricularAlunoForm";

export default async function NovaAvaliacaoPage() {
  const { usuario } = await requireSession();

  // UGO-14/AD-043: o escopo do GO é o próprio documento (`resolverEscopoOfertante`,
  // T6) - `usuario.cdOfertante` é sempre `null` para um GO, nunca a fonte da
  // verdade de escopo.
  const escopoOfertante = resolverEscopoOfertante(usuario);

  if (usuario.tipo !== "GO" || escopoOfertante === null) {
    return (
      <>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Matricular aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seu perfil não pode matricular alunos.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const cursosDoOfertante = await prisma.preCurso.findMany({
    where: { cdOfertante: escopoOfertante },
    orderBy: { cdCurso: "asc" },
    select: { cdCurso: true },
  });

  // O nome do curso não é coluna de `PreCurso` - é a resposta da Seção 2, Q8
  // ("Nome da Ação de Qualificação") do formulário de pré-curso, gravada em
  // `RespostaPreCurso` (RESP-01). Pode faltar se o GO ainda não preencheu
  // essa pergunta - o select cai pro "Curso #cd" nesse caso.
  const nomesCursos =
    cursosDoOfertante.length > 0
      ? await prisma.respostaPreCurso.findMany({
          where: {
            cdCurso: { in: cursosDoOfertante.map((curso) => curso.cdCurso) },
            chave: "qualifNomeCurso",
          },
          select: { cdCurso: true, valor: true },
        })
      : [];
  const nomePorCurso = new Map(nomesCursos.map((linha) => [linha.cdCurso, linha.valor]));

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Matricular aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <MatricularAlunoForm
            cursosDisponiveis={cursosDoOfertante.map((curso) => ({
              cdCurso: curso.cdCurso,
              nome: nomePorCurso.get(curso.cdCurso) ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
