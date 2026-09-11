// Completude do dado pessoal do Aluno (PESSOAL-05, PESSOAL-10, PESSOAL-18).
//
// Diferente da Avaliação, as 7 perguntas não têm nenhuma condicional entre si:
// Q9 não abre um "Qual?" — é a própria pergunta que já pede o tipo da
// deficiência. Então não há tabela de regras aqui, só o schema exigido inteiro.
//
// `ResultadoCompletude` é redeclarado, não importado de
// `src/lib/avaliacao/completude.ts`: os dois domínios não devem ficar acoplados
// por uma interface de 2 campos (design.md, item 2).
import { respostasDadosPessoaisSchema } from "../validation/schemas/dados-pessoais.schema";

const schemaExigido = respostasDadosPessoaisSchema.required();

export interface ResultadoCompletudeDadosPessoais {
  completo: boolean;
  pendentes: string[];
}

export function validarCompletudeDadosPessoais(
  respostas: unknown,
): ResultadoCompletudeDadosPessoais {
  const resultado = schemaExigido.safeParse(respostas);

  if (resultado.success) {
    return { completo: true, pendentes: [] };
  }

  const pendentes = [
    ...new Set(resultado.error.issues.map((issue) => issue.path.join("."))),
  ];

  return { completo: false, pendentes };
}
