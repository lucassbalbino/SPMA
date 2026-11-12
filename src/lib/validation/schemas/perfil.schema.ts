// Editar Perfil (RU-47 a RU-54, comentário 2 do documento do cliente): nome,
// e-mail e telefone que a própria pessoa corrige depois do cadastro.
//
// Mesmas regras de nome e e-mail dos dados cadastrais (AD-050). O telefone
// é opcional aqui; para o GO, que já o declara como obrigatório nos dados
// organizacionais, `PATCH /api/usuarios/me/perfil` continua exigindo.
import { z } from "zod";
import "../zod-pt";
import { telefoneOpcionalSchema } from "../telefone";
import { dadosCadastraisSchema } from "./dados-cadastrais.schema";

// Telefone ausente = "não mexer" (a tela só o envia quando a pessoa o
// altera, para não reescrever um telefone antigo, gravado antes da regra de
// DDD). Vazio apaga; preenchido segue a regra de DDD.
export const perfilSchema = dadosCadastraisSchema.extend({
  telefone: telefoneOpcionalSchema.optional(),
});

export type PerfilInput = z.output<typeof perfilSchema>;
