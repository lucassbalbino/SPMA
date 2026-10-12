// Formulário de onboarding organizacional do GO (OGO-02, OGO-03, OGO-04,
// OGO-19, OGO-20), renderizado por `(onboarding)/cadastro-ofertante`.
//
// Consome PATCH /api/usuarios/me/organizacao. Sem campo de CNPJ: a identidade
// do GO é fixa desde a criação. O nome chega preenchido com o que o AM/GT
// informou ao criar o GO, como valor editável e não `placeholder` - com o
// campo obrigatório, um placeholder obrigaria a redigitar o nome só para
// avançar.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { organizacaoSchema } from "@/lib/validation/schemas/organizacao.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

export function CadastroOrganizacaoForm({ nomeInicial }: { nomeInicial: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [uf, setUf] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = organizacaoSchema.safeParse({
      nome,
      responsavel,
      email,
      telefone,
      uf,
      municipio,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios/me/organizacao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível cadastrar o Ofertante");
        return;
      }

      router.push("/painel");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Cadastre o Ofertante</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
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
                <FieldLabel htmlFor="responsavel">Responsável</FieldLabel>
                <Input
                  id="responsavel"
                  name="responsavel"
                  value={responsavel}
                  onChange={(event) => setResponsavel(event.target.value)}
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
              <Field>
                <FieldLabel htmlFor="telefone">Telefone</FieldLabel>
                <Input
                  id="telefone"
                  name="telefone"
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                  disabled={enviando}
                />
              </Field>
              <Field data-invalid={!!erro}>
                <FieldLabel htmlFor="uf">UF</FieldLabel>
                <Input
                  id="uf"
                  name="uf"
                  maxLength={2}
                  value={uf}
                  onChange={(event) => setUf(event.target.value.toUpperCase())}
                  disabled={enviando}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="municipio">Município</FieldLabel>
                <Input
                  id="municipio"
                  name="municipio"
                  value={municipio}
                  onChange={(event) => setMunicipio(event.target.value)}
                  disabled={enviando}
                />
              </Field>
              {erro && <FieldError>{erro}</FieldError>}
              <Button type="submit" disabled={enviando}>
                Cadastrar
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
