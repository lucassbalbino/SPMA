"use client";

// O interpretador genérico de um campo da tabela `BLOCOS` - um `switch` sobre
// `campo.tipo` que devolve o controle correspondente.
//
// Existia em triplicata (`PreCursoForm`, `PosCursoForm`, `AvaliacaoForm`),
// ~200 linhas cada, idênticas exceto por duas coisas que agora são
// parâmetros: o `disabled` efetivo (a avaliação soma dois bloqueios próprios)
// e a lista de opções da escala (os textos do pré-curso e da avaliação
// diferem).
//
// Os `data-testid` são contrato do e2e (`campo-<chave>`,
// `campo-<chave>-select`, `campo-<chave>-grupo`, `campo-<chave>-opcao-<i>`) -
// mantidos exatamente como as três cópias os emitiam.
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CampoDef, OpcaoEscala } from "./tipos";

export function CampoResposta<C extends string, R>({
  campo,
  valor,
  desabilitado,
  invalido,
  opcoesEscala,
  aoAlterar,
  aoAlternarOpcao,
  children,
}: {
  campo: CampoDef<C, R>;
  valor: unknown;
  desabilitado: boolean;
  /** Marca o campo como pendente depois de um encerramento recusado. */
  invalido: boolean;
  /** Só é consultada por campos `tipo: "escala"`. */
  opcoesEscala?: readonly OpcaoEscala[];
  aoAlterar: (chave: C, valor: unknown) => void;
  /** Marcar/desmarcar uma opção de `checkboxes`, já com a regra da excludente. */
  aoAlternarOpcao: (campo: CampoDef<C, R>, opcao: string, marcado: boolean) => void;
  /** Campo "Qual?/Quais?" revelado por este, quando houver (só o pré-curso usa). */
  children?: ReactNode;
}) {
  let controle: ReactNode;

  switch (campo.tipo) {
    case "texto":
    case "email":
      controle = (
        <Input
          id={campo.chave}
          data-testid={`campo-${campo.chave}`}
          type={campo.tipo === "email" ? "email" : "text"}
          value={(valor as string | undefined) ?? ""}
          onChange={(event) => aoAlterar(campo.chave, event.target.value)}
          disabled={desabilitado}
        />
      );
      break;
    case "textarea":
      controle = (
        <Textarea
          id={campo.chave}
          data-testid={`campo-${campo.chave}`}
          value={(valor as string | undefined) ?? ""}
          onChange={(event) => aoAlterar(campo.chave, event.target.value)}
          disabled={desabilitado}
        />
      );
      break;
    case "numero":
      controle = (
        <Input
          id={campo.chave}
          data-testid={`campo-${campo.chave}`}
          type="number"
          value={valor === undefined || valor === null ? "" : String(valor)}
          onChange={(event) =>
            aoAlterar(
              campo.chave,
              event.target.value === "" ? undefined : Number(event.target.value),
            )
          }
          disabled={desabilitado}
        />
      );
      break;
    case "data":
      controle = (
        <Input
          id={campo.chave}
          data-testid={`campo-${campo.chave}`}
          type="date"
          value={(valor as string | undefined) ?? ""}
          onChange={(event) => aoAlterar(campo.chave, event.target.value)}
          disabled={desabilitado}
        />
      );
      break;
    case "select":
      controle = (
        <Select
          value={(valor as string | undefined) ?? null}
          onValueChange={(novoValor) => aoAlterar(campo.chave, novoValor)}
        >
          <SelectTrigger
            id={campo.chave}
            data-testid={`campo-${campo.chave}-select`}
            disabled={desabilitado}
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {campo.opcoes?.map((opcao, indice) => (
              <SelectItem
                key={opcao}
                value={opcao}
                data-testid={`campo-${campo.chave}-opcao-${indice}`}
              >
                {opcao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case "escala":
      // Diferente de `select`, o valor da escala é gravado como NÚMERO - por
      // isso o `Number(...)` na volta e o `String(...)` na ida.
      controle = (
        <Select
          value={valor === undefined || valor === null ? null : String(valor)}
          onValueChange={(novoValor) => aoAlterar(campo.chave, Number(novoValor))}
        >
          <SelectTrigger
            id={campo.chave}
            data-testid={`campo-${campo.chave}-select`}
            disabled={desabilitado}
          >
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {opcoesEscala?.map((opcao) => (
              <SelectItem
                key={opcao.valor}
                value={opcao.valor}
                data-testid={`campo-${campo.chave}-opcao-${opcao.valor}`}
              >
                {opcao.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case "radio":
      controle = (
        <RadioGroup
          aria-label={campo.rotulo}
          data-testid={`campo-${campo.chave}-grupo`}
          value={(valor as string | undefined) ?? null}
          onValueChange={(novoValor) => aoAlterar(campo.chave, novoValor)}
        >
          {campo.opcoes?.map((opcao, indice) => (
            <FieldLabel key={opcao} htmlFor={`${campo.chave}-${indice}`}>
              <RadioGroupItem
                id={`${campo.chave}-${indice}`}
                value={opcao}
                data-testid={`campo-${campo.chave}-opcao-${indice}`}
                disabled={desabilitado}
              />
              {opcao}
            </FieldLabel>
          ))}
        </RadioGroup>
      );
      break;
    case "checkboxes":
      controle = (
        <div data-testid={`campo-${campo.chave}-grupo`} className="flex flex-col gap-2">
          {campo.opcoes?.map((opcao, indice) => (
            <FieldLabel key={opcao} htmlFor={`${campo.chave}-${indice}`}>
              <Checkbox
                id={`${campo.chave}-${indice}`}
                data-testid={`campo-${campo.chave}-opcao-${indice}`}
                checked={((valor as string[] | undefined) ?? []).includes(opcao)}
                onCheckedChange={(marcado) =>
                  aoAlternarOpcao(campo, opcao, marcado === true)
                }
                disabled={desabilitado}
              />
              {opcao}
            </FieldLabel>
          ))}
        </div>
      );
      break;
  }

  return (
    <Field data-invalid={invalido}>
      <FieldLabel htmlFor={campo.chave}>{campo.rotulo}</FieldLabel>
      {controle}
      {children}
    </Field>
  );
}
