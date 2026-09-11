// Testes do classificador de forma (RESP-02, RESP-14).
//
// A asserção central é NOMINAL: as 13 chaves de múltipla escolha dos três
// questionários estão listadas uma a uma. Um classificador que desembrulhe
// `ZodArray` (que em Zod 4.4.3 expõe `unwrap()` devolvendo o ELEMENTO)
// devolveria "texto" para elas e truncaria a seleção múltipla para um
// valor só, sem erro visível. Só uma lista nominal pega isso.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { respostasAvaliacaoSchema } from "../validation/schemas/avaliacao.schema";
import { respostasPosCursoSchema } from "../validation/schemas/pos-curso.schema";
import { respostasPreCursoSchema } from "../validation/schemas/pre-curso.schema";
import { classificarChave, desserializar, serializar } from "./forma";

const LISTAS_PRE_CURSO = [
  "qualifCaracteristicas",
  "publicoPerfil",
  "diagnosticoConsultas",
  "docenteCriteriosSelecao",
  "divulgacaoEstrategias",
  "parceriasEstabelecidas",
  "suporteEstrategias",
];

const LISTAS_POS_CURSO = [
  "posAcompanhMonitoramento",
  "posParticMotivosAbandono",
  "posContEstrategias",
];

const LISTAS_AVALIACAO = [
  "avalMotivMotivosParticipacao",
  "avalParticipMotivoNaoConclusao",
  "avalMotivacoesPosPercepcoes",
];

const NUMERICAS_PRE_CURSO = [
  "planejCargaHoraria",
  "planejNumTurmas",
  "planejNumAlunosPrevistos",
  "planejTaxaEvasaoEsperada",
  "infraBasicaBanheiros",
  "infraBasicaBebedouros",
  "infraBasicaEnergia",
  "infraBasicaSalaAula",
  "infraBasicaRecepcao",
  "infraBasicaBiblioteca",
  "infraBasicaMobiliario",
  "infraBasicaAcessibilidade",
  "infraBasicaLaboratorio",
  "infraComplSalaProfessores",
  "infraComplSalaGestores",
  "infraComplSalaEstudo",
  "infraComplCopa",
  "infraComplLanchonete",
  "infraComplAuditorio",
  "infraComplAudiovisual",
  "infraComplTecnologicos",
];

const NUMERICAS_POS_CURSO = [
  "posExecCargaHorariaRealizada",
  "posParticNumInscritos",
  "posParticNumMatriculados",
  "posParticNumConcluintes",
  "posFinValorTotal",
  "posFinValorProfessores",
  "posFinValorMateriais",
  "posFinValorInfraestrutura",
  "posFinValorBolsaPermanencia",
];

const NUMERICAS_AVALIACAO = [
  "avalCursoDinamicasInclusao",
  "avalCursoMaterialDidatico",
  "avalCursoConteudo",
  "avalCursoClareza",
  "avalCursoConhecimentoInstrutores",
  "avalCursoOrganizacao",
  "avalCursoInfraestruturaBasica",
  "avalCursoInfraestruturaSalaAula",
  "avalGeralNota",
];

const QUESTIONARIOS = [
  {
    nome: "pré-curso",
    schema: respostasPreCursoSchema,
    listas: LISTAS_PRE_CURSO,
    numericas: NUMERICAS_PRE_CURSO,
    totalChaves: 56,
  },
  {
    nome: "pós-curso",
    schema: respostasPosCursoSchema,
    listas: LISTAS_POS_CURSO,
    numericas: NUMERICAS_POS_CURSO,
    totalChaves: 26,
  },
  {
    nome: "avaliação",
    schema: respostasAvaliacaoSchema,
    listas: LISTAS_AVALIACAO,
    numericas: NUMERICAS_AVALIACAO,
    // 38 = as 45 originais menos as 7 de dados pessoais, que saíram do
    // questionário do curso para `dados-pessoais.schema.ts` (PESSOAL-11).
    totalChaves: 38,
  },
] as const;

describe("classificarChave", () => {
  for (const questionario of QUESTIONARIOS) {
    describe(questionario.nome, () => {
      const chaves = Object.keys(questionario.schema.shape);

      it(`tem as ${questionario.totalChaves} chaves esperadas`, () => {
        expect(chaves).toHaveLength(questionario.totalChaves);
      });

      for (const chave of questionario.listas) {
        it(`classifica ${chave} como lista`, () => {
          expect(classificarChave(questionario.schema, chave)).toBe("lista");
        });
      }

      for (const chave of questionario.numericas) {
        it(`classifica ${chave} como numero`, () => {
          expect(classificarChave(questionario.schema, chave)).toBe("numero");
        });
      }

      it("classifica como texto todas as chaves que não são lista nem número", () => {
        const restantes = chaves.filter(
          (chave) =>
            !questionario.listas.includes(chave) && !questionario.numericas.includes(chave),
        );

        for (const chave of restantes) {
          expect(classificarChave(questionario.schema, chave), chave).toBe("texto");
        }
      });

      it("não classifica nenhuma outra chave como lista", () => {
        const listasEncontradas = chaves.filter(
          (chave) => classificarChave(questionario.schema, chave) === "lista",
        );

        expect(listasEncontradas.sort()).toEqual([...questionario.listas].sort());
      });

      it("não classifica nenhuma outra chave como numero", () => {
        const numericasEncontradas = chaves.filter(
          (chave) => classificarChave(questionario.schema, chave) === "numero",
        );

        expect(numericasEncontradas.sort()).toEqual([...questionario.numericas].sort());
      });
    });
  }

  it("classifica 13 listas e 39 numéricas nas 120 chaves dos três questionários", () => {
    const formas = QUESTIONARIOS.flatMap((questionario) =>
      Object.keys(questionario.schema.shape).map((chave) =>
        classificarChave(questionario.schema, chave),
      ),
    );

    expect(formas).toHaveLength(120);
    expect(formas.filter((forma) => forma === "lista")).toHaveLength(13);
    expect(formas.filter((forma) => forma === "numero")).toHaveLength(39);
    // 68 = 75 menos as 7 chaves de dados pessoais, todas escalares.
    expect(formas.filter((forma) => forma === "texto")).toHaveLength(68);
  });

  it("lista opcional continua sendo lista (ZodArray.unwrap devolve o elemento)", () => {
    const schema = z.object({ multipla: z.array(z.enum(["a", "b"])).min(1).optional() });

    expect(classificarChave(schema, "multipla")).toBe("lista");
  });

  it("número opcional continua sendo numero", () => {
    const schema = z.object({ nota: z.number().int().optional() });

    expect(classificarChave(schema, "nota")).toBe("numero");
  });

  // RESP-14: chave migrada de um questionário antigo não existe mais no
  // schema, então não há forma declarada em lugar nenhum - ela é `"orfa"`, e
  // quem remonta decide pela quantidade de linhas.
  //
  // Esta asserção dizia `"texto"` até o Verifier mostrar o que isso custava:
  // órfã de seleção múltipla voltava truncada no primeiro item. Não é um
  // teste afrouxado, é o contrato corrigido - a cobertura AUMENTA logo abaixo,
  // em `desserializar`.
  it("classifica chave ausente do schema como órfã", () => {
    expect(classificarChave(respostasPreCursoSchema, "chaveDeQuestionarioAntigo")).toBe(
      "orfa",
    );
  });
});

describe("serializar / desserializar", () => {
  // RESP-02: K opções selecionadas viram K itens, na ordem da seleção.
  it("explode a lista em um item por opção, preservando a ordem", () => {
    expect(serializar(["Jovens", "Idosos", "Mulheres"])).toEqual([
      "Jovens",
      "Idosos",
      "Mulheres",
    ]);
  });

  it("transforma valor escalar em um único item", () => {
    expect(serializar("Sim")).toEqual(["Sim"]);
    expect(serializar(40)).toEqual(["40"]);
  });

  it("faz round-trip de valor de texto", () => {
    const valor = "Zona Rural";

    expect(desserializar(serializar(valor), "texto")).toBe(valor);
  });

  it("faz round-trip de valor numérico", () => {
    const valor = 40;

    expect(desserializar(serializar(valor), "numero")).toBe(valor);
  });

  it("faz round-trip de valor numérico decimal", () => {
    const valor = 12.5;

    expect(desserializar(serializar(valor), "numero")).toBe(valor);
  });

  it("faz round-trip de lista", () => {
    const valor = ["Jovens", "Idosos", "Mulheres"];

    expect(desserializar(serializar(valor), "lista")).toEqual(valor);
  });

  it("faz round-trip de lista de um item só", () => {
    const valor = ["Jovens"];

    expect(desserializar(serializar(valor), "lista")).toEqual(valor);
  });

  // RESP-14: chave órfã não tem schema que diga a forma, então a quantidade
  // de linhas decide. Mais de uma linha só pode ter vindo de uma lista.
  //
  // O caso é real, não hipotético: `posContEstrategiasContinuidade` e
  // `posContEstrategiasAmpliacao` eram `z.array(...).min(1)` e saíram do
  // schema na troca dos questionários (AD-035/036). Antes desta correção, uma
  // órfã dessas voltava como "Parcerias" - as outras opções sumiam na leitura.
  it("remonta órfã de várias linhas como lista, sem truncar", () => {
    expect(desserializar(["Parcerias", "Editais", "Turmas novas"], "orfa")).toEqual([
      "Parcerias",
      "Editais",
      "Turmas novas",
    ]);
  });

  it("remonta órfã de uma linha só como escalar", () => {
    expect(desserializar(["Sim"], "orfa")).toBe("Sim");
  });

  // LIMITE ACEITO e documentado: lista órfã de um item só é indistinguível de
  // escalar - as duas gravam exatamente uma linha com `Ordem` 0. Nenhum valor
  // se perde, que é o que a RESP-14 exige; só o invólucro.
  it("não distingue lista órfã de um item só de um escalar", () => {
    expect(desserializar(serializar(["Jovens"]), "orfa")).toBe("Jovens");
  });
});
