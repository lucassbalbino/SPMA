// Completude do dado pessoal do Aluno (PESSOAL-05, PESSOAL-10, PESSOAL-18).
//
// Diferente da Avaliação, as 7 perguntas não têm nenhuma condicional entre si:
// Q9 não abre um "Qual?" — é a própria pergunta que já pede o tipo da
// deficiência. Então não há tabela de regras aqui, só o schema exigido inteiro.
//
// A forma do veredito vem de `validation/completude.ts`, não de
// `src/lib/avaliacao/completude.ts`: o ponto do design.md (item 2) era não
// acoplar os DOMÍNIOS entre si, e continua valendo - o tipo compartilhado
// mora na camada de validação, da qual os dois já dependem, e nenhuma regra
// de negócio atravessa.
import { respostasDadosPessoaisSchema } from "../validation/schemas/dados-pessoais.schema";
import {
  pendentesDoResultado,
  vereditoCompletude,
  type ResultadoCompletude,
} from "../validation/completude";

const schemaExigido = respostasDadosPessoaisSchema.required();

export type ResultadoCompletudeDadosPessoais = ResultadoCompletude;

export function validarCompletudeDadosPessoais(
  respostas: unknown,
): ResultadoCompletudeDadosPessoais {
  return vereditoCompletude(pendentesDoResultado(schemaExigido.safeParse(respostas)));
}
