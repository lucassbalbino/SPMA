// Metadados de campo compartilhados pelos três questionários (pré-curso,
// pós-curso, avaliação do aluno).
//
// Cada formulário descreve as suas perguntas como uma tabela `BLOCOS` e deixa
// o render genérico interpretá-la (AD-004: nunca duplicar a lista de campos
// em dois lugares). Até aqui a TABELA era compartilhada mas o INTERPRETADOR
// não: `TipoCampo`, `CampoDef`, `BlocoDef` e as ~200 linhas de `renderCampo`
// existiam em triplicata, com as três cópias divergindo só no que não
// importava (o nome da variável de `disabled`, a lista de opções da escala).

/**
 * `email` e `data` existem porque mudam o `type` do input nativo - não é
 * decoração: `email` liga a validação do navegador e `data` abre o date
 * picker. `escala` é um select de 0-5/1-5 com rótulo por nota, cuja lista de
 * opções cada formulário fornece (as escalas do pré-curso e da avaliação têm
 * textos diferentes).
 */
export type TipoCampo =
  | "texto"
  | "email"
  | "textarea"
  | "numero"
  | "data"
  | "select"
  | "radio"
  | "checkboxes"
  | "escala";

/** Uma nota da escala: o valor gravado e o texto mostrado ao lado dele. */
export interface OpcaoEscala {
  valor: string;
  rotulo: string;
}

/**
 * `C` é a união das chaves do formulário e `R` o objeto de respostas dele -
 * assim `chave` e `visivelSe` continuam tipados por questionário, sem
 * `string` solto nem `any`.
 */
export interface CampoDef<C extends string, R> {
  chave: C;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: readonly string[];
  /**
   * Opção que, no papel, nega todas as outras ("Não foram realizadas
   * consultas...") - marcá-la limpa as demais e vice-versa. Espelha, na tela,
   * o que `multiplaComExclusiva` recusa no servidor (HTTP 400).
   */
  exclusiva?: string;
  /** Condição de visibilidade, lida da regra condicional compartilhada. */
  visivelSe?: (respostas: R) => boolean;
}

export interface BlocoDef<C extends string, R> {
  titulo: string;
  enunciado?: string;
  campos: CampoDef<C, R>[];
}
