import { z } from "zod";
import { normalizarDocumento, validarDocumento } from "../documento";

// Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) como documento de login
// (UGO-10): GO se identifica por CNPJ, os demais tipos continuam por CPF, e
// o login ainda não sabe o `tipo` do usuário antes de validar o formato -
// por isso delega para `validarDocumento` (que decide o algoritmo pelo
// comprimento) em vez de `validarCPF` direto.
export const loginSchema = z.object({
  documento: z
    .string()
    .refine((valor) => validarDocumento(valor).valido, {
      message: "Documento inválido",
    })
    .transform(normalizarDocumento),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
