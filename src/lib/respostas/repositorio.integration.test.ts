// Testes de integração do repositório de respostas, contra o banco real
// `spma_test`. Cobrem COL-01, COL-02, COL-04 a COL-08, COL-11 a COL-15,
// COL-29 a COL-31.
//
// A prova é sempre o estado persistido - as colunas `P*` lidas por SQL, com
// o nome que o Power BI vê -, nunca só o retorno da função.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { camposDeResposta } from "./colunas";
import {
  apagarRespostas,
  gravarRespostas,
  incluirRespostas,
  lerRespostas,
  ISOLAMENTO_RESPOSTAS,
  separarRespostas,
} from "./repositorio";

const CPF_GO = "40364947096";
const CPF_ALUNO = "70172121048";
// Aluno usado só nos testes que criam e apagam a conta - CPF_ALUNO é
// compartilhado pelos demais testes do arquivo.
const CPF_ALUNO_DESCARTAVEL = "83641290740";

let cdOfertante: string;
let cdCursoA: number;
let cdCursoB: number;

type Linha = Record<string, unknown>;

/** Lê colunas pelo nome físico (`P11`, `P20a`, `P25.1`) direto da tabela. */
async function colunas(
  tabela: string,
  where: string,
  parametros: unknown[],
  nomes: string[],
): Promise<Linha[]> {
  const lista = nomes.map((nome) => `\`${nome}\``).join(", ");
  return prisma.$queryRawUnsafe<Linha[]>(
    `SELECT ${lista} FROM \`${tabela}\` WHERE ${where}`,
    ...parametros,
  );
}

const doCurso = (cdCurso: number, nomes: string[]) =>
  colunas("TB_Pre_Curso", "CD_Curso = ?", [cdCurso], nomes).then((linhas) => linhas[0]);

/** 1/0 do BOOLEAN do MySQL, seja qual for a forma que o driver devolve. */
const bit = (valor: unknown) => (valor === null ? null : Number(valor));

const nulas = (formulario: "preCurso" | "posCurso" | "avaliacao") =>
  Object.fromEntries(camposDeResposta(formulario).map((campo) => [campo, null]));

describe("repositório de respostas por coluna (integration)", () => {
  beforeAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.usuario.deleteMany({
      where: { documento: { in: [CPF_GO, CPF_ALUNO, CPF_ALUNO_DESCARTAVEL] } },
    });

    // AD-043: o GO É o ofertante - `cdOfertante` é o próprio `documento`.
    cdOfertante = CPF_GO;

    await prisma.usuario.create({
      data: { documento: CPF_GO, nome: "GO Respostas", tipo: "GO", uf: "SP" },
    });
    await prisma.usuario.create({
      data: { documento: CPF_ALUNO, nome: "Aluno Respostas", tipo: "AL" },
    });

    const verba = await prisma.verba.create({
      data: { dsVerba: "Verba teste", cdOfertante, vlVerba: 100000 },
    });

    const novoCurso = () =>
      prisma.preCurso.create({
        data: { cdOfertante, cdVerba: verba.cdVerba, vlCursoAlocado: 1000, criadoPor: CPF_GO },
      });
    cdCursoA = (await novoCurso()).cdCurso;
    cdCursoB = (await novoCurso()).cdCurso;

    await prisma.posCurso.create({ data: { cdCurso: cdCursoA, criadoPor: CPF_GO } });
    await prisma.avaliacaoAluno.create({ data: { cpf: CPF_ALUNO, cdCurso: cdCursoA } });
  });

  beforeEach(async () => {
    await prisma.preCurso.updateMany({
      where: { cdCurso: { in: [cdCursoA, cdCursoB] } },
      data: nulas("preCurso"),
    });
    await prisma.posCurso.update({ where: { cdCurso: cdCursoA }, data: nulas("posCurso") });
    await prisma.avaliacaoAluno.update({
      where: { cpf_cdCurso: { cpf: CPF_ALUNO, cdCurso: cdCursoA } },
      data: nulas("avaliacao"),
    });
    await prisma.dadoPessoalAluno.deleteMany({
      where: { cpf: { in: [CPF_ALUNO, CPF_ALUNO_DESCARTAVEL] } },
    });
  });

  afterAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.posCurso.deleteMany({ where: { cdCurso: cdCursoA } });
    await prisma.preCurso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({
      where: { documento: { in: [CPF_GO, CPF_ALUNO, CPF_ALUNO_DESCARTAVEL] } },
    });
    await prisma.$disconnect();
  });

  // COL-08: formulário sem resposta tem todas as colunas em NULL.
  it("devolve {} para formulário sem nenhuma resposta", async () => {
    expect(await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA })).toEqual({});
    expect(await doCurso(cdCursoA, ["P2", "P11", "P20a"])).toEqual({ P2: null, P11: null, P20a: null });
  });

  // COL-01, COL-04, COL-06: cada pergunta na sua coluna; objetiva grava a letra.
  it("grava texto na coluna da pergunta e a letra na escolha única", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifUf: "AM",
      identifMunicipio: "Manaus",
      qualifModalidade: "À distância (online)",
      qualifCaracteristicasOutra: "Gastronomia regional",
    });

    expect(await doCurso(cdCursoA, ["P1", "P2", "P11", "P10Qual"])).toEqual({
      P1: "AM",
      P2: "Manaus",
      P11: "b",
      P10Qual: "Gastronomia regional",
    });
    // COL-11: a leitura devolve o texto da opção, como antes.
    expect(await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA })).toEqual({
      identifUf: "AM",
      identifMunicipio: "Manaus",
      qualifModalidade: "À distância (online)",
      qualifCaracteristicasOutra: "Gastronomia regional",
    });
  });

  // COL-07: número, percentual, nota e data no tipo da coluna, ida e volta.
  it("grava número, decimal, nota e data no tipo da coluna", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      planejCargaHoraria: 40,
      planejTaxaEvasaoEsperada: 12.5,
      infraBasicaRecepcao: 4,
      planejDataInicioPrevista: "2026-11-03",
    });

    const linha = await doCurso(cdCursoA, ["P15", "P18", "P23.5", "P13"]);
    expect(Number(linha.P15)).toBe(40);
    expect(String(linha.P18)).toBe("12.5");
    expect(Number(linha["P23.5"])).toBe(4);
    expect((linha.P13 as Date).toISOString().slice(0, 10)).toBe("2026-11-03");
    const tipos = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string; DATA_TYPE: string }[]>(
      `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TB_Pre_Curso'
         AND COLUMN_NAME IN ('P15', 'P18', 'P23.5', 'P13') ORDER BY COLUMN_NAME`,
    );
    expect(tipos.map((t) => [t.COLUMN_NAME, t.DATA_TYPE])).toEqual([
      ["P13", "date"],
      ["P15", "int"],
      ["P18", "decimal"],
      ["P23.5", "tinyint"],
    ]);

    expect(await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA })).toEqual({
      planejCargaHoraria: 40,
      planejTaxaEvasaoEsperada: 12.5,
      infraBasicaRecepcao: 4,
      planejDataInicioPrevista: "2026-11-03",
    });
  });

  // COL-05: uma coluna por opção, 1 marcada e 0 não marcada.
  it("grava 1 nas opções marcadas e 0 nas demais", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      publicoPerfil: ["Idosos", "Jovens", "Mulheres"],
    });

    const linha = await doCurso(cdCursoA, ["P20a", "P20b", "P20c", "P20d", "P20k"]);
    expect(Object.values(linha).map(bit)).toEqual([1, 1, 1, 0, 0]);
    // Volta na ordem do questionário (Assumption "ordem da seleção múltipla").
    expect(await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA })).toEqual({
      publicoPerfil: ["Jovens", "Mulheres", "Idosos"],
    });
  });

  // COL-12: só as colunas das chaves enviadas mudam.
  it("faz merge raso: regravar uma chave não toca nas demais", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };
    await gravarRespostas(prisma, alvo, { identifMunicipio: "Manaus", qualifNomeCurso: "Guiamento" });
    await gravarRespostas(prisma, alvo, { identifMunicipio: "Belém" });

    expect(await doCurso(cdCursoA, ["P2", "P8"])).toEqual({ P2: "Belém", P8: "Guiamento" });
  });

  // COL-13: opção que sai da seleção passa a 0.
  it("grava 0 nas opções que saíram quando a lista encolhe", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };
    await gravarRespostas(prisma, alvo, { publicoPerfil: ["Jovens", "Mulheres", "Idosos"] });
    await gravarRespostas(prisma, alvo, { publicoPerfil: ["Idosos"] });

    const linha = await doCurso(cdCursoA, ["P20a", "P20b", "P20c"]);
    expect(Object.values(linha).map(bit)).toEqual([0, 0, 1]);
    expect(await lerRespostas(prisma, alvo)).toEqual({ publicoPerfil: ["Idosos"] });
  });

  // COL-14: null limpa todas as colunas da pergunta.
  it("grava NULL em todas as colunas de uma chave enviada como null", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };
    await gravarRespostas(prisma, alvo, { publicoPerfil: ["Jovens"], qualifModalidade: "Presencial" });
    await gravarRespostas(prisma, alvo, { publicoPerfil: null, qualifModalidade: null });

    expect(await doCurso(cdCursoA, ["P11", "P20a", "P20b", "P20k"])).toEqual({
      P11: null,
      P20a: null,
      P20b: null,
      P20k: null,
    });
    expect(await lerRespostas(prisma, alvo)).toEqual({});
  });

  // COL-29: regravar o mesmo valor deixa o mesmo estado, sem erro.
  it("mantém o mesmo valor ao regravar a mesma chave", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };
    await gravarRespostas(prisma, alvo, { identifMunicipio: "Manaus" });
    await gravarRespostas(prisma, alvo, { identifMunicipio: "Manaus" });

    expect(await doCurso(cdCursoA, ["P2"])).toEqual({ P2: "Manaus" });
    expect(await lerRespostas(prisma, alvo)).toEqual({ identifMunicipio: "Manaus" });
  });

  it("isola formulários diferentes", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, { identifMunicipio: "Manaus" });
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoB }, { identifMunicipio: "Belém" });

    expect(await doCurso(cdCursoA, ["P2"])).toEqual({ P2: "Manaus" });
    expect(await doCurso(cdCursoB, ["P2"])).toEqual({ P2: "Belém" });
  });

  // COL-15: o encerramento descarta a condicional órfã gravando NULL.
  it("apaga só as chaves informadas", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };
    await gravarRespostas(prisma, alvo, {
      qualifCaracteristicas: ["Eventos (cerimonialista / organizador(a) de eventos)", "Outro"],
      qualifCaracteristicasOutra: "Turismo náutico",
      identifMunicipio: "Manaus",
    });

    await apagarRespostas(prisma, alvo, ["qualifCaracteristicasOutra"]);

    const linha = await doCurso(cdCursoA, ["P10Qual", "P10j", "P10l", "P2"]);
    expect({ ...linha, P10j: bit(linha.P10j), P10l: bit(linha.P10l) }).toEqual({
      P10Qual: null,
      P10j: 1,
      P10l: 1,
      P2: "Manaus",
    });
  });

  // COL-30: duas gravações concorrentes no mesmo formulário, em chaves
  // diferentes, cada uma na sua transação e com o isolamento das rotas.
  it("preserva o merge raso sob duas gravações concorrentes", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };

    const resultados = await Promise.allSettled([
      prisma.$transaction((tx) => gravarRespostas(tx, alvo, { identifUf: "SP" }), ISOLAMENTO_RESPOSTAS),
      prisma.$transaction(
        (tx) => gravarRespostas(tx, alvo, { publicoPerfil: ["Mulheres", "Jovens", "Idosos"] }),
        ISOLAMENTO_RESPOSTAS,
      ),
    ]);

    expect(resultados.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
    // Nenhuma apagou a chave da outra, e a lista veio inteira.
    expect(await lerRespostas(prisma, alvo)).toEqual({
      identifUf: "SP",
      publicoPerfil: ["Jovens", "Mulheres", "Idosos"],
    });
  });

  // COL-30: nada meio-gravado quando a transação falha.
  it("não deixa nenhuma coluna gravada quando a transação é revertida", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await gravarRespostas(tx, { formulario: "preCurso", cdCurso: cdCursoA }, {
          identifMunicipio: "Manaus",
          qualifNomeCurso: "Guiamento",
        });
        throw new Error("falha no meio da gravação");
      }),
    ).rejects.toThrow("falha no meio da gravação");

    expect(await doCurso(cdCursoA, ["P2", "P8"])).toEqual({ P2: null, P8: null });
  });

  it("grava e lê respostas do pós-curso nas colunas de TB_Pos_Curso", async () => {
    await gravarRespostas(prisma, { formulario: "posCurso", cdCurso: cdCursoA }, {
      posParticNumInscritos: 30,
      posFinValorTotal: 15000.5,
      posContEstrategias: ["Não foi adotada nenhuma estratégia de continuidade e ampliação."],
    });

    const [linha] = await colunas("TB_Pos_Curso", "CD_Curso = ?", [cdCursoA], ["P13", "P19", "P26a", "P26f"]);
    expect([Number(linha.P13), String(linha.P19), bit(linha.P26a), bit(linha.P26f)]).toEqual([
      30,
      "15000.5",
      0,
      1,
    ]);
    expect(await lerRespostas(prisma, { formulario: "posCurso", cdCurso: cdCursoA })).toEqual({
      posParticNumInscritos: 30,
      posFinValorTotal: 15000.5,
      posContEstrategias: ["Não foi adotada nenhuma estratégia de continuidade e ampliação."],
    });
  });

  it("grava e lê respostas da avaliação pela chave composta", async () => {
    const alvo = { formulario: "avaliacao" as const, cpf: CPF_ALUNO, cdCurso: cdCursoA };
    await gravarRespostas(prisma, alvo, {
      avalGeralNota: 9,
      avalExpectAtendimento: "Parcialmente",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
    });

    const [linha] = await colunas(
      "TB_Avaliacao_Aluno",
      "CPF = ? AND CD_Curso = ?",
      [CPF_ALUNO, cdCursoA],
      ["P35", "P19", "P22.1a", "P22.1b"],
    );
    expect([Number(linha.P35), linha.P19, bit(linha["P22.1a"]), bit(linha["P22.1b"])]).toEqual([9, "b", 0, 1]);
    expect(await lerRespostas(prisma, alvo)).toEqual({
      avalGeralNota: 9,
      avalExpectAtendimento: "Parcialmente",
      avalParticipMotivoNaoConclusao: ["Dificuldades financeiras"],
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Dado pessoal do Aluno (COL-02, COL-31, PESSOAL-09)
  // ─────────────────────────────────────────────────────────────

  it("devolve {} para Aluno sem nenhum dado pessoal gravado", async () => {
    expect(await lerRespostas(prisma, { formulario: "dadosPessoais", cpf: CPF_ALUNO })).toEqual({});
  });

  // COL-02: uma única linha por CPF, uma coluna por pergunta.
  it("grava os dados pessoais numa única linha por CPF", async () => {
    const alvo = { formulario: "dadosPessoais" as const, cpf: CPF_ALUNO };
    await gravarRespostas(prisma, alvo, { avalPessoalEstado: "AM", avalPessoalMunicipio: "Manaus" });
    await gravarRespostas(prisma, alvo, { avalPessoalGenero: "Feminino", avalPessoalMunicipio: "Parintins" });

    expect(
      await colunas("TB_Dado_Pessoal_Aluno", "CPF = ?", [CPF_ALUNO], ["P3", "P4", "P5", "P6"]),
    ).toEqual([{ P3: "AM", P4: "Parintins", P5: "a", P6: null }]);
    expect(await lerRespostas(prisma, alvo)).toEqual({
      avalPessoalEstado: "AM",
      avalPessoalMunicipio: "Parintins",
      avalPessoalGenero: "Feminino",
    });
  });

  it("isola o dado pessoal de Alunos diferentes", async () => {
    await prisma.usuario.create({
      data: { documento: CPF_ALUNO_DESCARTAVEL, nome: "Aluno Dado Pessoal", tipo: "AL" },
    });

    await gravarRespostas(prisma, { formulario: "dadosPessoais", cpf: CPF_ALUNO }, { avalPessoalMunicipio: "Manaus" });
    await gravarRespostas(
      prisma,
      { formulario: "dadosPessoais", cpf: CPF_ALUNO_DESCARTAVEL },
      { avalPessoalMunicipio: "Belém" },
    );

    expect(await lerRespostas(prisma, { formulario: "dadosPessoais", cpf: CPF_ALUNO })).toEqual({
      avalPessoalMunicipio: "Manaus",
    });
    expect(
      await lerRespostas(prisma, { formulario: "dadosPessoais", cpf: CPF_ALUNO_DESCARTAVEL }),
    ).toEqual({ avalPessoalMunicipio: "Belém" });

    await prisma.usuario.delete({ where: { documento: CPF_ALUNO_DESCARTAVEL } });
  });

  // COL-30: falha no meio da gravação não deixa a linha criada.
  it("não deixa nenhum dado pessoal quando a transação é revertida", async () => {
    const alvo = { formulario: "dadosPessoais" as const, cpf: CPF_ALUNO };

    await expect(
      prisma.$transaction(async (tx) => {
        await gravarRespostas(tx, alvo, { avalPessoalEstado: "AM", avalPessoalGenero: "Feminino" });
        throw new Error("falha no meio da gravação");
      }, ISOLAMENTO_RESPOSTAS),
    ).rejects.toThrow("falha no meio da gravação");

    expect(await prisma.dadoPessoalAluno.count({ where: { cpf: CPF_ALUNO } })).toBe(0);
  });

  // COL-31 / PESSOAL-09: remover o Aluno remove a linha dele, por FK.
  it("remove o dado pessoal quando o Aluno é removido", async () => {
    await prisma.usuario.create({
      data: { documento: CPF_ALUNO_DESCARTAVEL, nome: "Aluno Descartável", tipo: "AL" },
    });
    await gravarRespostas(
      prisma,
      { formulario: "dadosPessoais", cpf: CPF_ALUNO_DESCARTAVEL },
      { avalPessoalGenero: "Masculino", avalPessoalRacaEtnia: "Pardo" },
    );
    expect(await prisma.dadoPessoalAluno.count({ where: { cpf: CPF_ALUNO_DESCARTAVEL } })).toBe(1);

    await prisma.usuario.delete({ where: { documento: CPF_ALUNO_DESCARTAVEL } });

    expect(await prisma.dadoPessoalAluno.count({ where: { cpf: CPF_ALUNO_DESCARTAVEL } })).toBe(0);
  });
  // COL-11: as listagens devolvem o registro sem nenhuma coluna `P*` e as
  // respostas como `{ chave: valor }`. O client padrão esconde as colunas
  // (omit global); a listagem as pede de volta e as separa do registro.
  it("lê sem colunas P* pelo client padrão e separa as respostas na listagem", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      qualifModalidade: "Presencial",
      publicoPerfil: ["Mulheres"],
    });
    await gravarRespostas(prisma, { formulario: "posCurso", cdCurso: cdCursoA }, { posFinValorTotal: 10 });
    await gravarRespostas(
      prisma,
      { formulario: "avaliacao", cpf: CPF_ALUNO, cdCurso: cdCursoA },
      { avalGeralNota: 7 },
    );
    const temColunaP = (registro: object) => Object.keys(registro).filter((campo) => /^p\d/.test(campo));

    const padrao = [
      await prisma.preCurso.findUniqueOrThrow({ where: { cdCurso: cdCursoA } }),
      await prisma.posCurso.findUniqueOrThrow({ where: { cdCurso: cdCursoA } }),
      await prisma.avaliacaoAluno.findUniqueOrThrow({
        where: { cpf_cdCurso: { cpf: CPF_ALUNO, cdCurso: cdCursoA } },
      }),
    ];
    expect(padrao.map(temColunaP)).toEqual([[], [], []]);

    const [registro] = await prisma.preCurso.findMany({
      where: { cdCurso: cdCursoA },
      omit: incluirRespostas("preCurso"),
    });
    expect(registro.p11).toBe("a");
    const separado = separarRespostas("preCurso", registro);

    expect(temColunaP(separado.registro)).toEqual([]);
    expect(separado.registro.cdCurso).toBe(cdCursoA);
    expect(separado.respostas).toEqual({ qualifModalidade: "Presencial", publicoPerfil: ["Mulheres"] });
  });
});
