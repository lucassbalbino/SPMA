// Cálculo de saldo e validação de teto de uma Verba (REQ-OV-11/12, RN-10,
// AD-015, AD-016). O teto é só de VALOR - uma Verba pode custear quantos
// cursos couberem dentro do seu valor total, sem limite de quantidade.
//
// `PreCurso` já existe no schema (desenhado antecipadamente), mesmo sem
// nenhuma rota de criação de curso ainda (isso é escopo de
// `formulario-pre-curso`) - por isso as funções aqui são consumidas por
// integration test direto via Prisma, não por uma rota própria.
import { prisma } from "../db/prisma";
import { Prisma } from "../../generated/prisma/client";

export interface SaldoVerba {
  valorTotal: Prisma.Decimal;
  totalAlocado: Prisma.Decimal;
  saldoDisponivel: Prisma.Decimal;
}

async function obterTotalAlocado(cdVerba: number): Promise<Prisma.Decimal> {
  const agregado = await prisma.preCurso.aggregate({
    where: { cdVerba },
    _sum: { vlCursoAlocado: true },
  });

  return agregado._sum.vlCursoAlocado ?? new Prisma.Decimal(0);
}

/**
 * Total alocado de VÁRIAS verbas numa consulta só, indexado por `cdVerba`.
 *
 * `GET /api/verbas` chamava `calcularSaldoVerba` dentro de um `map`, o que
 * custava 2 consultas POR VERBA (a verba de novo + o agregado) em cima da
 * listagem que já as havia trazido - um N+1 que crescia com o número de
 * verbas do Ofertante. Aqui é um `groupBy` só, para a lista inteira.
 *
 * Verba sem nenhum curso alocado não aparece no resultado do `groupBy`:
 * ausente no Map significa zero alocado, e o chamador trata com `?? 0`.
 */
export async function saldosDasVerbas(
  cdVerbas: number[],
): Promise<Map<number, Prisma.Decimal>> {
  if (cdVerbas.length === 0) {
    return new Map();
  }

  const agregados = await prisma.preCurso.groupBy({
    by: ["cdVerba"],
    where: { cdVerba: { in: cdVerbas } },
    _sum: { vlCursoAlocado: true },
  });

  return new Map(
    agregados.map((agregado) => [
      agregado.cdVerba,
      agregado._sum.vlCursoAlocado ?? new Prisma.Decimal(0),
    ]),
  );
}

export async function calcularSaldoVerba(cdVerba: number): Promise<SaldoVerba> {
  const verba = await prisma.verba.findUniqueOrThrow({
    where: { cdVerba },
    select: { vlVerba: true },
  });

  const totalAlocado = await obterTotalAlocado(cdVerba);

  return {
    valorTotal: verba.vlVerba,
    totalAlocado,
    saldoDisponivel: verba.vlVerba.minus(totalAlocado),
  };
}

/**
 * Usado na edição do valor total da Verba (REQ-OV-09/CA-OV-14): o novo valor
 * nunca pode ficar abaixo do que já foi alocado a cursos. Igualdade é
 * permitida (AD-016 - uso de até 100%).
 *
 * Devolve `totalAlocado` junto do veredito porque quem recusa precisa
 * informá-lo na resposta: a rota de edição chamava esta função e, ao reprovar,
 * chamava `calcularSaldoVerba` SÓ para reler o mesmo número - duas consultas
 * extras para um valor que já estava calculado aqui.
 */
export async function validarNovoValorTotal(
  cdVerba: number,
  novoValorTotal: number,
): Promise<{ valido: boolean; totalAlocado: Prisma.Decimal }> {
  const totalAlocado = await obterTotalAlocado(cdVerba);

  return {
    valido: new Prisma.Decimal(novoValorTotal).greaterThanOrEqualTo(totalAlocado),
    totalAlocado,
  };
}

/**
 * Usado na alocação de um valor a um curso (REQ-OV-12/CA-OV-12/CA-OV-13): um
 * valor proposto só é válido se não exceder o saldo disponível ATUAL da
 * Verba (RN-10/CA-16 do documento fonte). Igualar o saldo a zero é permitido
 * (AD-016). `saldoDisponivel` no retorno é o saldo antes da alocação
 * proposta - a rota chamadora (a criação de curso em si, escopo de
 * `formulario-pre-curso`) usa isso para informar o saldo ao usuário quando
 * rejeita.
 */
export async function validarAlocacao(
  cdVerba: number,
  valorProposto: number,
): Promise<{ valido: boolean; saldoDisponivel: Prisma.Decimal }> {
  const { saldoDisponivel } = await calcularSaldoVerba(cdVerba);

  return {
    valido: new Prisma.Decimal(valorProposto).lessThanOrEqualTo(saldoDisponivel),
    saldoDisponivel,
  };
}
