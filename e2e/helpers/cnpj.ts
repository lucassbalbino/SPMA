// Gerador de CNPJ válido para as fixtures dos specs.
//
// Desde a unificação Ofertante=GO (AD-043) todo Ofertante de fixture é um
// usuário GO identificado por CNPJ, e o dígito verificador precisa fechar
// (`validarCNPJ` roda em `usuarioSchema`). O resultado foi que as MESMAS duas
// funções - `calcularDvCnpj` e `gerarCnpjValido` - acabaram copiadas em 27
// arquivos de spec, idênticas exceto pelo prefixo de 2 dígitos.
//
// Esse prefixo não é decoração: ele é o espaço de numeração do spec. Os
// arquivos rodam contra o mesmo banco `spma_test` e cada um apaga os próprios
// CNPJs no `beforeAll`/`afterAll`, então dois specs que gerassem o mesmo CNPJ
// apagariam as fixtures um do outro. Por isso o prefixo é parâmetro
// obrigatório, e não um default: escolher um é uma decisão consciente de quem
// escreve o spec.
import { normalizarCNPJ, validarCNPJ } from "../../src/lib/validation/cnpj";

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
 * Devolve o gerador de CNPJs de UM spec, preso ao seu prefixo.
 *
 * Uso: `const gerarCnpjValido = geradorDeCnpj("30");` no topo do spec, e
 * `gerarCnpjValido(1)`, `gerarCnpjValido(2)`... nas fixtures - os mesmos
 * pontos de chamada que as cópias locais já tinham.
 */
export function geradorDeCnpj(prefixo: string): (indice: number) => string {
  if (!/^\d{2}$/.test(prefixo)) {
    throw new Error(`Prefixo de CNPJ deve ter 2 dígitos, recebido "${prefixo}"`);
  }

  return (indice: number) => {
    const base12 = `${prefixo}${String(indice).padStart(6, "0")}0001`;
    const digitos = base12.split("").map(Number);
    const d1 = calcularDigitoVerificador(digitos);
    const d2 = calcularDigitoVerificador([...digitos, d1]);

    return `${base12}${d1}${d2}`;
  };
}

export { normalizarCNPJ, validarCNPJ };
