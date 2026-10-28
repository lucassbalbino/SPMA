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
import { comCurso, incluirCurso } from "@/lib/cursos/curso";
import {
  incluirRespostas,
  respostasOuNulo,
  separarRespostas,
} from "@/lib/respostas/repositorio";

async function listarPosCursos(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PO-12: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam
  // no filtro do cliente (ver `lib/api/escopo.ts`). O Ofertante é do curso
  // (`TB_Curso`, AD-052) - o filtro vai pela relação.
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  if (escopo.tipo === "proprioAluno") {
    throw erroHttp(403, "Acesso negado");
  }

  const posCursos = await prisma.posCurso.findMany({
    where: whereDeEscopo(
      escopo,
      (cdOfertante) => ({ curso: { cdOfertante } }),
      () => ({ curso: { cdOfertante: "" } }),
    ),
    orderBy: { cdCurso: "asc" },
    omit: incluirRespostas("posCurso"),
    include: incluirCurso("posCurso"),
  });

  return NextResponse.json({
    posCursos: posCursos.map((registro) => {
      const { registro: posCurso, respostas } = separarRespostas("posCurso", registro);
      return { ...comCurso("posCurso", posCurso), respostas: respostasOuNulo(respostas) };
    }),
  });
}

export const GET = comTratamentoDeErro(listarPosCursos);
