import { describe, expect, it } from "vitest";
import { criarLimitador } from "./limite";

describe("criarLimitador (PBI-20)", () => {
  it("por padrão, 20 pedidos passam na janela e o 21º é negado", () => {
    const limitador = criarLimitador({ agora: () => 0 });

    const resultados = Array.from({ length: 21 }, () => limitador.permitir("sessao-a"));

    expect(resultados.slice(0, 20).every(Boolean)).toBe(true);
    expect(resultados[20]).toBe(false);
  });

  it("depois de 60 000 ms a mesma chave volta a passar", () => {
    let agora = 0;
    const limitador = criarLimitador({ agora: () => agora });
    for (let i = 0; i < 20; i++) limitador.permitir("sessao-a");

    agora = 59_999;
    expect(limitador.permitir("sessao-a")).toBe(false);

    agora = 60_000;
    expect(limitador.permitir("sessao-a")).toBe(true);
  });

  it("chaves diferentes não se afetam", () => {
    const limitador = criarLimitador({ agora: () => 0 });
    for (let i = 0; i < 20; i++) limitador.permitir("sessao-a");

    expect(limitador.permitir("sessao-a")).toBe(false);
    expect(limitador.permitir("sessao-b")).toBe(true);
  });

  it("entradas vencidas são removidas", () => {
    let agora = 0;
    const limitador = criarLimitador({ agora: () => agora });
    limitador.permitir("sessao-a");
    limitador.permitir("sessao-b");
    expect(limitador.tamanho()).toBe(2);

    agora = 60_000;
    limitador.permitir("sessao-c");

    expect(limitador.tamanho()).toBe(1);
  });
});
