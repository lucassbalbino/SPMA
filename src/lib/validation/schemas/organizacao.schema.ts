import { z } from "zod";
import "../zod-pt";
import { OPCOES_UF } from "./pre-curso.schema";
import { telefoneObrigatorioSchema } from "../telefone";

// Dados organizacionais do GO (AD-043/AD-044) - os 6 campos que o próprio GO
// declara no 1º acesso (`PATCH /api/usuarios/me/organizacao`) e que AM/GT
// editam por `PATCH /api/usuarios/[documento]/organizacao`. Todos
// obrigatórios (OGO-04): o formulário manda string vazia e a API pode receber
// o campo ausente, e a pessoa tem de ver a mesma mensagem nos dois casos.
function textoObrigatorio(mensagem: string) {
  return z.string({ message: mensagem }).min(1, { message: mensagem });
}

export const organizacaoSchema = z.object({
  nome: textoObrigatorio("Nome é obrigatório"),
  responsavel: textoObrigatorio("Responsável é obrigatório"),
  email: textoObrigatorio("Email é obrigatório").email({ message: "Email inválido" }),
  // RU-45/RU-46 (doc 2): o contato é por WhatsApp - DDD obrigatório, e o
  // banco recebe só os dígitos.
  telefone: telefoneObrigatorioSchema("Telefone é obrigatório"),
  // Lista canônica (a mesma de `identifUf`/`avalPessoalEstado`), não só "2
  // caracteres": este corpo grava a MESMA coluna `Usuario.uf` que o
  // questionário de pré-curso valida por enum, e `length(2)` aceitava "ZZ".
  uf: z.enum(OPCOES_UF, { message: "UF inválida" }),
  municipio: textoObrigatorio("Município é obrigatório"),
});

export type OrganizacaoInput = z.infer<typeof organizacaoSchema>;
