// POST /api/avaliacoes - matrícula de um Aluno num curso (AVAL-01 a 06).
// GET /api/avaliacoes - listagem escopada (AVAL-22).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeMatricularAluno } from "@/lib/auth/guards";
import { matricularAlunoSchema } from "@/lib/validation/schemas/avaliacao.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function matricularAluno(request: Request) {
  // REQ-SEC-15: mesma ordem RH→CSRF→Sessão→Guard das demais rotas mutantes.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = matricularAlunoSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { cpf, cdCurso } = entrada.data;

  // AVAL-02: CPF precisa corresponder a um usuário do tipo AL já cadastrado.
  const aluno = await prisma.usuario.findUnique({ where: { cpf } });

  if (!aluno) {
    return NextResponse.json({ erro: "Aluno não encontrado" }, { status: 404 });
  }

  if (aluno.tipo !== "AL") {
    return NextResponse.json(
      { erro: "CPF informado não é de um Aluno" },
      { status: 400 },
    );
  }

  const curso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!curso) {
    return NextResponse.json({ erro: "Curso não encontrado" }, { status: 404 });
  }

  // AVAL-05/06: só o GO vinculado ao Ofertante do curso matricula.
  if (!podeMatricularAluno(sessao.usuario, curso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // AVAL-03: checagem explícita antes do create para devolver um 409 limpo
  // em vez de deixar a constraint de PK composta do Prisma estourar como 500.
  const avaliacaoExistente = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });

  if (avaliacaoExistente) {
    return NextResponse.json(
      { erro: "Este aluno já tem avaliação para este curso" },
      { status: 409 },
    );
  }

  // AVAL-04/RN-12: um Aluno nunca tem duas avaliações EM_ANDAMENTO simultâneas.
  const avaliacaoEmAndamento = await prisma.avaliacaoAluno.findFirst({
    where: { cpf, status: "EM_ANDAMENTO" },
  });

  if (avaliacaoEmAndamento) {
    return NextResponse.json(
      { erro: "Este aluno já tem uma avaliação em andamento noutro curso" },
      { status: 409 },
    );
  }

  const avaliacao = await prisma.avaliacaoAluno.create({
    data: { cpf, cdCurso },
  });

  return NextResponse.json({ avaliacao }, { status: 201 });
}

async function listarAvaliacoes(request: Request) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const cdOfertanteFiltro = new URL(request.url).searchParams.get("cdOfertante");

  // AVAL-22: mesmo padrão de escopo já usado em pos-cursos/route.ts - GO/VO
  // nunca confiam num filtro vindo do cliente; AL só vê a própria.
  let where: { curso?: { cdOfertante?: number }; cpf?: string } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = cdOfertanteFiltro ? { curso: { cdOfertante: Number(cdOfertanteFiltro) } } : {};
      break;
    case "GO":
    case "VO":
      where = { curso: { cdOfertante: usuario.cdOfertante ?? -1 } };
      break;
    case "AL":
      where = { cpf: usuario.cpf };
      break;
  }

  const avaliacoes = await prisma.avaliacaoAluno.findMany({
    where,
    orderBy: [{ cdCurso: "asc" }, { cpf: "asc" }],
    include: { curso: { select: { cdOfertante: true } } },
  });

  return NextResponse.json({
    avaliacoes: avaliacoes.map(({ curso, ...avaliacao }) => ({
      ...avaliacao,
      cdOfertante: curso.cdOfertante,
    })),
  });
}

export const POST = comTratamentoDeErro(matricularAluno);
export const GET = comTratamentoDeErro(listarAvaliacoes);
