import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("gera um hash diferente do texto original", async () => {
    const senha = "senhaSecreta123";
    const hash = await hashPassword(senha);

    expect(hash).not.toBe(senha);
  });

  it("gera um hash argon2id, não reversível por inspeção simples (não contém a senha em texto claro)", async () => {
    const senha = "senhaSecreta123";
    const hash = await hashPassword(senha);

    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash.includes(senha)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const senha = "senhaSecreta123";
    const hash1 = await hashPassword(senha);
    const hash2 = await hashPassword(senha);

    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("retorna true para a senha correta", async () => {
    const senha = "senhaSecreta123";
    const hash = await hashPassword(senha);

    await expect(verifyPassword(hash, senha)).resolves.toBe(true);
  });

  it("retorna false para a senha incorreta", async () => {
    const senha = "senhaSecreta123";
    const hash = await hashPassword(senha);

    await expect(verifyPassword(hash, "senhaErrada456")).resolves.toBe(false);
  });
});

describe("DUMMY_HASH", () => {
  it("é aceito por verifyPassword e resolve false sem lançar, para qualquer senha informada", async () => {
    await expect(
      verifyPassword(DUMMY_HASH, "qualquer coisa"),
    ).resolves.toBe(false);
  });
});
