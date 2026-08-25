// Testes de integração do limite de tentativas de login por IP
// (REQ-SEC-03 / CA-SEC-03), contra o banco real `spma_test`. Cada teste usa
// um IP próprio para não depender da ordem de execução.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  MAX_TENTATIVAS_IP,
  ipEstaBloqueado,
  obterIpCliente,
  registrarFalhaIp,
} from "@/lib/auth/rate-limit-ip";
import { BLOQUEIO_MS } from "@/lib/auth/rate-limit";

const IP_SEM_HISTORICO = "203.0.113.10";
const IP_VINTE_FALHAS = "203.0.113.20";

const TODOS_IPS = [IP_SEM_HISTORICO, IP_VINTE_FALHAS];

describe("rate-limit-ip (integration)", () => {
  beforeAll(async () => {
    await prisma.tentativaLoginIp.deleteMany({
      where: { ip: { in: TODOS_IPS } },
    });
  });

  afterAll(async () => {
    await prisma.tentativaLoginIp.deleteMany({
      where: { ip: { in: TODOS_IPS } },
    });
    await prisma.$disconnect();
  });

  describe("obterIpCliente", () => {
    it("extrai o primeiro IP de uma lista x-forwarded-for com múltiplos IPs (proxy encadeado)", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "198.51.100.5, 10.0.0.1, 10.0.0.2" },
      });

      expect(obterIpCliente(request)).toBe("198.51.100.5");
    });

    it('retorna "desconhecido" quando o header está ausente', () => {
      const request = new Request("https://example.com");

      expect(obterIpCliente(request)).toBe("desconhecido");
    });
  });

  describe("ipEstaBloqueado", () => {
    it("retorna false para um IP sem histórico", async () => {
      await expect(ipEstaBloqueado(IP_SEM_HISTORICO)).resolves.toBe(false);
    });
  });

  describe("registrarFalhaIp", () => {
    it(`bloqueia por BLOQUEIO_MS ao atingir ${MAX_TENTATIVAS_IP} falhas`, async () => {
      const antes = Date.now();

      for (let i = 0; i < MAX_TENTATIVAS_IP; i++) {
        await registrarFalhaIp(IP_VINTE_FALHAS);
      }

      const depois = Date.now();

      const registro = await prisma.tentativaLoginIp.findUniqueOrThrow({
        where: { ip: IP_VINTE_FALHAS },
      });

      expect(registro.tentativas).toBe(MAX_TENTATIVAS_IP);
      expect(registro.bloqueadoAte).not.toBeNull();
      expect(registro.bloqueadoAte!.getTime()).toBeGreaterThanOrEqual(
        antes + BLOQUEIO_MS,
      );
      expect(registro.bloqueadoAte!.getTime()).toBeLessThanOrEqual(
        depois + BLOQUEIO_MS,
      );
      await expect(ipEstaBloqueado(IP_VINTE_FALHAS)).resolves.toBe(true);
    });
  });
});
