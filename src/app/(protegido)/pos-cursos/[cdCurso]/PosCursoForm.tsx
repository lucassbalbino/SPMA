// Formulário de preenchimento/encerramento do pós-curso (REQ-PO-04 a
// REQ-PO-11), colocado junto de `page.tsx` (T9). Mesmo padrão orientado a
// metadados de `PreCursoForm.tsx`: os 5 blocos do questionário fonte
// (`docs/Questionario_do_Gestor_Pos_Curso.md`) viram uma tabela `BLOCOS`
// interpretada genericamente por `renderCampo`, em vez de 26 blocos JSX
// escritos à mão. Os rótulos carregam a numeração do papel (1..26).
// Diferente do Pré-Curso, nenhum campo tem opção "Qual?" nem escala 0-5 -
// só o único condicional (`posExecAlteracaoDetalhe`, Q12) via `visivelSe` e
// duas perguntas com alternativa excludente (Q6 e Q26).
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
  EXCLUSIVA_CONTINUIDADE,
  EXCLUSIVA_MONITORAMENTO,
  OPCOES_CONCEITOS_TRABALHADOS,
  OPCOES_ESTRATEGIAS_CONTINUIDADE,
  OPCOES_LICAO_INDIVIDUAL,
  OPCOES_MONITORAMENTO,
  OPCOES_MOTIVOS_ABANDONO,
  OPCOES_PLANO_ACAO,
  OPCOES_PROBLEMAS_ESTUDO,
  OPCOES_PROVA_SITUACAO,
  OPCOES_SIM_NAO,
  type RespostasPosCurso,
  type RespostasPosCursoParcial,
} from "@/lib/validation/schemas/pos-curso.schema";
import {
  REGRAS_CONDICIONAIS_POS_CURSO,
  condicaoPosCurso,
} from "@/lib/pos-curso/condicionais";
import { chavesOrfas } from "@/lib/validation/condicionais";
import { headerCSRF } from "@/lib/security/csrf-client";
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasPosCurso;

type TipoCampo = "texto" | "textarea" | "numero" | "data" | "select" | "radio" | "checkboxes";

interface CampoDef {
  chave: Chave;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: readonly string[];
  // Opção que, no papel, nega todas as outras ("Nenhuma ação de
  // monitoramento...") - marcá-la limpa as demais e vice-versa, espelhando o
  // que `multiplaComExclusiva` rejeita no servidor.
  exclusiva?: string;
  visivelSe?: (respostas: RespostasPosCursoParcial) => boolean;
}

interface BlocoDef {
  titulo: string;
  campos: CampoDef[];
}

const BLOCOS: BlocoDef[] = [
  {
    titulo: "Durante o Curso - Acompanhamento Pedagógico",
    campos: [
      {
        chave: "posAcompanhProblemasEstudo",
        rotulo:
          "1. Para o exercício pleno da profissão pretendida, é fundamental que o Docente, em conjunto com a Coordenação Didática-Pedagógica, tenha definido os problemas de estudo (desafios) que os Discentes deverão resolver. Esses problemas foram definidos?",
        tipo: "radio",
        opcoes: OPCOES_PROBLEMAS_ESTUDO,
      },
      {
        chave: "posAcompanhConceitosTrabalhados",
        rotulo:
          "2. As dimensões econômica, ambiental e sociocultural abordadas no Curso foram devidamente detalhadas pelos Docentes em conjunto com a Coordenação Didático-Pedagógica, a partir de conceitos pertinentes a cada dimensão?",
        tipo: "radio",
        opcoes: OPCOES_CONCEITOS_TRABALHADOS,
      },
      {
        chave: "posAcompanhPlanoAcao",
        rotulo:
          "3. O Plano de Ação, que prepara as vivências dos alunos para as situações práticas do Curso, foi devidamente definido pelos Docentes em conjunto com a Coordenação Didático-Pedagógica responsável?",
        tipo: "radio",
        opcoes: OPCOES_PLANO_ACAO,
      },
      {
        chave: "posAcompanhProvaSituacao",
        rotulo:
          "4. A \"Prova Situação\", que reconhece no primeiro dia de aula o nível de conhecimento de cada discente, foi elaborada pelos Docentes e devidamente realizada pelos alunos?",
        tipo: "radio",
        opcoes: OPCOES_PROVA_SITUACAO,
      },
      {
        chave: "posAcompanhLicaoIndividual",
        rotulo:
          "5. Ao final do Curso, cada discente deve realizar a Prova chamada \"Lição Individual\". Ela foi devidamente realizada pelos alunos?",
        tipo: "radio",
        opcoes: OPCOES_LICAO_INDIVIDUAL,
      },
      {
        chave: "posAcompanhMonitoramento",
        rotulo:
          "6. Quais ações de monitoramento foram realizadas durante o desenvolvimento do Curso?",
        tipo: "checkboxes",
        opcoes: OPCOES_MONITORAMENTO,
        exclusiva: EXCLUSIVA_MONITORAMENTO,
      },
    ],
  },
  {
    titulo: "Execução",
    campos: [
      {
        chave: "posExecDataInicioReal",
        rotulo: "7. Data de início do Curso/Ação de Qualificação",
        tipo: "data",
      },
      {
        chave: "posExecDataTerminoReal",
        rotulo: "8. Data de término do Curso/Ação de Qualificação",
        tipo: "data",
      },
      {
        chave: "posExecCargaHorariaRealizada",
        rotulo: "9. Carga horária realizada (horas)",
        tipo: "numero",
      },
      {
        chave: "posExecDificuldadesEnfrentadas",
        rotulo:
          "10. Quais as dificuldades enfrentadas na execução do Curso/Ação de Qualificação?",
        tipo: "textarea",
      },
      {
        chave: "posExecHouveAlteracaoPlanejamento",
        rotulo:
          "11. Houve alguma alteração no planejamento inicial do Curso/Ação de Qualificação?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "posExecAlteracaoDetalhe",
        rotulo: "12. Se sim, por qual motivo? Qual alteração foi necessária?",
        tipo: "textarea",
        // Mesma regra que a completude usa no encerramento - a tela não pode
        // revelar um campo que ela não cobra, nem esconder um que ela cobre.
        visivelSe: condicaoPosCurso("posExecAlteracaoDetalhe"),
      },
    ],
  },
  {
    titulo: "Participação",
    campos: [
      { chave: "posParticNumInscritos", rotulo: "13. Número de alunos inscritos", tipo: "numero" },
      {
        chave: "posParticNumMatriculados",
        rotulo: "14. Número de alunos matriculados",
        tipo: "numero",
      },
      {
        chave: "posParticNumConcluintes",
        rotulo: "15. Número de alunos concluintes",
        tipo: "numero",
      },
      {
        chave: "posParticMotivosAbandono",
        rotulo:
          "16. Principais motivos atestados para o abandono do Curso/Ação de Qualificação",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVOS_ABANDONO,
      },
      {
        chave: "posParticDemandaMaiorQueOferta",
        rotulo:
          "17. A demanda pelo Curso/Ação de Qualificação foi maior do que a oferta disponibilizada?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "posParticIntencaoNovaOferta",
        rotulo: "18. Pretendem ofertar o Curso/Ação de Qualificação novamente?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
    ],
  },
  {
    titulo: "Financeiro",
    campos: [
      {
        chave: "posFinValorTotal",
        rotulo: "19. Valor total do Curso/Ação de Qualificação (R$)",
        tipo: "numero",
      },
      {
        chave: "posFinValorProfessores",
        rotulo: "20. Valor pago para professores e/ou instrutores (R$)",
        tipo: "numero",
      },
      {
        chave: "posFinValorMateriais",
        rotulo: "21. Valor pago para aquisição de materiais didáticos e insumos (R$)",
        tipo: "numero",
      },
      {
        chave: "posFinValorInfraestrutura",
        rotulo: "22. Valor pago com infraestrutura (R$)",
        tipo: "numero",
      },
      {
        chave: "posFinValorBolsaPermanencia",
        rotulo:
          "23. Valor destinado a bolsa permanência (apoio aos alunos para transporte, alimentação, uniforme, equipamentos etc.) (R$)",
        tipo: "numero",
      },
      {
        chave: "posFinHouveDevolucaoRecursos",
        rotulo: "24. Houve devolução de recursos?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "posFinNecessidadeAditivo",
        rotulo: "25. Houve a necessidade de complementação financeira (aditivos)?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
    ],
  },
  {
    titulo: "Ações para Continuidade do Curso",
    campos: [
      {
        chave: "posContEstrategias",
        rotulo:
          "26. Quais estratégias foram adotadas pensando na continuidade e na ampliação da formação proposta?",
        tipo: "checkboxes",
        opcoes: OPCOES_ESTRATEGIAS_CONTINUIDADE,
        exclusiva: EXCLUSIVA_CONTINUIDADE,
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

  // Espelha, na tela, a regra que `multiplaComExclusiva` aplica no servidor:
  // marcar a opção excludente limpa as demais, e marcar qualquer outra
  // desmarca a excludente.
  function toggleCheckbox(campo: CampoDef, opcao: string, marcado: boolean) {
    const atuais = (respostas[campo.chave] as string[] | undefined) ?? [];

    let novos: string[];
    if (!marcado) {
      novos = atuais.filter((item) => item !== opcao);
    } else if (campo.exclusiva !== undefined && opcao === campo.exclusiva) {
      novos = [opcao];
    } else {
      novos = [...atuais.filter((item) => item !== campo.exclusiva), opcao];
    }

    setCampo(campo.chave, novos);
  }

  async function salvarRascunho() {
    setErro(null);
    setSalvando(true);
    try {
      // Q12 que ficou órfã (o Gestor detalhou a alteração e depois mudou
      // Q11 para "Não") não vai no PATCH: o valor continua no estado local,
      // caso ele volte atrás, mas não é gravado como resposta de uma
      // pergunta que não se aplica mais.
      const orfas = new Set<string>(chavesOrfas(REGRAS_CONDICIONAIS_POS_CURSO, respostas));
      const corpo = Object.fromEntries(
        [...alterados]
          .filter((chave) => !orfas.has(chave))
          .map((chave) => [chave, respostas[chave]]),
      );
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
                  onCheckedChange={(marcado) => toggleCheckbox(campo, opcao, marcado === true)}
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
