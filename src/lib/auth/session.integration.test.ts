// Testes de integração do ciclo de vida da sessão (REQ-AU-01 / REQ-AU-12),
// contra o banco real `spma_test`. Cobre só as funções que falam com o banco;
// `obterSessao`/`setCookieSessao` dependem de `next/headers` e são exercidos
// pelos testes e2e das rotas que os consomem (T19/T21).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  buscarSessaoValida,
  criarSessao,
  destruirSessao,
  rotacionarSessao,
  SESSAO_TTL_MS,
} from "@/lib/auth/session";

const CPF_SESSAO = "77788899941";

describe("session (integration)", () => {
  beforeAll(async () => {
    await prisma.sessao.deleteMany({ where: { cpfUsuario: CPF_SESSAO } });
    await prisma.usuario.deleteMany({ where: { cpf: CPF_SESSAO } });
    await prisma.usuario.create({
      data: { cpf: CPF_SESSAO, nome: "Usuário de Sessão", tipo: "AL" },
    });
  });

  afterAll(async () => {
    await prisma.sessao.deleteMany({ where: { cpfUsuario: CPF_SESSAO } });
    await prisma.usuario.deleteMany({ where: { cpf: CPF_SESSAO } });
    await prisma.$disconnect();
  });

  it("criarSessao grava a sessão com expiraEm 60 minutos no futuro", async () => {
    const antes = Date.now();
    const sessao = await criarSessao(CPF_SESSAO);
    const depois = Date.now();

    const persistida = await prisma.sessao.findUniqueOrThrow({
      where: { id: sessao.id },
    });

    expect(persistida.cpfUsuario).toBe(CPF_SESSAO);
    expect(persistida.expiraEm.getTime()).toBeGreaterThanOrEqual(
      antes + SESSAO_TTL_MS,
    );
    expect(persistida.expiraEm.getTime()).toBeLessThanOrEqual(
      depois + SESSAO_TTL_MS,
    );
  });

  it("rotacionarSessao remove a sessão anterior e cria uma nova com id diferente", async () => {
    const anterior = await criarSessao(CPF_SESSAO);

    const nova = await rotacionarSessao(anterior.id, CPF_SESSAO);

    expect(nova.id).not.toBe(anterior.id);
    expect(
      await prisma.sessao.findUnique({ where: { id: anterior.id } }),
    ).toBeNull();
    expect(
      await prisma.sessao.findUnique({ where: { id: nova.id } }),
    ).not.toBeNull();
  });

  it("buscarSessaoValida retorna usuário e sessão para uma sessão vigente", async () => {
    const sessao = await criarSessao(CPF_SESSAO);

    const encontrada = await buscarSessaoValida(sessao.id);

    expect(encontrada).not.toBeNull();
    expect(encontrada!.sessao.id).toBe(sessao.id);
    expect(encontrada!.usuario.cpf).toBe(CPF_SESSAO);
  });

  it("buscarSessaoValida retorna null para id inexistente", async () => {
    const encontrada = await buscarSessaoValida(
      "00000000-0000-4000-8000-000000000000",
    );

    expect(encontrada).toBeNull();
  });

  it("buscarSessaoValida retorna null para sessão com expiraEm no passado", async () => {
    const expirada = await prisma.sessao.create({
      data: {
        cpfUsuario: CPF_SESSAO,
        expiraEm: new Date(Date.now() - 1000),
      },
    });

    const encontrada = await buscarSessaoValida(expirada.id);

    expect(encontrada).toBeNull();
  });

  it("destruirSessao remove a linha da sessão", async () => {
    const sessao = await criarSessao(CPF_SESSAO);

    await destruirSessao(sessao.id);

    expect(
      await prisma.sessao.findUnique({ where: { id: sessao.id } }),
    ).toBeNull();
  });
});
