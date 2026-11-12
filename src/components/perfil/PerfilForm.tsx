// Editar Perfil de AM, GT, VT, GO e VO (RU-48, RU-53, comentário 2 do
// documento do cliente): nome, e-mail e telefone do próprio cadastro.
// Consome PATCH /api/usuarios/me/perfil. O Aluno edita pelo formulário de
// dados pessoais.
//
// A validação de schema aqui é só conveniência (AD-004): o servidor
// reconfere o corpo, e só ele sabe que o telefone do GO é obrigatório.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { perfilSchema } from "@/lib/validation/schemas/perfil.schema";
import { mascaraTelefone } from "@/lib/validation/telefone";
import { headerCSRF } from "@/lib/security/csrf-client";
import { AVISO_SENHA } from "@/lib/ui/perfil";

export function PerfilForm({
  inicial,
  mostrarAvisoSenha,
}: {
  inicial: { nome: string; email: string; telefone: string };
  /** Falso para o AM, que não tem gestor acima dele. */
  mostrarAvisoSenha: boolean;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial.nome);
  const [email, setEmail] = useState(inicial.email);
  const [telefone, setTelefone] = useState(() => mascaraTelefone(inicial.telefone));
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSalvo(false);

    const entrada = perfilSchema.safeParse({ nome, email, telefone });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios/me/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível salvar o perfil");
        return;
      }

      setSalvo(true);
      // O nome aparece no painel ("Olá, <nome>"): recarrega os dados da sessão.
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full max-w-lg" data-testid="form-perfil">
      <CardHeader>
        <CardTitle>Editar Perfil</CardTitle>
        {mostrarAvisoSenha && (
          <p className="text-sm text-muted-foreground" data-testid="aviso-senha">
            {AVISO_SENHA}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!erro}>
              <FieldLabel htmlFor="nome">Nome</FieldLabel>
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
            <Field data-invalid={!!erro}>
              <FieldLabel htmlFor="telefone">Telefone/WhatsApp (com DDD)</FieldLabel>
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(61) 99999-9999"
                value={telefone}
                onChange={(event) => setTelefone(mascaraTelefone(event.target.value))}
                disabled={enviando}
              />
            </Field>
            {erro && <FieldError data-testid="erro-perfil">{erro}</FieldError>}
            {salvo && (
              <p role="status" className="text-sm text-muted-foreground" data-testid="salvo-perfil">
                Perfil salvo.
              </p>
            )}
            <Button type="submit" disabled={enviando}>
              Salvar
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
