// Formulário de criação de verba da tela /verbas (GV-01..05, GV-07, GV-09,
// GV-10, AD-046). Renderizado só para AM/GT (`podeGerenciarVerba`), mas isso
// é conveniência: POST /api/verbas reavalia a permissão (AD-033).
//
// A forma é validada aqui pelo mesmo `verbaSchema` do servidor, que é quem
// decide de fato. Depois de criar, `router.refresh()` re-renderiza a página
// e a verba nova aparece na lista sem recarregar.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { headerCSRF } from "@/lib/security/csrf-client";
import { verbaSchema } from "@/lib/validation/schemas/verba.schema";

type OpcaoGo = { documento: string; nome: string | null };

export function NovaVerbaForm({ gos }: { gos: OpcaoGo[] }) {
  const router = useRouter();
  const [cdOfertante, setCdOfertante] = useState("");
  const [vlVerba, setVlVerba] = useState("");
  const [dtVerba, setDtVerba] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const semGo = gos.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = verbaSchema.safeParse({
      cdOfertante,
      vlVerba: vlVerba === "" ? undefined : Number(vlVerba),
      dtVerba: dtVerba || undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/verbas", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível criar a verba");
        return;
      }

      setCdOfertante("");
      setVlVerba("");
      setDtVerba("");
      router.refresh();
    } catch {
      setErro("Não foi possível criar a verba");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cdOfertante">GO</FieldLabel>
          <select
            id="cdOfertante"
            name="cdOfertante"
            value={cdOfertante}
            onChange={(event) => setCdOfertante(event.target.value)}
            disabled={enviando || semGo}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm dark:bg-input/30"
          >
            <option value="">Selecione o GO</option>
            {gos.map((go) => (
              <option key={go.documento} value={go.documento}>
                {go.nome ? `${go.nome} — ${go.documento}` : go.documento}
              </option>
            ))}
          </select>
          {semGo && (
            <p className="text-sm text-muted-foreground">
              Nenhum Ofertante cadastrado - cadastre um GO antes de criar uma verba.
            </p>
          )}
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="vlVerba">Valor da verba</FieldLabel>
          <Input
            id="vlVerba"
            name="vlVerba"
            type="number"
            min="0"
            step="0.01"
            value={vlVerba}
            onChange={(event) => setVlVerba(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dtVerba">Data de liberação</FieldLabel>
          <Input
            id="dtVerba"
            name="dtVerba"
            type="date"
            value={dtVerba}
            onChange={(event) => setDtVerba(event.target.value)}
            disabled={enviando}
          />
        </Field>
        {erro && <FieldError>{erro}</FieldError>}
        <Button type="submit" disabled={enviando || semGo}>
          Criar verba
        </Button>
      </FieldGroup>
    </form>
  );
}
