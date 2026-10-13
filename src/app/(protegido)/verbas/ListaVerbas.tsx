// Lista de verbas da tela /verbas (GV-11, GV-14, GV-15, AD-046).
//
// O escopo e o saldo chegam prontos do servidor (`listarVerbasDoEscopo`, a
// mesma consulta de GET /api/verbas); esta tela só exibe.
"use client";

/** Verba já serializada pelo Server Component: sem Decimal nem Date. */
export interface VerbaDaTela {
  cdVerba: number;
  cdOfertante: string;
  nomeOfertante: string | null;
  vlVerba: number;
  saldoDisponivel: number;
  /** "AAAA-MM-DD", ou null quando a verba não tem data de liberação. */
  dtVerba: string | null;
}

/** Mesmo formato de moeda de `NovoCursoForm`. */
function moeda(valor: number): string {
  return `R$ ${valor.toFixed(2)}`;
}

/** "AAAA-MM-DD" → "dd/mm/aaaa", sem passar por Date (sem fuso). */
function dataBr(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ListaVerbas({ verbas }: { verbas: VerbaDaTela[] }) {
  if (verbas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma verba cadastrada.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {verbas.map((verba) => (
        <li
          key={verba.cdVerba}
          data-testid={`verba-${verba.cdVerba}`}
          className="flex flex-col gap-3 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <div className="grid items-center gap-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <span className="font-medium">{verba.nomeOfertante ?? verba.cdOfertante}</span>
            <span>{verba.cdOfertante}</span>
            <span>Valor {moeda(verba.vlVerba)}</span>
            <span>Saldo {moeda(verba.saldoDisponivel)}</span>
            <span className="text-muted-foreground">{dataBr(verba.dtVerba)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
