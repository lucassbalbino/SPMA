// Formulário de preenchimento/encerramento do pós-curso (REQ-PO-04 a
// REQ-PO-11), colocado junto de `page.tsx` (T9). Mesmo padrão orientado a
// metadados de `PreCursoForm.tsx`: os 5 blocos do Dicionário de Campos
// (spec.md) viram uma tabela `BLOCOS` interpretada genericamente por
// `renderCampo`, em vez de 26 blocos JSX escritos à mão. Diferente do
// Pré-Curso, nenhum campo tem opção "Outro/Outra" nem escala 0-5 - só o
// único condicional (`posExecAlteracaoDetalhe`) via `visivelSe`.
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
  OPCOES_AVALIACAO_COGNITIVA,
  OPCOES_DIFICULDADES_ENFRENTADAS,
  OPCOES_ESTRATEGIAS_AMPLIACAO,
  OPCOES_ESTRATEGIAS_CONTINUIDADE,
  OPCOES_HOUVE_ALTERACAO_PLANEJAMENTO,
  OPCOES_HOUVE_DEVOLUCAO_RECURSOS,
  OPCOES_INTENCAO_NOVA_OFERTA,
  OPCOES_MONITORAMENTO,
  OPCOES_MOTIVOS_ABANDONO,
  OPCOES_NECESSIDADE_ADITIVO,
  OPCOES_PROBLEMAS_ESTUDO,
  OPCOES_RELACAO_DEMANDA_OFERTA,
  type RespostasPosCurso,
  type RespostasPosCursoParcial,
} from "@/lib/validation/schemas/pos-curso.schema";
import { headerCSRF } from "@/lib/security/csrf-client";
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasPosCurso;

type TipoCampo = "texto" | "textarea" | "numero" | "data" | "select" | "radio" | "checkboxes";

interface CampoDef {
  chave: Chave;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: readonly string[];
  visivelSe?: (respostas: RespostasPosCursoParcial) => boolean;
}

interface BlocoDef {
  titulo: string;
  campos: CampoDef[];
}

const BLOCOS: BlocoDef[] = [
  {
    titulo: "Bloco 1 - Acompanhamento Pedagógico",
    campos: [
      {
        chave: "posAcompanhProblemasEstudo",
        rotulo: "Problemas de estudo identificados",
        tipo: "checkboxes",
        opcoes: OPCOES_PROBLEMAS_ESTUDO,
      },
      {
        chave: "posAcompanhConceitosTrabalhados",
        rotulo: "Principais conceitos/temas trabalhados",
        tipo: "textarea",
      },
      { chave: "posAcompanhPlanoAcao", rotulo: "Plano de ação pedagógico adotado", tipo: "textarea" },
      {
        chave: "posAcompanhAvaliacaoCognitiva",
        rotulo: "Forma de avaliação cognitiva utilizada",
        tipo: "select",
        opcoes: OPCOES_AVALIACAO_COGNITIVA,
      },
      {
        chave: "posAcompanhMonitoramento",
        rotulo: "Estratégias de monitoramento do aprendizado",
        tipo: "checkboxes",
        opcoes: OPCOES_MONITORAMENTO,
      },
    ],
  },
  {
    titulo: "Bloco 2 - Execução",
    campos: [
      { chave: "posExecDataInicioReal", rotulo: "Data real de início", tipo: "data" },
      { chave: "posExecDataTerminoReal", rotulo: "Data real de término", tipo: "data" },
      {
        chave: "posExecCargaHorariaRealizada",
        rotulo: "Carga horária efetivamente realizada (horas)",
        tipo: "numero",
      },
      {
        chave: "posExecDificuldadesEnfrentadas",
        rotulo: "Dificuldades enfrentadas na execução",
        tipo: "checkboxes",
        opcoes: OPCOES_DIFICULDADES_ENFRENTADAS,
      },
      {
        chave: "posExecHouveAlteracaoPlanejamento",
        rotulo: "Houve alteração no planejamento inicial?",
        tipo: "radio",
        opcoes: OPCOES_HOUVE_ALTERACAO_PLANEJAMENTO,
      },
      {
        chave: "posExecAlteracaoDetalhe",
        rotulo: "Motivo e descrição da alteração",
        tipo: "textarea",
        visivelSe: (respostas) => respostas.posExecHouveAlteracaoPlanejamento === "Sim",
      },
    ],
  },
  {
    titulo: "Bloco 3 - Participação",
    campos: [
      { chave: "posParticNumInscritos", rotulo: "Número de inscritos", tipo: "numero" },
      { chave: "posParticNumMatriculados", rotulo: "Número de matriculados", tipo: "numero" },
      { chave: "posParticNumConcluintes", rotulo: "Número de concluintes", tipo: "numero" },
      {
        chave: "posParticMotivosAbandono",
        rotulo: "Principal motivo de abandono",
        tipo: "select",
        opcoes: OPCOES_MOTIVOS_ABANDONO,
      },
      {
        chave: "posParticRelacaoDemandaOferta",
        rotulo: "Relação entre demanda e oferta de vagas",
        tipo: "select",
        opcoes: OPCOES_RELACAO_DEMANDA_OFERTA,
      },
      {
        chave: "posParticIntencaoNovaOferta",
        rotulo: "Intenção de nova oferta do curso",
        tipo: "select",
        opcoes: OPCOES_INTENCAO_NOVA_OFERTA,
      },
    ],
  },
  {
    titulo: "Bloco 4 - Financeiro",
    campos: [
      { chave: "posFinValorTotalExecutado", rotulo: "Valor total executado", tipo: "numero" },
      {
        chave: "posFinValorDespesaDocentes",
        rotulo: "Despesa com docentes/instrutores",
        tipo: "numero",
      },
      {
        chave: "posFinValorDespesaMaterialDidatico",
        rotulo: "Despesa com material didático",
        tipo: "numero",
      },
      {
        chave: "posFinValorDespesaInfraestrutura",
        rotulo: "Despesa com infraestrutura",
        tipo: "numero",
      },
      {
        chave: "posFinHouveDevolucaoRecursos",
        rotulo: "Houve devolução de recursos?",
        tipo: "select",
        opcoes: OPCOES_HOUVE_DEVOLUCAO_RECURSOS,
      },
      { chave: "posFinValorDevolvido", rotulo: "Valor devolvido", tipo: "numero" },
      {
        chave: "posFinNecessidadeAditivo",
        rotulo: "Necessidade de aditivo orçamentário",
        tipo: "select",
        opcoes: OPCOES_NECESSIDADE_ADITIVO,
      },
    ],
  },
  {
    titulo: "Bloco 5 - Continuidade",
    campos: [
      {
        chave: "posContEstrategiasContinuidade",
        rotulo: "Estratégias de continuidade da formação",
        tipo: "checkboxes",
        opcoes: OPCOES_ESTRATEGIAS_CONTINUIDADE,
      },
      {
        chave: "posContEstrategiasAmpliacao",
        rotulo: "Estratégias de ampliação da formação",
        tipo: "checkboxes",
        opcoes: OPCOES_ESTRATEGIAS_AMPLIACAO,
      },
    ],
  },
];

const ROTULOS: Partial<Record<Chave, string>> = Object.fromEntries(
  BLOCOS.flatMap((bloco) => bloco.campos).map((campo) => [campo.chave, campo.rotulo]),
);

export function PosCursoForm({
  cdCurso,
  status,
  respostasIniciais,
  podeEditar,
}: {
  cdCurso: number;
  status: StatusFormulario;
  respostasIniciais: RespostasPosCursoParcial;
  podeEditar: boolean;
}) {
  const router = useRouter();

  const [respostas, setRespostas] = useState<RespostasPosCursoParcial>(respostasIniciais);
  const [alterados, setAlterados] = useState<Set<Chave>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [statusAtual, setStatusAtual] = useState<StatusFormulario>(status);

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
      const res = await fetch(`/api/pos-cursos/${cdCurso}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(corpo),
      });
      const resposta = await res.json();

      if (!res.ok) {
        setErro(resposta.erro ?? "Não foi possível salvar");
        return;
      }

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
      const res = await fetch(`/api/pos-cursos/${cdCurso}/encerrar`, {
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

  function renderCampo(campo: CampoDef): ReactNode {
    if (campo.visivelSe && !campo.visivelSe(respostas)) {
      return null;
    }

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
            onChange={(event) => setCampo(campo.chave, event.target.value)}
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
              setCampo(campo.chave, event.target.value === "" ? undefined : Number(event.target.value))
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
            onChange={(event) => setCampo(campo.chave, event.target.value)}
            disabled={desabilitado}
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
                    toggleCheckbox(campo.chave, opcao, marcado === true)
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
      <Field key={campo.chave} data-invalid={pendentes.includes(campo.chave)}>
        <FieldLabel htmlFor={campo.chave}>{campo.rotulo}</FieldLabel>
        {controle}
      </Field>
    );
  }

  return (
    <Card className="w-full max-w-3xl" data-testid="form-pos-curso">
      <CardHeader>
        <CardTitle>Pós-curso #{cdCurso}</CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="status-pos-curso">
          {statusAtual === "ENCERRADO" ? "Encerrado" : "Em andamento"}
        </p>
        {somenteLeitura && (
          <p className="text-sm text-muted-foreground" data-testid="somente-leitura-pos-curso">
            Somente leitura.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro && <FieldError data-testid="erro-pos-curso">{erro}</FieldError>}
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
        <Accordion>
          {BLOCOS.map((bloco, indice) => (
            <AccordionItem key={bloco.titulo} value={bloco.titulo}>
              <AccordionTrigger data-testid={`bloco-${indice + 1}`}>{bloco.titulo}</AccordionTrigger>
              <AccordionContent>
                <FieldGroup>{bloco.campos.map((campo) => renderCampo(campo))}</FieldGroup>
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
