// POST /api/pos-cursos/[cdCurso]/encerrar - encerramento irreversível do
// pós-curso (REQ-PO-08, REQ-PO-09, REQ-PO-10).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarPosCurso } from "@/lib/auth/guards";
import { validarCompletudePosCurso } from "@/lib/pos-curso/completude";
import { normalizarCondicionaisPosCurso } from "@/lib/pos-curso/condicionais";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ cdCurso: string }> };

function parseId(id: string): number | null {
  const cdCurso = Number(id);
  return Number.isInteger(cdCurso) && cdCurso > 0 ? cdCurso : null;
}

async function encerrarPosCurso(request: Request, { params }: Contexto) {
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdCurso = parseId((await params).cdCurso);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const posCurso = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: { preCurso: { select: { cdOfertante: true } } },
  });

  if (!posCurso) {
    return NextResponse.json({ erro: "Pós-curso não encontrado" }, { status: 404 });
  }

  if (!podeGerenciarPosCurso(sessao.usuario, posCurso.preCurso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // AD-018: transição irreversível - encerrar de novo é rejeitado.
  if (posCurso.status === "ENCERRADO") {
    return NextResponse.json({ erro: "Pós-curso já está encerrado" }, { status: 409 });
  }

  // Q12 preenchida com Q11="Não" (o Gestor respondeu "Sim", detalhou e
  // depois mudou de ideia) é descartada AQUI, no momento em que o
  // formulário vira registro final e imutável - durante o preenchimento o
  // valor fica preservado. Sem isso, o registro encerrado guardaria uma
  // contradição interna, exatamente o que o AD-037 barra nas perguntas de
  // seleção múltipla.
  const respostas = normalizarCondicionaisPosCurso(posCurso.respostas);
  const { completo, pendentes } = validarCompletudePosCurso(respostas);

  if (!completo) {
    return NextResponse.json(
      { erro: "Existem campos obrigatórios pendentes", pendentes },
      { status: 400 },
    );
  }

  const atualizado = await prisma.posCurso.update({
    where: { cdCurso },
    data: { status: "ENCERRADO", dataEncerramento: new Date(), respostas },
  });

  return NextResponse.json({ posCurso: atualizado });
}

export const POST = comTratamentoDeErro(encerrarPosCurso);
