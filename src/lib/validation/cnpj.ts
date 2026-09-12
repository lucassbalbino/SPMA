/**
 * Validação de CNPJ pelo algoritmo padrão módulo 11 (UGO-07, UGO-08), mesma
 * forma de `cpf.ts`. Os pesos do CNPJ são cíclicos (2..9, da direita para a
 * esquerda) em vez de uma sequência linear decrescente como no CPF - por
 * isso `calcularDigitoVerificador` aqui é uma função própria, não
 * reaproveitada de `cpf.ts`.
 */

function calcularDigitoVerificador(digitos: number[]): number {
  let soma = 0;
  let peso = 2;

  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += digitos[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Forma canônica de um CNPJ (somente dígitos). Mesma razão de
 * `normalizarCPF`: gravar/buscar no banco independente de como foi digitado.
 */
export function normalizarCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function validarCNPJ(cnpj: string): boolean {
  const apenasDigitos = cnpj.replace(/\D/g, "");

  if (apenasDigitos.length !== 14) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(apenasDigitos)) {
    return false;
  }

  const digitos = apenasDigitos.split("").map(Number);
  const primeiroDigito = calcularDigitoVerificador(digitos.slice(0, 12));
  const segundoDigito = calcularDigitoVerificador(digitos.slice(0, 13));

  return primeiroDigito === digitos[12] && segundoDigito === digitos[13];
}
