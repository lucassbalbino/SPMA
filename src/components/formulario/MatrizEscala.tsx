"use client";

// Perguntas de nota em formato de planilha: uma linha por item avaliado, uma
// coluna por nota, o cabeçalho com o texto de cada nota escrito uma vez só
// no topo. Substitui o select por item, que escondia a escala até abrir.
//
// Cada linha é um `RadioGroup` próprio (uma resposta por item), alinhado ao
// cabeçalho pelo mesmo `gridTemplateColumns`. Com muitas colunas a planilha
// rola na horizontal dentro do bloco, com a coluna do item fixa à esquerda -
// a página em si nunca ganha rolagem lateral.
//
// Os `data-testid` seguem o contrato do e2e: `campo-<chave>-grupo` na linha e
// `campo-<chave>-opcao-<valor>` em cada nota, o mesmo sufixo `<valor>` que as
// opções do select usavam.
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { CampoDef, OpcaoEscala, TipoCampo } from "./tipos";

// Larguras mínimas, em rem, da coluna do item e de cada coluna de nota.
const LARGURA_ITEM = 10;
const LARGURA_NOTA = 3.5;

export function MatrizEscala<C extends string, R>({
  campos,
  opcoes,
  valorDe,
  desabilitado,
  invalido,
  aoAlterar,
}: {
  campos: CampoDef<C, R>[];
  opcoes: readonly OpcaoEscala[];
  valorDe: (chave: C) => unknown;
  desabilitado: (campo: CampoDef<C, R>) => boolean;
  invalido: (chave: C) => boolean;
  aoAlterar: (chave: C, valor: unknown) => void;
}) {
  const colunas = `minmax(${LARGURA_ITEM}rem, 2fr) repeat(${opcoes.length}, minmax(${LARGURA_NOTA}rem, 1fr))`;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${LARGURA_ITEM + opcoes.length * LARGURA_NOTA}rem` }}>
        {/* O texto de cada nota já vai no `aria-label` do próprio botão. */}
        <div
          aria-hidden
          className="grid items-end gap-1 border-b border-border pb-2 text-center text-xs text-muted-foreground"
          style={{ gridTemplateColumns: colunas }}
        >
          <span className="sticky left-0 bg-card" />
          {opcoes.map((opcao) => (
            <span key={opcao.valor}>{opcao.rotulo}</span>
          ))}
        </div>
        {campos.map((campo) => {
          const valor = valorDe(campo.chave);
          const bloqueado = desabilitado(campo);

          return (
            <RadioGroup
              key={campo.chave}
              aria-label={campo.rotulo}
              data-testid={`campo-${campo.chave}-grupo`}
              // Gravado como NÚMERO: `Number(...)` na volta, `String(...)` na ida.
              value={valor === undefined || valor === null ? null : String(valor)}
              onValueChange={(novoValor) => aoAlterar(campo.chave, Number(novoValor))}
              className="items-center gap-1 border-b border-border py-1"
              style={{ gridTemplateColumns: colunas }}
            >
              <span
                className={cn(
                  "sticky left-0 bg-card py-1 pr-2 text-sm",
                  invalido(campo.chave) && "text-destructive",
                )}
              >
                {campo.rotulo}
              </span>
              {opcoes.map((opcao) => (
                <label
                  key={opcao.valor}
                  htmlFor={`${campo.chave}-${opcao.valor}`}
                  className="flex justify-center py-2"
                >
                  <RadioGroupItem
                    id={`${campo.chave}-${opcao.valor}`}
                    value={opcao.valor}
                    aria-label={opcao.rotulo}
                    data-testid={`campo-${campo.chave}-opcao-${opcao.valor}`}
                    disabled={bloqueado}
                  />
                </label>
              ))}
            </RadioGroup>
          );
        })}
      </div>
    </div>
  );
}

/** Um trecho de bloco: um campo comum ou uma planilha de campos de nota. */
export type Segmento<T> = { campo: T } | { matriz: T[]; opcoes: readonly OpcaoEscala[] };

/**
 * Agrupa os campos `escala` consecutivos de mesma escala numa planilha só,
 * na ordem em que aparecem no bloco; os demais seguem um a um. A escala de
 * um campo é a dele (`campo.escala`) ou, sem ela, a do formulário.
 */
export function segmentarCampos<T extends { tipo: TipoCampo; escala?: readonly OpcaoEscala[] }>(
  campos: T[],
  escalaPadrao: readonly OpcaoEscala[],
): Segmento<T>[] {
  const segmentos: Segmento<T>[] = [];

  for (const campo of campos) {
    if (campo.tipo !== "escala") {
      segmentos.push({ campo });
      continue;
    }

    const opcoes = campo.escala ?? escalaPadrao;
    const anterior = segmentos.at(-1);

    if (anterior && "matriz" in anterior && anterior.opcoes === opcoes) {
      anterior.matriz.push(campo);
    } else {
      segmentos.push({ matriz: [campo], opcoes });
    }
  }

  return segmentos;
}
