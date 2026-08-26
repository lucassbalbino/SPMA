// POST /api/usuarios - criação em cascata (REQ-AU-05, REQ-AU-06, REQ-AU-07,
// REQ-AU-08, REQ-SEC-15, REQ-SEC-11).
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
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function criarUsuario(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

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

  // CPF duplicado (violação de unicidade, `cpf` é @id) lança uma exceção do
  // Prisma não tratada aqui de propósito - `comTratamentoDeErro` (REQ-SEC-11)
  // é quem a converte num 500 genérico com id de correlação, nunca o erro
  // cru do Prisma no corpo da resposta.
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

export const POST = comTratamentoDeErro(criarUsuario);
