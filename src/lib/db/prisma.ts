// Singleton do PrismaClient.
//
// Em desenvolvimento o Next.js recarrega os módulos a cada alteração
// (hot reload). Sem o cache em `globalThis`, cada recarga instanciaria um
// novo PrismaClient e abriria um novo pool de conexões, esgotando o limite
// do MySQL em poucos minutos. Guardar a instância em `globalThis` faz o
// módulo reaproveitar sempre o mesmo client entre recargas.
//
// Em produção o módulo é avaliado uma única vez, então o cache global é
// desnecessário e fica desativado de propósito.
//
// Prisma 7 exige driver adapter explícito em todo PrismaClient, sem
// fallback (ver design.md, Tech Decisions). O adapter oficial para MySQL é
// `@prisma/adapter-mariadb` (protocolo compatível).
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";

const globalParaPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function criarPrismaClient(): PrismaClient {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalParaPrisma.prisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
