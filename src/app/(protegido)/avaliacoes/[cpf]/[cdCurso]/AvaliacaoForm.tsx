// Formulário de preenchimento/encerramento da avaliação (AVAL-07 a AVAL-19),
// colocado junto de `page.tsx` (T9). Mesmo padrão orientado a metadados de
// `PosCursoForm.tsx`/`PreCursoForm.tsx`: os blocos do questionário fonte
// (`docs/Questionario_do_Aluno_1.md`, Q1-Q21 = Parte 1, Q22-Q38 = Parte 2)
// viram tabelas `BLOCOS_PARTE_1`/`BLOCOS_PARTE_2` interpretadas genericamente
// por `renderCampo`. Os rótulos carregam a numeração do papel.
//
// Diferença chave frente às duas features anteriores: dois gates empilhados
// (AD-023/AVAL-10: Parte 2 inteira bloqueada até `parte1Completa`; AVAL-12/13:
// dentro da Parte 2, "Concluiu o curso?" bloqueia as chaves de Q24 a Q38). O
// primeiro gate desabilita todo o Accordion de Parte 2; o segundo desabilita
// campo a campo, a partir da lista `CHAVES_SOMENTE_CONCLUINTE` de
// `src/lib/avaliacao/condicionais.ts` - a MESMA que o encerramento usa para
// descartar essas respostas quando o aluno declara não ter concluído, para a
// tela não bloquear um conjunto de campos e o servidor tratar outro.
// Bloquear é diferente de `visivelSe`, que ESCONDE um campo que só existe
// quando outra pergunta o revela, como `avalProfissAtividadeEspecifica`.
//
// Q22 e Q23 NÃO levam `bloqueadoSe`: são do bloco "Participação", que todo
// aluno responde. O cabeçalho "Avaliação do curso (apenas para quem
// concluiu)" do papel só começa em Q24.
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
  OPCOES_ATIVIDADE_TURISMO,
  OPCOES_CONDICAO_PCD,
  OPCOES_CONDICAO_TRABALHO,
  OPCOES_ESCOLARIDADE,
  OPCOES_EXPECTATIVA_RENDA,
  OPCOES_FAIXA_ETARIA,
  OPCOES_FAIXA_RENDA,
  OPCOES_FORMA_CONHECIMENTO,
  OPCOES_GENERO,
  OPCOES_MELHORIA_PADRAO_VIDA,
  OPCOES_MOTIVACOES_POS,
  OPCOES_MOTIVOS_PARTICIPACAO,
  OPCOES_MOTIVO_NAO_CONCLUSAO,
  OPCOES_PERCENTUAL_FREQUENCIA,
  OPCOES_RACA_ETNIA,
  OPCOES_RETOMADA_ESTUDOS,
  OPCOES_SIM_NAO,
  OPCOES_SIM_PARCIAL_NAO,
  OPCOES_SIM_TALVEZ_NAO,
  OPCOES_SITUACAO_TRABALHO,
  OPCOES_TIPO_CURSO_ANTERIOR,
  OPCOES_UF,
  type RespostasAvaliacao,
  type RespostasAvaliacaoParcial,
} from "@/lib/validation/schemas/avaliacao.schema";
import {
  CHAVES_SOMENTE_CONCLUINTE,
  REGRAS_CONDICIONAIS_AVALIACAO,
  condicaoAvaliacao,
  naoConcluiuDeclarado,
} from "@/lib/avaliacao/condicionais";
import { chavesOrfas } from "@/lib/validation/condicionais";
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
}

interface BlocoDef {
  titulo: string;
  campos: CampoDef[];
}

// Q24 (AD-020): valor armazenado é crescente (1=Péssimo .. 5=Ótimo), mas a
// ordem apresentada segue a da tabela do papel, que começa em ÓTIMO.
const ESCALA_AVALIACAO_OPCOES = [
  { valor: "5", rotulo: "Ótimo" },
  { valor: "4", rotulo: "Bom" },
  { valor: "3", rotulo: "Regular" },
  { valor: "2", rotulo: "Ruim" },
  { valor: "1", rotulo: "Péssimo" },
] as const;

// Enquanto Q22 não é "Sim", as chaves de "apenas para quem concluiu" ficam
// visíveis porém não editáveis.
const somenteConcluinte = new Set<string>(CHAVES_SOMENTE_CONCLUINTE);

const BLOCOS_PARTE_1: BlocoDef[] = [
  {
    titulo: "Dados Pessoais",
    campos: [
      {
        chave: "avalPessoalEstado",
        rotulo: "3. Estado de residência",
        tipo: "select",
        opcoes: OPCOES_UF,
      },
      { chave: "avalPessoalMunicipio", rotulo: "4. Município e Estado", tipo: "texto" },
      { chave: "avalPessoalGenero", rotulo: "5. Gênero", tipo: "radio", opcoes: OPCOES_GENERO },
      {
        chave: "avalPessoalFaixaEtaria",
        rotulo: "6. Faixa etária",
        tipo: "radio",
        opcoes: OPCOES_FAIXA_ETARIA,
      },
      {
        chave: "avalPessoalEscolaridade",
        rotulo: "7. Qual o seu nível de escolaridade",
        tipo: "select",
        opcoes: OPCOES_ESCOLARIDADE,
      },
      {
        chave: "avalPessoalRacaEtnia",
        rotulo: "8. Qual a sua cor/raça/etnia?",
        tipo: "radio",
        opcoes: OPCOES_RACA_ETNIA,
      },
      {
        chave: "avalPessoalCondicaoPcd",
        rotulo: "9. Você é uma Pessoa com Deficiência (PCD)?",
        tipo: "radio",
        opcoes: OPCOES_CONDICAO_PCD,
      },
    ],
  },
  {
    titulo: "Situação Profissional",
    campos: [
      {
        chave: "avalProfissCondicaoTrabalho",
        rotulo: "10. Qual sua condição atual de trabalho?",
        tipo: "select",
        opcoes: OPCOES_CONDICAO_TRABALHO,
      },
      {
        chave: "avalProfissAtuaTurismo",
        rotulo: "11. Atualmente você trabalha na área de Turismo?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalProfissAtividadeEspecifica",
        rotulo: "12. Se sim, em qual atividade?",
        tipo: "select",
        opcoes: OPCOES_ATIVIDADE_TURISMO,
        visivelSe: condicaoAvaliacao("avalProfissAtividadeEspecifica"),
      },
      {
        chave: "avalProfissFaixaRenda",
        rotulo: "13. Qual a sua faixa de renda mensal",
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
        rotulo: "14. Já trabalhou no setor de Turismo?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalExperienciaCursoAnterior",
        rotulo: "15. Já realizou cursos na área de Turismo antes?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalExperienciaTipoCursoAnterior",
        rotulo: "16. Se sim, qual?",
        tipo: "select",
        opcoes: OPCOES_TIPO_CURSO_ANTERIOR,
        visivelSe: condicaoAvaliacao("avalExperienciaTipoCursoAnterior"),
      },
    ],
  },
  {
    titulo: "Motivação",
    campos: [
      {
        chave: "avalMotivMotivosParticipacao",
        rotulo: "17. Quais os três (03) principais motivos para participar do Curso?",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVOS_PARTICIPACAO,
      },
      {
        chave: "avalMotivFormaConhecimento",
        rotulo: "18. Como você ficou sabendo do curso?",
        tipo: "radio",
        opcoes: OPCOES_FORMA_CONHECIMENTO,
      },
    ],
  },
  {
    titulo: "Expectativas",
    campos: [
      {
        chave: "avalExpectAtendimento",
        rotulo: "19. Você considera que a sua expectativa no Curso será atendida?",
        tipo: "radio",
        opcoes: OPCOES_SIM_PARCIAL_NAO,
      },
      {
        chave: "avalExpectEmprego",
        rotulo:
          "20. Você acredita que conseguirá um trabalho ou uma ascensão de carreira após o Curso?",
        tipo: "radio",
        opcoes: OPCOES_SIM_TALVEZ_NAO,
      },
      {
        chave: "avalExpectRenda",
        rotulo: "21. Qual a sua expectativa de melhoria de renda após o Curso?",
        tipo: "radio",
        opcoes: OPCOES_EXPECTATIVA_RENDA,
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
        rotulo: "22. Você concluiu o Curso?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalParticipMotivoNaoConclusao",
        rotulo: "22.1. Se não concluiu, qual(ais) o(os) motivo(s) principal(ais)?",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVO_NAO_CONCLUSAO,
        visivelSe: condicaoAvaliacao("avalParticipMotivoNaoConclusao"),
      },
      // Q23 é do bloco "Participação", que todo aluno responde - por isso
      // não leva `bloqueadoSe`: o gate "apenas para quem concluiu" só começa
      // no cabeçalho de Q24.
      {
        chave: "avalParticipPercentualFrequencia",
        rotulo: "23. Percentual de aulas frequentadas",
        tipo: "radio",
        opcoes: OPCOES_PERCENTUAL_FREQUENCIA,
      },
    ],
  },
  {
    titulo: "Avaliação do curso (apenas para quem concluiu)",
    campos: [
      {
        chave: "avalCursoDinamicasInclusao",
        rotulo: "24. Dinâmicas de inclusão e de participação do aluno nas aulas",
        tipo: "escala",
      },
      {
        chave: "avalCursoMaterialDidatico",
        rotulo:
          "24. Qualidade do material didático (vídeos, leituras, visitas técnicas, aulas práticas etc.)",
        tipo: "escala",
      },
      {
        chave: "avalCursoConteudo",
        rotulo: "24. Qualidade do conteúdo apresentado",
        tipo: "escala",
      },
      {
        chave: "avalCursoClareza",
        rotulo: "24. Clareza na exposição das aulas",
        tipo: "escala",
      },
      {
        chave: "avalCursoConhecimentoInstrutores",
        rotulo: "24. Conhecimento dos instrutores/professores",
        tipo: "escala",
      },
      {
        chave: "avalCursoOrganizacao",
        rotulo: "24. Organização do Curso (horário, local, comunicação)",
        tipo: "escala",
      },
      {
        chave: "avalCursoInfraestruturaBasica",
        rotulo:
          "24. Infraestrutura Básica de Atendimento (banheiros, bebedouros, limpeza, acessibilidade etc.)",
        tipo: "escala",
      },
      {
        chave: "avalCursoInfraestruturaSalaAula",
        rotulo:
          "24. Infraestrutura da Sala de Aula (climatização, equipamentos, mesas e cadeiras etc.)",
        tipo: "escala",
      },
    ],
  },
  {
    titulo: "Aprendizado",
    campos: [
      {
        chave: "avalAprendizAmpliacaoConhecimento",
        rotulo: "25. O seu conhecimento após a conclusão do Curso",
        tipo: "radio",
        opcoes: OPCOES_AMPLIACAO_CONHECIMENTO,
      },
      {
        chave: "avalAprendizAtendimentoExpectativas",
        rotulo: "26. O Curso atendeu as suas expectativas",
        tipo: "radio",
        opcoes: OPCOES_SIM_PARCIAL_NAO,
      },
      {
        chave: "avalAprendizSensacaoPreparo",
        rotulo: "27. Você se sente preparado para trabalhar na área da formação",
        tipo: "radio",
        opcoes: OPCOES_SIM_PARCIAL_NAO,
      },
    ],
  },
  {
    titulo: "Continuidade nos Estudos",
    campos: [
      {
        chave: "avalContinuidadeRetomadaEstudos",
        rotulo:
          "28. Após a conclusão do Curso, você retomou os estudos? (Educação Básica / Fundamental)",
        tipo: "radio",
        opcoes: OPCOES_RETOMADA_ESTUDOS,
      },
    ],
  },
  {
    titulo: "Motivações após o Curso",
    campos: [
      {
        chave: "avalMotivacoesPosPercepcoes",
        rotulo: "29. Após a conclusão do Curso, você sente que:",
        tipo: "checkboxes",
        opcoes: OPCOES_MOTIVACOES_POS,
      },
    ],
  },
  {
    titulo: "Oportunidades Reais de Trabalho e Emprego",
    campos: [
      {
        chave: "avalOportunSituacaoTrabalho",
        rotulo: "30. Após a conclusão do Curso:",
        tipo: "radio",
        opcoes: OPCOES_SITUACAO_TRABALHO,
      },
      {
        chave: "avalOportunSituacaoTrabalhoOutra",
        rotulo: "30. Outra. Quais?",
        tipo: "texto",
        visivelSe: condicaoAvaliacao("avalOportunSituacaoTrabalhoOutra"),
      },
      {
        chave: "avalOportunIntencaoAtuarTurismo",
        rotulo:
          "31. Caso não esteja trabalhando no Turismo, você pretende trabalhar no setor?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
    ],
  },
  {
    titulo: "Efetivação no Emprego e Aumento da Renda",
    campos: [
      {
        chave: "avalEfetivEmprego",
        rotulo:
          "32. Caso não esteja efetivado no emprego, após a conclusão do Curso você foi efetivado?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalEfetivAumentoRenda",
        rotulo: "33. Após a conclusão do Curso sua renda aumentou?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalEfetivMelhoriaPadraoVida",
        rotulo: "34. Após a conclusão do Curso, o seu padrão de vida melhorou?",
        tipo: "radio",
        opcoes: OPCOES_MELHORIA_PADRAO_VIDA,
      },
    ],
  },
  {
    titulo: "Avaliação geral",
    campos: [
      {
        chave: "avalGeralNota",
        rotulo: "35. Qual nota você dá para o Curso (0 a 10)?",
        tipo: "numero",
      },
      {
        chave: "avalGeralMelhoriasComunidade",
        rotulo:
          "36. Como você avalia as melhorias em sua comunidade após a conclusão do Curso?",
        tipo: "textarea",
      },
      {
        chave: "avalGeralRecomendaCurso",
        rotulo: "37. Você recomendaria este Curso para outra pessoa da comunidade?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
      {
        chave: "avalGeralComentariosFinais",
        rotulo:
          "38. A partir da sua experiência como aluno do Curso, você tem algum comentário, crítica, elogio ou sugestão que ajude a melhorar na próxima edição? (opcional)",
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
      // Resposta que deixou de se aplicar (condicional órfã, ou chave de
      // "apenas para quem concluiu" depois de o aluno marcar Q22="Não") não
      // vai no PATCH: o valor continua no estado local, caso ele volte
      // atrás, e o que já estava salvo no servidor segue preservado (edge
      // case da spec) até o encerramento.
      const naoAplicaveis = new Set<string>([
        ...chavesOrfas(REGRAS_CONDICIONAIS_AVALIACAO, respostas),
        ...(naoConcluiuDeclarado(respostas) ? CHAVES_SOMENTE_CONCLUINTE : []),
      ]);
      const corpo = Object.fromEntries(
        [...alterados]
          .filter((chave) => !naoAplicaveis.has(chave))
          .map((chave) => [chave, respostas[chave]]),
      );
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

    const bloqueadoPeloGateDeConclusao =
      somenteConcluinte.has(campo.chave) && respostas.avalParticipConcluiuCurso !== "Sim";
    const campoDesabilitado = desabilitado || bloqueioExtra || bloqueadoPeloGateDeConclusao;
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
