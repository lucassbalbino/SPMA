// Formulário das 7 perguntas de dado pessoal do Aluno (PESSOAL-01, PESSOAL-16),
// compartilhado por duas telas: a coleta obrigatória no primeiro acesso
// (`(onboarding)/dados-pessoais`) e a edição pelo perfil
// (`(protegido)/meus-dados`). Só o `modo` muda o que acontece depois de
// salvar - o resto do comportamento (campos, validação, envio) é idêntico.
//
// Renderização direta dos 7 campos, sem a máquina de blocos/`renderCampo` de
// `AvaliacaoForm.tsx`: 7 campos fixos não justificam metadado genérico
// (design.md, item 9). Os `data-testid` seguem a mesma convenção de
// `campo-<chave>`/`campo-<chave>-select`/`campo-<chave>-grupo`/
// `campo-<chave>-opcao-<indice>` usada lá, para quem já conhece a base.
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPCOES_CONDICAO_PCD,
  OPCOES_ESCOLARIDADE,
  OPCOES_FAIXA_ETARIA,
  OPCOES_GENERO,
  OPCOES_RACA_ETNIA,
  OPCOES_UF,
  type RespostasDadosPessoais,
} from "@/lib/validation/schemas/dados-pessoais.schema";
import { headerCSRF } from "@/lib/security/csrf-client";

type Chave = keyof RespostasDadosPessoais;
type TipoCampo = "texto" | "select" | "radio";

interface CampoDef {
  chave: Chave;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: readonly string[];
}

const CAMPOS: CampoDef[] = [
  { chave: "avalPessoalEstado", rotulo: "Estado de residência", tipo: "select", opcoes: OPCOES_UF },
  { chave: "avalPessoalMunicipio", rotulo: "Município e Estado", tipo: "texto" },
  { chave: "avalPessoalGenero", rotulo: "Gênero", tipo: "radio", opcoes: OPCOES_GENERO },
  {
    chave: "avalPessoalFaixaEtaria",
    rotulo: "Faixa etária",
    tipo: "radio",
    opcoes: OPCOES_FAIXA_ETARIA,
  },
  {
    chave: "avalPessoalEscolaridade",
    rotulo: "Qual o seu nível de escolaridade",
    tipo: "select",
    opcoes: OPCOES_ESCOLARIDADE,
  },
  {
    chave: "avalPessoalRacaEtnia",
    rotulo: "Qual a sua cor/raça/etnia?",
    tipo: "radio",
    opcoes: OPCOES_RACA_ETNIA,
  },
  {
    chave: "avalPessoalCondicaoPcd",
    rotulo: "Você é uma Pessoa com Deficiência (PCD)?",
    tipo: "radio",
    opcoes: OPCOES_CONDICAO_PCD,
  },
];

export function DadosPessoaisForm({
  respostasIniciais,
  modo,
}: {
  respostasIniciais: Partial<RespostasDadosPessoais>;
  /**
   * "onboarding": primeira gravação obrigatória - sucesso libera a
   * navegação e leva para `/painel` (PESSOAL-03). "perfil": edição
   * posterior - sucesso só confirma na própria tela (PESSOAL-17).
   */
  modo: "onboarding" | "perfil";
}) {
  const router = useRouter();
  const [respostas, setRespostas] =
    useState<Partial<RespostasDadosPessoais>>(respostasIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function setCampo(chave: Chave, valor: string | null) {
    setSucesso(false);
    setRespostas((atual) => ({ ...atual, [chave]: valor ?? undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/usuarios/me/dados-pessoais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(respostas),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível salvar os dados pessoais");
        return;
      }

      if (modo === "onboarding") {
        router.push("/painel");
        return;
      }

      setSucesso(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full max-w-lg" data-testid="form-dados-pessoais">
      <CardHeader>
        <CardTitle>Seus dados pessoais</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            {erro && <FieldError data-testid="erro-dados-pessoais">{erro}</FieldError>}
            {sucesso && (
              <p className="text-sm text-muted-foreground" data-testid="sucesso-dados-pessoais">
                Dados salvos.
              </p>
            )}

            {CAMPOS.map((campo) => {
              const valor = respostas[campo.chave] as string | undefined;
              let controle: ReactNode;

              if (campo.tipo === "texto") {
                controle = (
                  <Input
                    id={campo.chave}
                    data-testid={`campo-${campo.chave}`}
                    type="text"
                    value={valor ?? ""}
                    onChange={(event) => setCampo(campo.chave, event.target.value)}
                    disabled={enviando}
                  />
                );
              } else if (campo.tipo === "select") {
                controle = (
                  <Select
                    value={valor ?? null}
                    onValueChange={(novoValor) => setCampo(campo.chave, novoValor)}
                  >
                    <SelectTrigger
                      id={campo.chave}
                      data-testid={`campo-${campo.chave}-select`}
                      disabled={enviando}
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
              } else {
                controle = (
                  <RadioGroup
                    aria-label={campo.rotulo}
                    data-testid={`campo-${campo.chave}-grupo`}
                    value={valor ?? null}
                    onValueChange={(novoValor) => setCampo(campo.chave, novoValor)}
                  >
                    {campo.opcoes?.map((opcao, indice) => (
                      <FieldLabel key={opcao} htmlFor={`${campo.chave}-${indice}`}>
                        <RadioGroupItem
                          id={`${campo.chave}-${indice}`}
                          value={opcao}
                          data-testid={`campo-${campo.chave}-opcao-${indice}`}
                          disabled={enviando}
                        />
                        {opcao}
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                );
              }

              return (
                <Field key={campo.chave}>
                  <FieldLabel htmlFor={campo.chave}>{campo.rotulo}</FieldLabel>
                  {controle}
                </Field>
              );
            })}

            <Button type="submit" disabled={enviando} data-testid="botao-salvar-dados-pessoais">
              Salvar
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
