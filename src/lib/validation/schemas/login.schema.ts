import { z } from "zod";
import { normalizarDocumento, validarDocumento } from "../documento";

// Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) como documento de login
// (UGO-10): GO se identifica por CNPJ, os demais tipos continuam por CPF, e
// o login ainda não sabe o `tipo` do usuário antes de validar o formato -
// por isso delega para `validarDocumento` (que decide o algoritmo pelo
// comprimento) em vez de `validarCPF` direto.
//
// P2 AC5 distingue dois casos de documento inválido, cada um com sua própria
// mensagem (achado pelo Verifier independente, ranked gap #4 - o refine
// original tratava os dois igual, com "Documento inválido"):
// - comprimento 11 ou 14 mas dígito verificador errado: CA-AU-03
//   (pré-existente, grandfathered) - 400 "Documento inválido", format-check
//   antes de qualquer consulta ao banco.
// - comprimento diferente de 11 e de 14: não dá pra saber se seria CPF ou
//   CNPJ, então não revela "documento inválido" - o refine deixa passar e o
//   valor segue para `POST /api/auth/login`, que não encontra nenhum
//   `Usuario` com esse `documento` e responde a MESMA mensagem genérica de
//   credencial errada (401 "CPF ou senha inválidos"), como design.md sempre
//   descreveu (linha do comprimento inválido em "Error Handling Strategy").
export const loginSchema = z.object({
  documento: z
    .string()
    .transform(normalizarDocumento)
    .refine(
      (documento) =>
        documento.length !== 11 && documento.length !== 14
          ? true
          : validarDocumento(documento).valido,
      { message: "Documento inválido" },
    ),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
