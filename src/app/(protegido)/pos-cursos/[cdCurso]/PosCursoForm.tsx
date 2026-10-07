// Formulário de preenchimento/encerramento do pós-curso (REQ-PO-04 a
// REQ-PO-11), colocado junto de `page.tsx` (T9). Mesmo padrão orientado a
// metadados de `PreCursoForm.tsx`: os 5 blocos do questionário fonte
// (`docs/Questionario_do_Gestor_Pos_Curso.md`) viram uma tabela `BLOCOS`
// interpretada genericamente por `CampoResposta`, em vez de 26 blocos JSX
// escritos à mão. Os rótulos carregam a numeração do papel (1..26).
// Diferente do Pré-Curso, nenhum campo tem opção "Qual?" nem escala 0-5 -
// só o único condicional (`posExecAlteracaoDetalhe`, Q12) via `visivelSe` e
// duas perguntas com alternativa excludente (Q6 e Q26).
//
// O estado, as duas ações e o render de campo vivem em
// `src/components/formulario/` - esta tela é a TABELA mais a ligação com ela.
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FieldGroup } from "@/components/ui/field";
import { CampoResposta } from "@/components/formulario/CampoResposta";
import { CascaFormulario } from "@/components/formulario/CascaFormulario";
import { useFormularioRespostas } from "@/components/formulario/useFormularioRespostas";
import type { BlocoDef as BlocoGenerico } from "@/components/formulario/tipos";
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
import type { StatusFormulario } from "@/generated/prisma/enums";

type Chave = keyof RespostasPosCurso;
type BlocoDef = BlocoGenerico<Chave, RespostasPosCursoParcial>;

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
  const form = useFormularioRespostas<Chave, RespostasPosCursoParcial>({
    status,
    respostasIniciais,
    podeEditar,
    urlPatch: `/api/pos-cursos/${cdCurso}`,
    urlEncerrar: `/api/pos-cursos/${cdCurso}/encerrar`,
    // Q12 que ficou órfã (o Gestor detalhou a alteração e depois mudou Q11
    // para "Não") não vai no PATCH.
    naoAplicaveis: (respostas) => chavesOrfas(REGRAS_CONDICIONAIS_POS_CURSO, respostas),
  });

  return (
    <CascaFormulario
      testid="pos-curso"
      titulo={`Pós-curso #${cdCurso}`}
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
              <FieldGroup>
                {bloco.campos
                  .filter((campo) => !campo.visivelSe || campo.visivelSe(form.respostas))
                  .map((campo) => (
                    <CampoResposta
                      key={campo.chave}
                      campo={campo}
                      valor={form.respostas[campo.chave]}
                      desabilitado={form.desabilitado}
                      invalido={form.pendentes.includes(campo.chave)}
                      aoAlterar={form.setCampo}
                      aoAlternarOpcao={form.toggleCheckbox}
                    />
                  ))}
              </FieldGroup>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </CascaFormulario>
  );
}
