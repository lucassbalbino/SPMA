/**
 * Único ponto que decide "CPF ou CNPJ" a partir do comprimento normalizado
 * (UGO-10) - usado pelo login, que ainda não sabe o `tipo` do usuário antes
 * de validar o documento.
 */
import { validarCPF } from "./cpf";
import { normalizarCNPJ, validarCNPJ } from "./cnpj";

export type TipoDocumento = "CPF" | "CNPJ";

export type ResultadoValidacaoDocumento =
  | { valido: true; tipo: TipoDocumento }
  | { valido: false; tipo: null };

/**
 * Remove a pontuação e põe as letras em maiúscula - idêntica a
 * `normalizarCNPJ`, que é a mais permissiva das duas (o CNPJ alfanumérico
 * tem letras). Nomeada à parte para deixar explícito, no ponto de chamada,
 * que o valor ainda não tem um `tipo` conhecido. Um CPF com letra continua
 * reprovando em `validarCPF`.
 */
export function normalizarDocumento(valor: string): string {
  return normalizarCNPJ(valor);
}

export function validarDocumento(valor: string): ResultadoValidacaoDocumento {
  const normalizado = normalizarDocumento(valor);

  if (normalizado.length === 11 && validarCPF(normalizado)) {
    return { valido: true, tipo: "CPF" };
  }

  if (normalizado.length === 14 && validarCNPJ(normalizado)) {
    return { valido: true, tipo: "CNPJ" };
  }

  return { valido: false, tipo: null };
}
