// POST /api/auth/logout (REQ-AU-12 - encerramento de sessão, REQ-SEC-15).
//
// Escolha documentada: sem sessão ativa a rota responde 401, e não 200.
// O task admite "idempotente/401 tratado"; 401 mantém o mesmo contrato das
// demais rotas de API e nunca devolve 5xx nesse caminho.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, destruirSessao } from "@/lib/auth/session";
import { limparCookieCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";

async function logout(request: Request) {
  // REQ-SEC-15: `exigirMutacao` checa o token anti-CSRF ANTES da sessão
  // (design.md - RH -> CSRF -> Guard). Sem token válido a sessão permanece
  // ativa - o logout não acontece.
  const sessao = await exigirMutacao(request);

  await destruirSessao(sessao.sessao.id);
  (await cookies()).delete(COOKIE_SESSAO);
  await limparCookieCSRF();

  return NextResponse.json({ ok: true });
}

export const POST = comTratamentoDeErro(logout);
