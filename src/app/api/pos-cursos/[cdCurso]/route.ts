// GET /api/pos-cursos/[cdCurso] - consulta escopada (REQ-PO-11).
// PATCH /api/pos-cursos/[cdCurso] - gravação parcial de respostas
// (REQ-PO-04/05/06, bloqueada em pós-curso ENCERRADO por REQ-PO-08).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeAcessarOfertante, podeGerenciarPosCurso } from "@/lib/auth/guards";
import {
  datasReaisEmOrdem,
  respostasPosCursoSchema,
} from "@/lib/validation/schemas/pos-curso.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ cdCurso: string }> };

function parseId(id: string): number | null {
  const cdCurso = Number(id);
  return Number.isInteger(cdCurso) && cdCurso > 0 ? cdCurso : null;
}

async function consultarPosCurso(_request: Request, { params }: Contexto) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdCurso = parseId((await params).cdCurso);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const posCurso = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: { preCurso: { select: { cdOfertante: true } } },
  });

  if (!posCurso) {
    return NextResponse.json({ erro: "Pós-curso não encontrado" }, { status: 404 });
  }

  if (!podeAcessarOfertante(sessao.usuario, posCurso.preCurso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const { preCurso, ...dados } = posCurso;

  return NextResponse.json({ posCurso: { ...dados, cdOfertante: preCurso.cdOfertante } });
}

async function gravarRespostasPosCurso(request: Request, { params }: Contexto) {
  // REQ-SEC-15: mesma ordem RH→CSRF→Sessão→Guard das demais rotas mutantes.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdCurso = parseId((await params).cdCurso);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const posCursoExistente = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: { preCurso: { select: { cdOfertante: true } } },
  });

  if (!posCursoExistente) {
    return NextResponse.json({ erro: "Pós-curso não encontrado" }, { status: 404 });
  }

  if (!podeGerenciarPosCurso(sessao.usuario, posCursoExistente.preCurso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // REQ-PO-08: somente leitura depois de encerrado, sem exceção.
  if (posCursoExistente.status === "ENCERRADO") {
    return NextResponse.json(
      { erro: "Pós-curso já encerrado, somente leitura" },
      { status: 409 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const entrada = respostasPosCursoSchema.partial().safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  // REQ-PO-04: merge raso em memória - só as chaves enviadas são alteradas.
  const respostasAtuais =
    (posCursoExistente.respostas as Record<string, unknown> | null) ?? {};
  const respostasMescladas = { ...respostasAtuais, ...entrada.data };

  // REQ-PO-06: a validação roda contra o estado MESCLADO, não só o corpo do
  // PATCH - cobre tanto as duas datas chegando no mesmo PATCH quanto uma
  // data setada num PATCH anterior e a outra agora.
  if (!datasReaisEmOrdem(respostasMescladas)) {
    return NextResponse.json(
      { erro: "Data de término não pode ser anterior à data de início" },
      { status: 400 },
    );
  }

  const posCurso = await prisma.posCurso.update({
    where: { cdCurso },
    data: { respostas: respostasMescladas },
  });

  return NextResponse.json({ posCurso });
}

export const GET = comTratamentoDeErro(consultarPosCurso);
export const PATCH = comTratamentoDeErro(gravarRespostasPosCurso);
