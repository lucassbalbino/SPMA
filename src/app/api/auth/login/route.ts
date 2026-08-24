// POST /api/auth/login (REQ-AU-01, REQ-AU-02, REQ-AU-03, REQ-AU-04,
// REQ-AU-11, REQ-AU-12).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validation/schemas/login.schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  estaBloqueado,
  registrarFalha,
  resetarTentativas,
} from "@/lib/auth/rate-limit";
import {
  COOKIE_SESSAO,
  criarSessao,
  rotacionarSessao,
  setCookieSessao,
} from "@/lib/auth/session";

/**
 * Resposta única para CPF inexistente, senha errada e conta bloqueada.
 * Mesmo corpo e mesmo status nos três casos: qualquer diferença permitiria
 * enumerar contas (REQ-AU-04 / CA-AU-04) ou detectar o bloqueio (CA-AU-08).
 */
function erroCredenciais() {
  return NextResponse.json({ erro: "CPF ou senha inválidos" }, { status: 401 });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const entrada = loginSchema.safeParse(corpo);

  // Validação de formato acontece antes de qualquer consulta ao banco
  // (CA-AU-03): CPF inválido nem chega a virar busca de usuário.
  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { cpf, senha } = entrada.data;
  const usuario = await prisma.usuario.findUnique({ where: { cpf } });

  if (!usuario || estaBloqueado(usuario)) {
    return erroCredenciais();
  }

  // Conta ainda sem senha: o login abre a sessão que autoriza definir a
  // senha em /primeiro-acesso (REQ-AU-02). Nenhum outro módulo abre até lá -
  // quem barra é `requirePrimeiroAcessoConcluido` no layout protegido.
  const primeiroAcesso = usuario.senhaHash === null;

  if (!primeiroAcesso) {
    const senhaConfere = await verifyPassword(usuario.senhaHash!, senha);

    if (!senhaConfere) {
      await registrarFalha(cpf);
      return erroCredenciais();
    }

    await resetarTentativas(cpf);
  }

  // Rotação do identificador de sessão no login (CA-AU-09).
  const idAnterior = (await cookies()).get(COOKIE_SESSAO)?.value;
  const sessao = idAnterior
    ? await rotacionarSessao(idAnterior, cpf)
    : await criarSessao(cpf);

  await setCookieSessao(sessao.id, sessao.expiraEm);

  // Campos escolhidos um a um: senha e hash nunca saem daqui (CA-AU-10).
  return NextResponse.json({
    usuario: {
      cpf: usuario.cpf,
      nome: usuario.nome,
      tipo: usuario.tipo,
      primeiraVez: usuario.primeiraVez,
      cdOfertante: usuario.cdOfertante,
    },
    primeiroAcesso,
    proximaRota: primeiroAcesso ? "/primeiro-acesso" : "/painel",
  });
}
