/**
 * Validação de CNPJ pelo algoritmo padrão módulo 11 (UGO-07, UGO-08), mesma
 * forma de `cpf.ts`. Os pesos do CNPJ são cíclicos (2..9, da direita para a
 * esquerda) em vez de uma sequência linear decrescente como no CPF - por
 * isso `calcularDigitoVerificador` aqui é uma função própria, não
 * reaproveitada de `cpf.ts`.
 *
 * CNPJ alfanumérico (Receita Federal, IN RFB 2.229/2024, emitido desde
 * jul/2026): as 12 primeiras posições aceitam A-Z além de 0-9; os 2 dígitos
 * verificadores continuam numéricos. O cálculo é o mesmo módulo 11, com cada
 * caractere valendo o seu código ASCII menos 48 ("0" = 0 ... "9" = 9,
 * "A" = 17 ... "Z" = 42) - para um CNPJ só de dígitos, nada muda.
 */

function calcularDigitoVerificador(valores: number[]): number {
  let soma = 0;
  let peso = 2;

  for (let i = valores.length - 1; i >= 0; i--) {
    soma += valores[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// 12 posições alfanuméricas + 2 dígitos verificadores, já normalizado.
const FORMATO_CNPJ = /^[0-9A-Z]{12}\d{2}$/;

/**
 * Forma canônica de um CNPJ: só letras maiúsculas e dígitos, sem pontuação.
 * Mesma razão de `normalizarCPF`: gravar/buscar no banco independente de
 * como foi digitado - inclusive "12.abc.345/01de-35" e "12ABC34501DE35" são
 * o mesmo registro.
 */
export function normalizarCNPJ(cnpj: string): string {
  return cnpj.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function validarCNPJ(cnpj: string): boolean {
  const normalizado = normalizarCNPJ(cnpj);

  if (!FORMATO_CNPJ.test(normalizado)) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(normalizado)) {
    return false;
  }

  const valores = normalizado.split("").map((caractere) => caractere.charCodeAt(0) - 48);
  const primeiroDigito = calcularDigitoVerificador(valores.slice(0, 12));
  const segundoDigito = calcularDigitoVerificador(valores.slice(0, 13));

  return primeiroDigito === valores[12] && segundoDigito === valores[13];
}
