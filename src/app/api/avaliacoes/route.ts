// GET /api/avaliacoes - listagem escopada (AVAL-22).
//
// NÃO existe POST aqui, de propósito (decisão do usuário, 2026-10-09): o Aluno
// nasce matriculado no ato de criação do usuário, na transação de POST
// /api/usuarios (AVAL-01), e não há nenhum outro jeito de matricular. Matrícula
// avulsa deixou de ser um ato possível, do mesmo jeito que a criação avulsa de
// pós-curso.
//
// AVAL-01 a 06 deixaram de ser uma rota: o que elas exigiam é exercido em POST
// /api/usuarios, que confere curso obrigatório para AL (400), existência do
// curso (404) e `podeMatricularAluno` sobre o Ofertante do curso (403).
// AVAL-02/03/04 não têm como ocorrer lá - o documento acaba de ser criado,
// então não é "não-Aluno", não há par repetido e não há avaliação anterior.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirSessao } from "@/lib/api/guardas";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import {
  LINHAS_RESPOSTA_ORDENADAS,
  montarRespostas,
  respostasOuNulo,
} from "@/lib/respostas/repositorio";

async function listarAvaliacoes(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // AVAL-22: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam no
  // filtro do cliente; AL, diferente das outras listagens, TEM escopo aqui
  // (a própria avaliação, por CPF) em vez de 403.
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  const avaliacoes = await prisma.avaliacaoAluno.findMany({
    // Os dois ramos têm formas DIFERENTES de `where` (por relação vs. por
    // CPF), por isso o tipo é explícito: é a única listagem em que o ramo sem
    // escopo de Ofertante filtra por identidade em vez de devolver 403.
    where: whereDeEscopo<Prisma.AvaliacaoAlunoWhereInput>(
      escopo,
      (cdOfertante) => ({ curso: { cdOfertante } }),
      () => ({ cpf: escopo.tipo === "proprioAluno" ? escopo.cpf : "" }),
    ),
    orderBy: [{ cdCurso: "asc" }, { cpf: "asc" }],
    include: {
      curso: { select: { cdOfertante: true } },
      linhasResposta: LINHAS_RESPOSTA_ORDENADAS,
    },
  });

  return NextResponse.json({
    avaliacoes: avaliacoes.map(({ curso, linhasResposta, ...avaliacao }) => ({
      ...avaliacao,
      cdOfertante: curso.cdOfertante,
      respostas: respostasOuNulo(montarRespostas("avaliacao", linhasResposta)),
    })),
  });
}

export const GET = comTratamentoDeErro(listarAvaliacoes);
