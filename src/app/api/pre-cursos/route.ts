// POST /api/pre-cursos - criação de pré-curso (REQ-PC-01/02/03, AD-040).
// GET /api/pre-cursos - listagem escopada por Ofertante (REQ-PC-14).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeGerenciarPreCurso } from "@/lib/auth/guards";
import {
  criarPreCursoAmSchema,
  criarPreCursoSchema,
} from "@/lib/validation/schemas/pre-curso.schema";
import { obterVerbaIlimitada } from "@/lib/verba/ilimitada";
import { validarAlocacao } from "@/lib/verba/saldo";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import type { TipoUsuario } from "@/generated/prisma/enums";

async function criarPreCurso(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (mesma ordem RH→CSRF→Guard de verbas/route.ts).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);

  // AD-040: o AM entra por outra porta. Ele não tem Ofertante (AD-012) e não
  // escolhe verba - custeia sempre pela verba ilimitada - então informa o
  // Ofertante do curso, que no caminho do GO viria da verba escolhida. O tipo
  // aqui escolhe o FORMATO da entrada; quem autoriza continua sendo o guard,
  // chamado dentro dos dois caminhos.
  if (sessao.usuario.tipo === "AM") {
    return criarPreCursoDoAm(corpo, sessao.usuario);
  }

  const entrada = criarPreCursoSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;

  const verba = await prisma.verba.findUnique({ where: { cdVerba: dados.cdVerba } });

  // Verba sem Ofertante é a verba ilimitada do AM (AD-040) e não é escolhível
  // por aqui: fora do caminho do AM ela não existe como opção de custeio.
  if (!verba || verba.cdOfertante === null) {
    return NextResponse.json({ erro: "Verba informada não existe" }, { status: 400 });
  }

  // REQ-PC-01/03: só o GO vinculado ao Ofertante da Verba cria o pré-curso.
  if (!podeGerenciarPreCurso(sessao.usuario, verba.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // REQ-PC-02: teto de valor (RN-10/AD-016), reuso de cadastro-ofertante-verba.
  const { valido, saldoDisponivel } = await validarAlocacao(
    dados.cdVerba,
    dados.vlCursoAlocado,
  );

  if (!valido) {
    return NextResponse.json(
      { erro: "Valor alocado excede o saldo disponível da verba", saldoDisponivel },
      { status: 400 },
    );
  }

  const preCurso = await prisma.preCurso.create({
    data: {
      cdOfertante: verba.cdOfertante,
      cdVerba: dados.cdVerba,
      vlCursoAlocado: dados.vlCursoAlocado,
      criadoPor: sessao.usuario.cpf,
    },
  });

  return NextResponse.json({ preCurso }, { status: 201 });
}

/**
 * Criação pelo Administrador Master (AD-040). Sem teto a validar: a verba
 * ilimitada nunca esgota, então some daqui o 400 de saldo do caminho do GO.
 * O que resta a checar é o Ofertante informado - a verba do GO provava a
 * existência dele de graça, esta não prova nada.
 *
 * A autorização não é o `tipo === "AM"` que traz o fluxo até aqui: é o mesmo
 * `podeGerenciarPreCurso` do caminho do GO, sobre o Ofertante escolhido. No
 * dia em que o AD-040 for revisto, mudar a guarda basta para fechar a porta.
 */
async function criarPreCursoDoAm(
  corpo: unknown,
  usuario: { tipo: TipoUsuario; cpf: string; cdOfertante: number | null },
) {
  const entrada = criarPreCursoAmSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;

  // Mesmo motivo do CA-OV-09 em POST /api/verbas: erro claro, não a
  // constraint de FK crua do MySQL.
  const ofertante = await prisma.ofertante.findUnique({
    where: { cdOfertante: dados.cdOfertante },
  });

  if (!ofertante) {
    return NextResponse.json({ erro: "Ofertante informado não existe" }, { status: 400 });
  }

  if (!podeGerenciarPreCurso(usuario, dados.cdOfertante)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const verba = await obterVerbaIlimitada();

  const preCurso = await prisma.preCurso.create({
    data: {
      cdOfertante: dados.cdOfertante,
      cdVerba: verba.cdVerba,
      vlCursoAlocado: dados.vlCursoAlocado,
      criadoPor: usuario.cpf,
    },
  });

  return NextResponse.json({ preCurso }, { status: 201 });
}

async function listarPreCursos(request: Request) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const cdOfertanteFiltro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PC-14: mesmo padrão de escopo de listarVerbas - GO/VO nunca confiam
  // no filtro do cliente, o próprio cdOfertante do usuário sempre prevalece.
  let where: { cdOfertante?: number } = {};

  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      where = cdOfertanteFiltro ? { cdOfertante: Number(cdOfertanteFiltro) } : {};
      break;
    case "GO":
    case "VO":
      where = { cdOfertante: usuario.cdOfertante ?? -1 };
      break;
    case "AL":
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const preCursos = await prisma.preCurso.findMany({
    where,
    orderBy: { cdCurso: "asc" },
  });

  return NextResponse.json({ preCursos });
}

export const POST = comTratamentoDeErro(criarPreCurso);
export const GET = comTratamentoDeErro(listarPreCursos);
