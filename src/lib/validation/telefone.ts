// Telefone/WhatsApp com DDD (RU-44 a RU-46, doc 2).
//
// O contato com o ofertante é por WhatsApp, então o número precisa vir com
// DDD: 10 dígitos (fixo) ou 11 (celular), DDD de 11 a 99. Na tela o valor
// aparece com máscara; no banco, só os dígitos. Telefones antigos, gravados
// antes desta regra, ficam como estão (texto livre).
import { z } from "zod";
import "./zod-pt";

export const MENSAGEM_TELEFONE = "Informe o telefone com DDD, ex.: (61) 99999-9999";

export function soDigitosTelefone(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function telefoneValido(valor: string): boolean {
  const digitos = soDigitosTelefone(valor);
  if (digitos.length !== 10 && digitos.length !== 11) {
    return false;
  }
  const ddd = Number(digitos.slice(0, 2));
  return ddd >= 11 && ddd <= 99;
}

/**
 * Máscara aplicada durante a digitação: `(DD) NNNN-NNNN` até 10 dígitos,
 * `(DD) NNNNN-NNNN` com 11. Digitação parcial sai parcial; o excesso é cortado.
 */
export function mascaraTelefone(valor: string): string {
  const digitos = soDigitosTelefone(valor).slice(0, 11);
  if (digitos.length === 0) {
    return "";
  }
  if (digitos.length <= 2) {
    return `(${digitos}`;
  }
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  if (numero.length <= 4) {
    return `(${ddd}) ${numero}`;
  }
  const corte = numero.length === 9 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

/** Telefone obrigatório: vazio cai em `obrigatorio`, formato errado em MENSAGEM_TELEFONE. */
export function telefoneObrigatorioSchema(obrigatorio: string) {
  return z
    .string({ message: obrigatorio })
    .min(1, { message: obrigatorio })
    .refine(telefoneValido, { message: MENSAGEM_TELEFONE })
    .transform(soDigitosTelefone);
}

/** Telefone opcional: vazio (ou ausente) vira `null`; preenchido segue a mesma regra. */
export const telefoneOpcionalSchema = z
  .string()
  .optional()
  .nullable()
  .refine((valor) => !valor || telefoneValido(valor), { message: MENSAGEM_TELEFONE })
  .transform((valor) => (valor ? soDigitosTelefone(valor) : null));
