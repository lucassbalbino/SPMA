// Dado pessoal do Aluno (PESSOAL-07, PESSOAL-10).
//
// Esta é a fronteira declarada UMA vez: as 7 perguntas da seção DADOS PESSOAIS
// do `docs/Questionario_do_Aluno_1.md` (Q3-Q9) deixam de ser resposta do
// questionário de um curso e passam a ser atributo da pessoa, chaveado só pelo
// CPF. Q1 (nome) e Q2 (CPF) não entram: já vivem em `TB_Usuario`.
//
// As chaves NÃO mudam de nome (seguem `avalPessoal*`): é o mesmo dado, só muda
// de tabela. Renomear seria custo sem benefício e quebraria o rastro para quem
// ler a migration de descarte depois.
import { z } from "zod";
import { OPCOES_UF } from "./pre-curso.schema";

export { OPCOES_UF };

// ---- Constantes de opções (Q5-Q9) ----
//
// Transcritas de `docs/Questionario_do_Aluno_1.md`. Reexportadas para a UI
// montar Select/RadioGroup sem duplicar a lista (AD-004: schema único, cliente
// e servidor).

// Q5 - gênero.
export const OPCOES_GENERO = ["Feminino", "Masculino", "Prefiro não informar"] as const;

// Q6 - faixa etária.
export const OPCOES_FAIXA_ETARIA = [
  "Até 18 anos",
  "19 a 25 anos",
  "26 a 35 anos",
  "36 a 50 anos",
  "Acima de 50 anos",
] as const;

// Q7 - nível de escolaridade.
export const OPCOES_ESCOLARIDADE = [
  "Sem escolaridade",
  "Ensino fundamental incompleto",
  "Ensino fundamental completo",
  "Ensino médio incompleto",
  "Ensino médio completo",
  "Ensino técnico",
  "Ensino superior incompleto",
  "Ensino superior completo",
  "Pós-graduação incompleta",
  "Pós-graduação completa",
] as const;

// Q8 - cor/raça/etnia.
export const OPCOES_RACA_ETNIA = ["Branco", "Negro", "Pardo", "Amarelo", "Indígena"] as const;

// Q9 - condição de PCD. Note que NÃO é Sim/Não: o questionário fonte pede o
// tipo da deficiência na mesma pergunta.
export const OPCOES_CONDICAO_PCD = [
  "Não sou uma Pessoa com Deficiência.",
  "Sim, tenho deficiência física (paralisias, amputações, ausência de membros, lesões nervosas ou musculares, etc.)",
  "Sim, tenho deficiência auditiva.",
  "Sim, tenho deficiência visual.",
  "Sim, tenho deficiência intelectual/mental.",
] as const;

// ---- Forma das 7 chaves (Q3-Q9) ----
//
// Todas `.optional()`, mesma política de `respostasAvaliacaoSchema`: o schema
// valida FORMA, e a obrigatoriedade vive em
// `src/lib/dados-pessoais/completude.ts`. É o que permite ao PATCH de edição
// enviar um campo só sem que o schema exija os outros seis.
export const respostasDadosPessoaisSchema = z.object({
  avalPessoalEstado: z.enum(OPCOES_UF).optional(),
  avalPessoalMunicipio: z.string().min(1).optional(),
  avalPessoalGenero: z.enum(OPCOES_GENERO).optional(),
  avalPessoalFaixaEtaria: z.enum(OPCOES_FAIXA_ETARIA).optional(),
  avalPessoalEscolaridade: z.enum(OPCOES_ESCOLARIDADE).optional(),
  avalPessoalRacaEtnia: z.enum(OPCOES_RACA_ETNIA).optional(),
  avalPessoalCondicaoPcd: z.enum(OPCOES_CONDICAO_PCD).optional(),
});

export type RespostasDadosPessoais = z.infer<typeof respostasDadosPessoaisSchema>;

// A lista é explícita, com `satisfies`, nunca derivada do prefixo `avalPessoal`
// — mesma razão de `CHAVES_PARTE_1` (AD-041): um campo novo batizado com o
// mesmo prefixo não deve mudar de tabela sem alguém decidir. O `satisfies`
// quebra a compilação se uma chave sumir do schema.
export const CHAVES_DADOS_PESSOAIS = [
  "avalPessoalEstado",
  "avalPessoalMunicipio",
  "avalPessoalGenero",
  "avalPessoalFaixaEtaria",
  "avalPessoalEscolaridade",
  "avalPessoalRacaEtnia",
  "avalPessoalCondicaoPcd",
] as const satisfies readonly (keyof RespostasDadosPessoais)[];
