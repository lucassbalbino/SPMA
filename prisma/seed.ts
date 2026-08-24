// Semente do primeiro Administrador Master (README passo 5). Idempotente:
// só cria o AM se nenhum Usuario com tipo='AM' existir ainda. CPF/nome vêm
// de variáveis de ambiente (SEED_AM_CPF, SEED_AM_NOME) - não há
// auto-registro de admin pela interface (ver .specs/STATE.md AD-010).
//
// Validação de CPF aqui é mínima (formato: 11 dígitos) - a regra módulo-11
// completa só existe a partir de T8 (lib/validation/cpf.ts).
import { config as loadEnv } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv();

export async function seedAdminMaster(prisma: PrismaClient) {
  const cpf = process.env.SEED_AM_CPF;
  const nome = process.env.SEED_AM_NOME;

  if (!cpf || !/^\d{11}$/.test(cpf)) {
    throw new Error("SEED_AM_CPF ausente ou em formato inválido (esperado 11 dígitos)");
  }
  if (!nome) {
    throw new Error("SEED_AM_NOME ausente");
  }

  const existingAM = await prisma.usuario.findFirst({ where: { tipo: "AM" } });
  if (existingAM) {
    return existingAM;
  }

  return prisma.usuario.create({
    data: {
      cpf,
      nome,
      tipo: "AM",
      senhaHash: null,
      primeiraVez: true,
    },
  });
}

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });
  try {
    const am = await seedAdminMaster(prisma);
    console.log(`Admin Master ok: CPF ${am.cpf}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.filename === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
