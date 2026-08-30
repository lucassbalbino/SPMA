// /avaliacoes/[cpf]/[cdCurso] (AVAL-07 a AVAL-19, tela).
//
// Server Component: `requireSession` + `podeAcessarAvaliacao` decidem se a
// avaliação é visível (notFound() se não), `podeGerenciarAvaliacao` +
// `status` decidem se é editável (só o próprio Aluno, nunca o GO que
// matriculou).
import { notFound } from "next/navigation";
import {
  podeAcessarAvaliacao,
  podeGerenciarAvaliacao,
  requireSession,
} from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import type { RespostasAvaliacaoParcial } from "@/lib/validation/schemas/avaliacao.schema";
import { AvaliacaoForm } from "./AvaliacaoForm";

type Props = { params: Promise<{ cpf: string; cdCurso: string }> };

export default async function AvaliacaoPage({ params }: Props) {
  const { usuario } = await requireSession();
  const { cpf } = await params;
  const cdCurso = Number((await params).cdCurso);

  if (!Number.isInteger(cdCurso) || cdCurso <= 0) {
    notFound();
  }

  const avaliacao = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
    include: { curso: { select: { cdOfertante: true } } },
  });

  if (
    !avaliacao ||
    !podeAcessarAvaliacao(usuario, {
      cpfAluno: avaliacao.cpf,
      cdOfertante: avaliacao.curso.cdOfertante,
    })
  ) {
    notFound();
  }

  const podeEditar =
    avaliacao.status === "EM_ANDAMENTO" && podeGerenciarAvaliacao(usuario, avaliacao.cpf);

  return (
    <>
      <AvaliacaoForm
        cpf={avaliacao.cpf}
        cdCurso={avaliacao.cdCurso}
        status={avaliacao.status}
        parte1CompletaInicial={avaliacao.parte1Completa}
        respostasIniciais={(avaliacao.respostas as RespostasAvaliacaoParcial | null) ?? {}}
        podeEditar={podeEditar}
      />
    </>
  );
}
