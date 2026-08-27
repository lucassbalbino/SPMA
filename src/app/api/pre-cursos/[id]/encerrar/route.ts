// POST /api/pre-cursos/[id]/encerrar - encerramento irreversível do pré-curso
// (REQ-PC-10, REQ-PC-11, REQ-PC-12). Rota de ação dedicada, mesmo padrão de
// src/app/api/auth/primeiro-acesso.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarPreCurso } from "@/lib/auth/guards";
import { validarCompletudePreCurso } from "@/lib/pre-curso/completude";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const cdCurso = Number(id);
  return Number.isInteger(cdCurso) && cdCurso > 0 ? cdCurso : null;
}

async function encerrarPreCurso(request: Request, { params }: Contexto) {
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdCurso = parseId((await params).id);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCurso) {
    return NextResponse.json({ erro: "Pré-curso não encontrado" }, { status: 404 });
  }

  if (!podeGerenciarPreCurso(sessao.usuario, preCurso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // AD-018/RN-09: transição irreversível - encerrar de novo é rejeitado.
  if (preCurso.status === "ENCERRADO") {
    return NextResponse.json({ erro: "Pré-curso já está encerrado" }, { status: 409 });
  }

  const { completo, pendentes } = validarCompletudePreCurso(preCurso.respostas);

  if (!completo) {
    return NextResponse.json(
      { erro: "Existem campos obrigatórios pendentes", pendentes },
      { status: 400 },
    );
  }

  const atualizado = await prisma.preCurso.update({
    where: { cdCurso },
    data: { status: "ENCERRADO", dataEncerramento: new Date() },
  });

  return NextResponse.json({ preCurso: atualizado });
}

export const POST = comTratamentoDeErro(encerrarPreCurso);
