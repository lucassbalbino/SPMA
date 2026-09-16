// Nome por extenso de cada TP_Usuario, para exibição na interface (a sigla
// continua sendo o valor gravado/enviado - só o rótulo mudou). Fonte: seção
// 2.1 de docs/SPMA_Especificacao_Cliente_v2.md.
import { TipoUsuario } from "../../generated/prisma/enums";

export const NOME_TIPO_USUARIO: Record<TipoUsuario, string> = {
  AM: "Administrador Master",
  GT: "Gestor Turismo",
  VT: "Visualizador Turismo",
  GO: "Gestor Ofertante",
  VO: "Visualizador Ofertante",
  AL: "Aluno",
};
