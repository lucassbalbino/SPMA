// Formulário de criação de usuário em cascata (REQ-AU-05), colocado junto de
// `page.tsx` (T29). Componente cliente separado porque `page.tsx` precisa
// continuar sendo um Server Component para chamar `requireSession()`
// (redirect-based) - "use client" se aplica ao arquivo inteiro, então a
// interatividade (useState/fetch) não pode viver no mesmo arquivo que a
// guarda de sessão.
//
// `escolheOfertante` chega pronto do servidor (`podeGerenciarVerba`) em vez
// de ser recalculado aqui: `guards.ts` é server-only (usa `redirect` e a
// sessão), então a regra não pode ser importada por um client component.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TIPOS_PERMITIDOS } from "@/lib/auth/cascata";
import { usuarioSchema } from "@/lib/validation/schemas/usuario.schema";
import { headerCSRF } from "@/lib/security/csrf-client";
import type { TipoUsuario } from "@/generated/prisma/enums";

type OpcaoOfertante = { cdOfertante: number; nome: string };

export function NovoUsuarioForm({
  tipoCriador,
  escolheOfertante,
  ofertantes,
  cdCursosDisponiveis,
}: {
  tipoCriador: TipoUsuario;
  escolheOfertante: boolean;
  ofertantes: OpcaoOfertante[];
  cdCursosDisponiveis: number[];
}) {
  const router = useRouter();
  const tiposPermitidos = TIPOS_PERMITIDOS[tipoCriador];

  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<TipoUsuario | "">(tiposPermitidos[0] ?? "");
  const [cdOfertante, setCdOfertante] = useState("");
  const [vlVerba, setVlVerba] = useState("");
  const [dtVerba, setDtVerba] = useState("");
  const [cdCurso, setCdCurso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // GO e VO são os únicos perfis vinculados a Ofertante (AD-012); o GO ainda
  // nasce com a verba desse Ofertante (REQ-OV-08). Quem não gere verba não vê
  // nenhum dos dois blocos - o escopo vem do próprio criador (REQ-AU-08).
  const pedeOfertante = escolheOfertante && (tipo === "GO" || tipo === "VO");
  const pedeVerba = escolheOfertante && tipo === "GO";
  // AVAL-01: todo Aluno nasce matriculado, então o curso é obrigatório para
  // qualquer perfil que crie um AL (hoje AM e GO - REQ-AU-05/06).
  const pedeCurso = tipo === "AL";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    if (pedeVerba && !cdOfertante) {
      setErro("Ofertante é obrigatório");
      return;
    }

    if (pedeVerba && !vlVerba) {
      setErro("Valor da verba é obrigatório");
      return;
    }

    if (pedeCurso && !cdCurso) {
      setErro("Curso é obrigatório");
      return;
    }

    const entrada = usuarioSchema.safeParse({
      cpf,
      nome,
      email: email || undefined,
      tipo: tipo || undefined,
      cdOfertante: pedeOfertante && cdOfertante ? Number(cdOfertante) : undefined,
      cdCurso: pedeCurso && cdCurso ? Number(cdCurso) : undefined,
      verba: pedeVerba
        ? { vlVerba: vlVerba ? Number(vlVerba) : undefined, dtVerba: dtVerba || undefined }
        : undefined,
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
        setErro(corpo.erro ?? "Não foi possível criar o usuário");
        return;
      }

      router.push("/usuarios/novo");
      router.refresh();
      setCpf("");
      setNome("");
      setEmail("");
      setCdOfertante("");
      setVlVerba("");
      setDtVerba("");
      setCdCurso("");
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
        {pedeOfertante && (
          <Field data-invalid={!!erro}>
            <FieldLabel htmlFor="cdOfertante">Ofertante</FieldLabel>
            <select
              id="cdOfertante"
              name="cdOfertante"
              value={cdOfertante}
              onChange={(event) => setCdOfertante(event.target.value)}
              disabled={enviando || ofertantes.length === 0}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm dark:bg-input/30"
            >
              <option value="">Selecione</option>
              {ofertantes.map((ofertante) => (
                <option key={ofertante.cdOfertante} value={ofertante.cdOfertante}>
                  {ofertante.nome}
                </option>
              ))}
            </select>
            {ofertantes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum Ofertante cadastrado - cadastre um antes de criar o gestor.
              </p>
            )}
          </Field>
        )}
        {pedeVerba && (
          <>
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
              <FieldLabel htmlFor="dtVerba">Data da verba</FieldLabel>
              <Input
                id="dtVerba"
                name="dtVerba"
                type="date"
                value={dtVerba}
                onChange={(event) => setDtVerba(event.target.value)}
                disabled={enviando}
              />
            </Field>
          </>
        )}
        {pedeCurso && (
          <Field data-invalid={!!erro}>
            <FieldLabel htmlFor="cdCurso">Curso</FieldLabel>
            <select
              id="cdCurso"
              name="cdCurso"
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
                Nenhum curso disponível - crie um pré-curso antes de criar o aluno.
              </p>
            )}
          </Field>
        )}
        {erro && <FieldError>{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Criar usuário
        </Button>
      </FieldGroup>
    </form>
  );
}
