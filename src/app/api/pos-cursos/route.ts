// GET /api/pos-cursos - listagem escopada por Ofertante (REQ-PO-12).
//
// NÃO existe POST aqui, de propósito (decisão do usuário, 2026-10-09): o
// Pós-Curso nasce junto do curso, na transação de POST /api/cursos, e não
// há nenhum outro jeito de criá-lo. Pré-Curso e Pós-Curso não são dois cursos
// (AD-040 - `PosCurso.CD_Curso` é PK e FK 1:1 para `PreCurso.CD_Curso`), então
// criar os dois questionários é um ato só. Criar pós-curso avulso rescinde
// REQ-PO-01/02/03 como ROTA: a autorização e a unicidade que elas pediam
// continuam valendo, agora exercidas na rota de criação do curso.
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

async function listarPosCursos(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PO-12: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam
  // no filtro do cliente (ver `lib/api/escopo.ts`). PosCurso não tem
  // CD_Ofertante próprio - o filtro é aplicado via o PreCurso pai (relação).
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  if (escopo.tipo === "proprioAluno") {
    throw erroHttp(403, "Acesso negado");
  }

  // Inclui o cdOfertante do PreCurso pai na resposta - PosCurso não tem essa
  // coluna própria, e a listagem precisa expor a que Ofertante cada item
  // pertence (mesmo formato "achatado" que GET /api/pre-cursos já entrega).
  const posCursos = await prisma.posCurso.findMany({
    where: whereDeEscopo(
      escopo,
      (cdOfertante) => ({ preCurso: { cdOfertante } }),
      () => ({ preCurso: { cdOfertante: "" } }),
    ),
    orderBy: { cdCurso: "asc" },
    include: {
      preCurso: { select: { cdOfertante: true } },
      linhasResposta: LINHAS_RESPOSTA_ORDENADAS,
    },
  });

  return NextResponse.json({
    posCursos: posCursos.map(({ preCurso, linhasResposta, ...posCurso }) => ({
      ...posCurso,
      cdOfertante: preCurso.cdOfertante,
      respostas: respostasOuNulo(montarRespostas("posCurso", linhasResposta)),
    })),
  });
}

export const GET = comTratamentoDeErro(listarPosCursos);
