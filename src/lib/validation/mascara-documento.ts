/**
 * Máscara de CPF/CNPJ dos campos de documento e formatação na exibição.
 *
 * Só apresentação: o que trafega e é gravado continua sendo a forma
 * normalizada (`normalizarCPF`/`normalizarCNPJ`), sem pontuação. A pontuação
 * fica sempre nas mesmas posições, então é recolocada aqui a partir dos
 * caracteres - quem digita não precisa digitá-la, e quem cola com ou sem ela
 * chega ao mesmo valor.
 */
import type { TipoDocumento } from "./documento";

// `#` é uma posição de caractere; o resto é pontuação fixa.
const PADRAO: Record<TipoDocumento, string> = {
  CPF: "###.###.###-##",
  CNPJ: "##.###.###/####-##",
};

/** Comprimento do documento já pontuado - o `maxLength` do campo. */
export const TAMANHO_MASCARA: Record<TipoDocumento, number> = {
  CPF: PADRAO.CPF.length,
  CNPJ: PADRAO.CNPJ.length,
};

// CPF: só dígitos. CNPJ: letra ou dígito nas 12 primeiras posições, dígito
// nas 2 últimas (os verificadores) - mesmo formato de `validarCNPJ`.
function aceita(tipo: TipoDocumento, posicao: number, caractere: string): boolean {
  if (tipo === "CNPJ" && posicao < 12) {
    return /[0-9A-Z]/.test(caractere);
  }

  return /\d/.test(caractere);
}

/**
 * Aplica a máscara ao que foi digitado ou colado, com ou sem pontuação.
 * Descarta o que não cabe na posição (letra em CPF, letra nos verificadores
 * do CNPJ) e o excedente. A pontuação só entra antes de um caractere que
 * vem depois dela, para apagar com Backspace funcionar sem travar nela.
 */
export function aplicarMascaraDocumento(tipo: TipoDocumento, valor: string): string {
  const padrao = PADRAO[tipo];
  const caracteres = valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
  let resultado = "";
  let posicao = 0;

  for (const caractere of caracteres) {
    if (resultado.length >= padrao.length) {
      break;
    }

    if (!aceita(tipo, posicao, caractere)) {
      continue;
    }

    while (padrao[resultado.length] !== "#") {
      resultado += padrao[resultado.length];
    }

    resultado += caractere;
    posicao++;
  }

  return resultado;
}

/**
 * Documento gravado (normalizado) pontuado para exibição: 11 caracteres é
 * CPF, 14 é CNPJ. Qualquer outro comprimento volta como está - exibir o
 * valor real é melhor do que uma máscara que o deforme.
 */
export function formatarDocumento(documento: string): string {
  if (documento.length === 11) {
    return aplicarMascaraDocumento("CPF", documento);
  }

  if (documento.length === 14) {
    return aplicarMascaraDocumento("CNPJ", documento);
  }

  return documento;
}
