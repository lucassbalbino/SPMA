// GET /api/pre-cursos/[id] - consulta escopada (REQ-PC-13).
// PATCH /api/pre-cursos/[id] - gravação parcial de respostas (REQ-PC-04/05/06,
// bloqueada em pré-curso ENCERRADO por REQ-PC-12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeAcessarOfertante, podeGerenciarPreCurso } from "@/lib/auth/guards";
import { respostasPreCursoSchema } from "@/lib/validation/schemas/pre-curso.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const cdCurso = Number(id);
  return Number.isInteger(cdCurso) && cdCurso > 0 ? cdCurso : null;
}

async function consultarPreCurso(_request: Request, { params }: Contexto) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdCurso = parseId((await params).id);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCurso) {
    return NextResponse.json({ erro: "Pré-curso não encontrado" }, { status: 404 });
  }

  if (!podeAcessarOfertante(sessao.usuario, preCurso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.json({ preCurso });
}

async function gravarRespostasPreCurso(request: Request, { params }: Contexto) {
  // REQ-SEC-15: mesma ordem RH→CSRF→Sessão→Guard das demais rotas mutantes.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdCurso = parseId((await params).id);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const preCursoExistente = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCursoExistente) {
    return NextResponse.json({ erro: "Pré-curso não encontrado" }, { status: 404 });
  }

  if (!podeGerenciarPreCurso(sessao.usuario, preCursoExistente.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // REQ-PC-12: somente leitura depois de encerrado, sem exceção.
  if (preCursoExistente.status === "ENCERRADO") {
    return NextResponse.json(
      { erro: "Pré-curso já encerrado, somente leitura" },
      { status: 409 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const entrada = respostasPreCursoSchema.partial().safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  // REQ-PC-04: merge raso em memória - só as chaves enviadas são alteradas.
  const respostasAtuais =
    (preCursoExistente.respostas as Record<string, unknown> | null) ?? {};
  const respostasMescladas = { ...respostasAtuais, ...entrada.data };

  const preCurso = await prisma.preCurso.update({
    where: { cdCurso },
    data: { respostas: respostasMescladas },
  });

  return NextResponse.json({ preCurso });
}

export const GET = comTratamentoDeErro(consultarPreCurso);
export const PATCH = comTratamentoDeErro(gravarRespostasPreCurso);
