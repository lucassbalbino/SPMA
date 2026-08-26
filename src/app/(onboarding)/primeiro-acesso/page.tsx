// /primeiro-acesso (REQ-AU-02).
//
// Formulário de definição de senha (nova senha + confirmação), consome
// POST /api/auth/primeiro-acesso. Alcançável só com sessão válida (guard do
// layout de `(onboarding)`) - inclusive a sessão "pendente" aberta pelo
// login de quem ainda não tem senha.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { primeiroAcessoSchema } from "@/lib/validation/schemas/primeiro-acesso.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = primeiroAcessoSchema.safeParse({ senha, confirmacaoSenha });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/auth/primeiro-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível definir a senha");
        return;
      }

      router.push(corpo.proximaRota ?? "/painel");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Defina sua senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!erro}>
                <FieldLabel htmlFor="senha">Nova senha</FieldLabel>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  disabled={enviando}
                />
              </Field>
              <Field data-invalid={!!erro}>
                <FieldLabel htmlFor="confirmacaoSenha">Confirme a senha</FieldLabel>
                <Input
                  id="confirmacaoSenha"
                  name="confirmacaoSenha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmacaoSenha}
                  onChange={(event) => setConfirmacaoSenha(event.target.value)}
                  disabled={enviando}
                />
              </Field>
              {erro && <FieldError>{erro}</FieldError>}
              <Button type="submit" disabled={enviando}>
                Salvar senha
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
