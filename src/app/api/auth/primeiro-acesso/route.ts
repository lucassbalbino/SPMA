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
import { primeiroAcessoSchema } from "@/lib/validation/schemas/primeiro-acesso.schema";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";

async function primeiroAcesso(request: Request) {
  // REQ-SEC-15: `exigirMutacao` checa o token anti-CSRF ANTES até da sessão
  // (design.md - RH -> CSRF -> Guard).
  const sessao = await exigirMutacao(request);

  // REQ-SEC-17: a regra condicional (senha === confirmacaoSenha) é
  // reavaliada aqui mesmo se o cliente for burlado - o servidor é a
  // autoridade.
  const entrada = await corpoValidado(request, primeiroAcessoSchema);

  const usuario = await prisma.usuario.update({
    where: { documento: sessao.usuario.documento },
    data: {
      senhaHash: await hashPassword(entrada.senha),
      primeiraVez: false,
    },
  });

  return NextResponse.json({
    usuario: {
      documento: usuario.documento,
      nome: usuario.nome,
      tipo: usuario.tipo,
      primeiraVez: usuario.primeiraVez,
      cdOfertante: usuario.cdOfertante,
    },
    proximaRota: "/painel",
  });
}

export const POST = comTratamentoDeErro(primeiroAcesso);
