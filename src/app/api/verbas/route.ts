// POST /api/verbas - criação de Verba (REQ-OV-08).
// GET /api/verbas - listagem escopada com saldo disponível (REQ-OV-10/11).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarVerba, podeLerVerba } from "@/lib/auth/guards";
import { verbaSchema } from "@/lib/validation/schemas/verba.schema";
import { listarVerbasDoEscopo } from "@/lib/verba/consulta";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";

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
      dsVerba: dados.dsVerba,
      vlVerba: dados.vlVerba,
      dtVerba: dados.dtVerba,
    },
  });

  return NextResponse.json({ verba }, { status: 201 });
}

async function listarVerbas(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // GV-34 (AD-046): VT e AL não leem verba. Antes desta guarda o AL já caía
  // em 403 pelo escopo; o VT, com alcance nacional, via todas.
  if (!podeLerVerba(sessao.usuario.tipo)) {
    throw erroHttp(403, "Acesso negado");
  }

  // REQ-OV-10: escopo e saldo vêm da mesma consulta que a tela /verbas usa -
  // GO/VO nunca confiam no filtro do cliente (ver `lib/api/escopo.ts`).
  const verbas = await listarVerbasDoEscopo(sessao.usuario, filtro);

  return NextResponse.json({ verbas });
}

export const POST = comTratamentoDeErro(criarVerba);
export const GET = comTratamentoDeErro(listarVerbas);
