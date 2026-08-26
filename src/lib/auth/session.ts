// Ciclo de vida da sessão (REQ-AU-01, REQ-AU-12 / AD-031).
//
// O token de sessão é o próprio `Sessao.id` (uuid v4 opaco, 122 bits) — sem
// JWT nem assinatura, conforme design.md (Tech Decisions). O cookie é
// httpOnly + secure + sameSite=lax, e o login rotaciona o id para prevenir
// session fixation (CA-AU-09).
import { cookies } from "next/headers";
import { prisma } from "../db/prisma";
import type { SessaoModel, UsuarioModel } from "../../generated/prisma/models";
import { COOKIE_SESSAO } from "./session-cookie";

/** Nome do cookie de sessão - definido em ./session-cookie.ts (sem dependência de Prisma, ver esse arquivo), reexportado aqui para não mudar a API que as rotas já usam. */
export { COOKIE_SESSAO };

/**
 * TTL fixo de 60 minutos. `Sessao.expiraEm` é NOT NULL e precisa de um valor
 * concreto; a política formal de expiração por inatividade (sliding window) é
 * REQ-SEC-09, escopo da feature `seguranca-transversal`.
 */
export const SESSAO_TTL_MS = 60 * 60 * 1000;

export type SessaoComUsuario = { usuario: UsuarioModel; sessao: SessaoModel };

export async function criarSessao(
  cpf: string,
): Promise<{ id: string; expiraEm: Date }> {
  const sessao = await prisma.sessao.create({
    data: { cpfUsuario: cpf, expiraEm: new Date(Date.now() + SESSAO_TTL_MS) },
  });

  return { id: sessao.id, expiraEm: sessao.expiraEm };
}

/** Remove a sessão. Tolerante a id inexistente (logout é idempotente). */
export async function destruirSessao(id: string): Promise<void> {
  await prisma.sessao.deleteMany({ where: { id } });
}

/**
 * Destrói a sessão anterior e cria uma nova (CA-AU-09). Devolve também
 * `expiraEm` para o chamador emitir o cookie sem uma consulta extra.
 */
export async function rotacionarSessao(
  sessaoAnteriorId: string,
  cpf: string,
): Promise<{ id: string; expiraEm: Date }> {
  await destruirSessao(sessaoAnteriorId);
  return criarSessao(cpf);
}

/**
 * Sessão válida = existe no banco e ainda não expirou. Toda leitura vigente
 * estende `expiraEm` para `now + SESSAO_TTL_MS` (sliding window de
 * inatividade - REQ-SEC-09): a janela é renovada a cada requisição
 * autenticada, não fixa desde o login.
 */
export async function buscarSessaoValida(
  id: string,
): Promise<SessaoComUsuario | null> {
  const registro = await prisma.sessao.findUnique({
    where: { id },
    include: { usuario: true },
  });

  if (!registro || registro.expiraEm.getTime() <= Date.now()) {
    return null;
  }

  const { usuario } = registro;
  const sessao = await prisma.sessao.update({
    where: { id },
    data: { expiraEm: new Date(Date.now() + SESSAO_TTL_MS) },
  });

  return { usuario, sessao };
}

/** Lê o cookie da requisição atual e resolve a sessão correspondente. */
export async function obterSessao(): Promise<SessaoComUsuario | null> {
  const id = (await cookies()).get(COOKIE_SESSAO)?.value;
  return id ? buscarSessaoValida(id) : null;
}

// SPEC_DEVIATION: design.md declara `setCookieSessao(id, expiraEm): void`.
// Reason: no Next.js 16 `cookies()` é assíncrono (ver
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md),
// então o helper precisa ser async. Atributos do cookie inalterados.
//
// `expiraEm` não é mais usado para fixar `expires` no cookie (REQ-SEC-09):
// vira cookie de sessão do navegador (some ao fechar o navegador, sem prazo
// fixo), porque Server Components não conseguem reemitir `Set-Cookie` a cada
// leitura para fazer o cookie "deslizar" junto com o sliding window. A
// autoridade de expiração passa a ser inteiramente `Sessao.expiraEm` no
// banco (ver `buscarSessaoValida`). Parâmetro mantido para não alterar a
// assinatura consumida por `login/route.ts`.
export async function setCookieSessao(
  id: string,
  expiraEm: Date,
): Promise<void> {
  void expiraEm;
  (await cookies()).set(COOKIE_SESSAO, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}
