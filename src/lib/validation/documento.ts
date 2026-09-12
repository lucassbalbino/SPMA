/**
 * Único ponto que decide "CPF ou CNPJ" a partir do comprimento normalizado
 * (UGO-10) - usado pelo login, que ainda não sabe o `tipo` do usuário antes
 * de validar o documento.
 */
import { normalizarCPF, validarCPF } from "./cpf";
import { normalizarCNPJ, validarCNPJ } from "./cnpj";

export type TipoDocumento = "CPF" | "CNPJ";

export type ResultadoValidacaoDocumento =
  | { valido: true; tipo: TipoDocumento }
  | { valido: false; tipo: null };

/**
 * Remove tudo que não é dígito - idêntica a `normalizarCPF`/`normalizarCNPJ`
 * (ambas fazem a mesma coisa); nomeada à parte para deixar explícito, no
 * ponto de chamada, que o valor ainda não tem um `tipo` conhecido.
 */
export function normalizarDocumento(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function validarDocumento(valor: string): ResultadoValidacaoDocumento {
  const apenasDigitos = normalizarDocumento(valor);

  if (apenasDigitos.length === 11 && validarCPF(normalizarCPF(apenasDigitos))) {
    return { valido: true, tipo: "CPF" };
  }

  if (apenasDigitos.length === 14 && validarCNPJ(normalizarCNPJ(apenasDigitos))) {
    return { valido: true, tipo: "CNPJ" };
  }

  return { valido: false, tipo: null };
}
