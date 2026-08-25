/**
 * Mascaramento de CPF em log (REQ-SEC-12). Nunca deve derrubar o processo de
 * log: qualquer entrada, mesmo malformada ou mais curta que um CPF real, só
 * produz uma string mascarada, nunca lança exceção.
 */
export function mascararCPF(cpf: string): string {
  const digitos = cpf.replace(/\D/g, "");

  // Menos de 6 dígitos não sobra nada seguro para mascarar entre os 3
  // primeiros e os 2 últimos sem arriscar expor tudo (ou até duplicar
  // dígitos) - mascara por completo nesse caso defensivo.
  if (digitos.length < 6) {
    return "*".repeat(digitos.length);
  }

  const inicio = digitos.slice(0, 3);
  const fim = digitos.slice(-2);
  const meio = "*".repeat(digitos.length - 5);

  return `${inicio}${meio}${fim}`;
}
