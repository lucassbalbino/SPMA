import { z } from "zod";

// Dados organizacionais do GO (AD-043/UGO-01/UGO-05) - mesmos 6 campos que
// `ofertanteSchema` validava para o antigo `model Ofertante`, agora usados
// como corpo do PATCH de dados organizacionais do próprio GO (`Usuario`),
// já que o Ofertante deixou de ser uma entidade separada.
export const organizacaoSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  responsavel: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }).optional(),
  telefone: z.string().optional(),
  uf: z.string().length(2, { message: "UF deve ter 2 caracteres" }),
  municipio: z.string().optional(),
});

export type OrganizacaoInput = z.infer<typeof organizacaoSchema>;
