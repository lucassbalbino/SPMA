// Testes de integração do limite de tentativas de login (REQ-AU-11 / CA-AU-08),
// contra o banco real `spma_test`. Cada teste usa um CPF próprio para não
// depender da ordem de execução.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  estaBloqueado,
  registrarFalha,
  resetarTentativas,
} from "@/lib/auth/rate-limit";

const CPF_CINCO_FALHAS = "11122233396";
const CPF_QUATRO_FALHAS = "22233344405";
const CPF_BLOQUEIO_ATIVO = "33344455508";
const CPF_BLOQUEIO_EXPIRADO = "44455566619";
const CPF_SEM_BLOQUEIO = "55566677720";
const CPF_RESET = "66677788830";

const TODOS_CPFS = [
  CPF_CINCO_FALHAS,
  CPF_QUATRO_FALHAS,
  CPF_BLOQUEIO_ATIVO,
  CPF_BLOQUEIO_EXPIRADO,
  CPF_SEM_BLOQUEIO,
  CPF_RESET,
];

const QUINZE_MINUTOS_MS = 15 * 60 * 1000;

async function criarUsuario(
  cpf: string,
  dados: { tentativasFalhas?: number; bloqueadoAte?: Date | null } = {},
) {
  return prisma.usuario.create({
    data: {
      cpf,
      nome: `Usuário ${cpf}`,
      tipo: "AL",
      tentativasFalhas: dados.tentativasFalhas ?? 0,
      bloqueadoAte: dados.bloqueadoAte ?? null,
    },
  });
}

describe("rate-limit (integration)", () => {
  beforeAll(async () => {
    await prisma.usuario.deleteMany({ where: { cpf: { in: TODOS_CPFS } } });
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { cpf: { in: TODOS_CPFS } } });
    await prisma.$disconnect();
  });

  it("bloqueia por 15 minutos na 5ª falha consecutiva", async () => {
    await criarUsuario(CPF_CINCO_FALHAS);
    const antes = Date.now();

    for (let i = 0; i < 5; i++) {
      await registrarFalha(CPF_CINCO_FALHAS);
    }

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_CINCO_FALHAS },
    });
    const depois = Date.now();

    expect(usuario.tentativasFalhas).toBe(5);
    expect(usuario.bloqueadoAte).not.toBeNull();
    // A janela é de 15 min contados no momento da 5ª falha, que ocorreu
    // entre `antes` e `depois`.
    expect(usuario.bloqueadoAte!.getTime()).toBeGreaterThanOrEqual(
      antes + QUINZE_MINUTOS_MS,
    );
    expect(usuario.bloqueadoAte!.getTime()).toBeLessThanOrEqual(
      depois + QUINZE_MINUTOS_MS,
    );
  });

  it("não bloqueia antes da 5ª falha", async () => {
    await criarUsuario(CPF_QUATRO_FALHAS);

    for (let i = 0; i < 4; i++) {
      await registrarFalha(CPF_QUATRO_FALHAS);
    }

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_QUATRO_FALHAS },
    });

    expect(usuario.tentativasFalhas).toBe(4);
    expect(usuario.bloqueadoAte).toBeNull();
  });

  it("estaBloqueado retorna true enquanto bloqueadoAte está no futuro", async () => {
    await criarUsuario(CPF_BLOQUEIO_ATIVO, {
      tentativasFalhas: 5,
      bloqueadoAte: new Date(Date.now() + QUINZE_MINUTOS_MS),
    });

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_BLOQUEIO_ATIVO },
    });

    expect(estaBloqueado(usuario)).toBe(true);
  });

  it("estaBloqueado retorna false depois de bloqueadoAte expirar", async () => {
    await criarUsuario(CPF_BLOQUEIO_EXPIRADO, {
      tentativasFalhas: 5,
      bloqueadoAte: new Date(Date.now() - 1000),
    });

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_BLOQUEIO_EXPIRADO },
    });

    expect(estaBloqueado(usuario)).toBe(false);
  });

  it("estaBloqueado retorna false para usuário sem bloqueio registrado", async () => {
    await criarUsuario(CPF_SEM_BLOQUEIO);

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_SEM_BLOQUEIO },
    });

    expect(estaBloqueado(usuario)).toBe(false);
  });

  it("resetarTentativas zera o contador e limpa o bloqueio", async () => {
    await criarUsuario(CPF_RESET, {
      tentativasFalhas: 5,
      bloqueadoAte: new Date(Date.now() + QUINZE_MINUTOS_MS),
    });

    await resetarTentativas(CPF_RESET);

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { cpf: CPF_RESET },
    });

    expect(usuario.tentativasFalhas).toBe(0);
    expect(usuario.bloqueadoAte).toBeNull();
  });
});
