// A forma de um veredito de completude, e a tradução de issues do Zod na
// lista de chaves pendentes.
//
// `ResultadoCompletude` estava declarada 4 vezes (pré-curso, pós-curso,
// avaliação, dados pessoais) e o mapeamento `issues -> pendentes` reescrito
// em cada uma. Uma das cópias (avaliação) chegou a declarar um tipo
// estrutural à mão para o resultado do `safeParse`, com um `!` de
// não-nulidade em cima - ruído que some ao usar o tipo do próprio Zod.
//
// Isto NÃO acopla os domínios entre si: todos já dependem de Zod e de
// `validation/`, e o que compartilham aqui é a forma do veredito, não regra
// de negócio nenhuma. Cada `completude.ts` continua dono das suas regras.
import type { z } from "zod";

export interface ResultadoCompletude {
  completo: boolean;
  pendentes: string[];
}

/**
 * Chaves que falharam, a partir de um `safeParse`. Sucesso devolve lista
 * vazia; `path.join(".")` é o formato que as rotas de encerramento já
 * devolvem no corpo (`pendentes`) e que a tela usa para realçar o campo.
 */
export function pendentesDoResultado(
  resultado: z.ZodSafeParseResult<unknown>,
): string[] {
  return resultado.success
    ? []
    : resultado.error.issues.map((issue) => issue.path.join("."));
}

/**
 * Junta listas de pendências de várias checagens, sem repetir chave. As
 * checagens rodam em PARALELO, nunca encadeadas como `.superRefine` no schema
 * base: o Zod pula o callback de `superRefine` quando o schema base já
 * produziu qualquer issue, o que faria as pendências condicionais sumirem
 * enquanto o formulário ainda está pouco preenchido - o estado normal de um
 * preenchimento incremental. Lição registrada em `.specs/LESSONS.md` a partir
 * do que aconteceu em `formulario-pre-curso`.
 */
export function vereditoCompletude(...listas: string[][]): ResultadoCompletude {
  const pendentes = [...new Set(listas.flat())];

  return { completo: pendentes.length === 0, pendentes };
}
