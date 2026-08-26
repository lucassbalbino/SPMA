// Apoio HTTP dos specs e2e.
//
// Cada chamada usa um APIRequestContext novo (jar de cookies vazio), então o
// cookie enviado é sempre o que o teste escolheu explicitamente - nada de
// cookie residual de uma requisição anterior mascarando o cenário. Isso
// também evita depender de como o jar trata `Secure` sobre http://localhost.
import { request as apiRequest, type APIResponse } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";
export const COOKIE_SESSAO = "spma_sessao";
export const COOKIE_CSRF = "spma_csrf";

export async function novoCliente() {
  return apiRequest.newContext({ baseURL: BASE_URL });
}

/** Todos os headers Set-Cookie da resposta, concatenados. */
export function cookiesDaResposta(res: APIResponse): string {
  return res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value)
    .join("\n");
}

/** Valor do cookie de sessão emitido pela resposta, ou null se não houver. */
export function idSessaoDaResposta(res: APIResponse): string | null {
  const match = cookiesDaResposta(res).match(
    new RegExp(`${COOKIE_SESSAO}=([^;\\s]+)`),
  );
  return match ? match[1] : null;
}

/** Header Cookie para autenticar uma requisição com a sessão informada. */
export function cabecalhoCookie(idSessao: string): Record<string, string> {
  return { Cookie: `${COOKIE_SESSAO}=${idSessao}` };
}

/** Valor do cookie CSRF emitido pela resposta, ou null se não houver. */
export function idCsrfDaResposta(res: APIResponse): string | null {
  const match = cookiesDaResposta(res).match(
    new RegExp(`${COOKIE_CSRF}=([^;\\s]+)`),
  );
  return match ? match[1] : null;
}

/**
 * Headers para autenticar uma requisição mutante contra uma rota protegida
 * por CSRF (REQ-SEC-15): cookie de sessão + cookie CSRF via double-submit,
 * mais o header `x-csrf-token` ecoando o mesmo valor do cookie CSRF.
 */
export function cabecalhosAutenticados(
  idSessao: string,
  idCsrf: string,
): Record<string, string> {
  return {
    Cookie: `${COOKIE_SESSAO}=${idSessao}; ${COOKIE_CSRF}=${idCsrf}`,
    "x-csrf-token": idCsrf,
  };
}
