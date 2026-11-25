import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAINEL_POR_PERFIL,
  ROLE_POR_PAINEL,
  identidadePowerBi,
  painelDoPerfil,
} from "./catalogo";

const CPF = "52998224725";
const CPF_COM_ZERO = "01234567890";
const CNPJ_GO = "11222333000181";

describe("painelDoPerfil (PBI-08)", () => {
  it.each(["AM", "GT", "VT"] as const)("%s usa o painel nacional", (tipo) => {
    expect(painelDoPerfil(tipo)).toBe("nacional");
  });

  it.each(["GO", "VO"] as const)("%s usa o painel do ofertante", (tipo) => {
    expect(painelDoPerfil(tipo)).toBe("ofertante");
  });

  it("AL não tem painel", () => {
    expect(painelDoPerfil("AL")).toBeNull();
  });

  it("a tabela cobre os seis perfis, e só o AL fica sem painel", () => {
    expect(PAINEL_POR_PERFIL).toEqual({
      AM: "nacional",
      GT: "nacional",
      VT: "nacional",
      GO: "ofertante",
      VO: "ofertante",
      AL: null,
    });
  });
});

describe("ROLE_POR_PAINEL (PBI-04)", () => {
  it("os dois painéis usam a role validada pelo cliente, com o ç", () => {
    expect(ROLE_POR_PAINEL.nacional).toBe("segurança_SPMA");
    expect(ROLE_POR_PAINEL.ofertante).toBe("segurança_SPMA");
  });
});

describe("identidadePowerBi (PBI-03, PBI-08, PBI-09)", () => {
  it.each(["AM", "GT", "VT"] as const)("%s envia o próprio documento", (tipo) => {
    expect(identidadePowerBi({ tipo, documento: CPF, cdOfertante: null })).toBe(CPF);
  });

  it("GO envia o próprio CNPJ", () => {
    expect(identidadePowerBi({ tipo: "GO", documento: CNPJ_GO, cdOfertante: null })).toBe(
      CNPJ_GO,
    );
  });

  it("VO envia o CNPJ do GO vinculado, não o próprio CPF", () => {
    expect(identidadePowerBi({ tipo: "VO", documento: CPF, cdOfertante: CNPJ_GO })).toBe(
      CNPJ_GO,
    );
  });

  it("VO sem GO vinculado não tem identidade (PBI-09)", () => {
    expect(identidadePowerBi({ tipo: "VO", documento: CPF, cdOfertante: null })).toBeNull();
  });

  it("AL não tem identidade (PBI-08)", () => {
    expect(identidadePowerBi({ tipo: "AL", documento: CPF, cdOfertante: null })).toBeNull();
  });

  it("documento com zero à esquerda sai igual, como texto (edge case)", () => {
    expect(identidadePowerBi({ tipo: "VT", documento: CPF_COM_ZERO, cdOfertante: null })).toBe(
      "01234567890",
    );
  });
});

describe("dependências do módulo", () => {
  it("não importa Prisma nem next/*", () => {
    const fonte = readFileSync(path.join(__dirname, "catalogo.ts"), "utf8");
    const imports = [...fonte.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

    expect(imports.length).toBeGreaterThan(0);
    for (const origem of imports) {
      expect(origem).not.toMatch(/^next(\/|$)/);
      expect(origem).not.toMatch(/prisma\/client|db\/prisma|@prisma/);
    }
  });
});
