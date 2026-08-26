// POST /api/auth/logout (REQ-AU-12 - encerramento de sessão, REQ-SEC-15).
//
// Escolha documentada: sem sessão ativa a rota responde 401, e não 200.
// O task admite "idempotente/401 tratado"; 401 mantém o mesmo contrato das
// demais rotas de API e nunca devolve 5xx nesse caminho.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, destruirSessao, obterSessao } from "@/lib/auth/session";
import { limparCookieCSRF, verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function logout(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes da sessão (design.md - RH -> CSRF -> Guard). Sem token
  // válido a sessão permanece ativa - o logout não acontece.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  await destruirSessao(sessao.sessao.id);
  (await cookies()).delete(COOKIE_SESSAO);
  await limparCookieCSRF();

  return NextResponse.json({ ok: true });
}

export const POST = comTratamentoDeErro(logout);
