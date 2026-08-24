// Guardas de rota chamadas no topo de cada layout/página protegida.
//
// Esta é a autoridade real de autorização (REQ-SEC-14 / AD-033): `proxy.ts`
// só faz um redirect barato por presença de cookie e não pode consultar o
// banco, então toda checagem que vale roda aqui, a cada request.
//
// As rotas de API não usam `requireSession()`: `redirect()` produz um 307, e
// elas precisam responder 401. Lá o padrão é `obterSessao()` + resposta 401
// explícita (ver os route handlers em `src/app/api`).
import { redirect } from "next/navigation";
import { obterSessao, type SessaoComUsuario } from "./session";
import type { TipoUsuario } from "../../generated/prisma/enums";

/** Sessão válida ou volta para o login. */
export async function requireSession(): Promise<SessaoComUsuario> {
  const sessao = await obterSessao();

  if (!sessao) {
    redirect("/login");
  }

  return sessao;
}

/** Enquanto o 1º acesso não terminar, nenhum outro módulo abre (REQ-AU-02). */
export function requirePrimeiroAcessoConcluido(usuario: {
  primeiraVez: boolean;
}): void {
  if (usuario.primeiraVez) {
    redirect("/primeiro-acesso");
  }
}

/**
 * GO sem Ofertante vinculado cadastra o seu antes de seguir (REQ-AU-09).
 * Vale só para GO: AL tem escopo pelo curso e VO/GO são os únicos perfis
 * vinculados a Ofertante (AD-012).
 */
export function requireOfertanteVinculado(usuario: {
  tipo: TipoUsuario;
  cdOfertante: number | null;
}): void {
  if (usuario.tipo === "GO" && usuario.cdOfertante === null) {
    redirect("/cadastro-ofertante");
  }
}
