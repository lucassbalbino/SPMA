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
    body: JSON.stringify({ documento: cpf, senha }),
  });
}

async function limparFixture() {
  await prisma.usuario.deleteMany({
    where: { documento: { in: [CPF_INEXISTENTE, CPF_COM_SENHA] } },
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
        documento: CPF_COM_SENHA,
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
      where: { documento: CPF_COM_SENHA },
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

  // P2 AC5 (correção pós-Verifier, ranked gap #4): `loginSchema` deixa passar
  // um documento de tamanho diferente de 11/14 (não rejeita no formato, ver
  // login.schema.test.ts) - é aqui, na rota, que ele precisa terminar com a
  // MESMA resposta genérica de credencial errada, nunca uma mensagem
  // distinta de "formato inválido" que revelaria a camada que reprovou.
  it("documento de tamanho diferente de 11/14: mesma resposta genérica de credencial errada, sem consulta reveladora", async () => {
    const DOCUMENTO_TAMANHO_INVALIDO = "123456789";

    const res = await POST(
      requisicaoLogin(
        DOCUMENTO_TAMANHO_INVALIDO,
        "qualquerSenha1",
        "198.51.100.62",
      ),
    );
    const corpo = await res.json();

    expect(res.status).toBe(401);
    expect(corpo.erro).toBe("CPF ou senha inválidos");
  });
});

// primeiro-acesso-senha-em-branco: a senha vazia é o pedido de 1º acesso e
// só vale para conta sem senha. Os caminhos de falha (PASB-02 a PASB-05)
// respondem antes de qualquer cookie, então cabem aqui; o caminho de sucesso
// (PASB-01) emite sessão via `next/headers` e é provado em e2e/login.spec.ts.
describe("POST /api/auth/login (integration) - 1º acesso com a senha em branco", () => {
  const CPF_SEM_SENHA = "70080090036";
  const CPF_COM_SENHA_VAZIA = "70080090117";
  const CPF_INEXISTENTE_VAZIA = "70080090206";
  const IP_SEM_SENHA = "198.51.100.70";
  const IP_COM_SENHA = "198.51.100.71";
  const IP_INEXISTENTE_VAZIA = "198.51.100.72";

  async function limpar() {
    await prisma.usuario.deleteMany({
      where: {
        documento: {
          in: [CPF_SEM_SENHA, CPF_COM_SENHA_VAZIA, CPF_INEXISTENTE_VAZIA],
        },
      },
    });
    await prisma.tentativaLoginIp.deleteMany({
      where: { ip: { in: [IP_SEM_SENHA, IP_COM_SENHA, IP_INEXISTENTE_VAZIA] } },
    });
  }

  async function tentativasFalhas(documento: string): Promise<number> {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { documento },
    });
    return usuario.tentativasFalhas;
  }

  beforeAll(async () => {
    await limpar();
    await prisma.usuario.createMany({
      data: [
        {
          documento: CPF_SEM_SENHA,
          nome: "Conta sem senha (PASB)",
          tipo: "AL",
          senhaHash: null,
          primeiraVez: true,
        },
        {
          documento: CPF_COM_SENHA_VAZIA,
          nome: "Conta com senha (PASB)",
          tipo: "AL",
          senhaHash: await hashPassword(SENHA_REAL),
        },
      ],
    });
  });

  afterAll(async () => {
    await limpar();
  });

  // PASB-02 + edge case "só espaços conta como senha digitada".
  it.each(["qualquerSenha1", "   "])(
    "PASB-02: conta sem senha com senha digitada (%j) - 401 genérico, sem sessão, falha contada no CPF",
    async (senha) => {
      const antes = await tentativasFalhas(CPF_SEM_SENHA);

      const res = await POST(requisicaoLogin(CPF_SEM_SENHA, senha, IP_SEM_SENHA));

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ erro: "CPF ou senha inválidos" });
      expect(res.headers.get("set-cookie")).toBeNull();
      expect(await tentativasFalhas(CPF_SEM_SENHA)).toBe(antes + 1);
    },
  );

  it("PASB-03: conta com senha e senha vazia - 401 genérico, sem sessão, falha contada no CPF", async () => {
    const antes = await tentativasFalhas(CPF_COM_SENHA_VAZIA);

    const res = await POST(requisicaoLogin(CPF_COM_SENHA_VAZIA, "", IP_COM_SENHA));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "CPF ou senha inválidos" });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await tentativasFalhas(CPF_COM_SENHA_VAZIA)).toBe(antes + 1);
  });

  it("PASB-04: documento sem conta e senha vazia - 401 genérico", async () => {
    const res = await POST(
      requisicaoLogin(CPF_INEXISTENTE_VAZIA, "", IP_INEXISTENTE_VAZIA),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "CPF ou senha inválidos" });
  });

  it("PASB-05: senha vazia em conta com senha - verifyPassword roda contra o hash real", async () => {
    verifyPasswordSpy.mockClear();
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { documento: CPF_COM_SENHA_VAZIA },
    });

    await POST(requisicaoLogin(CPF_COM_SENHA_VAZIA, "", IP_COM_SENHA));

    expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
    expect(verifyPasswordSpy).toHaveBeenCalledWith(usuario.senhaHash, "");
  });

  it("PASB-05: senha vazia em documento sem conta - verifyPassword roda contra DUMMY_HASH", async () => {
    verifyPasswordSpy.mockClear();

    await POST(requisicaoLogin(CPF_INEXISTENTE_VAZIA, "", IP_INEXISTENTE_VAZIA));

    expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
    expect(verifyPasswordSpy).toHaveBeenCalledWith(DUMMY_HASH, "");
  });
});
