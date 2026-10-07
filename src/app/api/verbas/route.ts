// POST /api/verbas - criação de Verba (REQ-OV-08).
// GET /api/verbas - listagem escopada com saldo disponível (REQ-OV-10/11).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarVerba } from "@/lib/auth/guards";
import { verbaSchema } from "@/lib/validation/schemas/verba.schema";
import { saldosDasVerbas } from "@/lib/verba/saldo";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";

async function criarVerba(request: Request) {
  const sessao = await exigirMutacao(request);

  // REQ-OV-08: só AM/GT criam Verba - o GO a consome (aloca a cursos, feature
  // futura), não a cria.
  if (!podeGerenciarVerba(sessao.usuario.tipo)) {
    throw erroHttp(403, "Acesso negado");
  }

  const dados = await corpoValidado(request, verbaSchema);

  // CA-OV-09: erro claro, não a constraint de FK crua do MySQL. UGO-14/AD-043:
  // o Ofertante É o GO - existência checada em `Usuario`, não numa tabela à
  // parte, e o documento precisa pertencer a um GO de fato.
  const go = await prisma.usuario.findUnique({
    where: { documento: dados.cdOfertante, tipo: "GO" },
  });

  if (!go) {
    throw erroHttp(400, "Ofertante informado não existe");
  }

  const verba = await prisma.verba.create({
    data: {
      cdOfertante: dados.cdOfertante,
      vlVerba: dados.vlVerba,
      dtVerba: dados.dtVerba,
    },
  });

  return NextResponse.json({ verba }, { status: 201 });
}

async function listarVerbas(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-OV-10: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam
  // no filtro do cliente (ver `lib/api/escopo.ts`).
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  if (escopo.tipo === "proprioAluno") {
    throw erroHttp(403, "Acesso negado");
  }

  const where = whereDeEscopo(
    escopo,
    (cdOfertante) => ({ cdOfertante }),
    () => ({ cdOfertante: "" }),
  );

  const verbas = await prisma.verba.findMany({ where, orderBy: { cdVerba: "asc" } });
  const saldos = await saldosDasVerbas(verbas.map((verba) => verba.cdVerba));

  return NextResponse.json({
    verbas: verbas.map((verba) => ({
      ...verba,
      saldoDisponivel: verba.vlVerba.minus(saldos.get(verba.cdVerba) ?? 0),
    })),
  });
}

export const POST = comTratamentoDeErro(criarVerba);
export const GET = comTratamentoDeErro(listarVerbas);
