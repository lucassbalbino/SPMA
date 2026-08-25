// Testes unitários do helper client-side de CSRF (REQ-SEC-15).
import { describe, expect, it } from "vitest";
import { headerCSRF } from "./csrf-client";

describe("headerCSRF", () => {
  it("extrai o token de spma_csrf de uma string com múltiplos cookies", () => {
    const cookies = "outro=valor; spma_csrf=token-abc-123; spma_sessao=xyz";

    expect(headerCSRF(cookies)).toEqual({ "x-csrf-token": "token-abc-123" });
  });

  it("devolve objeto vazio quando spma_csrf não está presente", () => {
    const cookies = "outro=valor; spma_sessao=xyz";

    expect(headerCSRF(cookies)).toEqual({});
  });

  it("devolve objeto vazio para string de cookies vazia", () => {
    expect(headerCSRF("")).toEqual({});
  });
});
