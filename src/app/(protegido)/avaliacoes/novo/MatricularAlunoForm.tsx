// Formulário de matrícula de um Aluno num curso (AVAL-01 a 05), colocado
// junto de `page.tsx` (T8). Client Component separado pelo mesmo motivo de
// `NovoPosCursoForm.tsx`: `page.tsx` precisa continuar Server Component para
// chamar `requireSession()`.
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
import { matricularAlunoSchema } from "@/lib/validation/schemas/avaliacao.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

export function MatricularAlunoForm({
  cdCursosDisponiveis,
}: {
  cdCursosDisponiveis: number[];
}) {
  const router = useRouter();

  const [cpf, setCpf] = useState("");
  const [cdCurso, setCdCurso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = matricularAlunoSchema.safeParse({
      cpf,
      cdCurso: cdCurso ? Number(cdCurso) : undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível matricular o aluno");
        return;
      }

      router.push(`/avaliacoes/${corpo.avaliacao.cpf}/${corpo.avaliacao.cdCurso}`);
    } finally {
      setEnviando(false);
    }
  }

  if (cdCursosDisponiveis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum curso cadastrado ainda - crie um pré-curso antes de matricular um aluno.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cpf">CPF do aluno</FieldLabel>
          <Input
            id="cpf"
            data-testid="campo-cpf-aluno"
            type="text"
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cdCurso">Curso</FieldLabel>
          <Select value={cdCurso} onValueChange={(valor) => setCdCurso(valor as string)}>
            <SelectTrigger id="cdCurso" data-testid="select-curso" disabled={enviando}>
              <SelectValue placeholder="Selecione um curso" />
            </SelectTrigger>
            <SelectContent>
              {cdCursosDisponiveis.map((cd) => (
                <SelectItem key={cd} value={String(cd)} data-testid={`opcao-curso-${cd}`}>
                  Curso #{cd}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {erro && <FieldError data-testid="erro-nova-avaliacao">{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Matricular
        </Button>
      </FieldGroup>
    </form>
  );
}
