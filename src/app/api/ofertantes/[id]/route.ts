// GET/PATCH /api/ofertantes/[id] - consulta e edição de um Ofertante
// específico (REQ-OV-02, REQ-OV-03, REQ-OV-05).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeAcessarOfertante, podeEditarOfertante } from "@/lib/auth/guards";
import { ofertanteSchema } from "@/lib/validation/schemas/ofertante.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const cdOfertante = Number(id);
  return Number.isInteger(cdOfertante) && cdOfertante > 0 ? cdOfertante : null;
}

async function consultarOfertante(_request: Request, { params }: Contexto) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdOfertante = parseId((await params).id);

  if (cdOfertante === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  // REQ-OV-05: escopo checado antes de revelar se o Ofertante existe - um GO
  // de outro Ofertante recebe 403, não 404 (não vaza existência fora do escopo).
  if (!podeAcessarOfertante(sessao.usuario, cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const ofertante = await prisma.ofertante.findUnique({ where: { cdOfertante } });

  if (!ofertante) {
    return NextResponse.json({ erro: "Ofertante não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ofertante });
}

async function editarOfertante(request: Request, { params }: Contexto) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdOfertante = parseId((await params).id);

  if (cdOfertante === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  if (!podeEditarOfertante(sessao.usuario, cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const existente = await prisma.ofertante.findUnique({ where: { cdOfertante } });

  if (!existente) {
    return NextResponse.json({ erro: "Ofertante não encontrado" }, { status: 404 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = ofertanteSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;
  const ofertante = await prisma.ofertante.update({
    where: { cdOfertante },
    data: {
      nome: dados.nome,
      responsavel: dados.responsavel ?? null,
      email: dados.email ?? null,
      telefone: dados.telefone ?? null,
      uf: dados.uf,
      municipio: dados.municipio ?? null,
    },
  });

  return NextResponse.json({ ofertante });
}

export const GET = comTratamentoDeErro(consultarOfertante);
export const PATCH = comTratamentoDeErro(editarOfertante);
