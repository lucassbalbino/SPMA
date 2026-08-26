import { z } from "zod";

export const verbaSchema = z.object({
  cdOfertante: z.number().int().positive({ message: "Ofertante é obrigatório" }),
  vlVerba: z.number().positive({ message: "Valor da verba deve ser positivo" }),
  dtVerba: z.coerce.date().optional(),
});

export type VerbaInput = z.infer<typeof verbaSchema>;

// Edição não permite trocar o Ofertante de uma verba (AD-015: a verba
// pertence a exatamente um Ofertante desde a criação).
export const edicaoVerbaSchema = z.object({
  vlVerba: z.number().positive({ message: "Valor da verba deve ser positivo" }),
  dtVerba: z.coerce.date().optional(),
});

export type EdicaoVerbaInput = z.infer<typeof edicaoVerbaSchema>;
