// POST /api/pos-cursos/[cdCurso]/encerrar - encerramento irreversível do
// pós-curso (REQ-PO-08, REQ-PO-09, REQ-PO-10).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarPosCurso } from "@/lib/auth/guards";
import { validarCompletudePosCurso } from "@/lib/pos-curso/completude";
import { normalizarCondicionaisPosCurso } from "@/lib/pos-curso/condicionais";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { idPositivo } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { encerrarFormulario } from "@/lib/respostas/encerramento";
import { comCurso, incluirCurso, INCLUIR_CURSO_DO_POS } from "@/lib/cursos/curso";
import {
  MENSAGEM_PRE_CURSO_EM_ANDAMENTO,
  posCursoLiberado,
} from "@/lib/pos-curso/liberacao";

type Contexto = { params: Promise<{ cdCurso: string }> };

async function encerrarPosCurso(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const cdCurso = idPositivo((await params).cdCurso);

  const posCurso = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: INCLUIR_CURSO_DO_POS,
  });

  if (!posCurso) {
    throw erroHttp(404, "Pós-curso não encontrado");
  }

  if (!podeGerenciarPosCurso(sessao.usuario, posCurso.curso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // AD-050: o pós-curso só encerra depois do pré-curso.
  if (!posCursoLiberado(posCurso.curso.preCurso)) {
    throw erroHttp(409, MENSAGEM_PRE_CURSO_EM_ANDAMENTO);
  }

  // AD-018: transição irreversível - encerrar de novo é rejeitado.
  if (posCurso.status === "ENCERRADO") {
    throw erroHttp(409, "Pós-curso já está encerrado");
  }

  // Q12 preenchida com Q11="Não" (o Gestor respondeu "Sim", detalhou e
  // depois mudou de ideia) é descartada pelo `normalizar` abaixo, no momento
  // em que o formulário vira registro final e imutável - durante o
  // preenchimento o valor fica preservado. Sem isso, o registro encerrado
  // guardaria uma contradição interna, exatamente o que o AD-037 barra nas
  // perguntas de seleção múltipla.
  const { registro, respostas } = await encerrarFormulario({
    alvo: { formulario: "posCurso", cdCurso },
    normalizar: normalizarCondicionaisPosCurso,
    validarCompletude: validarCompletudePosCurso,
    encerrarRegistro: (tx, data) =>
      tx.posCurso.update({ where: { cdCurso }, data, include: incluirCurso("posCurso") }),
  });

  return NextResponse.json({ posCurso: { ...comCurso("posCurso", registro), respostas } });
}

export const POST = comTratamentoDeErro(encerrarPosCurso);
