import { describe, expect, it } from "vitest";
import {
  consultaUsuariosSchema,
  edicaoUsuarioSchema,
  resetarSenhaSchema,
} from "./gestao-usuario.schema";

/** Primeira issue de um parse que precisa falhar. */
function primeiraIssue(resultado: { success: boolean; error?: { issues: { code: string; message: string }[] } }) {
  expect(resultado.success).toBe(false);
  return resultado.error!.issues[0];
}

describe("consultaUsuariosSchema", () => {
  it("aceita só a página", () => {
    const resultado = consultaUsuariosSchema.safeParse({ pagina: 1 });

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ pagina: 1 });
  });

  // GU-17: página precisa ser inteiro >= 1, e número (não string).
  it.each([0, -1, 1.5, "1"])("rejeita pagina %j", (pagina) => {
    expect(consultaUsuariosSchema.safeParse({ pagina }).success).toBe(false);
  });

  it("rejeita tipo fora de TipoUsuario (GU-17)", () => {
    expect(consultaUsuariosSchema.safeParse({ pagina: 1, tipo: "XX" }).success).toBe(false);
  });

  it("aceita busca com 100 caracteres e rejeita com 101 (GU-17)", () => {
    expect(consultaUsuariosSchema.safeParse({ pagina: 1, busca: "a".repeat(100) }).success).toBe(
      true,
    );
    expect(consultaUsuariosSchema.safeParse({ pagina: 1, busca: "a".repeat(101) }).success).toBe(
      false,
    );
  });

  it("rejeita chave extra (GU-17)", () => {
    const issue = primeiraIssue(
      consultaUsuariosSchema.safeParse({ pagina: 1, cpf: "52998224725" }),
    );

    expect(issue.code).toBe("unrecognized_keys");
  });
});

describe("edicaoUsuarioSchema", () => {
  const documentoAtual = "52998224725";

  it("aceita só o nome (GU-24)", () => {
    const resultado = edicaoUsuarioSchema.safeParse({ documentoAtual, nome: "Fulana" });

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ documentoAtual, nome: "Fulana" });
  });

  it("e-mail vazio sai null (GU-25)", () => {
    const resultado = edicaoUsuarioSchema.safeParse({ documentoAtual, email: "" });

    expect(resultado.success).toBe(true);
    expect(resultado.data?.email).toBeNull();
  });

  // GU-26: nome vazio, só espaços ou com mais de 255 caracteres.
  it.each(["", "   "])("rejeita nome %j com 'Nome é obrigatório'", (nome) => {
    expect(primeiraIssue(edicaoUsuarioSchema.safeParse({ documentoAtual, nome })).message).toBe(
      "Nome é obrigatório",
    );
  });

  it("rejeita nome com 256 caracteres com 'Nome deve ter no máximo 255 caracteres' (GU-26)", () => {
    const resultado = edicaoUsuarioSchema.safeParse({ documentoAtual, nome: "a".repeat(256) });

    expect(resultado.success).toBe(false);
    expect(primeiraIssue(resultado).message).toBe("Nome deve ter no máximo 255 caracteres");
  });

  it("rejeita e-mail em formato inválido (GU-26)", () => {
    expect(
      primeiraIssue(edicaoUsuarioSchema.safeParse({ documentoAtual, email: "x@" })).message,
    ).toBe("Email inválido");
  });

  it("rejeita sem documentoAtual (GU-30)", () => {
    expect(edicaoUsuarioSchema.safeParse({ nome: "Fulana" }).success).toBe(false);
  });

  it("rejeita só com documentoAtual: 'Nada para alterar' (GU-30)", () => {
    expect(primeiraIssue(edicaoUsuarioSchema.safeParse({ documentoAtual })).message).toBe(
      "Nada para alterar",
    );
  });

  // GU-30 (chave extra) e GU-47 (senha escolhida pelo gestor nunca é aceita).
  it.each([
    ["senha", "segredo123"],
    ["tipo", "AM"],
    ["cdOfertante", "11222333000181"],
  ])("rejeita a chave extra %s", (chave, valor) => {
    const issue = primeiraIssue(
      edicaoUsuarioSchema.safeParse({ documentoAtual, nome: "Fulana", [chave]: valor }),
    );

    expect(issue.code).toBe("unrecognized_keys");
  });

  it("normaliza documentoAtual para só dígitos", () => {
    const resultado = edicaoUsuarioSchema.safeParse({
      documentoAtual: "529.982.247-25",
      nome: "Fulana",
    });

    expect(resultado.data?.documentoAtual).toBe("52998224725");
  });
});

describe("resetarSenhaSchema", () => {
  it("aceita o documento com pontuação e devolve só dígitos (GU-44)", () => {
    const resultado = resetarSenhaSchema.safeParse({ documento: "529.982.247-25" });

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ documento: "52998224725" });
  });

  it("rejeita corpo vazio (GU-44)", () => {
    expect(resetarSenhaSchema.safeParse({}).success).toBe(false);
  });

  // GU-44 (chave extra) e GU-47 (o gestor não define senha).
  it("rejeita a chave extra senha", () => {
    const issue = primeiraIssue(
      resetarSenhaSchema.safeParse({ documento: "52998224725", senha: "segredo123" }),
    );

    expect(issue.code).toBe("unrecognized_keys");
  });
});
