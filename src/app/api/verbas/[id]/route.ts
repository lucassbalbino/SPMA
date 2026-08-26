// GET/PATCH /api/verbas/[id] - consulta e edição de uma Verba específica
// (REQ-OV-09, REQ-OV-10, REQ-OV-11, REQ-OV-12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeAcessarOfertante, podeGerenciarVerba } from "@/lib/auth/guards";
import { edicaoVerbaSchema } from "@/lib/validation/schemas/verba.schema";
import { calcularSaldoVerba, validarNovoValorTotal } from "@/lib/verba/saldo";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ id: string }> };

function parseId(id: string): number | null {
  const cdVerba = Number(id);
  return Number.isInteger(cdVerba) && cdVerba > 0 ? cdVerba : null;
}

async function consultarVerba(_request: Request, { params }: Contexto) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdVerba = parseId((await params).id);

  if (cdVerba === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const verba = await prisma.verba.findUnique({ where: { cdVerba } });

  if (!verba) {
    return NextResponse.json({ erro: "Verba não encontrada" }, { status: 404 });
  }

  if (!podeAcessarOfertante(sessao.usuario, verba.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const { saldoDisponivel } = await calcularSaldoVerba(cdVerba);

  return NextResponse.json({ verba: { ...verba, saldoDisponivel } });
}

async function editarVerba(request: Request, { params }: Contexto) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const cdVerba = parseId((await params).id);

  if (cdVerba === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  // REQ-OV-09: só AM/GT editam Verba, mesma autorização da criação.
  if (!podeGerenciarVerba(sessao.usuario.tipo)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const verbaExistente = await prisma.verba.findUnique({ where: { cdVerba } });

  if (!verbaExistente) {
    return NextResponse.json({ erro: "Verba não encontrada" }, { status: 404 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = edicaoVerbaSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;

  // CA-OV-14: o novo valor nunca pode ficar abaixo do que já foi alocado a
  // cursos - igualdade é permitida (AD-016).
  if (!(await validarNovoValorTotal(cdVerba, dados.vlVerba))) {
    const { totalAlocado } = await calcularSaldoVerba(cdVerba);
    return NextResponse.json(
      {
        erro: "Novo valor não pode ser menor que o já alocado a cursos desta verba",
        totalAlocado,
      },
      { status: 409 },
    );
  }

  const verba = await prisma.verba.update({
    where: { cdVerba },
    data: { vlVerba: dados.vlVerba, dtVerba: dados.dtVerba },
  });

  return NextResponse.json({ verba });
}

export const GET = comTratamentoDeErro(consultarVerba);
export const PATCH = comTratamentoDeErro(editarVerba);
