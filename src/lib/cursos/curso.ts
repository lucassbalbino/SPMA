// Curso como tabela própria (AD-052). O pré-curso e o pós-curso guardam só a
// etapa; ofertante, verba, valor, criador e data de criação vivem em
// `TB_Curso`. As rotas continuam devolvendo esses campos no próprio registro
// da etapa, como antes: `comCurso` é a única tradução entre os dois formatos.

/** Campos do curso que cada etapa expõe no JSON, os mesmos de antes do AD-052. */
export const CAMPOS_DO_CURSO = {
  preCurso: ["cdOfertante", "cdVerba", "vlCursoAlocado", "criadoPor", "dataCriacao"],
  posCurso: ["cdOfertante", "criadoPor", "dataCriacao"],
} as const;

type Etapa = keyof typeof CAMPOS_DO_CURSO;
type Campo<E extends Etapa> = (typeof CAMPOS_DO_CURSO)[E][number];

const selecionar = <E extends Etapa>(etapa: E) =>
  Object.fromEntries(CAMPOS_DO_CURSO[etapa].map((campo) => [campo, true])) as { [C in Campo<E>]: true };

/** `include` que traz do curso exatamente os campos que a etapa expõe. */
export const incluirCurso = <E extends Etapa>(etapa: E) => ({ curso: { select: selecionar(etapa) } });

/**
 * O pós-curso também precisa do status do pré do mesmo curso: ele só abre
 * depois do pré encerrado (AD-050).
 */
export const INCLUIR_CURSO_DO_POS = {
  curso: { select: { ...selecionar("posCurso"), preCurso: { select: { status: true } } } },
} as const;

/**
 * Devolve o registro da etapa sem a chave `curso` e com os campos dela no
 * topo, na forma que as rotas sempre devolveram.
 */
export function comCurso<E extends Etapa, R extends { curso: Pick<Record<Campo<E>, unknown>, Campo<E>> }>(
  etapa: E,
  registro: R,
): Omit<R, "curso"> & Pick<R["curso"], Campo<E>> {
  const { curso, ...etapaSemCurso } = registro;
  const campos = Object.fromEntries(
    CAMPOS_DO_CURSO[etapa].map((campo) => [campo, (curso as Record<string, unknown>)[campo]]),
  );
  return { ...etapaSemCurso, ...campos } as Omit<R, "curso"> & Pick<R["curso"], Campo<E>>;
}
