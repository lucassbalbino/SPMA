// Formulário de preenchimento/encerramento do pré-curso (REQ-PC-04 a
// REQ-PC-12), colocado junto de `page.tsx` (T10). As 12 seções do
// questionário fonte (`docs/Questionario_do_Gestor_Pre_Curso.md`) viram uma
// tabela `BLOCOS` (metadados: bloco, chave, rótulo, tipo, opções,
// condicional, opção excludente) em vez de 56 blocos JSX escritos à mão -
// `renderCampo` interpreta essa tabela genericamente, igual ao padrão de
// reuso de opções já usado em `pre-curso.schema.ts` (nunca duplicar a lista
// de campos em dois lugares). Os rótulos carregam a numeração do papel
// (1..32) para o Gestor conseguir conferir contra o questionário impresso.
//
// Estado único `respostas: RespostasPreCursoParcial` (design.md) com
// `setCampo` genérico; `alterados` rastreia só as chaves tocadas desde o
// último "Salvar rascunho" para o PATCH enviar apenas o bloco alterado
// (REQ-PC-04), não os 56 campos inteiros a cada auto-save.
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
  EXCLUSIVA_DIAGNOSTICO,
  EXCLUSIVA_DIVULGACAO,
  EXCLUSIVA_DOCENTE_CRITERIOS,
  EXCLUSIVA_PARCERIAS,
  EXCLUSIVA_SUPORTE,
  OPCOES_CARACTERISTICAS,
  OPCOES_DIAGNOSTICO_CONSULTAS,
  OPCOES_DIVULGACAO_ESTRATEGIAS,
  OPCOES_DOCENTE_CRITERIOS,
  OPCOES_DOCENTE_FORMA_CONTRATACAO,
  OPCOES_DOCENTE_NIVEL_FORMACAO,
  OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE,
  OPCOES_INFRA_ESPECIFICA_NECESSIDADE,
  OPCOES_INSTITUICAO_EXECUTORA,
  OPCOES_MODALIDADE,
  OPCOES_PARCERIAS,
  OPCOES_PUBLICO_PERFIL,
  OPCOES_REGIAO,
  OPCOES_SIM_NAO,
  OPCOES_SUPORTE_ESTRATEGIAS,
  OPCOES_UF,
  type RespostasPreCurso,
  type RespostasPreCursoParcial,
} from "@/lib/validation/schemas/pre-curso.schema";
import {
  REGRAS_CONDICIONAIS_PRE_CURSO,
  condicaoPreCurso,
  type ChaveCondicionalPreCurso,
} from "@/lib/pre-curso/condicionais";
import { chavesOrfas } from "@/lib/validation/condicionais";
import { headerCSRF } from "@/lib/security/csrf-client";
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasPreCurso;

type TipoCampo =
  | "texto"
  | "email"
  | "textarea"
  | "numero"
  | "data"
  | "select"
  | "radio"
  | "checkboxes"
  | "escala";

interface CampoDef {
  chave: Chave;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: readonly string[];
  // Campo de texto livre revelado pela regra condicional da própria chave
  // (`src/lib/pre-curso/condicionais.ts`) - a mesma que decide, no
  // encerramento, se ele é exigido e se um valor gravado ali é órfão.
  outroChave?: ChaveCondicionalPreCurso;
  outroRotulo?: string;
  // Opção que, no papel, nega todas as outras ("Não foram realizadas
  // consultas...") - marcá-la limpa as demais e vice-versa.
  exclusiva?: string;
  visivelSe?: (respostas: RespostasPreCursoParcial) => boolean;
}

interface BlocoDef {
  titulo: string;
  enunciado?: string;
  campos: CampoDef[];
}

// AD-019: escala crescente 0 (Não há disponibilidade) a 5 (Ótimo), Q23/Q24.
const ESCALA_OPCOES = [
  { valor: "0", rotulo: "0 - Não há disponibilidade" },
  { valor: "1", rotulo: "1 - Péssimo" },
  { valor: "2", rotulo: "2 - Ruim" },
  { valor: "3", rotulo: "3 - Regular" },
  { valor: "4", rotulo: "4 - Bom" },
  { valor: "5", rotulo: "5 - Ótimo" },
] as const;

// `visivelSe` e a exigência de encerramento saem da MESMA regra: a tela não
// pode revelar um campo que a completude não cobra, nem esconder um que ela
// cobre.

const BLOCOS: BlocoDef[] = [
  {
    titulo: "Seção 1 - Identificação",
    campos: [
      { chave: "identifUf", rotulo: "1. UF", tipo: "select", opcoes: OPCOES_UF },
      { chave: "identifMunicipio", rotulo: "2. Município", tipo: "texto" },
      {
        chave: "identifEntidadeResponsavel",
        rotulo: "3. Nome da Entidade Responsável",
        tipo: "texto",
      },
      {
        chave: "identifCoordenador",
        rotulo:
          "4. Nome do Coordenador Pedagógico ou Responsável Técnico da Ação de Qualificação",
        tipo: "texto",
      },
      { chave: "identifEmail", rotulo: "5. E-mail do Coordenador/Responsável", tipo: "email" },
      {
        chave: "identifTelefone",
        rotulo: "6. Telefone do Coordenador/Responsável",
        tipo: "texto",
      },
    ],
  },
  {
    titulo: "Seção 2 - Dados da Qualificação Profissional",
    campos: [
      {
        chave: "qualifEndereco",
        rotulo: "7. Endereço da Sede onde a ação de qualificação é realizada",
        tipo: "texto",
      },
      {
        chave: "qualifNomeCurso",
        rotulo: "8. Nome da Ação de Qualificação (Curso, Plano, Programa, Projeto ou Ação)",
        tipo: "texto",
      },
      {
        chave: "qualifVinculoPrograma",
        rotulo: "9. A formação faz parte de um Plano, Programa ou Projeto de Qualificação?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
        outroChave: "qualifVinculoProgramaQual",
        outroRotulo: "9. Qual?",
      },
      {
        chave: "qualifCaracteristicas",
        rotulo: "10. No caso de Cursos, quais características são contempladas",
        tipo: "checkboxes",
        opcoes: OPCOES_CARACTERISTICAS,
        outroChave: "qualifCaracteristicasOutra",
        outroRotulo: "10. Outro. Qual?",
      },
      {
        chave: "qualifModalidade",
        rotulo: "11. Modalidade da Ação de Qualificação/Curso",
        tipo: "radio",
        opcoes: OPCOES_MODALIDADE,
      },
      {
        chave: "qualifRegiao",
        rotulo: "12. Região de realização da Ação de Qualificação/Curso",
        tipo: "radio",
        opcoes: OPCOES_REGIAO,
      },
    ],
  },
  {
    titulo: "Seção 3 - Planejamento",
    campos: [
      {
        chave: "planejDataInicioPrevista",
        rotulo: "13. Data prevista de início do curso/ação",
        tipo: "data",
      },
      {
        chave: "planejDataTerminoPrevista",
        rotulo: "14. Data prevista de término do curso/ação",
        tipo: "data",
      },
      { chave: "planejCargaHoraria", rotulo: "15. Carga horária planejada (horas)", tipo: "numero" },
      { chave: "planejNumTurmas", rotulo: "16. Número de turmas planejadas", tipo: "numero" },
      {
        chave: "planejNumAlunosPrevistos",
        rotulo: "17. Número previsto de alunos",
        tipo: "numero",
      },
      {
        chave: "planejTaxaEvasaoEsperada",
        rotulo: "18. Taxa de evasão esperada (%)",
        tipo: "numero",
      },
      {
        chave: "planejObjetivo",
        rotulo: "19. Principal objetivo da ação de qualificação/curso",
        tipo: "textarea",
      },
    ],
  },
  {
    titulo: "Seção 4 - Público-Alvo",
    campos: [
      {
        chave: "publicoPerfil",
        rotulo: "20. Perfil do público-alvo",
        tipo: "checkboxes",
        opcoes: OPCOES_PUBLICO_PERFIL,
      },
      {
        chave: "publicoInstituicaoExecutora",
        rotulo: "21. Instituição Executora da ação de qualificação/curso",
        tipo: "radio",
        opcoes: OPCOES_INSTITUICAO_EXECUTORA,
      },
      {
        chave: "publicoInstituicaoExecutoraNome",
        rotulo: "21.1. Nome da instituição contratada / parceira",
        tipo: "texto",
        visivelSe: condicaoPreCurso("publicoInstituicaoExecutoraNome"),
      },
    ],
  },
  {
    titulo: "Diagnóstico Pré-Curso",
    campos: [
      {
        chave: "diagnosticoConsultas",
        rotulo:
          "22. Visando reconhecer as lacunas de, e as demandas por, qualificação profissional para o Turismo local, foram realizadas consultas individuais prévias e/ou reuniões (presenciais ou remotas) com representantes de quais grupos de atores territoriais?",
        tipo: "checkboxes",
        opcoes: OPCOES_DIAGNOSTICO_CONSULTAS,
        exclusiva: EXCLUSIVA_DIAGNOSTICO,
      },
    ],
  },
  {
    titulo: "Infraestrutura Básica",
    enunciado:
      "23. Qual a disponibilidade dos equipamentos básicos fundamentais, e seu estado de conservação e funcionalidade?",
    campos: [
      {
        chave: "infraBasicaBanheiros",
        rotulo: "Banheiros com sistema de esgoto ativo",
        tipo: "escala",
      },
      { chave: "infraBasicaBebedouros", rotulo: "Bebedouros com água potável", tipo: "escala" },
      { chave: "infraBasicaEnergia", rotulo: "Rede de energia elétrica ativa", tipo: "escala" },
      {
        chave: "infraBasicaSalaAula",
        rotulo: "Sala de aula com iluminação e climatização adequadas",
        tipo: "escala",
      },
      { chave: "infraBasicaRecepcao", rotulo: "Recepção/secretaria acadêmica", tipo: "escala" },
      {
        chave: "infraBasicaBiblioteca",
        rotulo: "Biblioteca e/ou espaço de acervo",
        tipo: "escala",
      },
      {
        chave: "infraBasicaMobiliario",
        rotulo: "Quadro branco/lousa, armário, mesa, cadeiras",
        tipo: "escala",
      },
      {
        chave: "infraBasicaAcessibilidade",
        rotulo:
          "Estrutura física adaptada para garantia de acessibilidade a pessoas com deficiência (PCDs) e mobilidade reduzida (rampas, portas adaptadas, barras de segurança, carteiras, mesas, cadeiras)",
        tipo: "escala",
      },
      {
        chave: "infraBasicaLaboratorio",
        rotulo:
          "Laboratório (de informática, de gastronomia, de hospedagem, de agenciamento de viagens, ou outros a depender do curso)",
        tipo: "escala",
      },
    ],
  },
  {
    titulo: "Infraestrutura Complementar",
    enunciado:
      "24. Qual a disponibilidade dos equipamentos básicos complementares, e seu estado de conservação e funcionalidade?",
    campos: [
      {
        chave: "infraComplSalaProfessores",
        rotulo: "Sala de professores/instrutores, com iluminação adequada",
        tipo: "escala",
      },
      {
        chave: "infraComplSalaGestores",
        rotulo: "Sala de gestores e de reuniões, com iluminação adequada",
        tipo: "escala",
      },
      {
        chave: "infraComplSalaEstudo",
        rotulo: "Sala de estudo coletiva, com iluminação adequada",
        tipo: "escala",
      },
      { chave: "infraComplCopa", rotulo: "Copa/cozinha", tipo: "escala" },
      { chave: "infraComplLanchonete", rotulo: "Lanchonete/Cantina", tipo: "escala" },
      { chave: "infraComplAuditorio", rotulo: "Auditório", tipo: "escala" },
      {
        chave: "infraComplAudiovisual",
        rotulo:
          "Equipamentos audiovisuais (tela de projeção, projetores, TV, lousa digital)",
        tipo: "escala",
      },
      {
        chave: "infraComplTecnologicos",
        rotulo:
          "Equipamentos tecnológicos e conexão (computador/laptop com acesso à internet)",
        tipo: "escala",
      },
    ],
  },
  {
    titulo: "Infraestrutura Específica",
    campos: [
      {
        chave: "infraEspecificaNecessidade",
        rotulo:
          "25. Para a realização deste curso/ação de qualificação são necessários equipamentos e/ou insumos específicos?",
        tipo: "radio",
        opcoes: OPCOES_INFRA_ESPECIFICA_NECESSIDADE,
      },
      {
        chave: "infraEspecificaDisponibilidade",
        rotulo:
          "25.1. Se sim, em qual dessas situações se encaixa melhor a situação dos equipamentos específicos?",
        tipo: "radio",
        opcoes: OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE,
        visivelSe: condicaoPreCurso("infraEspecificaDisponibilidade"),
      },
      {
        chave: "infraEspecificaSuficiencia",
        rotulo:
          "25.2. A quantidade de equipamentos específicos é suficiente para o Curso/Ação de Qualificação?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
        visivelSe: condicaoPreCurso("infraEspecificaSuficiencia"),
      },
      {
        chave: "infraEspecificaManutencao",
        rotulo:
          "25.3. Os equipamentos específicos para o Curso/Ação de Qualificação recebem manutenção periódica?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
        visivelSe: condicaoPreCurso("infraEspecificaManutencao"),
      },
    ],
  },
  {
    titulo: "Corpo Docente",
    campos: [
      {
        chave: "docenteCriteriosSelecao",
        rotulo:
          "26. Foi realizada a devida avaliação da trajetória profissional e do histórico de formação do(a) candidato(a), a partir do cumprimento de quais ações fundamentais?",
        tipo: "checkboxes",
        opcoes: OPCOES_DOCENTE_CRITERIOS,
        exclusiva: EXCLUSIVA_DOCENTE_CRITERIOS,
      },
      {
        chave: "docenteFormaContratacao",
        rotulo: "27. Como se deu a forma de contratação dos professores e instrutores?",
        tipo: "radio",
        opcoes: OPCOES_DOCENTE_FORMA_CONTRATACAO,
        outroChave: "docenteFormaContratacaoOutra",
        outroRotulo: "27. Outro sistema seletivo. Qual?",
      },
      {
        chave: "docenteNivelFormacao",
        rotulo: "28. Qual o nível de formação dos professores/instrutores contratados?",
        tipo: "radio",
        opcoes: OPCOES_DOCENTE_NIVEL_FORMACAO,
      },
      {
        chave: "docentePoliticasReparacao",
        rotulo:
          "29. Foram consideradas políticas de reparação (raça/gênero) no processo de contratação dos professores?",
        tipo: "radio",
        opcoes: OPCOES_SIM_NAO,
      },
    ],
  },
  {
    titulo: "Divulgação",
    campos: [
      {
        chave: "divulgacaoEstrategias",
        rotulo:
          "30. Foram adotadas estratégias de divulgação do Curso, a partir da realização de quais ações fundamentais?",
        tipo: "checkboxes",
        opcoes: OPCOES_DIVULGACAO_ESTRATEGIAS,
        exclusiva: EXCLUSIVA_DIVULGACAO,
        outroChave: "divulgacaoEstrategiasOutra",
        outroRotulo: "30. Divulgação via outros canais. Quais?",
      },
    ],
  },
  {
    titulo: "Parcerias e Sensibilização",
    campos: [
      {
        chave: "parceriasEstabelecidas",
        rotulo:
          "31. Estabeleceu parceria(s) locais para realização de quais ações de notória contribuição ao Curso?",
        tipo: "checkboxes",
        opcoes: OPCOES_PARCERIAS,
        exclusiva: EXCLUSIVA_PARCERIAS,
      },
    ],
  },
  {
    titulo: "Suporte ao Aluno",
    campos: [
      {
        chave: "suporteEstrategias",
        rotulo:
          "32. Adotou estratégias para viabilizar a participação ativa de interessados(as) no Curso, até a sua conclusão, a partir da realização de quais ações de notória contribuição?",
        tipo: "checkboxes",
        opcoes: OPCOES_SUPORTE_ESTRATEGIAS,
        exclusiva: EXCLUSIVA_SUPORTE,
        outroChave: "suporteEstrategiasOutra",
        outroRotulo: "32. Outros. Quais?",
      },
    ],
  },
];

const TODOS_OS_CAMPOS = BLOCOS.flatMap((bloco) => bloco.campos);

const ROTULOS: Partial<Record<Chave, string>> = Object.fromEntries(
  TODOS_OS_CAMPOS.flatMap((campo) => {
    const entradas: [Chave, string][] = [[campo.chave, campo.rotulo]];
    if (campo.outroChave) {
      entradas.push([campo.outroChave, campo.outroRotulo ?? `${campo.rotulo} - especificação`]);
    }
    return entradas;
  }),
);

// O campo "Qual?/Quais?" só aparece quando a opção que o revela está
// escolhida (radio) ou marcada (checkboxes) - condição lida da regra
// compartilhada, nunca reescrita aqui.
function acionaOutro(campo: CampoDef, respostas: RespostasPreCursoParcial): boolean {
  return campo.outroChave !== undefined && condicaoPreCurso(campo.outroChave)(respostas);
}

export function PreCursoForm({
  cdCurso,
  status,
  respostasIniciais,
  podeEditar,
}: {
  cdCurso: number;
  status: StatusFormulario;
  respostasIniciais: RespostasPreCursoParcial;
  podeEditar: boolean;
}) {
  const router = useRouter();

  const [respostas, setRespostas] = useState<RespostasPreCursoParcial>(respostasIniciais);
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
      // Uma condicional que ficou órfã (o Gestor respondeu, mudou a
      // pergunta-mãe e o campo sumiu da tela) não vai no PATCH: o valor
      // continua no estado local, caso ele volte atrás, mas não é gravado
      // como resposta de uma pergunta que não se aplica mais.
      const orfas = new Set<string>(chavesOrfas(REGRAS_CONDICIONAIS_PRE_CURSO, respostas));
      const corpo = Object.fromEntries(
        [...alterados]
          .filter((chave) => !orfas.has(chave))
          .map((chave) => [chave, respostas[chave]]),
      );
      const res = await fetch(`/api/pre-cursos/${cdCurso}`, {
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
      const res = await fetch(`/api/pre-cursos/${cdCurso}/encerrar`, {
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
      case "email":
        controle = (
          <Input
            id={campo.chave}
            data-testid={`campo-${campo.chave}`}
            type={campo.tipo === "email" ? "email" : "text"}
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
      case "escala":
        controle = (
          <Select
            value={valor === undefined || valor === null ? null : String(valor)}
            onValueChange={(novoValor) => setCampo(campo.chave, Number(novoValor))}
          >
            <SelectTrigger
              id={campo.chave}
              data-testid={`campo-${campo.chave}-select`}
              disabled={desabilitado}
            >
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {ESCALA_OPCOES.map((opcao) => (
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

    const campoOutro = acionaOutro(campo, respostas) ? campo.outroChave! : null;

    return (
      <Field key={campo.chave} data-invalid={pendentes.includes(campo.chave)}>
        <FieldLabel htmlFor={campo.chave}>{campo.rotulo}</FieldLabel>
        {controle}
        {campoOutro && (
          <Field data-invalid={pendentes.includes(campoOutro)}>
            <FieldLabel htmlFor={campoOutro}>{ROTULOS[campoOutro]}</FieldLabel>
            <Input
              id={campoOutro}
              data-testid={`campo-${campoOutro}`}
              value={(respostas[campoOutro] as string | undefined) ?? ""}
              onChange={(event) => setCampo(campoOutro, event.target.value)}
              disabled={desabilitado}
            />
          </Field>
        )}
      </Field>
    );
  }

  return (
    <Card className="w-full max-w-3xl" data-testid="form-pre-curso">
      <CardHeader>
        <CardTitle>Pré-curso #{cdCurso}</CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="status-pre-curso">
          {statusAtual === "ENCERRADO" ? "Encerrado" : "Em andamento"}
        </p>
        {somenteLeitura && (
          <p className="text-sm text-muted-foreground" data-testid="somente-leitura-pre-curso">
            Somente leitura.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro && <FieldError data-testid="erro-pre-curso">{erro}</FieldError>}
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
                {bloco.enunciado && (
                  <p className="mb-2 text-sm text-muted-foreground">{bloco.enunciado}</p>
                )}
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
