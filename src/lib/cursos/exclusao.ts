// Exclusão de uma formação (RU-23 a RU-27, doc 10 e observação final).
//
// Só sai uma formação sem "filho": nenhum aluno matriculado e o Cadastro de
// Formação ainda em andamento (decisão do usuário, 2026-11-11). Apagar a
// linha de `TB_Curso` leva o pré e o pós por `ON DELETE CASCADE` (AD-052.3),
// e o saldo da verba volta sozinho, porque é calculado a partir dos cursos.
//
// A checagem roda dentro da mesma transação do `DELETE`. Se um aluno for
// matriculado no meio, a FK da avaliação (sem cascata, AD-052.3) recusa o
// `DELETE` e a recusa sai como o mesmo 409 - nada é apagado.
import { Prisma } from "@/generated/prisma/client";
import { erroHttp } from "@/lib/api/erro-http";
import { podeGerenciarPreCurso, type UsuarioComEscopo } from "@/lib/auth/permissoes";
import { prisma } from "@/lib/db/prisma";

export const MENSAGEM_FORMACAO_COM_ALUNO =
  "Esta formação tem aluno cadastrado e não pode ser excluída.";
export const MENSAGEM_FORMACAO_CONCLUIDA =
  "Cadastro de Formação concluído não pode ser excluído.";

export async function excluirCurso(
  cdCurso: number,
  solicitante: UsuarioComEscopo,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const curso = await tx.curso.findUnique({
        where: { cdCurso },
        select: {
          cdOfertante: true,
          preCurso: { select: { status: true } },
          _count: { select: { avaliacoes: true } },
        },
      });

      if (!curso) {
        throw erroHttp(404, "Formação não encontrada");
      }

      if (!podeGerenciarPreCurso(solicitante, curso.cdOfertante)) {
        throw erroHttp(403, "Acesso negado");
      }

      if (curso._count.avaliacoes > 0) {
        throw erroHttp(409, MENSAGEM_FORMACAO_COM_ALUNO);
      }

      if (curso.preCurso?.status === "ENCERRADO") {
        throw erroHttp(409, MENSAGEM_FORMACAO_CONCLUIDA);
      }

      await tx.curso.delete({ where: { cdCurso } });
    });
  } catch (erro) {
    // Aluno matriculado entre a checagem e o `DELETE`: a FK da avaliação recusa.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2003") {
      throw erroHttp(409, MENSAGEM_FORMACAO_COM_ALUNO);
    }
    // Outra exclusão concorrente apagou primeiro.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2025") {
      throw erroHttp(404, "Formação não encontrada");
    }
    throw erro;
  }
}
