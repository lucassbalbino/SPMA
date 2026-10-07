// POST /api/avaliacoes/[cpf]/[cdCurso]/encerrar - encerramento irreversível
// da avaliação (AVAL-12/13/15/16/17/18/19).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarAvaliacao } from "@/lib/auth/guards";
import { validarCompletudeAvaliacao } from "@/lib/avaliacao/completude";
import { normalizarCondicionaisAvaliacao } from "@/lib/avaliacao/condicionais";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { idPositivo } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { encerrarFormulario } from "@/lib/respostas/encerramento";

type Contexto = { params: Promise<{ cpf: string; cdCurso: string }> };

async function encerrarAvaliacao(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const { cpf, cdCurso: cdCursoBruto } = await params;
  const cdCurso = idPositivo(cdCursoBruto);

  const avaliacao = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });

  if (!avaliacao) {
    throw erroHttp(404, "Avaliação não encontrada");
  }

  // AVAL-18: só o próprio Aluno encerra, nunca o GO que fez a matrícula. A
  // guarda continua recebendo `cpf` (é sempre a identidade de um Aluno) - só
  // a fonte do valor muda: `usuario.documento` (renomeado por T4).
  if (
    !podeGerenciarAvaliacao(
      { tipo: sessao.usuario.tipo, cpf: sessao.usuario.documento },
      avaliacao.cpf,
    )
  ) {
    throw erroHttp(403, "Acesso negado");
  }

  // AD-018/AVAL-19: transição irreversível - encerrar de novo é rejeitado.
  if (avaliacao.status === "ENCERRADO") {
    throw erroHttp(409, "Esta avaliação já está encerrada");
  }

  // Respostas que a própria avaliação tornou inaplicáveis (Q12/Q16 com a
  // pergunta-mãe em "Não", Q30.j sem Q30="Outra", e as 22 chaves de "apenas
  // para quem concluiu" quando Q22="Não") são descartadas pelo `normalizar`
  // abaixo, no momento em que a avaliação vira registro final e imutável. No
  // PATCH elas continuam preservadas de propósito - é edge case explícito da
  // spec (Q22 alterada de "Sim" para "Não" numa gravação posterior preserva o
  // que já estava salvo), para o aluno poder corrigir Q22 sem perder o que
  // respondeu; o descarte só acontece quando ele confirma o encerramento.
  const { registro, respostas } = await encerrarFormulario({
    alvo: { formulario: "avaliacao", cpf, cdCurso },
    normalizar: normalizarCondicionaisAvaliacao,
    validarCompletude: validarCompletudeAvaliacao,
    encerrarRegistro: (tx, data) =>
      tx.avaliacaoAluno.update({ where: { cpf_cdCurso: { cpf, cdCurso } }, data }),
  });

  return NextResponse.json({ avaliacao: { ...registro, respostas } });
}

export const POST = comTratamentoDeErro(encerrarAvaliacao);
