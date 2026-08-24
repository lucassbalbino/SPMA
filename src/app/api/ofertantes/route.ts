// POST /api/ofertantes - auto-cadastro do Ofertante pelo GO (REQ-AU-09,
// AD-014).
//
// Escolhas documentadas (o task admite 403 ou 409 para o segundo caso):
// - perfil diferente de GO            -> 403 (não é dele essa rota)
// - GO que já tem Ofertante vinculado -> 409 (conflito com o estado atual;
//   o vínculo é 1:1 e não se troca por aqui)
//
// Não usa `requireSession()` (que redireciona): rota de API responde 401 -
// ver comentário em lib/auth/guards.ts.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { ofertanteSchema } from "@/lib/validation/schemas/ofertante.schema";

export async function POST(request: Request) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const usuario = sessao.usuario;

  if (usuario.tipo !== "GO") {
    return NextResponse.json(
      { erro: "Apenas um Gestor Ofertante pode cadastrar o Ofertante" },
      { status: 403 },
    );
  }

  if (usuario.cdOfertante !== null) {
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

  // Criar o Ofertante e vincular o GO são um passo só: um erro no meio não
  // pode deixar um Ofertante órfão nem um GO sem vínculo.
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
