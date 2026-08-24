import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedAdminMaster } from "./seed";

const TEST_CPF = "12345678901";
const TEST_NOME = "Admin Master de Teste";

describe("seedAdminMaster (integration)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.SEED_AM_CPF = TEST_CPF;
    process.env.SEED_AM_NOME = TEST_NOME;
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
    prisma = new PrismaClient({ adapter });
    await prisma.usuario.deleteMany({ where: { tipo: "AM" } });
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { tipo: "AM" } });
    await prisma.$disconnect();
  });

  it("cria o AM na primeira execução com senhaHash null, primeiraVez true e tipo AM", async () => {
    await seedAdminMaster(prisma);

    const usuarios = await prisma.usuario.findMany({ where: { tipo: "AM" } });
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].cpf).toBe(TEST_CPF);
    expect(usuarios[0].nome).toBe(TEST_NOME);
    expect(usuarios[0].senhaHash).toBeNull();
    expect(usuarios[0].primeiraVez).toBe(true);
  });

  it("não duplica o AM ao rodar uma segunda vez seguida", async () => {
    await seedAdminMaster(prisma);
    await seedAdminMaster(prisma);

    const usuarios = await prisma.usuario.findMany({ where: { tipo: "AM" } });
    expect(usuarios).toHaveLength(1);
  });
});
