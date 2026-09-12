// POST /api/verbas - criação de Verba (REQ-OV-08).
// GET /api/verbas - listagem escopada com saldo disponível (REQ-OV-10/11).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarVerba, resolverEscopoOfertante } from "@/lib/auth/guards";
import { verbaSchema } from "@/lib/validation/schemas/verba.schema";
import { calcularSaldoVerba } from "@/lib/verba/saldo";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function criarVerba(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  // REQ-OV-08: só AM/GT criam Verba - o GO a consome (aloca a cursos, feature
  // futura), não a cria.
  if (!podeGerenciarVerba(sessao.usuario.tipo)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = verbaSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;

  // CA-OV-09: erro claro, não a constraint de FK crua do MySQL. UGO-14/AD-043:
  // o Ofertante É o GO - existência checada em `Usuario`, não numa tabela à
  // parte, e o documento precisa pertencer a um GO de fato.
  const go = await prisma.usuario.findUnique({
    where: { documento: dados.cdOfertante, tipo: "GO" },
  });

  if (!go) {
    return NextResponse.json({ erro: "Ofertante informado não existe" }, { status: 400 });
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
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const cdOfertanteFiltro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-OV-10: mesmo escopo de GET /api/ofertantes. GO/VO nunca confiam no
  // filtro do cliente - o próprio escopo do usuário sempre prevalece
  // (`resolverEscopoOfertante`, T6/UGO-14).
  let where: { cdOfertante?: string } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = cdOfertanteFiltro ? { cdOfertante: cdOfertanteFiltro } : {};
      break;
    case "GO":
    case "VO":
      where = { cdOfertante: resolverEscopoOfertante(usuario) ?? "" };
      break;
    case "AL":
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const verbas = await prisma.verba.findMany({ where, orderBy: { cdVerba: "asc" } });
  const verbasComSaldo = await Promise.all(
    verbas.map(async (verba) => ({
      ...verba,
      saldoDisponivel: (await calcularSaldoVerba(verba.cdVerba)).saldoDisponivel,
    })),
  );

  return NextResponse.json({ verbas: verbasComSaldo });
}

export const POST = comTratamentoDeErro(criarVerba);
export const GET = comTratamentoDeErro(listarVerbas);
