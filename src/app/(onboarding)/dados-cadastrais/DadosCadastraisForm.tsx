// Formulário de nome e e-mail do 1º acesso de AM/GT/VT/VO (AD-050),
// colocado junto de `page.tsx`. Consome PATCH /api/usuarios/me/dados-cadastrais.
//
// A validação de schema aqui é só conveniência (AD-004): o servidor
// reconfere o corpo antes de gravar.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dadosCadastraisSchema } from "@/lib/validation/schemas/dados-cadastrais.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

export function DadosCadastraisForm({ emailInicial }: { emailInicial: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(emailInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = dadosCadastraisSchema.safeParse({ nome, email });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios/me/dados-cadastrais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível salvar os seus dados");
        return;
      }

      router.push(corpo.proximaRota ?? "/painel");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="nome">Nome completo</FieldLabel>
          <Input
            id="nome"
            name="nome"
            autoComplete="name"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={enviando}
          />
        </Field>
        {erro && <FieldError>{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Salvar
        </Button>
      </FieldGroup>
    </form>
  );
}
