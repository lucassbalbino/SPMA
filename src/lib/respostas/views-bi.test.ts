// O SQL versionado das VIEWs do `bi` não pode ficar para trás do mapa: uma
// pergunta que entra no código sem entrar na VIEW some do Power BI.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAPA, colunasDaEntrada } from "./colunas";
import { sqlDasViewsBi } from "./views-bi";

const arquivo = readFileSync(path.resolve(process.cwd(), "scripts/views-bi.sql"), "utf8").replace(/\r\n/g, "\n");

/** Colunas da VIEW `bi.<tabela>` no arquivo versionado, na ordem. */
function viewDe(tabela: string): string[] {
  const inicio = arquivo.indexOf(`VIEW \`bi\`.\`${tabela}\` AS SELECT\n`);
  if (inicio < 0) return [];
  const corpo = arquivo.slice(inicio, arquivo.indexOf("\nFROM ", inicio)).split("\n").slice(1);
  return corpo.map((linha) => linha.trim().replace(/^`|`,?$/g, ""));
}

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

  // CUR-19: a dimensão de curso, com todas as colunas de TB_Curso.
  it("cria bi.TB_Curso com todas as colunas de TB_Curso", () => {
    expect(viewDe("TB_Curso")).toEqual([
      "CD_Curso",
      "CD_Ofertante",
      "CD_Verba",
      "VL_Curso_Alocado",
      "Data_Criacao",
      "Criado_Por",
    ]);
  });

  // CUR-20: o pré e o pós não pedem colunas que saíram das tabelas.
  it("não pede ao pré nem ao pós as colunas que foram para TB_Curso", () => {
    for (const coluna of ["CD_Ofertante", "CD_Verba", "VL_Curso_Alocado", "Criado_Por", "Data_Criacao"]) {
      expect(viewDe("TB_Pre_Curso")).not.toContain(coluna);
      expect(viewDe("TB_Pos_Curso")).not.toContain(coluna);
    }
    expect(viewDe("TB_Pre_Curso").slice(0, 3)).toEqual(["CD_Curso", "Status", "Data_Encerramento"]);
    expect(viewDe("TB_Pos_Curso").slice(0, 4)).toEqual([
      "CD_Curso",
      "Status",
      "Data_Ultima_Atualizacao",
      "Data_Encerramento",
    ]);
  });

  it("nunca expõe senha nem token de sessão", () => {
    expect(arquivo).not.toMatch(/Senha|ID_Sessao|Token/i);
  });
});
