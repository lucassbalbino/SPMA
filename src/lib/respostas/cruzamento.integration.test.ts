// Filtro e cruzamento por pergunta direto na tabela do formulário (COL-25,
// COL-26), contra o banco real `spma_test`. É a consulta que o Power BI faz:
// uma coluna filtrada, outra agrupada, sem JOIN nem pivot.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { gravarRespostas } from "./repositorio";

const CPF_GO = "27182818205";

let cdOfertante: string;
let cursos: number[] = [];

const lista = () => cursos.join(", ");

describe("cruzamento por pergunta (integration)", () => {
  beforeAll(async () => {
    await prisma.usuario.deleteMany({ where: { documento: CPF_GO } });
    cdOfertante = CPF_GO;
    await prisma.usuario.create({ data: { documento: CPF_GO, nome: "GO Cruzamento", tipo: "GO" } });
    const verba = await prisma.verba.create({
      data: { dsVerba: "Verba cruzamento", cdOfertante, vlVerba: 10000 },
    });

    // Três cursos: dois à distância em zona rural, um presencial em zona urbana.
    const respostas = [
      { qualifModalidade: "À distância (online)", qualifRegiao: "Zona Rural", publicoPerfil: ["Jovens"] },
      { qualifModalidade: "À distância (online)", qualifRegiao: "Zona Rural", publicoPerfil: ["Jovens", "Mulheres"] },
      { qualifModalidade: "Presencial", qualifRegiao: "Zona Urbana", publicoPerfil: ["Mulheres"] },
    ];
    for (const patch of respostas) {
      const curso = await prisma.curso.create({
        data: {
          cdOfertante,
          cdVerba: verba.cdVerba,
          vlCursoAlocado: 100,
          criadoPor: CPF_GO,
          preCurso: { create: {} },
        },
      });
      cursos.push(curso.cdCurso);
      await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: curso.cdCurso }, patch);
    }
  });

  afterAll(async () => {
    await prisma.curso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({ where: { documento: CPF_GO } });
    cursos = [];
    await prisma.$disconnect();
  });

  // COL-25: filtra P11 e agrupa por P12 numa única tabela.
  it("filtra uma pergunta e agrupa por outra com um SELECT numa tabela só", async () => {
    const consulta = `SELECT \`P12\`, COUNT(*) AS total FROM TB_Pre_Curso
      WHERE \`P11\` = 'b' AND CD_Curso IN (${lista()}) GROUP BY \`P12\``;

    expect(await prisma.$queryRawUnsafe(consulta)).toEqual([{ P12: "c", total: BigInt(2) }]);

    const plano = await prisma.$queryRawUnsafe<{ table: string }[]>(`EXPLAIN ${consulta}`);
    expect(plano.map((linha) => linha.table)).toEqual(["TB_Pre_Curso"]);
  });

  // COL-26: a soma da coluna de uma opção conta quem a marcou.
  it("conta quantos formulários marcaram cada opção somando a coluna", async () => {
    const [linha] = await prisma.$queryRawUnsafe<{ jovens: unknown; mulheres: unknown; idosos: unknown }[]>(
      `SELECT SUM(\`P20a\`) AS jovens, SUM(\`P20b\`) AS mulheres, SUM(\`P20c\`) AS idosos
       FROM TB_Pre_Curso WHERE CD_Curso IN (${lista()})`,
    );

    expect([Number(linha.jovens), Number(linha.mulheres), Number(linha.idosos)]).toEqual([2, 2, 0]);
  });
});
