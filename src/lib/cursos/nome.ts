// O nome de uma formação, como as telas o mostram (RU-10).
//
// O nome do curso é a resposta P8 do Cadastro de Formação (AD-052.2) - não
// há coluna de nome em `TB_Curso`. Desde a revisão de usabilidade a P8 nasce
// preenchida na criação; o texto de reserva só aparece para formação antiga,
// criada antes disso e ainda sem a pergunta 8 respondida.
export function nomeDaFormacao(p8: string | null | undefined, cdCurso: number): string {
  const nome = p8?.trim();
  return nome ? nome : `Formação sem nome (nº ${cdCurso})`;
}
