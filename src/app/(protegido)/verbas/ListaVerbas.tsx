// Lista de verbas da tela /verbas (GV-11, GV-14, GV-15, AD-046) e, para
// AM/GT, a edição de valor e data dentro da própria linha (GV-18..20, GV-22),
// no padrão de `LinhaUsuario`: uma linha aberta por vez.
//
// O escopo e o saldo chegam prontos do servidor (`listarVerbasDoEscopo`, a
// mesma consulta de GET /api/verbas). `podeEditar` é conveniência de tela:
// PATCH /api/verbas/[id] reavalia a permissão e o teto (AD-033, AD-016).
"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { headerCSRF } from "@/lib/security/csrf-client";
import { edicaoVerbaSchema } from "@/lib/validation/schemas/verba.schema";

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

/** Colunas compartilhadas por cabeçalho e linhas, para alinharem. */
const COLUNAS = "sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_5rem]";

export function ListaVerbas({
  verbas,
  podeEditar,
}: {
  verbas: VerbaDaTela[];
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState<number | null>(null);

  if (verbas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma verba cadastrada.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border text-sm">
      {/* Cabeçalho só visual: em tela estreita some, e cada célula traz o
          próprio rótulo (que o leitor de tela também lê em tela larga). */}
      <div
        aria-hidden="true"
        className={`hidden gap-3 border-b border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground sm:grid ${COLUNAS}`}
      >
        <span>Ofertante</span>
        <span>CNPJ</span>
        <span>Valor</span>
        <span>Saldo</span>
        <span>Liberação</span>
        <span />
      </div>
      <ul className="divide-y divide-border">
        {verbas.map((verba) => {
          const aberta = editando === verba.cdVerba;
          return (
            <li
              key={verba.cdVerba}
              data-testid={`verba-${verba.cdVerba}`}
              className="flex flex-col gap-3 px-3 py-2"
            >
              <div className={`grid items-center gap-1 sm:gap-3 ${COLUNAS}`}>
                {/* Primeiro span da linha: o nome do GO (o e2e de GV-11 conta com isso). */}
                <span className="font-medium">
                  {verba.nomeOfertante ?? verba.cdOfertante}
                </span>
                <div>
                  <Rotulo>CNPJ</Rotulo> {verba.cdOfertante}
                </div>
                <div>
                  <Rotulo>Valor</Rotulo> {moeda(verba.vlVerba)}
                </div>
                <div>
                  <Rotulo>Saldo</Rotulo> {moeda(verba.saldoDisponivel)}
                </div>
                <div>
                  <Rotulo>Liberação</Rotulo>{" "}
                  <span className="text-muted-foreground">
                    {dataBr(verba.dtVerba)}
                  </span>
                </div>
                {podeEditar && !aberta ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-self-start sm:justify-self-end"
                    onClick={() => setEditando(verba.cdVerba)}
                  >
                    Editar
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              {aberta && (
                <EdicaoVerba verba={verba} aoFechar={() => setEditando(null)} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Rótulo da célula: visível em tela estreita, só para leitor de tela na larga. */
function Rotulo({ children }: { children: string }) {
  return <span className="text-muted-foreground sm:sr-only">{children}</span>;
}

/**
 * Montado só enquanto a linha está aberta: os campos começam com os valores
 * atuais. Só valor e data - o GO de uma verba não se troca (AD-015, GV-22).
 */
function EdicaoVerba({
  verba,
  aoFechar,
}: {
  verba: VerbaDaTela;
  aoFechar: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [vlVerba, setVlVerba] = useState(String(verba.vlVerba));
  const [dtVerba, setDtVerba] = useState(verba.dtVerba ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    // Data vazia não apaga a data atual: o PATCH trata `dtVerba` ausente como
    // "não alterar" (spec.md, Assumptions).
    const entrada = edicaoVerbaSchema.safeParse({
      vlVerba: vlVerba === "" ? undefined : Number(vlVerba),
      dtVerba: dtVerba || undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/verbas/${verba.cdVerba}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        // GV-19: o 409 de "abaixo do já alocado" chega aqui; a linha continua
        // aberta com o valor digitado, para corrigir.
        setErro(corpo.erro ?? "Não foi possível salvar a verba");
        return;
      }

      aoFechar();
      router.refresh();
    } catch {
      setErro("Não foi possível salvar a verba");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor={`${id}-vlVerba`}>Valor da verba</FieldLabel>
          <Input
            id={`${id}-vlVerba`}
            type="number"
            min="0"
            step="0.01"
            value={vlVerba}
            onChange={(event) => setVlVerba(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-dtVerba`}>Data de liberação</FieldLabel>
          <Input
            id={`${id}-dtVerba`}
            type="date"
            value={dtVerba}
            onChange={(event) => setDtVerba(event.target.value)}
            disabled={enviando}
          />
        </Field>
        {erro && <FieldError>{erro}</FieldError>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={enviando}>
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={aoFechar}
            disabled={enviando}
          >
            Cancelar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
