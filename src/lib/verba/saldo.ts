// Cálculo de saldo e validação de teto de uma Verba (REQ-OV-11/12, RN-10,
// AD-015, AD-016). O teto é só de VALOR - uma Verba pode custear quantos
// cursos couberem dentro do seu valor total, sem limite de quantidade.
//
// Exceção única: a verba ilimitada do Administrador Master (AD-040), que não
// tem teto nenhum. Nela `saldoDisponivel` é `null` - "sem teto" não é um
// número, e devolver 0 (ou o total menos o alocado, que ficaria negativo)
// faria a API mentir sobre uma verba que sempre aceita a próxima alocação.
import { prisma } from "../db/prisma";
import { Prisma } from "../../generated/prisma/client";

export interface SaldoVerba {
  valorTotal: Prisma.Decimal;
  totalAlocado: Prisma.Decimal;
  ilimitada: boolean;
  /** `null` quando a verba é ilimitada (AD-040): não há saldo a esgotar. */
  saldoDisponivel: Prisma.Decimal | null;
}

async function obterTotalAlocado(cdVerba: number): Promise<Prisma.Decimal> {
  const agregado = await prisma.preCurso.aggregate({
    where: { cdVerba },
    _sum: { vlCursoAlocado: true },
  });

  return agregado._sum.vlCursoAlocado ?? new Prisma.Decimal(0);
}

export async function calcularSaldoVerba(cdVerba: number): Promise<SaldoVerba> {
  const verba = await prisma.verba.findUniqueOrThrow({
    where: { cdVerba },
    select: { vlVerba: true, ilimitada: true },
  });

  const totalAlocado = await obterTotalAlocado(cdVerba);

  return {
    valorTotal: verba.vlVerba,
    totalAlocado,
    ilimitada: verba.ilimitada,
    saldoDisponivel: verba.ilimitada ? null : verba.vlVerba.minus(totalAlocado),
  };
}

/**
 * Usado na edição do valor total da Verba (REQ-OV-09/CA-OV-14): o novo valor
 * nunca pode ficar abaixo do que já foi alocado a cursos. Igualdade é
 * permitida (AD-016 - uso de até 100%).
 *
 * Não vale para a verba ilimitada (AD-040), que não tem valor a editar - a
 * rota de edição a rejeita antes de chegar aqui.
 */
export async function validarNovoValorTotal(
  cdVerba: number,
  novoValorTotal: number,
): Promise<boolean> {
  const totalAlocado = await obterTotalAlocado(cdVerba);

  return new Prisma.Decimal(novoValorTotal).greaterThanOrEqualTo(totalAlocado);
}

/**
 * Usado na alocação de um valor a um curso (REQ-OV-12/CA-OV-12/CA-OV-13): um
 * valor proposto só é válido se não exceder o saldo disponível ATUAL da
 * Verba (RN-10/CA-16 do documento fonte). Igualar o saldo a zero é permitido
 * (AD-016). `saldoDisponivel` no retorno é o saldo antes da alocação
 * proposta - a rota chamadora (POST /api/pre-cursos) usa isso para informar o
 * saldo ao usuário quando rejeita.
 *
 * Numa verba ilimitada (AD-040) qualquer valor passa e `saldoDisponivel` vem
 * `null`: é o que permite ao AM criar curso sem consumir verba de Ofertante.
 */
export async function validarAlocacao(
  cdVerba: number,
  valorProposto: number,
): Promise<{ valido: boolean; saldoDisponivel: Prisma.Decimal | null }> {
  const { saldoDisponivel } = await calcularSaldoVerba(cdVerba);

  if (saldoDisponivel === null) {
    return { valido: true, saldoDisponivel: null };
  }

  return {
    valido: new Prisma.Decimal(valorProposto).lessThanOrEqualTo(saldoDisponivel),
    saldoDisponivel,
  };
}
