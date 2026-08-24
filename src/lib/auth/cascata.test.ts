import { describe, expect, it } from "vitest";
import { TipoUsuario } from "../../generated/prisma/enums";
import { podeCriar, resolverOfertante } from "./cascata";

// Matriz esperada por REQ-AU-05/AD-009, escrita diretamente a partir da spec
// (não referencia TIPOS_PERMITIDOS do módulo sob teste).
const MATRIZ_ESPERADA: Record<TipoUsuario, TipoUsuario[]> = {
  AM: ["AM", "GT", "VT", "GO", "VO", "AL"],
  GT: ["GT", "VT", "GO"],
  VT: [],
  GO: ["GO", "VO", "AL"],
  VO: [],
  AL: [],
};

const TODOS_OS_TIPOS = Object.values(TipoUsuario);

describe("podeCriar", () => {
  const combinacoes = TODOS_OS_TIPOS.flatMap((criador) =>
    TODOS_OS_TIPOS.map((alvo) => ({
      criador,
      alvo,
      esperado: MATRIZ_ESPERADA[criador].includes(alvo),
    })),
  );

  it.each(combinacoes)(
    "$criador criando $alvo deve retornar $esperado",
    ({ criador, alvo, esperado }) => {
      expect(podeCriar(criador, alvo)).toBe(esperado);
    },
  );
});

describe("resolverOfertante", () => {
  it("ignora cdOfertanteInformado quando criador é GO criando GO", () => {
    const resultado = resolverOfertante(
      { tipo: TipoUsuario.GO, cdOfertante: 10 },
      TipoUsuario.GO,
      999,
    );

    expect(resultado).toBe(10);
  });

  it("ignora cdOfertanteInformado quando criador é GO criando VO", () => {
    const resultado = resolverOfertante(
      { tipo: TipoUsuario.GO, cdOfertante: 10 },
      TipoUsuario.VO,
      999,
    );

    expect(resultado).toBe(10);
  });

  it("usa cdOfertanteInformado quando criador é AM e alvo é GO", () => {
    const resultado = resolverOfertante(
      { tipo: TipoUsuario.AM, cdOfertante: null },
      TipoUsuario.GO,
      42,
    );

    expect(resultado).toBe(42);
  });

  it("usa cdOfertanteInformado quando criador é GT e alvo é VO", () => {
    const resultado = resolverOfertante(
      { tipo: TipoUsuario.GT, cdOfertante: null },
      TipoUsuario.VO,
      77,
    );

    expect(resultado).toBe(77);
  });

  it.each([TipoUsuario.AM, TipoUsuario.GT, TipoUsuario.VT, TipoUsuario.AL])(
    "retorna null para alvo %s",
    (alvoTipo) => {
      const resultado = resolverOfertante(
        { tipo: TipoUsuario.AM, cdOfertante: null },
        alvoTipo,
        123,
      );

      expect(resultado).toBeNull();
    },
  );
});
