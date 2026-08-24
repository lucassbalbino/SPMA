import { z } from "zod";
import { validarCPF } from "../cpf";

export const loginSchema = z.object({
  cpf: z.string().refine(validarCPF, { message: "CPF inválido" }),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
