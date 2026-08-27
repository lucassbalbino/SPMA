// /pre-cursos/[id] (REQ-PC-04 a REQ-PC-12, tela).
//
// Server Component: `requireSession` + `podeAcessarOfertante` decidem se o
// pré-curso é visível (notFound() se não), `podeGerenciarPreCurso` +
// `status` decidem se é editável. A interatividade (blocos, gravação
// parcial, encerramento) vive em `PreCursoForm` (client component
// colocado) - o servidor reavalia tudo de novo em cada PATCH/encerrar
// (AD-033), esta tela só evita expor controles que a API rejeitaria.
import { notFound } from "next/navigation";
import { podeAcessarOfertante, podeGerenciarPreCurso, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import type { RespostasPreCursoParcial } from "@/lib/validation/schemas/pre-curso.schema";
import { PreCursoForm } from "./PreCursoForm";

type Props = { params: Promise<{ id: string }> };

export default async function PreCursoPage({ params }: Props) {
  const { usuario } = await requireSession();
  const cdCurso = Number((await params).id);

  if (!Number.isInteger(cdCurso) || cdCurso <= 0) {
    notFound();
  }

  const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCurso || !podeAcessarOfertante(usuario, preCurso.cdOfertante)) {
    notFound();
  }

  const podeEditar =
    preCurso.status === "EM_ANDAMENTO" &&
    podeGerenciarPreCurso(usuario, preCurso.cdOfertante);

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      <PreCursoForm
        cdCurso={preCurso.cdCurso}
        status={preCurso.status}
        respostasIniciais={(preCurso.respostas as RespostasPreCursoParcial | null) ?? {}}
        podeEditar={podeEditar}
      />
    </main>
  );
}
