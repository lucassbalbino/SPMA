// POST /api/auth/logout (REQ-AU-12 - encerramento de sessão).
//
// Escolha documentada: sem sessão ativa a rota responde 401, e não 200.
// O task admite "idempotente/401 tratado"; 401 mantém o mesmo contrato das
// demais rotas de API e nunca devolve 5xx nesse caminho.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, destruirSessao, obterSessao } from "@/lib/auth/session";

export async function POST() {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  await destruirSessao(sessao.sessao.id);
  (await cookies()).delete(COOKIE_SESSAO);

  return NextResponse.json({ ok: true });
}
