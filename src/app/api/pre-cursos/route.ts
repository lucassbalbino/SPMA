// GET /api/pre-cursos - listagem escopada por Ofertante (REQ-PC-14).
//
// NÃO existe POST aqui, de propósito (decisão do usuário, 2026-10-09): criar
// um pré-curso isolado não é um ato que o sistema ofereça. O ato é criar um
// CURSO, em POST /api/cursos, que grava PreCurso e PosCurso na mesma
// transação. Este arquivo é só leitura de pré-curso.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirSessao } from "@/lib/api/guardas";
import { erroHttp } from "@/lib/api/erro-http";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import {
  LINHAS_RESPOSTA_ORDENADAS,
  montarRespostas,
  respostasOuNulo,
} from "@/lib/respostas/repositorio";

async function listarPreCursos(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PC-14: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam
  // no filtro do cliente (ver `lib/api/escopo.ts`).
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  if (escopo.tipo === "proprioAluno") {
    throw erroHttp(403, "Acesso negado");
  }

  const registros = await prisma.preCurso.findMany({
    where: whereDeEscopo(
      escopo,
      (cdOfertante) => ({ cdOfertante }),
      () => ({ cdOfertante: "" }),
    ),
    orderBy: { cdCurso: "asc" },
    include: { linhasResposta: LINHAS_RESPOSTA_ORDENADAS },
  });

  return NextResponse.json({
    preCursos: registros.map(({ linhasResposta, ...preCurso }) => ({
      ...preCurso,
      respostas: respostasOuNulo(montarRespostas("preCurso", linhasResposta)),
    })),
  });
}

export const GET = comTratamentoDeErro(listarPreCursos);
