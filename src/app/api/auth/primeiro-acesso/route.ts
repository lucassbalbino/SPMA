// POST /api/auth/primeiro-acesso (REQ-AU-02, REQ-SEC-11, REQ-SEC-15,
// REQ-SEC-17).
//
// Exige apenas sessão válida - inclusive a sessão "pendente" aberta pelo
// login de quem ainda não tem senha. A sessão continua ativa depois de
// definir a senha; quem passa a liberar os demais módulos é
// `requirePrimeiroAcessoConcluido` no layout protegido.
//
// Não usa `requireSession()`: aquela guarda serve a páginas e responde com
// redirect 307; aqui o contrato é 401 (ver comentário em lib/auth/guards.ts).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { obterSessao } from "@/lib/auth/session";
import { primeiroAcessoSchema } from "@/lib/validation/schemas/primeiro-acesso.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function primeiroAcesso(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = primeiroAcessoSchema.safeParse(corpo);

  // REQ-SEC-17: a regra condicional (senha === confirmacaoSenha) é
  // reavaliada aqui mesmo se o cliente for burlado - o servidor é a
  // autoridade.
  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const usuario = await prisma.usuario.update({
    where: { cpf: sessao.usuario.cpf },
    data: {
      senhaHash: await hashPassword(entrada.data.senha),
      primeiraVez: false,
    },
  });

  return NextResponse.json({
    usuario: {
      cpf: usuario.cpf,
      nome: usuario.nome,
      tipo: usuario.tipo,
      primeiraVez: usuario.primeiraVez,
      cdOfertante: usuario.cdOfertante,
    },
    proximaRota: "/painel",
  });
}

export const POST = comTratamentoDeErro(primeiroAcesso);
