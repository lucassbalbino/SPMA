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
  // Tira só a pontuação: uma letra no meio torna o CPF inválido, em vez de
  // ser descartada em silêncio. `normalizarDocumento` mantém letras (CNPJ
  // alfanumérico), então "52998224725X" passaria aqui e seria gravado assim.
  const apenasDigitos = cpf.replace(/[^0-9A-Za-z]/g, "");

  if (!/^\d{11}$/.test(apenasDigitos)) {
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
