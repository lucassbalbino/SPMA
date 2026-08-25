/**
 * Validação de CPF pelo algoritmo padrão módulo 11 (REQ-AU-03).
 */

function calcularDigitoVerificador(digitos: number[]): number {
  const pesoInicial = digitos.length + 1;
  const soma = digitos.reduce(
    (acc, digito, index) => acc + digito * (pesoInicial - index),
    0,
  );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Forma canônica de um CPF (somente dígitos). Usada para gravar e buscar no
 * banco, para que "529.982.247-25" e "52998224725" sejam sempre o mesmo
 * registro independente de como foram digitados.
 */
export function normalizarCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function validarCPF(cpf: string): boolean {
  const apenasDigitos = cpf.replace(/\D/g, "");

  if (apenasDigitos.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(apenasDigitos)) {
    return false;
  }

  const digitos = apenasDigitos.split("").map(Number);
  const primeiroDigito = calcularDigitoVerificador(digitos.slice(0, 9));
  const segundoDigito = calcularDigitoVerificador(digitos.slice(0, 10));

  return primeiroDigito === digitos[9] && segundoDigito === digitos[10];
}
