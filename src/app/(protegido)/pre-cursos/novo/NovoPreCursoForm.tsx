// Formulário de criação de pré-curso (REQ-PC-01/02/03), colocado junto de
// `page.tsx` (T9). Client Component separado pelo mesmo motivo de
// `NovoUsuarioForm.tsx`: `page.tsx` precisa continuar Server Component para
// chamar `requireSession()`. Estado simples (2 campos) - useState direto,
// sem o padrão de `respostas` genérico usado no formulário de 56 campos
// (T10).
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { criarPreCursoSchema } from "@/lib/validation/schemas/pre-curso.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

type OpcaoVerba = { cdVerba: number; saldoDisponivel: number };

export function NovoPreCursoForm({ opcoesVerba }: { opcoesVerba: OpcaoVerba[] }) {
  const router = useRouter();

  const [cdVerba, setCdVerba] = useState<string | null>(null);
  const [vlCursoAlocado, setVlCursoAlocado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = criarPreCursoSchema.safeParse({
      cdVerba: cdVerba ? Number(cdVerba) : undefined,
      vlCursoAlocado: vlCursoAlocado ? Number(vlCursoAlocado) : undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/pre-cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(
          corpo.saldoDisponivel !== undefined
            ? `${corpo.erro} (saldo disponível: ${corpo.saldoDisponivel})`
            : (corpo.erro ?? "Não foi possível criar o pré-curso"),
        );
        return;
      }

      router.push(`/pre-cursos/${corpo.preCurso.cdCurso}`);
    } finally {
      setEnviando(false);
    }
  }

  if (opcoesVerba.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma verba disponível para o seu Ofertante.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cdVerba">Verba</FieldLabel>
          <Select value={cdVerba} onValueChange={(valor) => setCdVerba(valor as string)}>
            <SelectTrigger id="cdVerba" data-testid="select-verba" disabled={enviando}>
              <SelectValue placeholder="Selecione uma verba" />
            </SelectTrigger>
            <SelectContent>
              {opcoesVerba.map((opcao) => (
                <SelectItem
                  key={opcao.cdVerba}
                  value={String(opcao.cdVerba)}
                  data-testid={`opcao-verba-${opcao.cdVerba}`}
                >
                  Verba #{opcao.cdVerba} — saldo R$ {opcao.saldoDisponivel.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="vlCursoAlocado">Valor alocado ao curso</FieldLabel>
          <Input
            id="vlCursoAlocado"
            name="vlCursoAlocado"
            type="number"
            step="0.01"
            value={vlCursoAlocado}
            onChange={(event) => setVlCursoAlocado(event.target.value)}
            disabled={enviando}
          />
        </Field>
        {erro && <FieldError data-testid="erro-novo-pre-curso">{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Criar pré-curso
        </Button>
      </FieldGroup>
    </form>
  );
}
