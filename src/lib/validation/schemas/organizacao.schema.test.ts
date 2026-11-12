import { describe, expect, it } from "vitest";
import { organizacaoSchema } from "./organizacao.schema";

// Os 6 campos organizacionais do GO são todos obrigatórios (OGO-04, AD-044).
// Cada caso parte de um payload completo e válido e estraga UM campo, para
// que a rejeição só possa ter vindo daquele campo.
const VALIDO = {
  nome: "Instituto Exemplo",
  responsavel: "Fulano de Tal",
  email: "contato@exemplo.org",
  telefone: "11999999999",
  uf: "SP",
  municipio: "São Paulo",
};

function sem(campo: keyof typeof VALIDO): Partial<typeof VALIDO> {
  const copia: Partial<typeof VALIDO> = { ...VALIDO };
  delete copia[campo];
  return copia;
}

function primeiraMensagem(entrada: unknown): string | undefined {
  const result = organizacaoSchema.safeParse(entrada);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("organizacaoSchema", () => {
  it("aceita os 6 campos preenchidos e válidos", () => {
    expect(organizacaoSchema.safeParse(VALIDO).success).toBe(true);
  });

  it.each([
    ["nome", "Nome é obrigatório"],
    ["responsavel", "Responsável é obrigatório"],
    ["telefone", "Telefone é obrigatório"],
    ["municipio", "Município é obrigatório"],
  ] as const)("rejeita %s ausente e vazio com a mensagem do campo", (campo, mensagem) => {
    expect(primeiraMensagem(sem(campo))).toBe(mensagem);
    expect(primeiraMensagem({ ...VALIDO, [campo]: "" })).toBe(mensagem);
  });

  // RU-45 (doc 2): o caso da imagem 2, "999281374", não tem DDD.
  it("rejeita telefone sem DDD com a orientação de formato", () => {
    expect(primeiraMensagem({ ...VALIDO, telefone: "999281374" })).toBe(
      "Informe o telefone com DDD, ex.: (61) 99999-9999",
    );
  });

  // RU-46: com máscara ou sem, o banco recebe só os dígitos.
  it("devolve o telefone só com os dígitos", () => {
    const result = organizacaoSchema.safeParse({ ...VALIDO, telefone: "(61) 99928-1374" });
    expect(result.success).toBe(true);
    expect(result.data?.telefone).toBe("61999281374");
  });

  it("rejeita email ausente e vazio", () => {
    expect(primeiraMensagem(sem("email"))).toBe("Email é obrigatório");
    expect(primeiraMensagem({ ...VALIDO, email: "" })).toBe("Email é obrigatório");
  });

  it("rejeita email malformado", () => {
    expect(primeiraMensagem({ ...VALIDO, email: "contato-sem-arroba" })).toBe("Email inválido");
  });

  it("rejeita uf ausente e uf fora da lista de UFs", () => {
    expect(primeiraMensagem(sem("uf"))).toBe("UF inválida");
    expect(primeiraMensagem({ ...VALIDO, uf: "ZZ" })).toBe("UF inválida");
  });
});
