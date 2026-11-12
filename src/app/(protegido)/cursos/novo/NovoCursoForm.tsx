// Formulário de criação de CURSO (REQ-PC-01/02/03), colocado junto de
// `page.tsx` (T9). Um envio daqui cria PreCurso e PosCurso na mesma
// transação - ver POST /api/cursos. Client Component separado pelo mesmo motivo de
// `NovoUsuarioForm.tsx`: `page.tsx` precisa continuar Server Component para
// chamar `requireSession()`. Estado simples (2 campos) - useState direto,
// sem o padrão de `respostas` genérico usado no formulário de 56 campos
// (T10).
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
import { criarCursoSchema } from "@/lib/validation/schemas/pre-curso.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

type OpcaoVerba = {
  cdVerba: number;
  dsVerba: string;
  saldoDisponivel: number;
  nomeOfertante?: string | null;
};

export function NovoCursoForm({ opcoesVerba }: { opcoesVerba: OpcaoVerba[] }) {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cdVerba, setCdVerba] = useState<string | null>(null);
  const [vlCursoAlocado, setVlCursoAlocado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = criarCursoSchema.safeParse({
      nome,
      cdVerba: cdVerba ? Number(cdVerba) : undefined,
      vlCursoAlocado: vlCursoAlocado ? Number(vlCursoAlocado) : undefined,
    });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(
          corpo.saldoDisponivel !== undefined
            ? `${corpo.erro} (saldo disponível: ${corpo.saldoDisponivel})`
            : (corpo.erro ?? "Não foi possível criar a formação"),
        );
        return;
      }

      // Leva ao questionário PRÉ do curso recém-criado. O pós-curso já nasceu
      // junto, na mesma transação, e é preenchido depois em /pos-cursos/[id].
      router.push(`/pre-cursos/${corpo.preCurso.cdCurso}`);
    } finally {
      setEnviando(false);
    }
  }

  // RU-15/RU-16: o mesmo texto na opção e no campo fechado - sem `items`, o
  // Select do Base UI mostra o `value` cru (o número) depois da escolha.
  // Só o nome da verba, sem número, mesmo quando o nome repete (decisão do
  // usuário, 2026-11-11).
  const itens = opcoesVerba.map((opcao) => ({
    value: String(opcao.cdVerba),
    label: `${opcao.nomeOfertante ? `${opcao.nomeOfertante} — ` : ""}${opcao.dsVerba} — saldo R$ ${opcao.saldoDisponivel.toFixed(2)}`,
  }));

  if (opcoesVerba.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum recurso disponível para criar uma formação.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="nome">Nome da formação</FieldLabel>
          <Input
            id="nome"
            name="nome"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cdVerba">Recurso</FieldLabel>
          <Select
            items={itens}
            value={cdVerba}
            onValueChange={(valor) => setCdVerba(valor as string)}
          >
            <SelectTrigger id="cdVerba" data-testid="select-verba" disabled={enviando}>
              <SelectValue placeholder="Selecione um recurso" />
            </SelectTrigger>
            <SelectContent>
              {itens.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  data-testid={`opcao-verba-${item.value}`}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="vlCursoAlocado">Valor alocado à formação</FieldLabel>
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
        {erro && <FieldError data-testid="erro-novo-curso">{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Criar formação
        </Button>
      </FieldGroup>
    </form>
  );
}
