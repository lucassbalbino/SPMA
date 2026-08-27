// POST /api/pre-cursos - criação de pré-curso (REQ-PC-01/02/03).
// GET /api/pre-cursos - listagem escopada por Ofertante (REQ-PC-14).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarPreCurso } from "@/lib/auth/guards";
import { criarPreCursoSchema } from "@/lib/validation/schemas/pre-curso.schema";
import { validarAlocacao } from "@/lib/verba/saldo";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function criarPreCurso(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (mesma ordem RH→CSRF→Guard de verbas/route.ts).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = criarPreCursoSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;

  const verba = await prisma.verba.findUnique({ where: { cdVerba: dados.cdVerba } });

  if (!verba) {
    return NextResponse.json({ erro: "Verba informada não existe" }, { status: 400 });
  }

  // REQ-PC-01/03: só o GO vinculado ao Ofertante da Verba cria o pré-curso.
  if (!podeGerenciarPreCurso(sessao.usuario, verba.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // REQ-PC-02: teto de valor (RN-10/AD-016), reuso de cadastro-ofertante-verba.
  const { valido, saldoDisponivel } = await validarAlocacao(
    dados.cdVerba,
    dados.vlCursoAlocado,
  );

  if (!valido) {
    return NextResponse.json(
      { erro: "Valor alocado excede o saldo disponível da verba", saldoDisponivel },
      { status: 400 },
    );
  }

  const preCurso = await prisma.preCurso.create({
    data: {
      cdOfertante: verba.cdOfertante,
      cdVerba: dados.cdVerba,
      vlCursoAlocado: dados.vlCursoAlocado,
      criadoPor: sessao.usuario.cpf,
    },
  });

  return NextResponse.json({ preCurso }, { status: 201 });
}

async function listarPreCursos(request: Request) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const cdOfertanteFiltro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PC-14: mesmo padrão de escopo de listarVerbas - GO/VO nunca confiam
  // no filtro do cliente, o próprio cdOfertante do usuário sempre prevalece.
  let where: { cdOfertante?: number } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = cdOfertanteFiltro ? { cdOfertante: Number(cdOfertanteFiltro) } : {};
      break;
    case "GO":
    case "VO":
      where = { cdOfertante: usuario.cdOfertante ?? -1 };
      break;
    case "AL":
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const preCursos = await prisma.preCurso.findMany({
    where,
    orderBy: { cdCurso: "asc" },
  });

  return NextResponse.json({ preCursos });
}

export const POST = comTratamentoDeErro(criarPreCurso);
export const GET = comTratamentoDeErro(listarPreCursos);
