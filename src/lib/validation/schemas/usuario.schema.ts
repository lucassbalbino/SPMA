import { z } from "zod";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { validarCPF } from "../cpf";

export const usuarioSchema = z.object({
  cpf: z.string().refine(validarCPF, { message: "CPF inválido" }),
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  email: z.string().email({ message: "Email inválido" }).optional(),
  tipo: z.enum(TipoUsuario, { message: "Tipo de usuário inválido" }),
  cdOfertante: z.number().int().positive().optional(),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
