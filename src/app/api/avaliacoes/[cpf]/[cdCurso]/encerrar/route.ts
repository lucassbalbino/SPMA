// POST /api/avaliacoes/[cpf]/[cdCurso]/encerrar - encerramento irreversível
// da avaliação (AVAL-12/13/15/16/17/18/19).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarAvaliacao } from "@/lib/auth/guards";
import { validarCompletudeAvaliacao } from "@/lib/avaliacao/completude";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ cpf: string; cdCurso: string }> };

function parseCdCurso(id: string): number | null {
  const cdCurso = Number(id);
  return Number.isInteger(cdCurso) && cdCurso > 0 ? cdCurso : null;
}

async function encerrarAvaliacao(request: Request, { params }: Contexto) {
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { cpf } = await params;
  const cdCurso = parseCdCurso((await params).cdCurso);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const avaliacao = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });

  if (!avaliacao) {
    return NextResponse.json({ erro: "Avaliação não encontrada" }, { status: 404 });
  }

  // AVAL-18: só o próprio Aluno encerra, nunca o GO que fez a matrícula.
  if (!podeGerenciarAvaliacao(sessao.usuario, avaliacao.cpf)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // AD-018/AVAL-19: transição irreversível - encerrar de novo é rejeitado.
  if (avaliacao.status === "ENCERRADO") {
    return NextResponse.json({ erro: "Esta avaliação já está encerrada" }, { status: 409 });
  }

  // AVAL-12/13: gate "Concluiu o curso?" - une pendências de Parte 1 e Parte 2.
  const { completo, pendentes } = validarCompletudeAvaliacao(avaliacao.respostas);

  if (!completo) {
    return NextResponse.json(
      { erro: "Existem campos obrigatórios pendentes", pendentes },
      { status: 400 },
    );
  }

  const atualizada = await prisma.avaliacaoAluno.update({
    where: { cpf_cdCurso: { cpf, cdCurso } },
    data: { status: "ENCERRADO", dataEncerramento: new Date() },
  });

  return NextResponse.json({ avaliacao: atualizada });
}

export const POST = comTratamentoDeErro(encerrarAvaliacao);
