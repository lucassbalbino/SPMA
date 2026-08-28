// Formulário de preenchimento/encerramento da avaliação (AVAL-07 a AVAL-19),
// colocado junto de `page.tsx` (T9). Mesmo padrão orientado a metadados de
// `PosCursoForm.tsx`/`PreCursoForm.tsx`: os blocos do Dicionário de Campos
// (spec.md) viram tabelas `BLOCOS_PARTE_1`/`BLOCOS_PARTE_2` interpretadas
// genericamente por `renderCampo`.
//
// Diferença chave frente às duas features anteriores: dois gates empilhados
// (AD-023/AVAL-10: Parte 2 inteira bloqueada até `parte1Completa`; AVAL-12/13:
// dentro da Parte 2, "Concluiu o curso?" bloqueia as outras 22 chaves). O
// primeiro gate desabilita todo o Accordion de Parte 2; o segundo desabilita
// campo a campo via `bloqueadoSe` (visível, mas não editável, refletindo
// que o dado "aplica-se ou não" - diferente de `visivelSe`, que ESCONDE um
// campo que revela outra pergunta, como `avalProfissAtividadeEspecifica`).
"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  OPCOES_AMPLIACAO_CONHECIMENTO,
  OPCOES_CONDICAO_TRABALHO,
  OPCOES_EFETIVACAO,
  OPCOES_ESCOLARIDADE,
  OPCOES_EXPECTATIVA,
  OPCOES_FAIXA_ETARIA,
  OPCOES_FAIXA_RENDA,
  OPCOES_FORMA_CONHECIMENTO,
  OPCOES_GENERO,
  OPCOES_INTENCAO_ATUAR_TURISMO,
  OPCOES_MELHORIAS_COMUNIDADE,
  OPCOES_MOTIVACOES_POS,
  OPCOES_MOTIVOS_PARTICIPACAO,
  OPCOES_MOTIVO_NAO_CONCLUSAO,
  OPCOES_RACA_ETNIA,
  OPCOES_RECOMENDA_CURSO,
  OPCOES_RETOMADA_ESTUDOS,
  OPCOES_SENSACAO_PREPARO,
  OPCOES_SIM_NAO,
  OPCOES_SITUACAO_TRABALHO,
  OPCOES_TIPO_CURSO_ANTERIOR,
  OPCOES_UF,
  type RespostasAvaliacao,
  type RespostasAvaliacaoParcial,
} from "@/lib/validation/schemas/avaliacao.schema";
import { headerCSRF } from "@/lib/security/csrf-client";
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasAvaliacao;

type TipoCampo = "texto" | "textarea" | "numero" | "select" | "radio" | "checkboxes" | "escala";

interface CampoDef {
  chave: Chave;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: readonly string[];
  visivelSe?: (respostas: RespostasAvaliacaoParcial) => boolean;
  bloqueadoSe?: (respostas: RespostasAvaliacaoParcial) => boolean;
}

interface BlocoDef {
  titulo: string;
  campos: CampoDef[];
}

const ESCALA_AVALIACAO_OPCOES = [
  { valor: "1", rotulo: "1 - Péssimo" },
  { valor: "2", rotulo: "2 - Ruim" },
  { valor: "3", rotulo: "3 - Regular" },
  { valor: "4", rotulo: "4 - Bom" },
  { valor: "5", rotulo: "5 - Ótimo" },
] as const;

const naoConcluiuOuIndefinido = (respostas: RespostasAvaliacaoParcial) =>
  respostas.avalParticipConcluiuCurso !== "Sim";

const BLOCOS_PARTE_1: BlocoDef[] = [
  {
    titulo: "Dados Pessoais",
    campos: [
      { chave: "avalPessoalEstado", rotulo: "Estado (UF)", tipo: "select", opcoes: OPCOES_UF },
      { chave: "avalPessoalMunicipio", rotulo: "Município", tipo: "texto" },
      { chave: "avalPessoalGenero", rotulo: "Gênero", tipo: "select", opcoes: OPCOES_GENERO },
      {
        chave: "avalPessoalFaixaEtaria",
        rotulo: "Faixa etária",
        tipo: "select",
        opcoes: OPCOES_FAIXA_ETARIA,
      },
      {
        chave: "avalPessoalEscolaridade",
        rotulo: "Escolaridade",
        tipo: "select",
        opcoes: OPCOES_ESCOLARIDADE,
      },
      {
        chave: "avalPessoalRacaEtnia",
        rotulo: "Raça/etnia",
        tipo: "select",
        opcoes: OPCOES_RACA_ETNIA,
      },
      {
        chave: "avalPessoalCondicaoPcd",
        rotulo: "Condição de PCD",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
    ],
  },
  {
    titulo: "Situação Profissional",
    campos: [
      {
        chave: "avalProfissCondicaoTrabalho",
        rotulo: "Condição atual de trabalho",
        tipo: "select",
        opcoes: OPCOES_CONDICAO_TRABALHO,
      },
      {
        chave: "avalProfissAtuaTurismo",
        rotulo: "Atualmente trabalha em Turismo?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalProfissAtividadeEspecifica",
        rotulo: "Atividade específica em que atua",
        tipo: "texto",
        visivelSe: (respostas) => respostas.avalProfissAtuaTurismo === "Sim",
      },
      {
        chave: "avalProfissFaixaRenda",
        rotulo: "Faixa de renda",
        tipo: "select",
        opcoes: OPCOES_FAIXA_RENDA,
      },
    ],
  },
  {
    titulo: "Experiência",
    campos: [
      {
        chave: "avalExperienciaTrabalhoPrevio",
        rotulo: "Trabalho prévio em Turismo",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalExperienciaCursoAnterior",
        rotulo: "Já realizou cursos de Turismo?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalExperienciaTipoCursoAnterior",
        rotulo: "Tipo de curso de Turismo já realizado",
        tipo: "select",
        opcoes: OPCOES_TIPO_CURSO_ANTERIOR,
        visivelSe: (respostas) => respostas.avalExperienciaCursoAnterior === "Sim",
      },
    ],
  },
  {
    titulo: "Motivação",
    campos: [
      {
        chave: "avalMotivMotivosParticipacao",
        rotulo: "Motivos para participar do curso (até 3)",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVOS_PARTICIPACAO,
      },
      {
        chave: "avalMotivFormaConhecimento",
        rotulo: "Como ficou sabendo do curso",
        tipo: "select",
        opcoes: OPCOES_FORMA_CONHECIMENTO,
      },
    ],
  },
  {
    titulo: "Expectativas",
    campos: [
      {
        chave: "avalExpectAtendimento",
        rotulo: "Expectativa de atendimento",
        tipo: "select",
        opcoes: OPCOES_EXPECTATIVA,
      },
      {
        chave: "avalExpectEmprego",
        rotulo: "Expectativa de emprego",
        tipo: "select",
        opcoes: OPCOES_EXPECTATIVA,
      },
      {
        chave: "avalExpectRenda",
        rotulo: "Expectativa de melhoria de renda",
        tipo: "select",
        opcoes: OPCOES_EXPECTATIVA,
      },
    ],
  },
];

const BLOCOS_PARTE_2: BlocoDef[] = [
  {
    titulo: "Participação",
    campos: [
      {
        chave: "avalParticipConcluiuCurso",
        rotulo: "Concluiu o curso?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalParticipMotivoNaoConclusao",
        rotulo: "Motivo(s) de não conclusão",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVO_NAO_CONCLUSAO,
        visivelSe: (respostas) => respostas.avalParticipConcluiuCurso === "Não",
      },
      {
        chave: "avalParticipPercentualFrequencia",
        rotulo: "Percentual de frequência",
        tipo: "numero",
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
    ],
  },
  {
    titulo: "Avaliação do Curso",
    campos: (
      [
        { chave: "avalCursoDinamicasInclusao", rotulo: "Dinâmicas de inclusão", tipo: "escala" },
        { chave: "avalCursoMaterialDidatico", rotulo: "Material didático", tipo: "escala" },
        { chave: "avalCursoConteudo", rotulo: "Conteúdo", tipo: "escala" },
        { chave: "avalCursoClareza", rotulo: "Clareza", tipo: "escala" },
        {
          chave: "avalCursoConhecimentoInstrutores",
          rotulo: "Conhecimento dos instrutores",
          tipo: "escala",
        },
        { chave: "avalCursoOrganizacao", rotulo: "Organização", tipo: "escala" },
        {
          chave: "avalCursoInfraestruturaBasica",
          rotulo: "Infraestrutura básica",
          tipo: "escala",
        },
        {
          chave: "avalCursoInfraestruturaSalaAula",
          rotulo: "Infraestrutura de sala de aula",
          tipo: "escala",
        },
      ] as const satisfies readonly Omit<CampoDef, "bloqueadoSe">[]
    ).map((campo) => ({ ...campo, bloqueadoSe: naoConcluiuOuIndefinido })),
  },
  {
    titulo: "Aprendizado",
    campos: (
      [
        {
          chave: "avalAprendizAmpliacaoConhecimento",
          rotulo: "Ampliação de conhecimento",
          tipo: "select",
          opcoes: OPCOES_AMPLIACAO_CONHECIMENTO,
        },
        {
          chave: "avalAprendizAtendimentoExpectativas",
          rotulo: "Atendimento de expectativas",
          tipo: "select",
          opcoes: OPCOES_EXPECTATIVA,
        },
        {
          chave: "avalAprendizSensacaoPreparo",
          rotulo: "Sensação de preparo",
          tipo: "select",
          opcoes: OPCOES_SENSACAO_PREPARO,
        },
      ] as const satisfies readonly Omit<CampoDef, "bloqueadoSe">[]
    ).map((campo) => ({ ...campo, bloqueadoSe: naoConcluiuOuIndefinido })),
  },
  {
    titulo: "Continuidade nos Estudos",
    campos: [
      {
        chave: "avalContinuidadeRetomadaEstudos",
        rotulo: "Retomada de estudos após o curso",
        tipo: "select",
        opcoes: OPCOES_RETOMADA_ESTUDOS,
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
    ],
  },
  {
    titulo: "Motivações Pós-Curso",
    campos: [
      {
        chave: "avalMotivacoesPosPercepcoes",
        rotulo: "Percepções e motivações desenvolvidas após o curso",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVACOES_POS,
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
    ],
  },
  {
    titulo: "Oportunidades de Trabalho",
    campos: [
      {
        chave: "avalOportunSituacaoTrabalho",
        rotulo: "Situação de trabalho após o curso",
        tipo: "select",
        opcoes: OPCOES_SITUACAO_TRABALHO,
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
      {
        chave: "avalOportunIntencaoAtuarTurismo",
        rotulo: "Intenção de atuar em Turismo",
        tipo: "select",
        opcoes: OPCOES_INTENCAO_ATUAR_TURISMO,
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
    ],
  },
  {
    titulo: "Efetivação e Renda",
    campos: (
      [
        {
          chave: "avalEfetivEmprego",
          rotulo: "Efetivação no emprego",
          tipo: "select",
          opcoes: OPCOES_EFETIVACAO,
        },
        {
          chave: "avalEfetivAumentoRenda",
          rotulo: "Aumento de renda",
          tipo: "select",
          opcoes: OPCOES_EFETIVACAO,
        },
        {
          chave: "avalEfetivMelhoriaPadraoVida",
          rotulo: "Melhoria de padrão de vida",
          tipo: "select",
          opcoes: OPCOES_EFETIVACAO,
        },
      ] as const satisfies readonly Omit<CampoDef, "bloqueadoSe">[]
    ).map((campo) => ({ ...campo, bloqueadoSe: naoConcluiuOuIndefinido })),
  },
  {
    titulo: "Avaliação Geral",
    campos: [
      {
        chave: "avalGeralNota",
        rotulo: "Nota geral do curso (0 a 10)",
        tipo: "numero",
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
      {
        chave: "avalGeralMelhoriasComunidade",
        rotulo: "Percepção de melhorias na comunidade",
        tipo: "select",
        opcoes: OPCOES_MELHORIAS_COMUNIDADE,
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
      {
        chave: "avalGeralRecomendaCurso",
        rotulo: "Recomendaria o curso?",
        tipo: "select",
        opcoes: OPCOES_RECOMENDA_CURSO,
        bloqueadoSe: naoConcluiuOuIndefinido,
      },
      {
        chave: "avalGeralComentariosFinais",
        rotulo: "Comentários finais (opcional)",
        tipo: "textarea",
      },
    ],
  },
];

const ROTULOS: Partial<Record<Chave, string>> = Object.fromEntries(
  [...BLOCOS_PARTE_1, ...BLOCOS_PARTE_2]
    .flatMap((bloco) => bloco.campos)
    .map((campo) => [campo.chave, campo.rotulo]),
);

export function AvaliacaoForm({
  cpf,
  cdCurso,
  status,
  parte1CompletaInicial,
  respostasIniciais,
  podeEditar,
}: {
  cpf: string;
  cdCurso: number;
  status: StatusFormulario;
  parte1CompletaInicial: boolean;
  respostasIniciais: RespostasAvaliacaoParcial;
  podeEditar: boolean;
}) {
  const router = useRouter();

  const [respostas, setRespostas] = useState<RespostasAvaliacaoParcial>(respostasIniciais);
  const [alterados, setAlterados] = useState<Set<Chave>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [statusAtual, setStatusAtual] = useState<StatusFormulario>(status);
  const [parte1Completa, setParte1Completa] = useState(parte1CompletaInicial);

  const somenteLeitura = !podeEditar || statusAtual === "ENCERRADO";
  const desabilitado = somenteLeitura || salvando || encerrando;

  function setCampo(chave: Chave, valor: unknown) {
    setRespostas((atual) => ({ ...atual, [chave]: valor }));
    setAlterados((atual) => new Set(atual).add(chave));
  }

  function toggleCheckbox(chave: Chave, opcao: string, marcado: boolean) {
    const atuais = (respostas[chave] as string[] | undefined) ?? [];
    const novos = marcado ? [...atuais, opcao] : atuais.filter((item) => item !== opcao);
    setCampo(chave, novos);
  }

  async function salvarRascunho() {
    setErro(null);
    setSalvando(true);
    try {
      const corpo = Object.fromEntries([...alterados].map((chave) => [chave, respostas[chave]]));
      const res = await fetch(`/api/avaliacoes/${cpf}/${cdCurso}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(corpo),
      });
      const resposta = await res.json();

      if (!res.ok) {
        setErro(resposta.erro ?? "Não foi possível salvar");
        return;
      }

      setParte1Completa(resposta.avaliacao.parte1Completa);
      setAlterados(new Set());
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function encerrar() {
    setErro(null);
    setPendentes([]);
    setEncerrando(true);
    try {
      const res = await fetch(`/api/avaliacoes/${cpf}/${cdCurso}/encerrar`, {
        method: "POST",
        headers: { ...headerCSRF() },
      });
      const resposta = await res.json();

      if (!res.ok) {
        setErro(resposta.erro ?? "Não foi possível encerrar");
        setPendentes(resposta.pendentes ?? []);
        return;
      }

      setStatusAtual("ENCERRADO");
      router.refresh();
    } finally {
      setEncerrando(false);
    }
  }

  function renderCampo(campo: CampoDef, bloqueioExtra: boolean): ReactNode {
    if (campo.visivelSe && !campo.visivelSe(respostas)) {
      return null;
    }

    const campoDesabilitado =
      desabilitado || bloqueioExtra || (campo.bloqueadoSe?.(respostas) ?? false);
    const valor = respostas[campo.chave];
    let controle: ReactNode;

    switch (campo.tipo) {
      case "texto":
        controle = (
          <Input
            id={campo.chave}
            data-testid={`campo-${campo.chave}`}
            type="text"
            value={(valor as string | undefined) ?? ""}
            onChange={(event) => setCampo(campo.chave, event.target.value)}
            disabled={campoDesabilitado}
          />
        );
        break;
      case "textarea":
        controle = (
          <Textarea
            id={campo.chave}
            data-testid={`campo-${campo.chave}`}
            value={(valor as string | undefined) ?? ""}
            onChange={(event) => setCampo(campo.chave, event.target.value)}
            disabled={campoDesabilitado}
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
              setCampo(campo.chave, event.target.value === "" ? undefined : Number(event.target.value))
            }
            disabled={campoDesabilitado}
          />
        );
        break;
      case "select":
        controle = (
          <Select
            value={(valor as string | undefined) ?? null}
            onValueChange={(novoValor) => setCampo(campo.chave, novoValor)}
          >
            <SelectTrigger
              id={campo.chave}
              data-testid={`campo-${campo.chave}-select`}
              disabled={campoDesabilitado}
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
        controle = (
          <Select
            value={valor === undefined || valor === null ? null : String(valor)}
            onValueChange={(novoValor) => setCampo(campo.chave, Number(novoValor))}
          >
            <SelectTrigger
              id={campo.chave}
              data-testid={`campo-${campo.chave}-select`}
              disabled={campoDesabilitado}
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {ESCALA_AVALIACAO_OPCOES.map((opcao) => (
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
            onValueChange={(novoValor) => setCampo(campo.chave, novoValor)}
          >
            {campo.opcoes?.map((opcao, indice) => (
              <FieldLabel key={opcao} htmlFor={`${campo.chave}-${indice}`}>
                <RadioGroupItem
                  id={`${campo.chave}-${indice}`}
                  value={opcao}
                  data-testid={`campo-${campo.chave}-opcao-${indice}`}
                  disabled={campoDesabilitado}
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
                    toggleCheckbox(campo.chave, opcao, marcado === true)
                  }
                  disabled={campoDesabilitado}
                />
                {opcao}
              </FieldLabel>
            ))}
          </div>
        );
        break;
    }

    return (
      <Field key={campo.chave} data-invalid={pendentes.includes(campo.chave)}>
        <FieldLabel htmlFor={campo.chave}>{campo.rotulo}</FieldLabel>
        {controle}
      </Field>
    );
  }

  return (
    <Card className="w-full max-w-3xl" data-testid="form-avaliacao">
      <CardHeader>
        <CardTitle>
          Avaliação #{cdCurso} - CPF {cpf}
        </CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="status-avaliacao">
          {statusAtual === "ENCERRADO" ? "Encerrado" : "Em andamento"}
        </p>
        {somenteLeitura && (
          <p className="text-sm text-muted-foreground" data-testid="somente-leitura-avaliacao">
            Somente leitura.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro && <FieldError data-testid="erro-avaliacao">{erro}</FieldError>}
        {pendentes.length > 0 && (
          <div data-testid="lista-pendencias" className="text-sm text-destructive">
            <p>Campos pendentes:</p>
            <ul className="ml-4 list-disc">
              {pendentes.map((chave) => (
                <li key={chave} data-testid={`pendencia-${chave}`}>
                  {ROTULOS[chave as Chave] ?? chave}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="text-sm font-semibold">Parte 1 — Dados Pessoais e Motivação</h2>
        <Accordion>
          {BLOCOS_PARTE_1.map((bloco, indice) => (
            <AccordionItem key={bloco.titulo} value={bloco.titulo}>
              <AccordionTrigger data-testid={`bloco-parte1-${indice + 1}`}>
                {bloco.titulo}
              </AccordionTrigger>
              <AccordionContent>
                <FieldGroup>
                  {bloco.campos.map((campo) => renderCampo(campo, false))}
                </FieldGroup>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <h2 className="text-sm font-semibold">Parte 2 — Avaliação Pós-Curso</h2>
        {!parte1Completa && (
          <p className="text-sm text-muted-foreground" data-testid="aviso-parte2-bloqueada">
            Complete a Parte 1 para responder esta seção.
          </p>
        )}
        <Accordion>
          {BLOCOS_PARTE_2.map((bloco, indice) => (
            <AccordionItem key={bloco.titulo} value={bloco.titulo}>
              <AccordionTrigger data-testid={`bloco-parte2-${indice + 1}`}>
                {bloco.titulo}
              </AccordionTrigger>
              <AccordionContent>
                <FieldGroup>
                  {bloco.campos.map((campo) => renderCampo(campo, !parte1Completa))}
                </FieldGroup>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {!somenteLeitura && (
          <div className="flex gap-2">
            <Button type="button" onClick={salvarRascunho} disabled={salvando || encerrando}>
              Salvar rascunho
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={encerrar}
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
