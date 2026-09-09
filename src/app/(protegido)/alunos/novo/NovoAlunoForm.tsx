// Formulário de cadastro de Aluno, colocado junto de `page.tsx`. Client
// Component separado pelo mesmo motivo de `NovoUsuarioForm`/
// `MatricularAlunoForm`: `page.tsx` precisa continuar Server Component para
// chamar `requireSession()`.
//
// Envia para a mesma rota da criação em cascata (POST /api/usuarios) com
// `tipo` fixo em "AL" - não existe endpoint próprio de Aluno, e não deveria:
// a autorização (cascata + matrícula) já vive toda lá (AD-033). O que muda em
// relação à tela genérica é só o formulário, sem o `select` de tipo e sem os
// campos de Ofertante/verba, que nunca se aplicam a um Aluno (AD-012).
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usuarioSchema } from "@/lib/validation/schemas/usuario.schema";
import { headerCSRF } from "@/lib/security/csrf-client";
import { TipoUsuario } from "@/generated/prisma/enums";

export function NovoAlunoForm({ cdCursosDisponiveis }: { cdCursosDisponiveis: number[] }) {
  const router = useRouter();

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cdCurso, setCdCurso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    // AVAL-01: Aluno sem curso não é cadastro incompleto, é Aluno sem
    // matrícula - barrado aqui e de novo no servidor.
    if (!cdCurso) {
      setErro("Curso é obrigatório");
      return;
    }

    const entrada = usuarioSchema.safeParse({
      cpf,
      nome,
      email: email || undefined,
      tipo: TipoUsuario.AL,
      cdCurso: Number(cdCurso),
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível cadastrar o aluno");
        return;
      }

      setSucesso(`Aluno ${corpo.usuario.nome} cadastrado e matriculado.`);
      setCpf("");
      setNome("");
      setEmail("");
      setCdCurso("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cpf">CPF</FieldLabel>
          <Input
            id="cpf"
            name="cpf"
            data-testid="campo-cpf-aluno"
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="nome">Nome</FieldLabel>
          <Input
            id="nome"
            name="nome"
            data-testid="campo-nome-aluno"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cdCurso">Curso</FieldLabel>
          <select
            id="cdCurso"
            name="cdCurso"
            data-testid="select-curso-aluno"
            value={cdCurso}
            onChange={(event) => setCdCurso(event.target.value)}
            disabled={enviando || cdCursosDisponiveis.length === 0}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm dark:bg-input/30"
          >
            <option value="">Selecione</option>
            {cdCursosDisponiveis.map((cd) => (
              <option key={cd} value={cd}>
                Curso #{cd}
              </option>
            ))}
          </select>
          {cdCursosDisponiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum curso disponível - crie um pré-curso antes de cadastrar o aluno.
            </p>
          )}
        </Field>
        {erro && <FieldError data-testid="erro-novo-aluno">{erro}</FieldError>}
        {sucesso && (
          <p className="text-sm text-muted-foreground" data-testid="sucesso-novo-aluno">
            {sucesso}
          </p>
        )}
        <Button type="submit" disabled={enviando}>
          Cadastrar aluno
        </Button>
      </FieldGroup>
    </form>
  );
}
