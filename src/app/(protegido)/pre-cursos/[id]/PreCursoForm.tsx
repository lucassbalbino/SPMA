// Formulário de preenchimento/encerramento do pré-curso (REQ-PC-04 a
// REQ-PC-12), colocado junto de `page.tsx` (T10). As 12 seções do
// questionário fonte (`docs/Questionario_do_Gestor_Pre_Curso.md`) viram uma
// tabela `BLOCOS` (metadados: bloco, chave, rótulo, tipo, opções,
// condicional, opção excludente) em vez de 56 blocos JSX escritos à mão -
// `CampoResposta` interpreta essa tabela genericamente, igual ao padrão de
// reuso de opções já usado em `pre-curso.schema.ts` (nunca duplicar a lista
// de campos em dois lugares). Os rótulos carregam a numeração do papel
// (1..32) para o Gestor conseguir conferir contra o questionário impresso.
//
// O estado, as duas ações e o render de campo vivem em
// `src/components/formulario/` - esta tela é a TABELA mais a ligação com ela.
// O que ela acrescenta ao render genérico é o campo "Qual?/Quais?" revelado
// pela regra condicional da própria chave, passado como filho de
// `CampoResposta`.
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CampoResposta } from "@/components/formulario/CampoResposta";
import { CascaFormulario } from "@/components/formulario/CascaFormulario";
import { useFormularioRespostas } from "@/components/formulario/useFormularioRespostas";
import type {
  BlocoDef as BlocoGenerico,
  CampoDef as CampoGenerico,
  OpcaoEscala,
} from "@/components/formulario/tipos";
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
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasPreCurso;

/**
 * O pré-curso estende o campo genérico com o par "Qual?/Quais?": um texto
 * livre revelado pela regra condicional da própria chave
 * (`src/lib/pre-curso/condicionais.ts`) - a mesma que decide, no
 * encerramento, se ele é exigido e se um valor gravado ali é órfão.
 */
interface CampoDef extends CampoGenerico<Chave, RespostasPreCursoParcial> {
  outroChave?: ChaveCondicionalPreCurso;
  outroRotulo?: string;
}

type BlocoDef = Omit<BlocoGenerico<Chave, RespostasPreCursoParcial>, "campos"> & {
  campos: CampoDef[];
};

// AD-019: escala crescente 0 (Não há disponibilidade) a 5 (Ótimo), Q23/Q24.
const ESCALA_OPCOES: readonly OpcaoEscala[] = [
  { valor: "0", rotulo: "0 - Não há disponibilidade" },
  { valor: "1", rotulo: "1 - Péssimo" },
  { valor: "2", rotulo: "2 - Ruim" },
  { valor: "3", rotulo: "3 - Regular" },
  { valor: "4", rotulo: "4 - Bom" },
  { valor: "5", rotulo: "5 - Ótimo" },
];

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
  const form = useFormularioRespostas<Chave, RespostasPreCursoParcial>({
    status,
    respostasIniciais,
    podeEditar,
    urlPatch: `/api/pre-cursos/${cdCurso}`,
    urlEncerrar: `/api/pre-cursos/${cdCurso}/encerrar`,
    // Uma condicional que ficou órfã (o Gestor respondeu, mudou a
    // pergunta-mãe e o campo sumiu da tela) não vai no PATCH.
    naoAplicaveis: (respostas) => chavesOrfas(REGRAS_CONDICIONAIS_PRE_CURSO, respostas),
  });

  return (
    <CascaFormulario
      testid="pre-curso"
      titulo={`Pré-curso #${cdCurso}`}
      status={form.statusAtual}
      somenteLeitura={form.somenteLeitura}
      erro={form.erro}
      pendentes={form.pendentes}
      rotuloDaChave={(chave) => ROTULOS[chave as Chave] ?? chave}
      salvando={form.salvando}
      encerrando={form.encerrando}
      aoSalvar={form.salvarRascunho}
      aoEncerrar={form.encerrar}
    >
      <Accordion>
        {BLOCOS.map((bloco, indice) => (
          <AccordionItem key={bloco.titulo} value={bloco.titulo}>
            <AccordionTrigger data-testid={`bloco-${indice + 1}`}>{bloco.titulo}</AccordionTrigger>
            <AccordionContent>
              {bloco.enunciado && (
                <p className="mb-2 text-sm text-muted-foreground">{bloco.enunciado}</p>
              )}
              <FieldGroup>
                {bloco.campos
                  .filter((campo) => !campo.visivelSe || campo.visivelSe(form.respostas))
                  .map((campo) => {
                    const campoOutro = acionaOutro(campo, form.respostas)
                      ? campo.outroChave!
                      : null;

                    return (
                      <CampoResposta
                        key={campo.chave}
                        campo={campo}
                        valor={form.respostas[campo.chave]}
                        desabilitado={form.desabilitado}
                        invalido={form.pendentes.includes(campo.chave)}
                        opcoesEscala={ESCALA_OPCOES}
                        aoAlterar={form.setCampo}
                        aoAlternarOpcao={form.toggleCheckbox}
                      >
                        {campoOutro && (
                          <Field data-invalid={form.pendentes.includes(campoOutro)}>
                            <FieldLabel htmlFor={campoOutro}>{ROTULOS[campoOutro]}</FieldLabel>
                            <Input
                              id={campoOutro}
                              data-testid={`campo-${campoOutro}`}
                              value={(form.respostas[campoOutro] as string | undefined) ?? ""}
                              onChange={(event) => form.setCampo(campoOutro, event.target.value)}
                              disabled={form.desabilitado}
                            />
                          </Field>
                        )}
                      </CampoResposta>
                    );
                  })}
              </FieldGroup>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </CascaFormulario>
  );
}
