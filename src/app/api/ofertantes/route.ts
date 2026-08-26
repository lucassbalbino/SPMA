// POST /api/ofertantes - cadastro de Ofertante: auto-cadastro pelo GO
// (REQ-AU-09, AD-014, REQ-SEC-15, REQ-SEC-11) ou pré-cadastro por AM/GT
// (REQ-OV-01, AD-014).
// GET /api/ofertantes - listagem escopada (REQ-OV-06).
//
// Escolhas documentadas (o task admite 403 ou 409 para o segundo caso):
// - perfil sem permissão de cadastrar Ofertante -> 403
// - GO que já tem Ofertante vinculado           -> 409 (conflito com o estado atual;
//   o vínculo é 1:1 e não se troca por aqui)
//
// Não usa `requireSession()` (que redireciona): rota de API responde 401 -
// ver comentário em lib/auth/guards.ts.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { ofertanteSchema } from "@/lib/validation/schemas/ofertante.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function criarOfertante(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;
  const ehPreCadastroAdministrativo = usuario.tipo === "AM" || usuario.tipo === "GT";

  if (!ehPreCadastroAdministrativo && usuario.tipo !== "GO") {
    return NextResponse.json(
      { erro: "Apenas AM, GT ou um Gestor Ofertante sem vínculo podem cadastrar um Ofertante" },
      { status: 403 },
    );
  }

  // Só se aplica ao GO: AM/GT não têm cdOfertante (escopo nacional, AD-012),
  // então nunca caem neste conflito de "já vinculado".
  if (!ehPreCadastroAdministrativo && usuario.cdOfertante !== null) {
    return NextResponse.json(
      { erro: "Este usuário já possui um Ofertante vinculado" },
      { status: 409 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const entrada = ofertanteSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;

  // Pré-cadastro administrativo (REQ-OV-01): cria o Ofertante autônomo, sem
  // vincular nenhum usuário - AM/GT não são GO, não há a si mesmos vincular.
  if (ehPreCadastroAdministrativo) {
    const ofertante = await prisma.ofertante.create({
      data: {
        nome: dados.nome,
        responsavel: dados.responsavel ?? null,
        email: dados.email ?? null,
        telefone: dados.telefone ?? null,
        uf: dados.uf,
        municipio: dados.municipio ?? null,
        criadoPor: usuario.cpf,
      },
    });

    return NextResponse.json({ ofertante }, { status: 201 });
  }

  // Auto-cadastro do GO (comportamento existente, inalterado): criar o
  // Ofertante e vincular o GO são um passo só - um erro no meio não pode
  // deixar um Ofertante órfão nem um GO sem vínculo.
  const ofertante = await prisma.$transaction(async (tx) => {
    const criado = await tx.ofertante.create({
      data: {
        nome: dados.nome,
        responsavel: dados.responsavel ?? null,
        email: dados.email ?? null,
        telefone: dados.telefone ?? null,
        uf: dados.uf,
        municipio: dados.municipio ?? null,
        criadoPor: usuario.cpf,
      },
    });

    await tx.usuario.update({
      where: { cpf: usuario.cpf },
      data: { cdOfertante: criado.cdOfertante },
    });

    return criado;
  });

  return NextResponse.json({ ofertante }, { status: 201 });
}

async function listarOfertantes() {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;

  // REQ-OV-06: AM/GT/VT têm escopo nacional (veem todos); GO/VO só o
  // próprio (nunca um filtro vindo do cliente - AD-033); AL não tem acesso a
  // esta listagem (escopo é por curso, não por Ofertante - AD-012).
  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT": {
      const ofertantes = await prisma.ofertante.findMany({
        orderBy: { cdOfertante: "asc" },
      });
      return NextResponse.json({ ofertantes });
    }
    case "GO":
    case "VO": {
      // cdOfertante nulo não deve devolver a lista inteira - usa um filtro
      // que nunca casa em vez de omitir o `where`.
      const ofertantes = await prisma.ofertante.findMany({
        where: { cdOfertante: usuario.cdOfertante ?? -1 },
        orderBy: { cdOfertante: "asc" },
      });
      return NextResponse.json({ ofertantes });
    }
    case "AL":
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }
}

export const POST = comTratamentoDeErro(criarOfertante);
export const GET = comTratamentoDeErro(listarOfertantes);
