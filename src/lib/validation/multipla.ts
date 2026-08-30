// Helper compartilhado pelos três questionários (pré-curso, pós-curso,
// avaliação do aluno).
//
// Várias perguntas de seleção múltipla dos questionários fonte
// (`docs/Questionario_do_*.md`) terminam com uma opção EXCLUDENTE - "Não
// foram realizadas consultas...", "Nenhuma ação de monitoramento foi
// realizada...", "Não foram estabelecidas parcerias...". Marcá-la junto de
// qualquer outra opção é contraditório e envenenaria qualquer agregação
// futura, então a combinação é rejeitada aqui (HTTP 400), não só escondida
// na UI: a regra precisa valer para qualquer chamada da API, não apenas
// para o preenchimento que passa pela tela.
import { z } from "zod";

export function multiplaComExclusiva<const T extends readonly [string, ...string[]]>(
  opcoes: T,
  exclusiva: T[number],
) {
  return z
    .array(z.enum(opcoes))
    .min(1)
    .refine((valores) => !(valores.includes(exclusiva) && valores.length > 1), {
      message: `"${exclusiva}" não pode ser combinada com outras opções`,
    });
}
