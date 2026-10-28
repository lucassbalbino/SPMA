// O SQL versionado das VIEWs do `bi` não pode ficar para trás do mapa: uma
// pergunta que entra no código sem entrar na VIEW some do Power BI.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAPA, colunasDaEntrada } from "./colunas";
import { sqlDasViewsBi } from "./views-bi";

const arquivo = readFileSync(path.resolve(process.cwd(), "scripts/views-bi.sql"), "utf8").replace(/\r\n/g, "\n");

describe("VIEWs do banco bi", () => {
  it("o arquivo versionado é o que o gerador produz (rode npm run bi:views)", () => {
    expect(arquivo).toBe(sqlDasViewsBi());
  });

  it("expõe todas as colunas de resposta dos quatro formulários", () => {
    for (const formulario of Object.keys(MAPA) as (keyof typeof MAPA)[]) {
      for (const coluna of MAPA[formulario].flatMap(colunasDaEntrada)) {
        expect(arquivo).toContain(`\`${coluna}\``);
      }
    }
  });

  it("nunca expõe senha nem token de sessão", () => {
    expect(arquivo).not.toMatch(/Senha|ID_Sessao|Token/i);
  });
});
