// POST /api/pos-cursos - criação de pós-curso (REQ-PO-01/02/03).
// GET /api/pos-cursos - listagem escopada por Ofertante (REQ-PO-12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarPosCurso } from "@/lib/auth/guards";
import { criarPosCursoSchema } from "@/lib/validation/schemas/pos-curso.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function criarPosCurso(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (mesma ordem RH→CSRF→Guard de pre-cursos/route.ts).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = criarPosCursoSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const preCurso = await prisma.preCurso.findUnique({
    where: { cdCurso: entrada.data.cdCurso },
  });

  if (!preCurso) {
    return NextResponse.json({ erro: "Pré-curso não encontrado" }, { status: 404 });
  }

  // REQ-PO-01/03: só o GO vinculado ao Ofertante do Pré-Curso pai cria o pós-curso.
  if (!podeGerenciarPosCurso(sessao.usuario, preCurso.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // REQ-PO-02: relação 1:1 - checagem explícita antes do create para devolver
  // um 409 limpo em vez de deixar a constraint de PK do Prisma estourar como 500.
  const posCursoExistente = await prisma.posCurso.findUnique({
    where: { cdCurso: entrada.data.cdCurso },
  });

  if (posCursoExistente) {
    return NextResponse.json({ erro: "Este curso já tem um pós-curso" }, { status: 409 });
  }

  const posCurso = await prisma.posCurso.create({
    data: {
      cdCurso: entrada.data.cdCurso,
      criadoPor: sessao.usuario.cpf,
    },
  });

  return NextResponse.json({ posCurso }, { status: 201 });
}

async function listarPosCursos(request: Request) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const cdOfertanteFiltro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PO-12: mesmo padrão de escopo de listarPreCursos - GO/VO nunca
  // confiam no filtro do cliente, o próprio cdOfertante do usuário sempre
  // prevalece. PosCurso não tem CD_Ofertante próprio - o filtro é aplicado
  // via o PreCurso pai (relação).
  let where: { preCurso?: { cdOfertante?: number } } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = cdOfertanteFiltro ? { preCurso: { cdOfertante: Number(cdOfertanteFiltro) } } : {};
      break;
    case "GO":
    case "VO":
      where = { preCurso: { cdOfertante: usuario.cdOfertante ?? -1 } };
      break;
    case "AL":
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // Inclui o cdOfertante do PreCurso pai na resposta - PosCurso não tem essa
  // coluna própria, e a listagem precisa expor a que Ofertante cada item
  // pertence (mesmo formato "achatado" que GET /api/pre-cursos já entrega).
  const posCursos = await prisma.posCurso.findMany({
    where,
    orderBy: { cdCurso: "asc" },
    include: { preCurso: { select: { cdOfertante: true } } },
  });

  return NextResponse.json({
    posCursos: posCursos.map(({ preCurso, ...posCurso }) => ({
      ...posCurso,
      cdOfertante: preCurso.cdOfertante,
    })),
  });
}

export const POST = comTratamentoDeErro(criarPosCurso);
export const GET = comTratamentoDeErro(listarPosCursos);
