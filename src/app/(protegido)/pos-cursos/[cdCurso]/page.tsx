// /pos-cursos/[cdCurso] (REQ-PO-04 a REQ-PO-11, tela).
//
// Server Component: `requireSession` + `podeAcessarOfertante` (contra o
// `cdOfertante` do curso) decidem se o pós-curso é visível
// (notFound() se não), `podeGerenciarPosCurso` + `status` decidem se é
// editável. Antes de o pré-curso ser encerrado, a página mostra só um aviso
// no lugar do formulário (AD-050).
import Link from "next/link";
import { notFound } from "next/navigation";
import { podeAcessarOfertante, podeGerenciarPosCurso, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import type { RespostasPosCursoParcial } from "@/lib/validation/schemas/pos-curso.schema";
import { lerRespostas } from "@/lib/respostas/repositorio";
import {
  MENSAGEM_PRE_CURSO_EM_ANDAMENTO,
  posCursoLiberado,
} from "@/lib/pos-curso/liberacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nomeDaFormacao } from "@/lib/cursos/nome";
import { PosCursoForm } from "./PosCursoForm";

type Props = { params: Promise<{ cdCurso: string }> };

export default async function PosCursoPage({ params }: Props) {
  const { usuario } = await requireSession();
  const cdCurso = Number((await params).cdCurso);

  if (!Number.isInteger(cdCurso) || cdCurso <= 0) {
    notFound();
  }

  const posCurso = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: {
      curso: {
        select: {
          cdOfertante: true,
          vlCursoAlocado: true,
          preCurso: { select: { status: true, p8: true } },
        },
      },
    },
  });

  if (!posCurso || !podeAcessarOfertante(usuario, posCurso.curso.cdOfertante)) {
    notFound();
  }

  // O nome da formação é a P8 do pré (RU-13), liberado ou não.
  const nomeFormacao = nomeDaFormacao(posCurso.curso.preCurso?.p8, posCurso.cdCurso);

  if (!posCursoLiberado(posCurso.curso.preCurso)) {
    return (
      <Card className="w-full max-w-3xl" data-testid="aviso-pre-curso-em-andamento">
        <CardHeader>
          <CardTitle>Avaliação de Formação - {nomeFormacao}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{MENSAGEM_PRE_CURSO_EM_ANDAMENTO}.</p>
          <p className="text-muted-foreground">
            A Avaliação de Formação abre quando o Cadastro de Formação estiver preenchido e concluído.
          </p>
          <Link href={`/pre-cursos/${posCurso.cdCurso}`} className="w-fit underline">
            Ir para o Cadastro de Formação
          </Link>
        </CardContent>
      </Card>
    );
  }

  const podeEditar =
    posCurso.status === "EM_ANDAMENTO" &&
    podeGerenciarPosCurso(usuario, posCurso.curso.cdOfertante);

  const respostasIniciais = (await lerRespostas(prisma, {
    formulario: "posCurso",
    cdCurso: posCurso.cdCurso,
  })) as RespostasPosCursoParcial;

  return (
    <>
      <PosCursoForm
        cdCurso={posCurso.cdCurso}
        nomeFormacao={nomeFormacao}
        valorPrevisto={posCurso.curso.vlCursoAlocado.toNumber()}
        status={posCurso.status}
        respostasIniciais={respostasIniciais}
        podeEditar={podeEditar}
      />
    </>
  );
}
