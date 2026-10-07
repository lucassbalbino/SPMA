// POST /api/pre-cursos/[id]/encerrar - encerramento irreversível do pré-curso
// (REQ-PC-10, REQ-PC-11, REQ-PC-12). Rota de ação dedicada, mesmo padrão de
// src/app/api/auth/primeiro-acesso.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarPreCurso } from "@/lib/auth/guards";
import { validarCompletudePreCurso } from "@/lib/pre-curso/completude";
import { normalizarCondicionaisPreCurso } from "@/lib/pre-curso/condicionais";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { idPositivo } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { encerrarFormulario } from "@/lib/respostas/encerramento";

type Contexto = { params: Promise<{ id: string }> };

async function encerrarPreCurso(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const cdCurso = idPositivo((await params).id);

  const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCurso) {
    throw erroHttp(404, "Pré-curso não encontrado");
  }

  if (!podeGerenciarPreCurso(sessao.usuario, preCurso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // AD-018/RN-09: transição irreversível - encerrar de novo é rejeitado.
  if (preCurso.status === "ENCERRADO") {
    throw erroHttp(409, "Pré-curso já está encerrado");
  }

  // Respostas de perguntas condicionais que a resposta-mãe tornou
  // inaplicáveis (ex.: Q25="Não, apenas equipamentos básicos" com Q25.1
  // ainda preenchida de uma escolha anterior) são descartadas no
  // `normalizar` abaixo, dentro de `encerrarFormulario` - no momento em que o
  // formulário vira registro final e imutável. Durante o preenchimento elas
  // ficam preservadas, para o Gestor poder ir e voltar entre as
  // alternativas. Sem isso, o registro encerrado guardaria uma contradição
  // interna, exatamente o que o AD-037 barra nas perguntas de seleção
  // múltipla.
  const { registro, respostas } = await encerrarFormulario({
    alvo: { formulario: "preCurso", cdCurso },
    normalizar: normalizarCondicionaisPreCurso,
    validarCompletude: validarCompletudePreCurso,
    encerrarRegistro: (tx, data) => tx.preCurso.update({ where: { cdCurso }, data }),
  });

  return NextResponse.json({ preCurso: { ...registro, respostas } });
}

export const POST = comTratamentoDeErro(encerrarPreCurso);
