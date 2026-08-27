// Formulário de criação de pós-curso (REQ-PO-01/02/03), colocado junto de
// `page.tsx` (T8). Client Component separado pelo mesmo motivo de
// `NovoPreCursoForm.tsx`: `page.tsx` precisa continuar Server Component
// para chamar `requireSession()`.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { criarPosCursoSchema } from "@/lib/validation/schemas/pos-curso.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

export function NovoPosCursoForm({ cdCursosElegiveis }: { cdCursosElegiveis: number[] }) {
  const router = useRouter();

  const [cdCurso, setCdCurso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = criarPosCursoSchema.safeParse({
      cdCurso: cdCurso ? Number(cdCurso) : undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/pos-cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível criar o pós-curso");
        return;
      }

      router.push(`/pos-cursos/${corpo.posCurso.cdCurso}`);
    } finally {
      setEnviando(false);
    }
  }

  if (cdCursosElegiveis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum pré-curso disponível para iniciar um pós-curso - todos já têm um pós-curso, ou
        nenhum pré-curso foi cadastrado ainda.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cdCurso">Pré-curso</FieldLabel>
          <Select value={cdCurso} onValueChange={(valor) => setCdCurso(valor as string)}>
            <SelectTrigger id="cdCurso" data-testid="select-pre-curso" disabled={enviando}>
              <SelectValue placeholder="Selecione um pré-curso" />
            </SelectTrigger>
            <SelectContent>
              {cdCursosElegiveis.map((cd) => (
                <SelectItem
                  key={cd}
                  value={String(cd)}
                  data-testid={`opcao-pre-curso-${cd}`}
                >
                  Pré-curso #{cd}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {erro && <FieldError data-testid="erro-novo-pos-curso">{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Criar pós-curso
        </Button>
      </FieldGroup>
    </form>
  );
}
