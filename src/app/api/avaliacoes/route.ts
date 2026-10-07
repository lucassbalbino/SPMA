// POST /api/avaliacoes - matrícula de um Aluno num curso (AVAL-01 a 06).
// GET /api/avaliacoes - listagem escopada (AVAL-22).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { podeMatricularAluno } from "@/lib/auth/guards";
import { matricularAlunoSchema } from "@/lib/validation/schemas/avaliacao.schema";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import {
  LINHAS_RESPOSTA_ORDENADAS,
  montarRespostas,
  respostasOuNulo,
} from "@/lib/respostas/repositorio";

async function matricularAluno(request: Request) {
  const sessao = await exigirMutacao(request);
  const { cpf, cdCurso } = await corpoValidado(request, matricularAlunoSchema);

  // AVAL-02: CPF precisa corresponder a um usuário do tipo AL já cadastrado.
  const aluno = await prisma.usuario.findUnique({ where: { documento: cpf } });

  if (!aluno) {
    throw erroHttp(404, "Aluno não encontrado");
  }

  if (aluno.tipo !== "AL") {
    throw erroHttp(400, "CPF informado não é de um Aluno");
  }

  const curso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!curso) {
    throw erroHttp(404, "Curso não encontrado");
  }

  // AVAL-05/06: só o GO vinculado ao Ofertante do curso matricula.
  if (!podeMatricularAluno(sessao.usuario, curso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // AVAL-03: checagem explícita antes do create para devolver um 409 limpo
  // em vez de deixar a constraint de PK composta do Prisma estourar como 500.
  const avaliacaoExistente = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });

  if (avaliacaoExistente) {
    throw erroHttp(409, "Este aluno já tem avaliação para este curso");
  }

  // AVAL-04/RN-12: um Aluno nunca tem duas avaliações EM_ANDAMENTO simultâneas.
  const avaliacaoEmAndamento = await prisma.avaliacaoAluno.findFirst({
    where: { cpf, status: "EM_ANDAMENTO" },
  });

  if (avaliacaoEmAndamento) {
    throw erroHttp(409, "Este aluno já tem uma avaliação em andamento noutro curso");
  }

  const avaliacao = await prisma.avaliacaoAluno.create({ data: { cpf, cdCurso } });

  // Avaliação nasce sem nenhuma linha de resposta - `null`, como a coluna
  // JSON devolvia.
  return NextResponse.json({ avaliacao: { ...avaliacao, respostas: null } }, { status: 201 });
}

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

export const POST = comTratamentoDeErro(matricularAluno);
export const GET = comTratamentoDeErro(listarAvaliacoes);
