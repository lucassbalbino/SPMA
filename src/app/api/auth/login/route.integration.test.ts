// REQ-SEC-04 (mecanismo): prova determinística de que `verifyPassword` roda
// sempre - contra o hash real quando existe, contra `DUMMY_HASH` quando não -
// antes do login decidir o veredito de erro. Não depende de medir tempo de
// parede: o teste de timing em `e2e/login.spec.ts` é só evidência
// complementar, porque sob `next dev` o ruído de framework (~150-250ms) pode
// dominar o custo real de um `argon2.verify` (~70-90ms) e não discrimina de
// forma confiável (achado do Verifier, `validation.md`, iteração 1). Aqui a
// asserção é sobre a chamada em si - com qual hash `verifyPassword` foi
// invocado - e por isso é imune a esse ruído.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const verifyPasswordSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/password", async () => {
  const real =
    await vi.importActual<typeof import("@/lib/auth/password")>(
      "@/lib/auth/password",
    );
  return {
    ...real,
    verifyPassword: verifyPasswordSpy.mockImplementation(real.verifyPassword),
  };
});

import { prisma } from "@/lib/db/prisma";
import { DUMMY_HASH, hashPassword } from "@/lib/auth/password";
import { POST } from "./route";

const CPF_INEXISTENTE = "30040050009";
const CPF_COM_SENHA = "60070080020";
const SENHA_REAL = "SenhaCorreta123";
const IP_INEXISTENTE = "198.51.100.60";
const IP_SENHA_ERRADA = "198.51.100.61";

function requisicaoLogin(cpf: string, senha: string, ip: string): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ cpf, senha }),
  });
}

async function limparFixture() {
  await prisma.usuario.deleteMany({
    where: { cpf: { in: [CPF_INEXISTENTE, CPF_COM_SENHA] } },
  });
  await prisma.tentativaLoginIp.deleteMany({
    where: { ip: { in: [IP_INEXISTENTE, IP_SENHA_ERRADA] } },
  });
}

describe("POST /api/auth/login (integration) - REQ-SEC-04 mecanismo de normalização de tempo", () => {
  beforeAll(async () => {
    await limparFixture();
    await prisma.usuario.create({
      data: {
        cpf: CPF_COM_SENHA,
        nome: "Usuário com senha (timing)",
        tipo: "AL",
        senhaHash: await hashPassword(SENHA_REAL),
      },
    });
  });

  afterAll(async () => {
    await limparFixture();
    await prisma.$disconnect();
  });

  it("CPF inexistente: verifyPassword é chamado mesmo assim, contra DUMMY_HASH", async () => {
    verifyPasswordSpy.mockClear();

    const res = await POST(
      requisicaoLogin(CPF_INEXISTENTE, "qualquerSenha1", IP_INEXISTENTE),
    );

    expect(res.status).toBe(401);
    expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
    expect(verifyPasswordSpy).toHaveBeenCalledWith(DUMMY_HASH, "qualquerSenha1");
  });

  it("senha errada em conta existente: verifyPassword é chamado contra o hash real (nunca DUMMY_HASH)", async () => {
    verifyPasswordSpy.mockClear();

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_COM_SENHA },
    });

    const res = await POST(
      requisicaoLogin(CPF_COM_SENHA, "senhaErrada999", IP_SENHA_ERRADA),
    );

    expect(res.status).toBe(401);
    expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
    expect(verifyPasswordSpy).toHaveBeenCalledWith(
      usuario.senhaHash,
      "senhaErrada999",
    );
    expect(verifyPasswordSpy).not.toHaveBeenCalledWith(
      DUMMY_HASH,
      expect.anything(),
    );
  });
});
