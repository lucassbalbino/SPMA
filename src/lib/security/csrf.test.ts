// Testes unitários do double-submit cookie de CSRF (REQ-SEC-15 / CA-SEC-15).
// `next/headers` é mockado: aqui só interessa a lógica de comparação e os
// atributos do cookie, não o mecanismo real do Next.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStore)),
}));

import {
  COOKIE_CSRF,
  limparCookieCSRF,
  setCookieCSRF,
  verificarCSRF,
} from "./csrf";

function criarRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com", { headers });
}

describe("setCookieCSRF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera um token, grava o cookie sem httpOnly (legível por JS) e devolve o valor gerado", async () => {
    const token = await setCookieCSRF();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(cookieStore.set).toHaveBeenCalledWith(
      COOKIE_CSRF,
      token,
      expect.objectContaining({
        httpOnly: false,
        secure: true,
        sameSite: "lax",
      }),
    );
  });
});

describe("verificarCSRF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna true quando cookie e header coincidem", async () => {
    cookieStore.get.mockReturnValue({ value: "token-123" });

    await expect(
      verificarCSRF(criarRequest({ "x-csrf-token": "token-123" })),
    ).resolves.toBe(true);
  });

  it("retorna false quando o header está ausente", async () => {
    cookieStore.get.mockReturnValue({ value: "token-123" });

    await expect(verificarCSRF(criarRequest())).resolves.toBe(false);
  });

  it("retorna false quando cookie e header têm o mesmo tamanho mas valores diferentes", async () => {
    cookieStore.get.mockReturnValue({ value: "token-123" });

    await expect(
      verificarCSRF(criarRequest({ "x-csrf-token": "token-456" })),
    ).resolves.toBe(false);
  });

  it("retorna false quando cookie e header têm tamanhos diferentes, sem lançar exceção do timingSafeEqual", async () => {
    cookieStore.get.mockReturnValue({ value: "token-123" });

    await expect(
      verificarCSRF(criarRequest({ "x-csrf-token": "token-12345678" })),
    ).resolves.toBe(false);
  });

  it("retorna false quando o cookie está ausente", async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(
      verificarCSRF(criarRequest({ "x-csrf-token": "token-123" })),
    ).resolves.toBe(false);
  });
});

describe("limparCookieCSRF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("remove o cookie de CSRF", async () => {
    await limparCookieCSRF();

    expect(cookieStore.delete).toHaveBeenCalledWith(COOKIE_CSRF);
  });
});
