// GET/PATCH /api/verbas/[id] - consulta e edição de uma Verba específica
// (REQ-OV-09, REQ-OV-10, REQ-OV-11, REQ-OV-12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeAcessarOfertante, podeGerenciarVerba } from "@/lib/auth/guards";
import { edicaoVerbaSchema } from "@/lib/validation/schemas/verba.schema";
import { calcularSaldoVerba, validarNovoValorTotal } from "@/lib/verba/saldo";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado, idPositivo } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";

type Contexto = { params: Promise<{ id: string }> };

async function consultarVerba(_request: Request, { params }: Contexto) {
  const sessao = await exigirSessao();
  const cdVerba = idPositivo((await params).id);

  const verba = await prisma.verba.findUnique({ where: { cdVerba } });

  if (!verba) {
    throw erroHttp(404, "Verba não encontrada");
  }

  if (!podeAcessarOfertante(sessao.usuario, verba.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  const { saldoDisponivel } = await calcularSaldoVerba(cdVerba);

  return NextResponse.json({ verba: { ...verba, saldoDisponivel } });
}

async function editarVerba(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const cdVerba = idPositivo((await params).id);

  // REQ-OV-09: só AM/GT editam Verba, mesma autorização da criação.
  if (!podeGerenciarVerba(sessao.usuario.tipo)) {
    throw erroHttp(403, "Acesso negado");
  }

  const verbaExistente = await prisma.verba.findUnique({ where: { cdVerba } });

  if (!verbaExistente) {
    throw erroHttp(404, "Verba não encontrada");
  }

  const dados = await corpoValidado(request, edicaoVerbaSchema);

  // CA-OV-14: o novo valor nunca pode ficar abaixo do que já foi alocado a
  // cursos - igualdade é permitida (AD-016).
  const { valido, totalAlocado } = await validarNovoValorTotal(cdVerba, dados.vlVerba);

  if (!valido) {
    throw erroHttp(
      409,
      "Novo valor não pode ser menor que o já alocado a cursos desta verba",
      { totalAlocado },
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
