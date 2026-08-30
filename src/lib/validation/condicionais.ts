// Regras condicionais dos três questionários (pré-curso, pós-curso,
// avaliação do aluno), em UMA forma só.
//
// Cada pergunta condicional do papel ("Se sim, qual?", "Outro. Quais?",
// Q25.1-25.3 reveladas por Q25...) tem duas leituras que precisam concordar
// entre si:
//
//   1. condição VERDADEIRA  -> a resposta é EXIGIDA no encerramento
//      (`pendenciasDasRegras`, usada pelos `completude.ts`);
//   2. condição FALSA       -> a resposta não se APLICA, e um valor gravado
//      ali é órfão (`chavesOrfas`/`semOrfas`).
//
// Antes as duas leituras viviam em lugares diferentes - a (1) em
// `completude.ts`, a (2) em lugar nenhum, e a condição de tela repetida à
// mão em `*Form.tsx` (a de Q21.1 do pré-curso chegou a existir como dois
// literais soltos). Uma regra só, aqui, alimenta os três consumidores.
//
// `dependeDe` lista as perguntas-mãe da regra: uma chave só é considerada
// órfã quando a(s) mãe(s) JÁ foram respondidas e a condição resultou falsa.
// Sem isso, um preenchimento que começasse pela pergunta-filha veria a
// própria resposta descartada só porque a mãe ainda estava em branco.

export interface RegraCondicional<T> {
  chave: keyof T & string;
  dependeDe: readonly (keyof T & string)[];
  exigidaQuando: (dados: T) => boolean;
}

// Mesma noção de "preenchido" já aplicada pelos schemas: `0` é resposta
// válida (escalas de infraestrutura, valores monetários, nota 0-10), string
// vazia e lista vazia não são (edge case das três specs).
export function estaPreenchido(valor: unknown): boolean {
  if (valor === undefined || valor === null) {
    return false;
  }
  if (typeof valor === "string") {
    return valor.length > 0;
  }
  if (Array.isArray(valor)) {
    return valor.length > 0;
  }
  return true;
}

function comoRegistro<T>(dados: T): Record<string, unknown> {
  return (typeof dados === "object" && dados !== null ? dados : {}) as Record<string, unknown>;
}

// (1) Condição verdadeira e resposta ausente -> pendência de encerramento.
export function pendenciasDasRegras<T>(
  regras: readonly RegraCondicional<T>[],
  dados: T,
): string[] {
  const registro = comoRegistro(dados);

  return regras
    .filter((regra) => regra.exigidaQuando(dados) && !estaPreenchido(registro[regra.chave]))
    .map((regra) => regra.chave);
}

// (2) Condição falsa (com a pergunta-mãe já respondida) e resposta presente
// -> valor órfão, contraditório com a própria resposta-mãe.
export function chavesOrfas<T>(regras: readonly RegraCondicional<T>[], dados: T): string[] {
  const registro = comoRegistro(dados);

  return regras
    .filter(
      (regra) =>
        estaPreenchido(registro[regra.chave]) &&
        regra.dependeDe.every((mae) => estaPreenchido(registro[mae])) &&
        !regra.exigidaQuando(dados),
    )
    .map((regra) => regra.chave);
}

// Cópia de `dados` sem as chaves órfãs (e sem as de `extras`, usadas pelos
// gates que valem para um bloco inteiro de perguntas). Não muta a entrada.
export function semOrfas<T>(
  regras: readonly RegraCondicional<T>[],
  dados: T,
  extras: readonly string[] = [],
): T {
  const remover = new Set([...chavesOrfas(regras, dados), ...extras]);

  if (remover.size === 0) {
    return dados;
  }

  const registro = comoRegistro(dados);
  const limpo: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(registro)) {
    if (!remover.has(chave)) {
      limpo[chave] = valor;
    }
  }

  return limpo as T;
}

// Predicado de uma regra, para a UI usar como `visivelSe` sem reescrever a
// condição. Lança se a chave não tem regra: erro de digitação vira falha de
// build/teste, não campo que nunca aparece na tela.
export function condicaoDe<T>(
  regras: readonly RegraCondicional<T>[],
  chave: keyof T & string,
): (dados: T) => boolean {
  const regra = regras.find((candidata) => candidata.chave === chave);

  if (!regra) {
    throw new Error(`Não há regra condicional para "${chave}"`);
  }

  return regra.exigidaQuando;
}
