import { z } from "zod";

export const ofertanteSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  responsavel: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }).optional(),
  telefone: z.string().optional(),
  uf: z.string().length(2, { message: "UF deve ter 2 caracteres" }),
  municipio: z.string().optional(),
});

export type OfertanteInput = z.infer<typeof ofertanteSchema>;
