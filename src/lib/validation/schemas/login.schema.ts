import { z } from "zod";
import { normalizarCPF, validarCPF } from "../cpf";

export const loginSchema = z.object({
  cpf: z
    .string()
    .refine(validarCPF, { message: "CPF inválido" })
    .transform(normalizarCPF),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
