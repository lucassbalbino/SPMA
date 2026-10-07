// Os gates de autenticação que TODA rota de API repetia à mão.
//
// Até aqui cada route handler reescrevia o mesmo preâmbulo - verificar CSRF,
// resolver a sessão, responder 401 - em 12 arquivos. O risco não era o
// volume: era a ORDEM. REQ-SEC-15 exige CSRF ANTES da sessão (uma requisição
// forjada não deve nem chegar a tocar o banco), e isso só estava garantido
// por cada autor repetir o padrão corretamente, arquivo a arquivo.
// `exigirMutacao` passa a ser o único lugar onde essa ordem existe.
//
// Os helpers LANÇAM `ErroHttp` em vez de devolver `Response`: é o que permite
// `const sessao = await exigirMutacao(request)` numa linha, sem o
// `if (x instanceof Response) return x` que a alternativa exigiria em cada
// chamada. Quem converte em resposta é `comTratamentoDeErro`, que já envolve
// toda rota.
import { obterSessao, type SessaoComUsuario } from "../auth/session";
import { verificarCSRF } from "../security/csrf";
import { erroHttp } from "./erro-http";

/**
 * Sessão válida ou 401. As rotas de API não usam `requireSession()` de
 * `lib/auth/guards.ts`: aquela redireciona (307), e aqui o contrato é 401.
 */
export async function exigirSessao(): Promise<SessaoComUsuario> {
  const sessao = await obterSessao();

  if (!sessao) {
    throw erroHttp(401, "Não autenticado");
  }

  return sessao;
}

/** REQ-SEC-15: token anti-CSRF válido ou 403. */
export async function exigirCSRF(request: Request): Promise<void> {
  if (!(await verificarCSRF(request))) {
    throw erroHttp(403, "Requisição inválida");
  }
}

/**
 * Preâmbulo completo de toda rota que MUTA estado: CSRF primeiro, sessão
 * depois (design.md - RH -> CSRF -> Guard). Devolve a sessão porque todo
 * chamador precisa dela em seguida.
 */
export async function exigirMutacao(request: Request): Promise<SessaoComUsuario> {
  await exigirCSRF(request);
  return exigirSessao();
}
