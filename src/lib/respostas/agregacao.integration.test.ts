// Prova de agregação por pergunta (RESP-17, RESP-18), contra o banco real
// `spma_test`.
//
// Esta é a razão declarada da AD-041: com as respostas em linha, um relatório
// agrega por `(Chave, Valor)` em SQL puro. As consultas aqui são escritas de
// propósito como o dashboard (AD-024) as escreveria - SQL cru, sem passar pelo
// repositório -, porque o que está sob teste é a ESTRUTURA física, não a
// camada de leitura. Se a normalização regredir, estes testes caem.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { gravarRespostas } from "./repositorio";

const CPF_GO = "05948297047";
const CPFS_ALUNOS = ["16215130095", "35168307000", "49629768003", "82802517074"];

const CHAVE_ESCALAR = "avalParticipConcluiuCurso";
const CHAVE_MULTIPLA = "avalMotivacoesPosPercepcoes";

const ATUAR_TURISMO = "tem condições de atuar na área do Turismo";
const RETOMAR_ESTUDOS = "se sente motivado(a) a retomar os estudos";

let cdOfertante: number;
let cdCurso: number;
let cdCursoOutro: number;

type LinhaContagem = { valor: string; total: bigint };

describe("agregação de respostas por pergunta (integration)", () => {
  beforeAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: CPFS_ALUNOS } } });
    await prisma.usuario.deleteMany({
      where: { cpf: { in: [CPF_GO, ...CPFS_ALUNOS] } },
    });

    const ofertante = await prisma.ofertante.create({
      data: { nome: "Ofertante Agregacao Teste", uf: "SP" },
    });
    cdOfertante = ofertante.cdOfertante;

    await prisma.usuario.create({
      data: { cpf: CPF_GO, nome: "GO Agregacao", tipo: "GO", cdOfertante },
    });

    const verba = await prisma.verba.create({ data: { cdOfertante, vlVerba: 100000 } });

    const curso = await prisma.preCurso.create({
      data: { cdOfertante, cdVerba: verba.cdVerba, vlCursoAlocado: 1000, criadoPor: CPF_GO },
    });
    cdCurso = curso.cdCurso;

    // Segundo curso com resposta na MESMA chave: prova que a agregação
    // escopada por curso não vaza respostas de outro curso.
    const outro = await prisma.preCurso.create({
      data: { cdOfertante, cdVerba: verba.cdVerba, vlCursoAlocado: 1000, criadoPor: CPF_GO },
    });
    cdCursoOutro = outro.cdCurso;

    for (const cpf of CPFS_ALUNOS) {
      await prisma.usuario.create({ data: { cpf, nome: `Aluno ${cpf}`, tipo: "AL" } });
      await prisma.avaliacaoAluno.create({ data: { cpf, cdCurso } });
    }

    // 3 alunos concluíram, 1 não - contagem esperada da chave escalar.
    const concluiu = ["Sim", "Sim", "Sim", "Não"];

    // Seleção múltipla: cada opção vira a sua própria linha, então a contagem
    // por opção soma mais que o número de alunos. É exatamente esse
    // comportamento que uma coluna JSON não conseguia agregar em SQL.
    const motivacoes = [
      [ATUAR_TURISMO],
      [ATUAR_TURISMO, RETOMAR_ESTUDOS],
      [RETOMAR_ESTUDOS],
      [ATUAR_TURISMO],
    ];

    for (const [i, cpf] of CPFS_ALUNOS.entries()) {
      await gravarRespostas(
        prisma,
        { formulario: "avaliacao", cpf, cdCurso },
        {
          [CHAVE_ESCALAR]: concluiu[i],
          [CHAVE_MULTIPLA]: motivacoes[i],
        },
      );
    }

    await gravarRespostas(
      prisma,
      { formulario: "preCurso", cdCurso: cdCursoOutro },
      { identifUf: "RJ" },
    );
    await gravarRespostas(
      prisma,
      { formulario: "preCurso", cdCurso },
      { identifUf: "SP" },
    );
  });

  afterAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: CPFS_ALUNOS } } });
    await prisma.preCurso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({
      where: { cpf: { in: [CPF_GO, ...CPFS_ALUNOS] } },
    });
    await prisma.ofertante.deleteMany({ where: { cdOfertante } });
    await prisma.$disconnect();
  });

  // RESP-17: agregação de uma pergunta escalar, em SQL puro, sem nenhuma
  // função de JSON no WHERE nem no GROUP BY.
  it("conta as respostas de uma pergunta escalar por valor", async () => {
    const linhas = await prisma.$queryRaw<LinhaContagem[]>`
      SELECT Valor AS valor, COUNT(*) AS total
      FROM TB_Resposta_Avaliacao
      WHERE Chave = ${CHAVE_ESCALAR} AND CD_Curso = ${cdCurso}
      GROUP BY Valor
      ORDER BY total DESC, valor ASC
    `;

    expect(linhas.map(({ valor, total }) => ({ valor, total: Number(total) }))).toEqual([
      { valor: "Sim", total: 3 },
      { valor: "Não", total: 1 },
    ]);
  });

  // RESP-17: numa pergunta de seleção múltipla cada opção é uma linha, então a
  // soma das contagens (4) é maior que o número de alunos (4 alunos, 5
  // seleções). É o caso que motivou a AD-041.
  it("conta cada opção de uma pergunta de seleção múltipla separadamente", async () => {
    const linhas = await prisma.$queryRaw<LinhaContagem[]>`
      SELECT Valor AS valor, COUNT(*) AS total
      FROM TB_Resposta_Avaliacao
      WHERE Chave = ${CHAVE_MULTIPLA} AND CD_Curso = ${cdCurso}
      GROUP BY Valor
      ORDER BY total DESC, valor ASC
    `;

    const contagens = linhas.map(({ valor, total }) => ({ valor, total: Number(total) }));

    expect(contagens).toEqual([
      { valor: ATUAR_TURISMO, total: 3 },
      { valor: RETOMAR_ESTUDOS, total: 2 },
    ]);
    expect(contagens.reduce((soma, { total }) => soma + total, 0)).toBe(5);
  });

  // RESP-17: o escopo por curso é uma cláusula SQL comum, não um filtro em
  // memória - a resposta do outro curso na mesma chave não entra na contagem.
  it("não mistura cursos ao agregar a mesma chave", async () => {
    const linhas = await prisma.$queryRaw<LinhaContagem[]>`
      SELECT Valor AS valor, COUNT(*) AS total
      FROM TB_Resposta_Pre_Curso
      WHERE Chave = 'identifUf' AND CD_Curso = ${cdCurso}
      GROUP BY Valor
    `;

    expect(linhas.map(({ valor, total }) => ({ valor, total: Number(total) }))).toEqual([
      { valor: "SP", total: 1 },
    ]);
  });

  // RESP-18: o índice de `Chave` cobre a busca por pergunta. A asserção é
  // sobre `possible_keys`, não sobre `key`: com a tabela de teste pequena o
  // otimizador do MySQL pode preferir varrer tudo, e o que a RESP-18 exige é
  // que o índice EXISTA e SIRVA à consulta. Derrubar o índice zera
  // `possible_keys` e quebra este teste.
  it.each([
    ["TB_Resposta_Pre_Curso", "TB_Resposta_Pre_Curso_Chave_idx"],
    ["TB_Resposta_Pos_Curso", "TB_Resposta_Pos_Curso_Chave_idx"],
    ["TB_Resposta_Avaliacao", "TB_Resposta_Avaliacao_Chave_idx"],
  ])("a busca por chave em %s passa pelo índice %s", async (tabela, indice) => {
    const plano = await prisma.$queryRawUnsafe<{ possible_keys: string | null }[]>(
      `EXPLAIN SELECT Valor, COUNT(*) FROM ${tabela} WHERE Chave = ? GROUP BY Valor`,
      CHAVE_ESCALAR,
    );

    const chavesPossiveis = plano[0]?.possible_keys?.split(",") ?? [];

    expect(chavesPossiveis).toContain(indice);
  });

  // RESP-17: a garantia estrutural por trás do "sem função de JSON" - não
  // sobrou nenhuma coluna JSON nos três formulários para uma consulta poder
  // recair nelas (AD-041 dropou as três).
  it("não deixou nenhuma coluna JSON nos três formulários", async () => {
    const colunas = await prisma.$queryRaw<{ TABLE_NAME: string; COLUMN_NAME: string }[]>`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND DATA_TYPE = 'json'
        AND TABLE_NAME IN ('TB_Pre_Curso', 'TB_Pos_Curso', 'TB_Avaliacao_Aluno')
    `;

    expect(colunas).toEqual([]);
  });
});
