// Schemas das três rotas da gestão de usuários (design.md, "Schemas das três
// rotas"). Todos `.strict()`: uma chave desconhecida é erro de quem chama e
// sai como 400 (GU-17, GU-30, GU-44), em vez de ser descartada em silêncio
// pelo `z.object()`. É também o que garante GU-47: uma `senha` enviada pelo
// gestor nunca chega ao serviço.
//
// O documento-alvo e a busca trafegam só no corpo (GU-48), por isso estes
// schemas existem: nenhuma rota desta feature lê documento de URL.
import { z } from "zod";
import { TipoUsuario } from "../../../generated/prisma/enums";
import { normalizarDocumento } from "../documento";

export const consultaUsuariosSchema = z
  .object({
    pagina: z.number().int().min(1),
    tipo: z.enum(TipoUsuario).optional(),
    busca: z.string().trim().max(100).optional(),
  })
  .strict();

export type ConsultaUsuariosInput = z.output<typeof consultaUsuariosSchema>;

export const edicaoUsuarioSchema = z
  .object({
    documentoAtual: z.string().min(1),
    nome: z
      .string()
      .trim()
      .min(1, { message: "Nome é obrigatório" })
      .max(255, { message: "Nome deve ter no máximo 255 caracteres" })
      .optional(),
    // `""` é o jeito de apagar o e-mail (GU-25): vira `null` no transform.
    email: z.union([z.string().email({ message: "Email inválido" }), z.literal("")]).optional(),
    // Validado depois, conforme o `tipo` do alvo (`validarDocumentoDoTipo`):
    // o schema não sabe se o alvo é GO (CNPJ) ou não (CPF).
    documentoNovo: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.nome !== undefined || data.email !== undefined || data.documentoNovo !== undefined,
    { message: "Nada para alterar" },
  )
  .transform((data) => ({
    ...data,
    documentoAtual: normalizarDocumento(data.documentoAtual),
    email: data.email === "" ? null : data.email,
  }));

export type EdicaoUsuarioInput = z.output<typeof edicaoUsuarioSchema>;

export const resetarSenhaSchema = z
  .object({
    documento: z.string().min(1),
  })
  .strict()
  .transform((data) => ({ documento: normalizarDocumento(data.documento) }));
