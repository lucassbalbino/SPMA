// Classificador de forma das respostas (RESP-02, RESP-14).
//
// A tabela de respostas guarda uma coluna `valor` de texto só. O tipo real
// de cada resposta (lista de opções, número, texto) é derivado do schema
// Zod do formulário, que já é a fonte de verdade da forma (AD-004). Assim
// não existe coluna `tipo` redundante que pudesse divergir do schema.
//
// ARMADILHA (verificada empiricamente em Zod 4.4.3, não deduzida):
// `ZodArray` também expõe `unwrap()`, e ele devolve o tipo do ELEMENTO.
// Desembrulhar em laço (`while (s.unwrap) s = s.unwrap()`) classificaria
// `z.array(z.enum(...)).optional()` como enum simples e truncaria as 13
// chaves de múltipla escolha dos três questionários para um único valor,
// sem erro nenhum. Por isso o desembrulho abaixo aceita SÓ os três
// wrappers de opcionalidade e a checagem de `ZodArray` vem antes de
// qualquer outra.
import { z } from "zod";

export type FormaResposta = "lista" | "numero" | "texto" | "orfa";

/**
 * Diz se o valor de `chave` é lista, número ou texto, olhando o schema Zod
 * do formulário.
 *
 * Chave ausente do schema atual (resquício de troca de questionário,
 * RESP-14) não tem forma declarada em lugar nenhum - o schema que a
 * descrevia não existe mais. Ela volta como `"orfa"`, e quem remonta decide
 * pela quantidade de linhas. Classificá-la como `"texto"` truncava uma
 * seleção múltipla órfã no primeiro item: `posContEstrategiasContinuidade` e
 * `posContEstrategiasAmpliacao` eram `z.array(...).min(1)` e saíram do schema
 * na troca dos questionários (AD-035/036), então o caso é real, não
 * hipotético.
 */
export function classificarChave(
  schema: z.ZodObject<z.ZodRawShape>,
  chave: string,
): FormaResposta {
  const campo = schema.shape[chave];
  if (!campo) return "orfa";

  let atual: unknown = campo;
  while (
    atual instanceof z.ZodOptional ||
    atual instanceof z.ZodNullable ||
    atual instanceof z.ZodDefault
  ) {
    atual = atual.unwrap();
  }

  if (atual instanceof z.ZodArray) return "lista";
  if (atual instanceof z.ZodNumber) return "numero";
  return "texto";
}

/** Explode o valor em itens - um por linha da tabela. Lista vira N itens, escalar vira 1. */
export function serializar(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map((item) => String(item));
  return [String(valor)];
}

/**
 * Remonta o valor original a partir das linhas, na ordem em que vieram.
 *
 * Para chave órfã não há schema que diga a forma, então a própria quantidade
 * de linhas decide: mais de uma só pode ter vindo de uma lista. LIMITE
 * ACEITO: lista órfã de um único item volta como escalar - as duas gravam
 * exatamente uma linha com `Ordem` 0, e nada no banco as distingue. Nenhum
 * valor se perde, que é o que a RESP-14 exige.
 */
export function desserializar(itens: string[], forma: FormaResposta): unknown {
  if (forma === "lista") return itens;
  if (forma === "numero") return Number(itens[0]);
  if (forma === "orfa") return itens.length > 1 ? itens : itens[0];
  return itens[0];
}
