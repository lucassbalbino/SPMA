import { z } from "zod";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { normalizarCPF, validarCPF } from "../cpf";
import { normalizarCNPJ, validarCNPJ } from "../cnpj";
import { OPCOES_UF } from "./pre-curso.schema";

// Dados organizacionais na criação (AD-044, OGO-09/OGO-10): AM/GT só
// identificam o GO (CNPJ + nome); os 6 dados organizacionais são declarados
// pelo próprio GO no 1º acesso. Por isso estes três nunca são aceitos na
// criação, de tipo nenhum.
//
// `verba` (GV-26, AD-046): a verba deixou de nascer junto do usuário - é
// criada à parte, em /verbas, por AM/GT.
const CAMPOS_NUNCA_NA_CRIACAO = ["responsavel", "telefone", "municipio", "verba"] as const;

// Estes dois são do GO e também ficam fora da criação dele - mas continuam
// aceitos para os outros tipos: `email` porque VT/VO/AL não têm onde declarar
// o próprio (OGO-13), e `uf` por decisão anterior fixada em teste ("aceita uf
// informada para um tipo != GO"). Se um dia só GO puder ter UF, mude a
// decisão e o teste junto - não esta lista sozinha.
const CAMPOS_FORA_DA_CRIACAO_DO_GO = ["email", "uf"] as const;

export const usuarioSchema = z
  .object({
    // 11 dígitos (CPF) ou 14 (CNPJ), conforme `tipo` - validado abaixo em
    // `superRefine` porque o algoritmo depende do `tipo` (UGO-07/UGO-09).
    documento: z.string(),
    nome: z.string().min(1, { message: "Nome é obrigatório" }),
    email: z.string().email({ message: "Email inválido" }).optional(),
    tipo: z.enum(TipoUsuario, { message: "Tipo de usuário inválido" }),
    // Documento (CNPJ) do GO ao qual o usuário sendo criado se vincula
    // (UGO-14) - não é mais um código substituto de Ofertante.
    cdOfertante: z.string().optional(),
    // Curso em que o Aluno é matriculado no mesmo passo em que é criado
    // (AVAL-01): todo AL nasce com uma AvaliacaoAluno. Opcional aqui porque a
    // obrigatoriedade depende do tipo criado - a rota é quem exige.
    cdCurso: z.number().int().positive({ message: "Curso é obrigatório" }).optional(),
    // Declarado só para ser REJEITADO (CAMPOS_NUNCA_NA_CRIACAO, GV-26).
    verba: z.unknown().optional(),
    responsavel: z.string().optional(),
    telefone: z.string().optional(),
    // Mesma lista canônica de `identifUf`/`avalPessoalEstado`, em vez de uma
    // string livre: aceitar "ZZ" aqui enquanto o questionário exige uma UF
    // real é uma divergência sem motivo.
    uf: z.enum(OPCOES_UF, { message: "UF inválida" }).optional(),
    municipio: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const documentoValido =
      data.tipo === TipoUsuario.GO ? validarCNPJ(data.documento) : validarCPF(data.documento);

    if (!documentoValido) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: data.tipo === TipoUsuario.GO ? "CNPJ inválido" : "CPF inválido",
        path: ["documento"],
      });
    }

    // REJEITADOS, não aceitos-e-ignorados (precedente da T8 de
    // `unificacao-ofertante-go`): campo que não deveria vir é erro de quem
    // chama, não dado com dois donos. Os campos continuam declarados no
    // `z.object` justamente para isto - sem eles, o Zod os descartaria em
    // silêncio e a rejeição não aconteceria.
    for (const campo of CAMPOS_NUNCA_NA_CRIACAO) {
      if (data[campo] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${campo} não é aceito na criação de usuário`,
          path: [campo],
        });
      }
    }

    if (data.tipo === TipoUsuario.GO) {
      for (const campo of CAMPOS_FORA_DA_CRIACAO_DO_GO) {
        if (data[campo] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${campo} não é aceito na criação de Gestor Ofertante`,
            path: [campo],
          });
        }
      }
    }
  })
  .transform((data) => ({
    ...data,
    documento:
      data.tipo === TipoUsuario.GO
        ? normalizarCNPJ(data.documento)
        : normalizarCPF(data.documento),
  }));

export type UsuarioInput = z.infer<typeof usuarioSchema>;
