// Helper client-side para anexar o token CSRF (REQ-SEC-15) nas mutações
// feitas via `fetch` pelo navegador. `spma_csrf` (ver `./csrf.ts`) não é
// httpOnly justamente para que este helper consiga lê-lo.
//
// `cookieString` é injetável (em vez de ler `document.cookie` direto no
// corpo da função) para ser testável sem jsdom - o ambiente Vitest deste
// projeto é `node` (ver vitest.config.ts).
export function headerCSRF(
  cookieString: string = typeof document !== "undefined"
    ? document.cookie
    : "",
): Record<string, string> {
  const par = cookieString
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith("spma_csrf="));

  if (!par) {
    return {};
  }

  const valor = par.slice("spma_csrf=".length);

  return { "x-csrf-token": valor };
}
