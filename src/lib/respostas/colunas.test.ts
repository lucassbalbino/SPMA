// Mapa de colunas (COL-03 a COL-08, COL-14, COL-32). As expectativas vêm do
// documento de formato aprovado pelo cliente e de `design.md`, não do código.
import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { respostasAvaliacaoSchema } from "../validation/schemas/avaliacao.schema";
import { respostasDadosPessoaisSchema } from "../validation/schemas/dados-pessoais.schema";
import { respostasPosCursoSchema } from "../validation/schemas/pos-curso.schema";
import {
  EXCLUSIVA_DIAGNOSTICO,
  respostasPreCursoSchema,
} from "../validation/schemas/pre-curso.schema";
import {
  MAPA,
  camposDeResposta,
  campoPrisma,
  colunasDaEntrada,
  deColunas,
  paraColunas,
  type Formulario,
} from "./colunas";

const SCHEMAS = {
  preCurso: respostasPreCursoSchema,
  posCurso: respostasPosCursoSchema,
  avaliacao: respostasAvaliacaoSchema,
  dadosPessoais: respostasDadosPessoaisSchema,
} as const;

const colunas = (formulario: Formulario) => MAPA[formulario].flatMap(colunasDaEntrada);

describe("cobertura do mapa (COL-03)", () => {
  it.each([
    ["preCurso", 63, 122],
    ["posCurso", 26, 45],
    ["avaliacao", 27, 46],
    ["dadosPessoais", 7, 7],
  ] as const)("%s mapeia todas as chaves do schema em colunas únicas", (formulario, chaves, total) => {
    expect(MAPA[formulario].map((e) => e.chave)).toEqual(Object.keys(SCHEMAS[formulario].shape));
    expect(MAPA[formulario]).toHaveLength(chaves);
    expect(colunas(formulario)).toHaveLength(total);
    expect(new Set(colunas(formulario)).size).toBe(total);
  });

  it("segue a numeração do papel: letra sem ponto, ponto só em subnúmero", () => {
    expect(colunas("preCurso")).toEqual(
      expect.arrayContaining([
        "P7a", "P7e", "P9Qual", "P10a", "P10l", "P10Qual", "P20k", "P21.1",
        "P23.1", "P23.9", "P24.8", "P25.1", "P25.3", "P27Qual", "P30Qual", "P32j", "P32Qual",
      ]),
    );
    expect(colunas("avaliacao")).toEqual(
      expect.arrayContaining(["P14", "P22.1a", "P22.1j", "P24.1", "P24.8", "P29f", "P35", "P38"]),
    );
    expect(colunas("dadosPessoais")).toEqual(["P3", "P4", "P5", "P6", "P7", "P8", "P9"]);
    for (const formulario of Object.keys(MAPA) as Formulario[]) {
      for (const coluna of colunas(formulario)) {
        expect(coluna).toMatch(/^P\d+(\.\d+)?([a-z]|Qual)?$/);
      }
    }
  });

  it("nenhuma coluna de opção de múltipla colide com uma pergunta numerada com letra", () => {
    for (const formulario of Object.keys(MAPA) as Formulario[]) {
      const escalares = MAPA[formulario]
        .filter((e) => e.tipo !== "multipla")
        .flatMap(colunasDaEntrada);
      const opcoes = MAPA[formulario]
        .filter((e) => e.tipo === "multipla")
        .flatMap(colunasDaEntrada);
      expect(opcoes.filter((coluna) => escalares.includes(coluna))).toEqual([]);
    }
  });

  it("campoPrisma troca P por p e ponto por sublinhado", () => {
    expect(campoPrisma("P11")).toBe("p11");
    expect(campoPrisma("P7a")).toBe("p7a");
    expect(campoPrisma("P25.1")).toBe("p25_1");
    expect(campoPrisma("P22.1b")).toBe("p22_1b");
    expect(campoPrisma("P10Qual")).toBe("p10Qual");
    expect(camposDeResposta("dadosPessoais")).toEqual(["p3", "p4", "p5", "p6", "p7", "p8", "p9"]);
  });
});

describe("gravação (paraColunas)", () => {
  it("escolha única grava a letra do papel, nunca o texto (COL-04)", () => {
    expect(paraColunas("preCurso", { qualifModalidade: "À distância (online)" })).toEqual({ p11: "b" });
    expect(paraColunas("preCurso", { qualifRegiao: "Zona Natural" })).toEqual({ p12: "d" });
    expect(paraColunas("posCurso", { posAcompanhLicaoIndividual: "Não se aplica." })).toEqual({ p5: "c" });
    expect(paraColunas("dadosPessoais", { avalPessoalEscolaridade: "Pós-graduação completa" })).toEqual({ p7: "j" });
  });

  it("UF/Estado grava a sigla (COL-04)", () => {
    expect(paraColunas("preCurso", { identifUf: "BA", qualifUf: "PE" })).toEqual({ p1: "BA", p7c: "PE" });
    expect(paraColunas("dadosPessoais", { avalPessoalEstado: "SP" })).toEqual({ p3: "SP" });
  });

  it("múltipla grava 1 nas marcadas e 0 nas demais (COL-05)", () => {
    const campos = paraColunas("preCurso", { publicoPerfil: ["Mulheres", "Jovens"] });

    expect(campos).toEqual({
      p20a: true, p20b: true, p20c: false, p20d: false, p20e: false, p20f: false,
      p20g: false, p20h: false, p20i: false, p20j: false, p20k: false,
    });
  });

  it("opção exclusiva é uma coluna 1/0 como as outras (COL-32)", () => {
    const campos = paraColunas("preCurso", { diagnosticoConsultas: [EXCLUSIVA_DIAGNOSTICO] });

    expect(campos.p22h).toBe(true);
    expect(["a", "b", "c", "d", "e", "f", "g"].map((l) => campos[`p22${l}`])).toEqual(Array(7).fill(false));
  });

  it("discursiva e \"Qual?\" gravam o texto (COL-06)", () => {
    expect(
      paraColunas("preCurso", {
        planejObjetivo: "Capacitar jovens para o receptivo",
        qualifCaracteristicasOutra: "Gastronomia regional",
        qualifOutrosMunicipiosQuais: "Cachoeira",
        publicoInstituicaoExecutoraNome: "Instituto X",
      }),
    ).toEqual({
      p19: "Capacitar jovens para o receptivo",
      p10Qual: "Gastronomia regional",
      p7e: "Cachoeira",
      p21_1: "Instituto X",
    });
  });

  it("número, valor, nota e data gravam no tipo da coluna (COL-07)", () => {
    const campos = paraColunas("preCurso", {
      planejCargaHoraria: 40,
      planejTaxaEvasaoEsperada: 12.5,
      infraBasicaRecepcao: 4,
      planejDataInicioPrevista: "2026-11-03",
    });

    expect(campos).toEqual({
      p15: 40,
      p18: 12.5,
      p23_5: 4,
      p13: new Date("2026-11-03T00:00:00.000Z"),
    });
    expect(paraColunas("avaliacao", { avalGeralNota: 9, avalCursoInfraestruturaSalaAula: 2 })).toEqual({
      p35: 9,
      p24_8: 2,
    });
    expect(paraColunas("posCurso", { posFinValorTotal: 15000 })).toEqual({ p19: 15000 });
  });

  it("null limpa todas as colunas da pergunta (COL-14)", () => {
    expect(paraColunas("preCurso", { qualifModalidade: null })).toEqual({ p11: null });
    expect(paraColunas("posCurso", { posAcompanhMonitoramento: null })).toEqual({
      p6a: null, p6b: null, p6c: null, p6d: null, p6e: null, p6f: null,
    });
  });

  it("recusa chave ou opção que o mapa não conhece", () => {
    expect(() => paraColunas("preCurso", { chaveInexistente: "x" })).toThrow(/chaveInexistente/);
    expect(() => paraColunas("preCurso", { qualifModalidade: "Teleporte" })).toThrow(/Teleporte/);
    expect(() => paraColunas("preCurso", { publicoPerfil: ["Marcianos"] })).toThrow(/Marcianos/);
  });
});

describe("leitura (deColunas)", () => {
  it("devolve o texto da opção a partir da letra (COL-11)", () => {
    expect(deColunas("preCurso", { p11: "b", p12: "c" })).toEqual({
      qualifModalidade: "À distância (online)",
      qualifRegiao: "Zona Rural",
    });
  });

  it("pergunta com todas as colunas NULL não aparece (COL-08)", () => {
    expect(deColunas("preCurso", { p11: null, p20a: null, p20b: null })).toEqual({});
    expect(deColunas("dadosPessoais", {})).toEqual({});
  });

  it("múltipla volta na ordem do questionário, com 0 tratado como não marcada", () => {
    const registro = paraColunas("preCurso", { publicoPerfil: ["Mulheres", "Jovens"] });

    expect(deColunas("preCurso", registro)).toEqual({ publicoPerfil: ["Jovens", "Mulheres"] });
  });

  it("converte decimal do Prisma e data para a forma da API", () => {
    expect(
      deColunas("preCurso", {
        p18: new Prisma.Decimal("12.5"),
        p13: new Date("2026-11-03T00:00:00.000Z"),
      }),
    ).toEqual({ planejTaxaEvasaoEsperada: 12.5, planejDataInicioPrevista: "2026-11-03" });
  });

  it("letra fora da lista volta crua em vez de sumir", () => {
    expect(deColunas("preCurso", { p11: "z" })).toEqual({ qualifModalidade: "z" });
  });

  it("ida e volta preservam um formulário completo", () => {
    const respostas = {
      posAcompanhProblemasEstudo: "Não se aplica.",
      posAcompanhMonitoramento: ["Reuniões periódicas com alunos.", "Reuniões de acompanhamento com parceiros."],
      posExecDataInicioReal: "2026-03-02",
      posExecCargaHorariaRealizada: 42,
      posExecDificuldadesEnfrentadas: "Chuva",
      posParticMotivosAbandono: ["Outro"],
      posFinValorTotal: 15000.5,
      posFinNecessidadeAditivo: "Não",
    };

    expect(deColunas("posCurso", paraColunas("posCurso", respostas))).toEqual(respostas);
  });
});
