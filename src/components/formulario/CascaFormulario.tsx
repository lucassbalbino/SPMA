"use client";

// A moldura comum dos três formulários de questionário: título, status,
// aviso de somente-leitura, erro, lista de pendências do encerramento e os
// dois botões de ação.
//
// Era o mesmo JSX nas três telas, com os `data-testid` variando só pelo
// sufixo do formulário (`status-pre-curso`, `status-pos-curso`,
// `status-avaliacao`...) - por isso o sufixo é parâmetro, e não texto fixo:
// os seletores do e2e continuam exatamente os mesmos.
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import type { StatusFormulario } from "@/generated/prisma/enums";

export function CascaFormulario({
  testid,
  titulo,
  status,
  somenteLeitura,
  erro,
  pendentes,
  rotuloDaChave,
  salvando,
  encerrando,
  aoSalvar,
  aoEncerrar,
  children,
}: {
  /** Sufixo dos `data-testid` - "pre-curso", "pos-curso" ou "avaliacao". */
  testid: string;
  titulo: ReactNode;
  status: StatusFormulario;
  somenteLeitura: boolean;
  erro: string | null;
  pendentes: string[];
  /** Traduz a chave crua devolvida pela API no rótulo que a pessoa leu na tela. */
  rotuloDaChave: (chave: string) => string;
  salvando: boolean;
  encerrando: boolean;
  aoSalvar: () => void;
  aoEncerrar: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="w-full max-w-3xl" data-testid={`form-${testid}`}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <p className="text-sm text-muted-foreground" data-testid={`status-${testid}`}>
          {status === "ENCERRADO" ? "Encerrado" : "Em andamento"}
        </p>
        {somenteLeitura && (
          <p
            className="text-sm text-muted-foreground"
            data-testid={`somente-leitura-${testid}`}
          >
            Somente leitura.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro && <FieldError data-testid={`erro-${testid}`}>{erro}</FieldError>}
        {pendentes.length > 0 && (
          <div data-testid="lista-pendencias" className="text-sm text-destructive">
            <p>Campos pendentes:</p>
            <ul className="ml-4 list-disc">
              {pendentes.map((chave) => (
                <li key={chave} data-testid={`pendencia-${chave}`}>
                  {rotuloDaChave(chave)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {children}
        {!somenteLeitura && (
          <div className="flex gap-2">
            <Button type="button" onClick={aoSalvar} disabled={salvando || encerrando}>
              Salvar rascunho
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={aoEncerrar}
              disabled={salvando || encerrando}
            >
              Encerrar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
