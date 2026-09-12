import { z } from "zod";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { camposVerbaSchema } from "./verba.schema";
import { normalizarCPF, validarCPF } from "../cpf";
import { normalizarCNPJ, validarCNPJ } from "../cnpj";

// Campos organizacionais (AD-043/UGO-01/UGO-08): só fazem sentido para GO,
// que passou a SER o próprio Ofertante. `uf` é obrigatória para GO (checado
// em superRefine, junto do `nome` que a base já exige para todo mundo);
// `responsavel`/`telefone`/`municipio` continuam opcionais mesmo para GO.
const CAMPOS_SO_GO = ["responsavel", "telefone", "municipio"] as const;

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
    // (AVAL-01): todo AL nasce com uma AvaliacaoAluno. Opcional aqui pelo mesmo
    // motivo de `verba` - a rota é quem exige, sabendo o tipo criado.
    cdCurso: z.number().int().positive({ message: "Curso é obrigatório" }).optional(),
    // Verba criada no mesmo passo que o usuário (REQ-OV-08). Sem `cdOfertante`
    // próprio: é sempre o do usuário sendo criado. Opcional aqui porque a
    // obrigatoriedade depende de quem cria e do tipo criado - regra que o
    // schema não tem como enxergar, avaliada em POST /api/usuarios.
    verba: camposVerbaSchema.optional(),
    responsavel: z.string().optional(),
    telefone: z.string().optional(),
    uf: z.string().optional(),
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

    if (data.tipo === TipoUsuario.GO && !data.uf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UF é obrigatória",
        path: ["uf"],
      });
    }

    // Decisão desta tarefa (T8): campos organizacionais fora do tipo GO são
    // REJEITADOS, não aceitos-e-ignorados silenciosamente - evita persistir
    // dado organizacional "fantasma" associado a um tipo que nunca deveria
    // carregá-lo.
    if (data.tipo !== TipoUsuario.GO) {
      for (const campo of CAMPOS_SO_GO) {
        if (data[campo] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${campo} só é aceito para o tipo GO`,
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
