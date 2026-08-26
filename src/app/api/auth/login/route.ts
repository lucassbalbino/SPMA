// POST /api/auth/login (REQ-AU-01, REQ-AU-02, REQ-AU-03, REQ-AU-04,
// REQ-AU-11, REQ-AU-12, REQ-SEC-03, REQ-SEC-04, REQ-SEC-15).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validation/schemas/login.schema";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import {
  estaBloqueado,
  registrarFalha,
  resetarTentativas,
} from "@/lib/auth/rate-limit";
import {
  ipEstaBloqueado,
  obterIpCliente,
  registrarFalhaIp,
} from "@/lib/auth/rate-limit-ip";
import {
  COOKIE_SESSAO,
  criarSessao,
  rotacionarSessao,
  setCookieSessao,
} from "@/lib/auth/session";
import { setCookieCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

/**
 * Resposta única para CPF inexistente, senha errada, conta bloqueada e IP
 * bloqueado. Mesmo corpo e mesmo status em todos os casos: qualquer diferença
 * permitiria enumerar contas (REQ-AU-04 / CA-AU-04) ou detectar o bloqueio
 * (CA-AU-08 / CA-SEC-03).
 */
function erroCredenciais() {
  return NextResponse.json({ erro: "CPF ou senha inválidos" }, { status: 401 });
}

async function login(request: Request) {
  const ip = obterIpCliente(request);

  // REQ-SEC-03: cooldown por IP, independente do CPF, checado antes de
  // qualquer outra coisa - inclusive antes de validar o corpo da requisição.
  if (await ipEstaBloqueado(ip)) {
    return erroCredenciais();
  }

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

  // REQ-SEC-04: `verifyPassword` roda sempre - contra o hash real quando
  // existe, senão contra `DUMMY_HASH` - antes de decidir o veredito. Sem
  // isso, CPF inexistente ou em 1º acesso responderia quase instantâneo
  // enquanto senha errada custaria o tempo de um `argon2.verify`, um oráculo
  // de enumeração por tempo.
  const senhaConfere = await verifyPassword(
    usuario?.senhaHash ?? DUMMY_HASH,
    senha,
  );

  if (!usuario || estaBloqueado(usuario)) {
    await registrarFalhaIp(ip);
    return erroCredenciais();
  }

  // Conta ainda sem senha: o login abre a sessão que autoriza definir a
  // senha em /primeiro-acesso (REQ-AU-02). Nenhum outro módulo abre até lá -
  // quem barra é `requirePrimeiroAcessoConcluido` no layout protegido.
  const primeiroAcesso = usuario.senhaHash === null;

  if (!primeiroAcesso) {
    if (!senhaConfere) {
      await registrarFalha(cpf);
      await registrarFalhaIp(ip);
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
  // REQ-SEC-15: token de CSRF emitido junto da sessão - protege toda mutação
  // autenticada a partir daqui.
  await setCookieCSRF();

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

export const POST = comTratamentoDeErro(login);
