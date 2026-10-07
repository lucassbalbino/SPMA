// Formulário de preenchimento/encerramento da avaliação (AVAL-07 a AVAL-19),
// colocado junto de `page.tsx` (T9). Mesmo padrão orientado a metadados de
// `PosCursoForm.tsx`/`PreCursoForm.tsx`: os blocos do questionário fonte
// (`docs/Questionario_do_Aluno_1.md`, Q1-Q21 = Parte 1, Q22-Q38 = Parte 2)
// viram tabelas `BLOCOS_PARTE_1`/`BLOCOS_PARTE_2` interpretadas genericamente
// por `CampoResposta`. Os rótulos carregam a numeração do papel.
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
// O estado, as duas ações e o render de campo vivem em
// `src/components/formulario/` - esta tela é a TABELA mais a ligação com ela,
// mais os dois gates que só ela tem.
"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FieldGroup } from "@/components/ui/field";
import { CampoResposta } from "@/components/formulario/CampoResposta";
import { CascaFormulario } from "@/components/formulario/CascaFormulario";
import { useFormularioRespostas } from "@/components/formulario/useFormularioRespostas";
import type {
  BlocoDef as BlocoGenerico,
  CampoDef as CampoGenerico,
  OpcaoEscala,
} from "@/components/formulario/tipos";
import {
  OPCOES_AMPLIACAO_CONHECIMENTO,
  OPCOES_ATIVIDADE_TURISMO,
  OPCOES_CONDICAO_TRABALHO,
  OPCOES_EXPECTATIVA_RENDA,
  OPCOES_FAIXA_RENDA,
  OPCOES_FORMA_CONHECIMENTO,
  OPCOES_MELHORIA_PADRAO_VIDA,
  OPCOES_MOTIVACOES_POS,
  OPCOES_MOTIVOS_PARTICIPACAO,
  OPCOES_MOTIVO_NAO_CONCLUSAO,
  OPCOES_PERCENTUAL_FREQUENCIA,
  OPCOES_RETOMADA_ESTUDOS,
  OPCOES_SIM_NAO,
  OPCOES_SIM_PARCIAL_NAO,
  OPCOES_SIM_TALVEZ_NAO,
  OPCOES_SITUACAO_TRABALHO,
  OPCOES_TIPO_CURSO_ANTERIOR,
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
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasAvaliacao;
type CampoDef = CampoGenerico<Chave, RespostasAvaliacaoParcial>;
type BlocoDef = BlocoGenerico<Chave, RespostasAvaliacaoParcial>;

// Q24 (AD-020): valor armazenado é crescente (1=Péssimo .. 5=Ótimo), mas a
// ordem apresentada segue a da tabela do papel, que começa em ÓTIMO.
const ESCALA_AVALIACAO_OPCOES: readonly OpcaoEscala[] = [
  { valor: "5", rotulo: "Ótimo" },
  { valor: "4", rotulo: "Bom" },
  { valor: "3", rotulo: "Regular" },
  { valor: "2", rotulo: "Ruim" },
  { valor: "1", rotulo: "Péssimo" },
];

// Enquanto Q22 não é "Sim", as chaves de "apenas para quem concluiu" ficam
// visíveis porém não editáveis.
const somenteConcluinte = new Set<string>(CHAVES_SOMENTE_CONCLUINTE);

// As 7 perguntas de dados pessoais (Q3-Q9) saíram deste formulário
// (PESSOAL-11): são atributo do Aluno, coletado uma vez fora do curso. Com
// isso os `data-testid` dos blocos, gerados por posição no array, deslocam um
// índice - "Situação Profissional" passa a ser `bloco-parte1-1`.
const BLOCOS_PARTE_1: BlocoDef[] = [
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
  const [parte1Completa, setParte1Completa] = useState(parte1CompletaInicial);

  const form = useFormularioRespostas<Chave, RespostasAvaliacaoParcial>({
    status,
    respostasIniciais,
    podeEditar,
    urlPatch: `/api/avaliacoes/${cpf}/${cdCurso}`,
    urlEncerrar: `/api/avaliacoes/${cpf}/${cdCurso}/encerrar`,
    // Resposta que deixou de se aplicar (condicional órfã, ou chave de
    // "apenas para quem concluiu" depois de o aluno marcar Q22="Não") não vai
    // no PATCH: o valor continua no estado local, caso ele volte atrás, e o
    // que já estava salvo no servidor segue preservado (edge case da spec)
    // até o encerramento.
    naoAplicaveis: (respostas) => [
      ...chavesOrfas(REGRAS_CONDICIONAIS_AVALIACAO, respostas),
      ...(naoConcluiuDeclarado(respostas) ? CHAVES_SOMENTE_CONCLUINTE : []),
    ],
    // AVAL-08: o servidor recalcula `parte1Completa` a cada gravação e o
    // gate da Parte 2 na tela segue esse valor, nunca um cálculo próprio.
    aoSalvar: (corpo) => {
      const avaliacao = corpo.avaliacao as { parte1Completa: boolean };
      setParte1Completa(avaliacao.parte1Completa);
    },
  });

  /**
   * Os dois gates empilhados desta tela, somados ao `desabilitado` comum:
   * `bloqueioDaParte` é a Parte 2 inteira travada até a Parte 1 fechar
   * (AVAL-10); o segundo termo é o gate "Concluiu o curso?" (AVAL-12/13),
   * campo a campo.
   */
  function campoDesabilitado(campo: CampoDef, bloqueioDaParte: boolean): boolean {
    const bloqueadoPeloGateDeConclusao =
      somenteConcluinte.has(campo.chave) &&
      form.respostas.avalParticipConcluiuCurso !== "Sim";

    return form.desabilitado || bloqueioDaParte || bloqueadoPeloGateDeConclusao;
  }

  function renderBlocos(blocos: BlocoDef[], prefixo: string, bloqueioDaParte: boolean) {
    return (
      <Accordion>
        {blocos.map((bloco, indice) => (
          <AccordionItem key={bloco.titulo} value={bloco.titulo}>
            <AccordionTrigger data-testid={`bloco-${prefixo}-${indice + 1}`}>
              {bloco.titulo}
            </AccordionTrigger>
            <AccordionContent>
              <FieldGroup>
                {bloco.campos
                  .filter((campo) => !campo.visivelSe || campo.visivelSe(form.respostas))
                  .map((campo) => (
                    <CampoResposta
                      key={campo.chave}
                      campo={campo}
                      valor={form.respostas[campo.chave]}
                      desabilitado={campoDesabilitado(campo, bloqueioDaParte)}
                      invalido={form.pendentes.includes(campo.chave)}
                      opcoesEscala={ESCALA_AVALIACAO_OPCOES}
                      aoAlterar={form.setCampo}
                      aoAlternarOpcao={form.toggleCheckbox}
                    />
                  ))}
              </FieldGroup>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <CascaFormulario
      testid="avaliacao"
      titulo={`Avaliação #${cdCurso} - CPF ${cpf}`}
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
      <h2 className="text-sm font-semibold">
        Parte 1 — Situação Profissional e Motivação
      </h2>
      {renderBlocos(BLOCOS_PARTE_1, "parte1", false)}

      <h2 className="text-sm font-semibold">Parte 2 — Avaliação Pós-Curso</h2>
      {!parte1Completa && (
        <p className="text-sm text-muted-foreground" data-testid="aviso-parte2-bloqueada">
          Complete a Parte 1 para responder esta seção.
        </p>
      )}
      {renderBlocos(BLOCOS_PARTE_2, "parte2", !parte1Completa)}
    </CascaFormulario>
  );
}
