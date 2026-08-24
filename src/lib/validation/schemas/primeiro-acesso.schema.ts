import { z } from "zod";

export const primeiroAcessoSchema = z
  .object({
    senha: z.string().min(8, { message: "Senha deve ter ao menos 8 caracteres" }),
    confirmacaoSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmacaoSenha, {
    message: "As senhas não coincidem",
    path: ["confirmacaoSenha"],
  });

export type PrimeiroAcessoInput = z.infer<typeof primeiroAcessoSchema>;
