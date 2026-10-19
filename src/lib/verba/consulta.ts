// Lista de verbas escopada, com o nome do GO e o saldo disponível
// (GV-11..13, GV-16, AD-046).
//
// Fonte única para a tela `/verbas` e para `GET /api/verbas`, mesmo
// raciocínio de `consultarUsuarios` na gestão de usuários: a tela e a API não
// têm como divergir no escopo nem no cálculo do saldo.
//
// Quem chama garante `podeLerVerba` antes. Se um AL chegar aqui mesmo assim,
// a lista volta vazia (filtro impossível), nunca inteira: falha fechada.
import { prisma } from "../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { TipoUsuario } from "../../generated/prisma/enums";
import { escopoDeLeitura, whereDeEscopo } from "../api/escopo";
import { saldosDasVerbas } from "./saldo";

export interface VerbaListada {
  cdVerba: number;
  /** CNPJ do GO dono da verba (AD-043). */
  cdOfertante: string;
  nomeOfertante: string | null;
  /** Identificação livre da verba (IDV-09, IDV-11). */
  dsVerba: string;
  vlVerba: Prisma.Decimal;
  dtVerba: Date | null;
  dataCriacao: Date;
  /** Valor total menos o já alocado a cursos (REQ-OV-11). */
  saldoDisponivel: Prisma.Decimal;
}

type UsuarioEscopo = {
  tipo: TipoUsuario;
  documento: string;
  cdOfertante: string | null;
};

/**
 * `cdOfertanteFiltro` é o `?cdOfertante=` de `GET /api/verbas`: honrado só
 * para quem tem alcance nacional; para GO/VO o próprio vínculo prevalece
 * (`escopoDeLeitura`).
 */
export async function listarVerbasDoEscopo(
  usuario: UsuarioEscopo,
  cdOfertanteFiltro?: string | null,
): Promise<VerbaListada[]> {
  const where = whereDeEscopo(
    escopoDeLeitura(usuario, cdOfertanteFiltro),
    (cdOfertante) => ({ cdOfertante }),
    () => ({ cdOfertante: "" }),
  );

  const verbas = await prisma.verba.findMany({
    where,
    orderBy: { cdVerba: "asc" },
    include: { ofertante: { select: { nome: true } } },
  });
  const alocados = await saldosDasVerbas(verbas.map((verba) => verba.cdVerba));

  return verbas.map((verba) => ({
    cdVerba: verba.cdVerba,
    cdOfertante: verba.cdOfertante,
    nomeOfertante: verba.ofertante.nome,
    dsVerba: verba.dsVerba,
    vlVerba: verba.vlVerba,
    dtVerba: verba.dtVerba,
    dataCriacao: verba.dataCriacao,
    saldoDisponivel: verba.vlVerba.minus(alocados.get(verba.cdVerba) ?? 0),
  }));
}
