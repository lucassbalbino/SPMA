// Formulário de criação de pré-curso (REQ-PC-01/02/03, AD-040), colocado
// junto de `page.tsx` (T9). Client Component separado pelo mesmo motivo de
// `NovoUsuarioForm.tsx`: `page.tsx` precisa continuar Server Component para
// chamar `requireSession()`. Estado simples (2 campos) - useState direto,
// sem o padrão de `respostas` genérico usado no formulário de 56 campos
// (T10).
//
// Dois perfis criam pré-curso, e cada um escolhe uma coisa diferente: o GO
// escolhe entre as verbas do próprio Ofertante (e o Ofertante do curso sai
// da verba), o AM escolhe o Ofertante (e o custeio sai sempre da verba
// ilimitada, AD-040). É a mesma tela com uma escolha diferente, então o que
// varia é uma prop `fonte`, não um segundo componente: o servidor já resolve
// qual lista mostrar e a rota reavalia tudo de novo (AD-033).
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
import {
  criarPreCursoAmSchema,
  criarPreCursoSchema,
} from "@/lib/validation/schemas/pre-curso.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

/** O que o perfil escolhe: a verba que custeia (GO) ou o Ofertante (AM). */
export type FonteDoCurso = "verba" | "ofertante";

/** Opção já formatada pelo servidor - a tela não recalcula saldo nem nome. */
export type OpcaoDoCurso = { valor: number; rotulo: string };

const TEXTOS: Record<
  FonteDoCurso,
  {
    rotulo: string;
    placeholder: string;
    vazio: string;
    campo: "cdVerba" | "cdOfertante";
  }
> = {
  verba: {
    rotulo: "Verba",
    placeholder: "Selecione uma verba",
    vazio: "Nenhuma verba disponível para o seu Ofertante.",
    campo: "cdVerba",
  },
  ofertante: {
    rotulo: "Ofertante",
    placeholder: "Selecione um Ofertante",
    vazio: "Nenhum Ofertante cadastrado.",
    campo: "cdOfertante",
  },
};

export function NovoPreCursoForm({
  fonte,
  opcoes,
}: {
  fonte: FonteDoCurso;
  opcoes: OpcaoDoCurso[];
}) {
  const router = useRouter();
  const textos = TEXTOS[fonte];

  const [escolha, setEscolha] = useState<string | null>(null);
  const [vlCursoAlocado, setVlCursoAlocado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const schema = fonte === "verba" ? criarPreCursoSchema : criarPreCursoAmSchema;
    const entrada = schema.safeParse({
      [textos.campo]: escolha ? Number(escolha) : undefined,
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

  if (opcoes.length === 0) {
    return <p className="text-sm text-muted-foreground">{textos.vazio}</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor={textos.campo}>{textos.rotulo}</FieldLabel>
          <Select value={escolha} onValueChange={(valor) => setEscolha(valor as string)}>
            <SelectTrigger
              id={textos.campo}
              data-testid={`select-${fonte}`}
              disabled={enviando}
            >
              <SelectValue placeholder={textos.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((opcao) => (
                <SelectItem
                  key={opcao.valor}
                  value={String(opcao.valor)}
                  data-testid={`opcao-${fonte}-${opcao.valor}`}
                >
                  {opcao.rotulo}
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
