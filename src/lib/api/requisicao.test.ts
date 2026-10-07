import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErroHttp } from "./erro-http";
import { corpoValidado, idPositivo } from "./requisicao";

function pedido(corpo: unknown, bruto?: string): Request {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bruto ?? JSON.stringify(corpo),
  });
}

describe("idPositivo", () => {
  it.each([["1", 1], ["42", 42]])("aceita %s", (entrada, esperado) => {
    expect(idPositivo(entrada as string)).toBe(esperado);
  });

  // Comportamento preservado dos 5 `parseId`/`parseCdCurso` copiados: a
  // conversão é `Number()`, então notação científica é um id válido - `1e3`
  // endereça o curso 1000. É só um apelido de URL (o `findUnique` seguinte
  // decide se existe), documentado aqui para não parecer acidente.
  it("aceita notação científica como o id que ela representa", () => {
    expect(idPositivo("1e3")).toBe(1000);
  });

  // Mesmas recusas que os 5 `parseId`/`parseCdCurso` copiados faziam.
  it.each(["0", "-1", "1.5", "abc", "", " ", "NaN", "Infinity"])(
    "recusa %o com 400",
    (entrada) => {
      try {
        idPositivo(entrada);
        throw new Error("devia ter lançado");
      } catch (erro) {
        expect(erro).toBeInstanceOf(ErroHttp);
        expect((erro as ErroHttp).status).toBe(400);
        expect((erro as ErroHttp).corpo).toEqual({ erro: "Id inválido" });
      }
    },
  );
});

describe("corpoValidado", () => {
  const schema = z.object({ nome: z.string().min(1, { message: "Nome é obrigatório" }) });

  it("devolve os dados quando o corpo valida", async () => {
    await expect(corpoValidado(pedido({ nome: "ok" }), schema)).resolves.toEqual({
      nome: "ok",
    });
  });

  it("usa a primeira mensagem de issue no 400", async () => {
    await expect(corpoValidado(pedido({ nome: "" }), schema)).rejects.toMatchObject({
      status: 400,
      corpo: { erro: "Nome é obrigatório" },
    });
  });

  // JSON malformado vira `null` e cai no schema, nunca numa exceção de parse
  // que `comTratamentoDeErro` transformaria em 500.
  it("corpo malformado vira 400, não 500", async () => {
    await expect(
      corpoValidado(pedido(undefined, "{nao-e-json"), schema),
    ).rejects.toBeInstanceOf(ErroHttp);
  });
});
