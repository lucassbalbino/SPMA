import { z } from "zod";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { camposVerbaSchema } from "./verba.schema";
import { normalizarCPF, validarCPF } from "../cpf";

export const usuarioSchema = z.object({
  cpf: z
    .string()
    .refine(validarCPF, { message: "CPF inválido" })
    .transform(normalizarCPF),
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  email: z.string().email({ message: "Email inválido" }).optional(),
  tipo: z.enum(TipoUsuario, { message: "Tipo de usuário inválido" }),
  cdOfertante: z.number().int().positive().optional(),
  // Curso em que o Aluno é matriculado no mesmo passo em que é criado
  // (AVAL-01): todo AL nasce com uma AvaliacaoAluno. Opcional aqui pelo mesmo
  // motivo de `verba` - a rota é quem exige, sabendo o tipo criado.
  cdCurso: z.number().int().positive({ message: "Curso é obrigatório" }).optional(),
  // Verba criada no mesmo passo que o usuário (REQ-OV-08). Sem `cdOfertante`
  // próprio: é sempre o do usuário sendo criado. Opcional aqui porque a
  // obrigatoriedade depende de quem cria e do tipo criado - regra que o
  // schema não tem como enxergar, avaliada em POST /api/usuarios.
  verba: camposVerbaSchema.optional(),
});

export type UsuarioInput = z.infer<typeof usuarioSchema>;
