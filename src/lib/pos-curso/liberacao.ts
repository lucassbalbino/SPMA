// O Pós-Curso só abre depois que o Pré-Curso do mesmo curso foi encerrado
// (AD-050). Os dois nascem juntos (POST /api/cursos), então o pós-curso
// existe desde o início e continua listado; o que fica fechado é preencher e
// encerrar. A tela mostra um aviso no lugar do formulário e as rotas de
// gravação respondem 409 com a mesma mensagem.
import type { StatusFormulario } from "../../generated/prisma/enums";

export const MENSAGEM_PRE_CURSO_EM_ANDAMENTO =
  "Encerre o pré-curso antes de preencher o pós-curso";

// O status chega pelo curso (`curso.preCurso`, AD-052), que o Prisma tipa
// como opcional; sem pré-curso, o pós continua fechado.
export function posCursoLiberado(preCurso: { status: StatusFormulario } | null): boolean {
  return preCurso?.status === "ENCERRADO";
}
