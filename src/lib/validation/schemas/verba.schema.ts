import { z } from "zod";

// Campos próprios da Verba, sem o Ofertante. Reaproveitado onde o Ofertante
// não vem no payload: na edição (AD-015: a verba pertence a exatamente um
// Ofertante desde a criação, não se transfere) e na criação junto do Gestor
// Ofertante, onde ele é o mesmo `cdOfertante` do usuário sendo criado.
export const camposVerbaSchema = z.object({
  vlVerba: z.number().positive({ message: "Valor da verba deve ser positivo" }),
  dtVerba: z.coerce.date().optional(),
});

export const verbaSchema = camposVerbaSchema.extend({
  cdOfertante: z.number().int().positive({ message: "Ofertante é obrigatório" }),
});

export type VerbaInput = z.infer<typeof verbaSchema>;

// Edição não permite trocar o Ofertante de uma verba (AD-015).
export const edicaoVerbaSchema = camposVerbaSchema;

export type EdicaoVerbaInput = z.infer<typeof edicaoVerbaSchema>;
