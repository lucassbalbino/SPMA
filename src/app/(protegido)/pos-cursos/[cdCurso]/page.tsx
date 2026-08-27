// /pos-cursos/[cdCurso] (REQ-PO-04 a REQ-PO-11, tela).
//
// Server Component: `requireSession` + `podeAcessarOfertante` (contra o
// `cdOfertante` do PreCurso pai) decidem se o pós-curso é visível
// (notFound() se não), `podeGerenciarPosCurso` + `status` decidem se é
// editável.
import { notFound } from "next/navigation";
import { podeAcessarOfertante, podeGerenciarPosCurso, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import type { RespostasPosCursoParcial } from "@/lib/validation/schemas/pos-curso.schema";
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
    include: { preCurso: { select: { cdOfertante: true } } },
  });

  if (!posCurso || !podeAcessarOfertante(usuario, posCurso.preCurso.cdOfertante)) {
    notFound();
  }

  const podeEditar =
    posCurso.status === "EM_ANDAMENTO" &&
    podeGerenciarPosCurso(usuario, posCurso.preCurso.cdOfertante);

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      <PosCursoForm
        cdCurso={posCurso.cdCurso}
        status={posCurso.status}
        respostasIniciais={(posCurso.respostas as RespostasPosCursoParcial | null) ?? {}}
        podeEditar={podeEditar}
      />
    </main>
  );
}
