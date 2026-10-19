import { z } from "zod";

// Campos próprios da Verba, sem o Ofertante. Reaproveitado onde o Ofertante
// não vem no payload: na edição (AD-015: a verba pertence a exatamente um
// Ofertante desde a criação, não se transfere) e na criação junto do Gestor
// Ofertante, onde ele é o mesmo `cdOfertante` do usuário sendo criado.
// GV-06 (AD-046): `VL_Verba` é DECIMAL(10,2). Sem este teto, um valor maior
// chegava ao MySQL e virava 500; com 3+ casas, o MySQL arredondava em
// silêncio e gravava um valor diferente do digitado.
const VALOR_MAXIMO_VERBA = 99999999.99;

/**
 * No máximo 2 casas decimais. Compara com tolerância, não com igualdade
 * exata: `0.29 * 100` é `28.999999999999996` em ponto flutuante, e uma
 * comparação exata rejeitaria um valor válido.
 */
function temNoMaximoDuasCasas(valor: number): boolean {
  const centavos = valor * 100;
  return Math.abs(centavos - Math.round(centavos)) < 1e-6;
}

// IDV-02..04: nome livre da verba, pode repetir. O trim vem antes do limite,
// então espaços nas pontas não contam e "   " é vazio. `max` conta unidades
// UTF-16 (um emoji vale 2), o que nunca passa do VARCHAR(60) do MySQL.
const TAMANHO_MAXIMO_IDENTIFICACAO = 60;

export const camposVerbaSchema = z.object({
  dsVerba: z
    .string({ error: "Identificação é obrigatória" })
    .trim()
    .min(1, { message: "Identificação é obrigatória" })
    .max(TAMANHO_MAXIMO_IDENTIFICACAO, {
      message: "Identificação deve ter no máximo 60 caracteres",
    }),
  vlVerba: z
    .number({ error: "Valor da verba é obrigatório" })
    .positive({ message: "Valor da verba deve ser positivo" })
    .max(VALOR_MAXIMO_VERBA, { message: "Valor da verba excede o máximo permitido" })
    .refine(temNoMaximoDuasCasas, {
      message: "Valor da verba aceita no máximo 2 casas decimais",
    }),
  dtVerba: z.coerce.date().optional(),
});

// UGO-14/AD-043: o Ofertante É o GO - `cdOfertante` passa a ser o `documento`
// (CNPJ) do próprio GO, não mais um id numérico de uma tabela à parte.
//
// `cdOfertante` vem PRIMEIRO de propósito: o Zod reporta os erros na ordem das
// chaves, e a tela /verbas mostra o primeiro. Com o formulário vazio, a falta
// do GO (o primeiro campo da tela) é a que aparece (GV-03).
export const verbaSchema = z.object({
  cdOfertante: z
    .string({ error: "Ofertante é obrigatório" })
    .min(1, { message: "Ofertante é obrigatório" }),
  ...camposVerbaSchema.shape,
});

export type VerbaInput = z.infer<typeof verbaSchema>;

// Edição não permite trocar o Ofertante de uma verba (AD-015).
export const edicaoVerbaSchema = camposVerbaSchema;

export type EdicaoVerbaInput = z.infer<typeof edicaoVerbaSchema>;
