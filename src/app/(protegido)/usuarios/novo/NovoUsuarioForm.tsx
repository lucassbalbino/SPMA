// Formulário de criação de usuário em cascata (REQ-AU-05), colocado junto de
// `page.tsx` (T29). Componente cliente separado porque `page.tsx` precisa
// continuar sendo um Server Component para chamar `requireSession()`
// (redirect-based) - "use client" se aplica ao arquivo inteiro, então a
// interatividade (useState/fetch) não pode viver no mesmo arquivo que a
// guarda de sessão.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TIPOS_PERMITIDOS } from "@/lib/auth/cascata";
import { usuarioSchema } from "@/lib/validation/schemas/usuario.schema";
import type { TipoUsuario } from "@/generated/prisma/enums";

export function NovoUsuarioForm({ tipoCriador }: { tipoCriador: TipoUsuario }) {
  const router = useRouter();
  const tiposPermitidos = TIPOS_PERMITIDOS[tipoCriador];

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<TipoUsuario | "">(tiposPermitidos[0] ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = usuarioSchema.safeParse({
      cpf,
      nome,
      email: email || undefined,
      tipo: tipo || undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível criar o usuário");
        return;
      }

      router.push("/usuarios/novo");
      router.refresh();
      setCpf("");
      setNome("");
      setEmail("");
    } finally {
      setEnviando(false);
    }
  }

  if (tiposPermitidos.length === 0) {
    return <p className="text-sm text-muted-foreground">Seu perfil não pode criar usuários.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cpf">CPF</FieldLabel>
          <Input
            id="cpf"
            name="cpf"
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
          <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
          <select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(event) => setTipo(event.target.value as TipoUsuario)}
            disabled={enviando}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm dark:bg-input/30"
          >
            {tiposPermitidos.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </Field>
        {erro && <FieldError>{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Criar usuário
        </Button>
      </FieldGroup>
    </form>
  );
}
