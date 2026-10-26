// Nome e e-mail que a própria pessoa declara depois do 1º login (AD-050).
//
// Só o Administrador Master nasce com eles (`usuarioSchema`). GT/VT/VO os
// informam em /dados-cadastrais e o Aluno junto dos dados pessoais; o GO já
// os declarava nos dados organizacionais (AD-044) e segue por lá.
import { z } from "zod";

export const dadosCadastraisSchema = z.object({
  nome: z.string().trim().min(1, { message: "Nome é obrigatório" }),
  email: z.string().trim().email({ message: "E-mail inválido" }),
});

export type DadosCadastraisInput = z.infer<typeof dadosCadastraisSchema>;
