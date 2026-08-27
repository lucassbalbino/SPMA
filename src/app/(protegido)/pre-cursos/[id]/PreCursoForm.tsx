// Formulário de preenchimento/encerramento do pré-curso (REQ-PC-04 a
// REQ-PC-12), colocado junto de `page.tsx` (T10). Os 12 blocos do
// Dicionário de Campos (spec.md) viram uma tabela `BLOCOS` (metadados:
// bloco, chave, rótulo, tipo, opções, condicional) em vez de 56 blocos
// JSX escritos à mão - `renderCampo` interpreta essa tabela genericamente,
// igual ao padrão de reuso de opções já usado em `pre-curso.schema.ts`
// (nunca duplicar a lista de campos em dois lugares).
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
  OPCOES_CARACTERISTICAS,
  OPCOES_DIAGNOSTICO_CONSULTAS,
  OPCOES_DIVULGACAO_ESTRATEGIAS,
  OPCOES_DOCENTE_CRITERIOS,
  OPCOES_DOCENTE_FORMA_CONTRATACAO,
  OPCOES_DOCENTE_NIVEL_FORMACAO,
  OPCOES_DOCENTE_POLITICAS_REPARACAO,
  OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE,
  OPCOES_INFRA_ESPECIFICA_MANUTENCAO,
  OPCOES_INFRA_ESPECIFICA_NECESSIDADE,
  OPCOES_INFRA_ESPECIFICA_SUFICIENCIA,
  OPCOES_INSTITUICAO_EXECUTORA,
  OPCOES_MODALIDADE,
  OPCOES_PARCERIAS,
  OPCOES_PUBLICO_PERFIL,
  OPCOES_REGIAO,
  OPCOES_SUPORTE_ESTRATEGIAS,
  OPCOES_UF,
  OPCOES_VINCULO_PROGRAMA,
  type RespostasPreCurso,
  type RespostasPreCursoParcial,
} from "@/lib/validation/schemas/pre-curso.schema";
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
  outroChave?: Chave;
  visivelSe?: (respostas: RespostasPreCursoParcial) => boolean;
}

interface BlocoDef {
  titulo: string;
  enunciado?: string;
  campos: CampoDef[];
}

// AD-019: escala crescente 0 (Não há disponibilidade) a 5 (Ótimo), Blocos 6/7.
const ESCALA_OPCOES = [
  { valor: "0", rotulo: "0 - Não há disponibilidade" },
  { valor: "1", rotulo: "1 - Péssimo" },
  { valor: "2", rotulo: "2 - Ruim" },
  { valor: "3", rotulo: "3 - Regular" },
  { valor: "4", rotulo: "4 - Bom" },
  { valor: "5", rotulo: "5 - Ótimo" },
] as const;

const ENUNCIADO_INFRAESTRUTURA =
  "Avalie a disponibilidade e o estado de conservação dos seguintes itens:";

const BLOCOS: BlocoDef[] = [
  {
    titulo: "Bloco 1 - Identificação",
    campos: [
      { chave: "identifUf", rotulo: "UF", tipo: "select", opcoes: OPCOES_UF },
      { chave: "identifMunicipio", rotulo: "Município", tipo: "texto" },
      { chave: "identifEntidadeResponsavel", rotulo: "Entidade responsável", tipo: "texto" },
      { chave: "identifCoordenador", rotulo: "Coordenador do curso", tipo: "texto" },
      { chave: "identifEmail", rotulo: "E-mail de contato", tipo: "email" },
      { chave: "identifTelefone", rotulo: "Telefone de contato", tipo: "texto" },
    ],
  },
  {
    titulo: "Bloco 2 - Dados da Qualificação",
    campos: [
      { chave: "qualifEndereco", rotulo: "Endereço do local do curso", tipo: "texto" },
      { chave: "qualifNomeCurso", rotulo: "Nome do curso", tipo: "texto" },
      {
        chave: "qualifVinculoPrograma",
        rotulo: "Vínculo a plano/programa de qualificação",
        tipo: "select",
        opcoes: OPCOES_VINCULO_PROGRAMA,
        outroChave: "qualifVinculoProgramaOutro",
      },
      {
        chave: "qualifCaracteristicas",
        rotulo: "Características do curso contempladas",
        tipo: "checkboxes",
        opcoes: OPCOES_CARACTERISTICAS,
        outroChave: "qualifCaracteristicasOutra",
      },
      { chave: "qualifModalidade", rotulo: "Modalidade", tipo: "select", opcoes: OPCOES_MODALIDADE },
      { chave: "qualifRegiao", rotulo: "Região", tipo: "select", opcoes: OPCOES_REGIAO },
    ],
  },
  {
    titulo: "Bloco 3 - Planejamento",
    campos: [
      { chave: "planejDataInicioPrevista", rotulo: "Data prevista de início", tipo: "data" },
      { chave: "planejDataTerminoPrevista", rotulo: "Data prevista de término", tipo: "data" },
      { chave: "planejCargaHoraria", rotulo: "Carga horária prevista (horas)", tipo: "numero" },
      { chave: "planejNumTurmas", rotulo: "Número de turmas previstas", tipo: "numero" },
      { chave: "planejNumAlunosPrevistos", rotulo: "Número de alunos previstos", tipo: "numero" },
      { chave: "planejTaxaEvasaoEsperada", rotulo: "Taxa de evasão esperada (%)", tipo: "numero" },
      { chave: "planejObjetivo", rotulo: "Objetivo do curso", tipo: "textarea" },
    ],
  },
  {
    titulo: "Bloco 4 - Público-Alvo",
    campos: [
      {
        chave: "publicoPerfil",
        rotulo: "Perfil do público-alvo",
        tipo: "checkboxes",
        opcoes: OPCOES_PUBLICO_PERFIL,
      },
      {
        chave: "publicoInstituicaoExecutora",
        rotulo: "Instituição executora",
        tipo: "select",
        opcoes: OPCOES_INSTITUICAO_EXECUTORA,
      },
      {
        chave: "publicoInstituicaoExecutoraNome",
        rotulo: "Nome da instituição contratada/parceira",
        tipo: "texto",
        visivelSe: (respostas) =>
          respostas.publicoInstituicaoExecutora === "Empresa contratada" ||
          respostas.publicoInstituicaoExecutora ===
            "Parceria entre Entidade Responsável e Entidade Executora",
      },
    ],
  },
  {
    titulo: "Bloco 5 - Diagnóstico Pré-Curso",
    campos: [
      {
        chave: "diagnosticoConsultas",
        rotulo: "Consultas realizadas com atores territoriais",
        tipo: "checkboxes",
        opcoes: OPCOES_DIAGNOSTICO_CONSULTAS,
      },
    ],
  },
  {
    titulo: "Bloco 6 - Infraestrutura Básica",
    enunciado: ENUNCIADO_INFRAESTRUTURA,
    campos: [
      { chave: "infraBasicaBanheiros", rotulo: "Banheiros", tipo: "escala" },
      { chave: "infraBasicaEnergia", rotulo: "Fornecimento de energia elétrica", tipo: "escala" },
      { chave: "infraBasicaSalaAula", rotulo: "Sala de aula", tipo: "escala" },
      { chave: "infraBasicaBiblioteca", rotulo: "Biblioteca / espaço de leitura", tipo: "escala" },
      {
        chave: "infraBasicaAcessibilidade",
        rotulo: "Acessibilidade (rampas, sinalização, banheiro adaptado)",
        tipo: "escala",
      },
      { chave: "infraBasicaLaboratorio", rotulo: "Laboratório de informática", tipo: "escala" },
      { chave: "infraBasicaAguaPotavel", rotulo: "Água potável", tipo: "escala" },
      { chave: "infraBasicaIluminacao", rotulo: "Iluminação dos ambientes", tipo: "escala" },
      {
        chave: "infraBasicaConectividade",
        rotulo: "Conectividade / acesso à internet",
        tipo: "escala",
      },
    ],
  },
  {
    titulo: "Bloco 7 - Infraestrutura Complementar",
    enunciado: ENUNCIADO_INFRAESTRUTURA,
    campos: [
      { chave: "infraComplSalaProfessores", rotulo: "Sala de professores", tipo: "escala" },
      { chave: "infraComplCopa", rotulo: "Copa / cozinha", tipo: "escala" },
      { chave: "infraComplAuditorio", rotulo: "Auditório / espaço para eventos", tipo: "escala" },
      {
        chave: "infraComplAudiovisual",
        rotulo: "Equipamentos audiovisuais (projetor, som)",
        tipo: "escala",
      },
      {
        chave: "infraComplTecnologicos",
        rotulo: "Equipamentos tecnológicos (computadores, tablets)",
        tipo: "escala",
      },
      { chave: "infraComplConvivencia", rotulo: "Área de convivência / lazer", tipo: "escala" },
      { chave: "infraComplEstacionamento", rotulo: "Estacionamento", tipo: "escala" },
      {
        chave: "infraComplAlimentacao",
        rotulo: "Espaço para alimentação (refeitório/cantina)",
        tipo: "escala",
      },
    ],
  },
  {
    titulo: "Bloco 8 - Infraestrutura Específica",
    campos: [
      {
        chave: "infraEspecificaNecessidade",
        rotulo: "Necessidade de equipamentos específicos ao curso",
        tipo: "radio",
        opcoes: OPCOES_INFRA_ESPECIFICA_NECESSIDADE,
      },
      {
        chave: "infraEspecificaDisponibilidade",
        rotulo: "Disponibilidade dos equipamentos específicos",
        tipo: "select",
        opcoes: OPCOES_INFRA_ESPECIFICA_DISPONIBILIDADE,
        visivelSe: (respostas) => respostas.infraEspecificaNecessidade === "Sim",
      },
      {
        chave: "infraEspecificaSuficiencia",
        rotulo: "Suficiência dos equipamentos específicos",
        tipo: "select",
        opcoes: OPCOES_INFRA_ESPECIFICA_SUFICIENCIA,
        visivelSe: (respostas) => respostas.infraEspecificaNecessidade === "Sim",
      },
      {
        chave: "infraEspecificaManutencao",
        rotulo: "Situação de manutenção dos equipamentos específicos",
        tipo: "select",
        opcoes: OPCOES_INFRA_ESPECIFICA_MANUTENCAO,
        visivelSe: (respostas) => respostas.infraEspecificaNecessidade === "Sim",
      },
    ],
  },
  {
    titulo: "Bloco 9 - Corpo Docente",
    campos: [
      {
        chave: "docenteCriteriosSelecao",
        rotulo: "Critérios de seleção de professores",
        tipo: "checkboxes",
        opcoes: OPCOES_DOCENTE_CRITERIOS,
      },
      {
        chave: "docenteFormaContratacao",
        rotulo: "Forma de contratação de professores",
        tipo: "select",
        opcoes: OPCOES_DOCENTE_FORMA_CONTRATACAO,
        outroChave: "docenteFormaContratacaoOutra",
      },
      {
        chave: "docenteNivelFormacao",
        rotulo: "Nível de formação dos professores",
        tipo: "radio",
        opcoes: OPCOES_DOCENTE_NIVEL_FORMACAO,
      },
      {
        chave: "docentePoliticasReparacao",
        rotulo: "Políticas de reparação/inclusão docente",
        tipo: "checkboxes",
        opcoes: OPCOES_DOCENTE_POLITICAS_REPARACAO,
      },
    ],
  },
  {
    titulo: "Bloco 10 - Divulgação",
    campos: [
      {
        chave: "divulgacaoEstrategias",
        rotulo: "Estratégias de divulgação",
        tipo: "checkboxes",
        opcoes: OPCOES_DIVULGACAO_ESTRATEGIAS,
        outroChave: "divulgacaoEstrategiasOutra",
      },
    ],
  },
  {
    titulo: "Bloco 11 - Parcerias",
    campos: [
      {
        chave: "parceriasEstabelecidas",
        rotulo: "Parcerias locais estabelecidas",
        tipo: "checkboxes",
        opcoes: OPCOES_PARCERIAS,
      },
    ],
  },
  {
    titulo: "Bloco 12 - Suporte ao Aluno",
    campos: [
      {
        chave: "suporteEstrategias",
        rotulo: "Estratégias de apoio logístico, financeiro e político",
        tipo: "checkboxes",
        opcoes: OPCOES_SUPORTE_ESTRATEGIAS,
        outroChave: "suporteEstrategiasOutra",
      },
    ],
  },
];

const ROTULOS: Partial<Record<Chave, string>> = Object.fromEntries(
  BLOCOS.flatMap((bloco) => bloco.campos).flatMap((campo) => {
    const entradas: [Chave, string][] = [[campo.chave, campo.rotulo]];
    if (campo.outroChave) {
      entradas.push([campo.outroChave, `${campo.rotulo} - especificação "Outro/Outra"`]);
    }
    return entradas;
  }),
);

function acionaOutro(valor: unknown): boolean {
  if (typeof valor === "string") {
    return valor === "Outro" || valor === "Outra";
  }
  if (Array.isArray(valor)) {
    return valor.includes("Outro") || valor.includes("Outra");
  }
  return false;
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

    const campoOutro = campo.outroChave && acionaOutro(valor) ? campo.outroChave : null;

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
