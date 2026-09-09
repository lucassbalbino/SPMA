// A verba ilimitada do Administrador Master (AD-040).
//
// O AM tem escopo nacional e nenhum Ofertante (AD-012), mas todo curso é
// custeado por uma Verba (AD-015). A saída é uma única verba nacional, sem
// dono e sem teto: é ela que custeia os cursos criados pelo AM, sem tocar no
// saldo da verba de nenhum Ofertante.
//
// Ela nasce na migration `20260909120000_verba_ilimitada_am`. O find-or-create
// aqui é rede de segurança para bancos montados por outro caminho (ex.: um
// `prisma db push` em desenvolvimento), não um segundo caminho de criação:
// nenhuma rota cria verba ilimitada, `verbaSchema` exige Ofertante.
import { prisma } from "../db/prisma";

/**
 * A verba ilimitada, criando-a se ainda não existir. Havendo mais de uma (só
 * possível por escrita manual no banco), vence sempre a de menor `cdVerba`,
 * para que a escolha seja estável entre chamadas.
 */
export async function obterVerbaIlimitada() {
  const existente = await prisma.verba.findFirst({
    where: { ilimitada: true },
    orderBy: { cdVerba: "asc" },
  });

  if (existente) {
    return existente;
  }

  return prisma.verba.create({
    data: { cdOfertante: null, vlVerba: 0, ilimitada: true },
  });
}
