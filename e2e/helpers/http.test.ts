// Testes unitários do suporte a CSRF em `http.ts` (T19, REQ-SEC-15 - suporte
// de teste). As demais funções do arquivo (`novoCliente`, `cabecalhoCookie`,
// `idSessaoDaResposta`) já são exercitadas indiretamente por todos os specs
// e2e que as usam - sem tarefa pedindo teste direto para elas.
import { describe, expect, it } from "vitest";
import type { APIResponse } from "@playwright/test";
import {
  COOKIE_CSRF,
  COOKIE_SESSAO,
  cabecalhosAutenticados,
  idCsrfDaResposta,
} from "./http";

function respostaComSetCookie(...valores: string[]): APIResponse {
  return {
    headersArray: () =>
      valores.map((value) => ({ name: "set-cookie", value })),
  } as unknown as APIResponse;
}

describe("idCsrfDaResposta", () => {
  it("extrai corretamente o valor do cookie spma_csrf de uma resposta de login", () => {
    const res = respostaComSetCookie(
      `${COOKIE_SESSAO}=id-sessao-123; Path=/; HttpOnly`,
      `${COOKIE_CSRF}=token-csrf-abc; Path=/; Secure; SameSite=Lax`,
    );

    expect(idCsrfDaResposta(res)).toBe("token-csrf-abc");
  });

  it("retorna null quando a resposta não emite o cookie spma_csrf", () => {
    const res = respostaComSetCookie(
      `${COOKIE_SESSAO}=id-sessao-123; Path=/; HttpOnly`,
    );

    expect(idCsrfDaResposta(res)).toBeNull();
  });
});

describe("cabecalhosAutenticados", () => {
  it("produz um objeto com Cookie e x-csrf-token consistentes entre si", () => {
    const headers = cabecalhosAutenticados("id-sessao-123", "token-csrf-abc");

    expect(headers.Cookie).toContain(`${COOKIE_SESSAO}=id-sessao-123`);
    expect(headers.Cookie).toContain(`${COOKIE_CSRF}=token-csrf-abc`);
    expect(headers["x-csrf-token"]).toBe("token-csrf-abc");
  });
});
