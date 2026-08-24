// POST /api/usuarios - criação em cascata (REQ-AU-05, REQ-AU-06, REQ-AU-07,
// REQ-AU-08).
//
// A permissão é reavaliada aqui, no servidor, a cada request (AD-033):
// o que a interface mostra ou deixa de mostrar não vale como autorização.
//
// Não usa `requireSession()` (que redireciona): rota de API responde 401 -
// ver comentário em lib/auth/guards.ts.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeCriar, resolverOfertante } from "@/lib/auth/cascata";
import { obterSessao } from "@/lib/auth/session";
import { usuarioSchema } from "@/lib/validation/schemas/usuario.schema";

export async function POST(request: Request) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = usuarioSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const criador = sessao.usuario;
  const dados = entrada.data;

  if (!podeCriar(criador.tipo, dados.tipo)) {
    return NextResponse.json(
      { erro: "Você não tem permissão para criar este tipo de usuário" },
      { status: 403 },
    );
  }

  // O escopo do novo usuário é resolvido no servidor: quando o criador é GO,
  // o `cdOfertante` que veio no payload é ignorado (REQ-AU-08).
  const cdOfertante = resolverOfertante(criador, dados.tipo, dados.cdOfertante);

  const usuario = await prisma.usuario.create({
    data: {
      cpf: dados.cpf,
      nome: dados.nome,
      email: dados.email ?? null,
      tipo: dados.tipo,
      cdOfertante,
      criadoPor: criador.cpf,
    },
  });

  return NextResponse.json(
    {
      usuario: {
        cpf: usuario.cpf,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        cdOfertante: usuario.cdOfertante,
        criadoPor: usuario.criadoPor,
        dataCriacao: usuario.dataCriacao,
      },
    },
    { status: 201 },
  );
}
