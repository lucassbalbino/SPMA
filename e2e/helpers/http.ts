// Apoio HTTP dos specs e2e.
//
// Cada chamada usa um APIRequestContext novo (jar de cookies vazio), então o
// cookie enviado é sempre o que o teste escolheu explicitamente - nada de
// cookie residual de uma requisição anterior mascarando o cenário. Isso
// também evita depender de como o jar trata `Secure` sobre http://localhost.
import { request as apiRequest, test, type APIResponse } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";
export const COOKIE_SESSAO = "spma_sessao";
export const COOKIE_CSRF = "spma_csrf";

/**
 * IP de origem próprio de cada worker do Playwright.
 *
 * O limite de login por IP (REQ-SEC-03, `MAX_TENTATIVAS_IP = 20`) é contado
 * por `x-forwarded-for`, e sem o header tudo cai num balde único
 * (`"desconhecido"`). Com a suíte em paralelo, as falhas de login de arquivos
 * diferentes somariam nesse mesmo balde e um worker bloquearia o login
 * legítimo de outro - regressão intermitente e dificílima de ler.
 *
 * Dando a cada worker a sua faixa, o orçamento de 20 falhas passa a ser
 * individual. Usa a documentação RFC 5737 (`203.0.113.0/24`, reservada para
 * exemplos) para não confundir com IP real em log nenhum.
 *
 * Header por requisição tem precedência sobre `extraHTTPHeaders`, então os
 * testes que já usam IP dedicado (`login.spec.ts`) seguem valendo intactos.
 */
function ipDoWorker(): string {
  return `203.0.113.${test.info().parallelIndex + 1}`;
}

export async function novoCliente() {
  return apiRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "x-forwarded-for": ipDoWorker() },
  });
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
