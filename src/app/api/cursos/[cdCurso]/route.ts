// DELETE /api/cursos/[cdCurso] - exclusão de uma formação (RU-23 a RU-27).
//
// Rota fina: CSRF + sessão em `exigirMutacao`, e toda a regra (quem pode, o
// que impede, a transação) em `excluirCurso`. Excluir a formação apaga o pré
// e o pós junto; não existe exclusão de uma etapa isolada.
import { NextResponse } from "next/server";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { idPositivo } from "@/lib/api/requisicao";
import { excluirCurso } from "@/lib/cursos/exclusao";

type Contexto = { params: Promise<{ cdCurso: string }> };

async function excluirFormacao(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const cdCurso = idPositivo((await params).cdCurso);

  await excluirCurso(cdCurso, sessao.usuario);

  return NextResponse.json({ ok: true });
}

export const DELETE = comTratamentoDeErro(excluirFormacao);
