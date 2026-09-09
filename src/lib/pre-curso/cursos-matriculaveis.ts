// Cursos em que um dado usuário pode matricular um Aluno (AVAL-05/06).
//
// É `podeMatricularAluno` (guards.ts) escrito como filtro que o banco
// entende: AM tem autoridade nacional e não tem `cdOfertante` (AD-012), então
// vê os cursos de todos; GO só os do próprio Ofertante; os demais perfis não
// matriculam ninguém e recebem lista vazia.
//
// Vive aqui, e não copiado dentro de cada `page.tsx`, porque duas telas já
// precisam da mesma lista (`/usuarios/novo` e `/alunos/novo`) - uma terceira
// cópia divergiria no primeiro ajuste de escopo. Continua sendo conveniência
// de UI: o curso escolhido é reavaliado em POST /api/usuarios (AD-033).
import { prisma } from "../db/prisma";
import type { TipoUsuario } from "../../generated/prisma/enums";

export async function cursosMatriculaveis(usuario: {
  tipo: TipoUsuario;
  cdOfertante: number | null;
}): Promise<number[]> {
  if (usuario.tipo !== "AM" && !(usuario.tipo === "GO" && usuario.cdOfertante !== null)) {
    return [];
  }

  const cursos = await prisma.preCurso.findMany({
    where: usuario.tipo === "AM" ? {} : { cdOfertante: usuario.cdOfertante ?? -1 },
    orderBy: { cdCurso: "asc" },
    select: { cdCurso: true },
  });

  return cursos.map((curso) => curso.cdCurso);
}
