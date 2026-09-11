// Testes de integração do repositório de respostas, contra o banco real
// `spma_test`. Cobrem RESP-01, RESP-03, RESP-04, RESP-16, RESP-19 e RESP-21.
//
// A prova é sempre o estado persistido - as linhas na tabela -, nunca só o
// retorno da função.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  apagarRespostas,
  gravarRespostas,
  lerRespostas,
  ISOLAMENTO_RESPOSTAS,
} from "./repositorio";

const CPF_GO = "40364947096";
const CPF_ALUNO = "70172121048";

let cdOfertante: number;
let cdCursoA: number;
let cdCursoB: number;

describe("repositório de respostas (integration)", () => {
  beforeAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.usuario.deleteMany({ where: { cpf: { in: [CPF_GO, CPF_ALUNO] } } });

    const ofertante = await prisma.ofertante.create({
      data: { nome: "Ofertante Respostas Teste", uf: "SP" },
    });
    cdOfertante = ofertante.cdOfertante;

    await prisma.usuario.create({
      data: { cpf: CPF_GO, nome: "GO Respostas", tipo: "GO", cdOfertante },
    });
    await prisma.usuario.create({
      data: { cpf: CPF_ALUNO, nome: "Aluno Respostas", tipo: "AL" },
    });

    const verba = await prisma.verba.create({
      data: { cdOfertante, vlVerba: 100000 },
    });

    const cursoA = await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 1000,
        criadoPor: CPF_GO,
      },
    });
    cdCursoA = cursoA.cdCurso;

    const cursoB = await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 1000,
        criadoPor: CPF_GO,
      },
    });
    cdCursoB = cursoB.cdCurso;

    await prisma.posCurso.create({ data: { cdCurso: cdCursoA, criadoPor: CPF_GO } });
    await prisma.avaliacaoAluno.create({ data: { cpf: CPF_ALUNO, cdCurso: cdCursoA } });
  });

  beforeEach(async () => {
    await prisma.respostaPreCurso.deleteMany({
      where: { cdCurso: { in: [cdCursoA, cdCursoB] } },
    });
    await prisma.respostaPosCurso.deleteMany({ where: { cdCurso: cdCursoA } });
    await prisma.respostaAvaliacao.deleteMany({ where: { cpf: CPF_ALUNO } });
  });

  afterAll(async () => {
    await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_ALUNO } });
    await prisma.posCurso.deleteMany({ where: { cdCurso: cdCursoA } });
    await prisma.preCurso.deleteMany({ where: { cdOfertante } });
    await prisma.verba.deleteMany({ where: { cdOfertante } });
    await prisma.usuario.deleteMany({ where: { cpf: { in: [CPF_GO, CPF_ALUNO] } } });
    await prisma.ofertante.deleteMany({ where: { cdOfertante } });
    await prisma.$disconnect();
  });

  // RESP-16: registro sem nenhuma linha devolve objeto vazio, não null.
  it("devolve {} para registro sem nenhuma linha", async () => {
    const respostas = await lerRespostas(prisma, {
      formulario: "preCurso",
      cdCurso: cdCursoA,
    });

    expect(respostas).toEqual({});
  });

  // RESP-01: uma linha por chave escalar, com a chave e o valor.
  it("grava uma linha por chave escalar e remonta os tipos do schema", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifMunicipio: "Manaus",
      planejCargaHoraria: 40,
    });

    const linhas = await prisma.respostaPreCurso.findMany({
      where: { cdCurso: cdCursoA },
      orderBy: { chave: "asc" },
      select: { chave: true, ordem: true, valor: true },
    });

    expect(linhas).toEqual([
      { chave: "identifMunicipio", ordem: 0, valor: "Manaus" },
      { chave: "planejCargaHoraria", ordem: 0, valor: "40" },
    ]);

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({ identifMunicipio: "Manaus", planejCargaHoraria: 40 });
  });

  // RESP-02: K opções selecionadas viram K linhas, com a posição na seleção.
  it("grava uma linha por opção de múltipla escolha, com a ordem da seleção", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      publicoPerfil: ["Jovens", "Mulheres", "Idosos"],
    });

    const linhas = await prisma.respostaPreCurso.findMany({
      where: { cdCurso: cdCursoA, chave: "publicoPerfil" },
      orderBy: { ordem: "asc" },
      select: { ordem: true, valor: true },
    });

    expect(linhas).toEqual([
      { ordem: 0, valor: "Jovens" },
      { ordem: 1, valor: "Mulheres" },
      { ordem: 2, valor: "Idosos" },
    ]);

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({ publicoPerfil: ["Jovens", "Mulheres", "Idosos"] });
  });

  // RESP-03: só as chaves enviadas mudam.
  it("faz merge raso: regravar uma chave não toca nas demais", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifMunicipio: "Manaus",
      qualifNomeCurso: "Guiamento",
    });

    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifMunicipio: "Belém",
    });

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({ identifMunicipio: "Belém", qualifNomeCurso: "Guiamento" });
  });

  // RESP-04: as opções que saíram da seleção perdem as linhas delas.
  it("remove as linhas das opções que saíram quando a lista encolhe", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      publicoPerfil: ["Jovens", "Mulheres", "Idosos"],
    });

    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      publicoPerfil: ["Idosos"],
    });

    const linhas = await prisma.respostaPreCurso.findMany({
      where: { cdCurso: cdCursoA, chave: "publicoPerfil" },
      orderBy: { ordem: "asc" },
      select: { ordem: true, valor: true },
    });

    expect(linhas).toEqual([{ ordem: 0, valor: "Idosos" }]);

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({ publicoPerfil: ["Idosos"] });
  });

  // RESP-19: regravar o mesmo valor não duplica linha.
  it("mantém uma única linha ao regravar a mesma chave com o mesmo valor", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifMunicipio: "Manaus",
    });
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifMunicipio: "Manaus",
    });

    const linhas = await prisma.respostaPreCurso.findMany({
      where: { cdCurso: cdCursoA, chave: "identifMunicipio" },
      select: { ordem: true, valor: true },
    });

    expect(linhas).toEqual([{ ordem: 0, valor: "Manaus" }]);
  });

  it("isola registros diferentes do mesmo formulário", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      identifMunicipio: "Manaus",
    });
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoB }, {
      identifMunicipio: "Belém",
    });

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({ identifMunicipio: "Manaus" });
    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoB }),
    ).toEqual({ identifMunicipio: "Belém" });
  });

  // RESP-08: o encerramento descarta a condicional órfã como DELETE de linha.
  it("apaga só as chaves informadas", async () => {
    await gravarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, {
      qualifCaracteristicas: ["Eventos", "Outro"],
      qualifCaracteristicasOutra: "Turismo náutico",
      identifMunicipio: "Manaus",
    });

    await apagarRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }, [
      "qualifCaracteristicasOutra",
    ]);

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({
      qualifCaracteristicas: ["Eventos", "Outro"],
      identifMunicipio: "Manaus",
    });
  });

  // RESP-14: chave que o schema atual não conhece continua legível, como texto.
  it("remonta como texto uma chave ausente do schema atual", async () => {
    await prisma.respostaPreCurso.create({
      data: { cdCurso: cdCursoA, chave: "chaveDeQuestionarioAntigo", ordem: 0, valor: "x" },
    });

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({ chaveDeQuestionarioAntigo: "x" });
  });

  // RESP-14: chave órfã que era SELEÇÃO MÚLTIPLA volta inteira. É o caso que
  // o Verifier pegou: `posContEstrategiasContinuidade` e
  // `posContEstrategiasAmpliacao` eram `z.array(...).min(1)` e saíram do
  // schema na AD-035/036, então uma órfã de várias linhas existe de verdade.
  // Classificá-la como texto devolvia só a primeira - perda silenciosa na
  // leitura, exatamente o que a assumption da spec diz não aceitar.
  it("remonta como lista uma chave órfã com várias linhas", async () => {
    await prisma.respostaPreCurso.createMany({
      data: [
        { cdCurso: cdCursoA, chave: "estrategiasDeQuestionarioAntigo", ordem: 0, valor: "Parcerias" },
        { cdCurso: cdCursoA, chave: "estrategiasDeQuestionarioAntigo", ordem: 1, valor: "Editais" },
        { cdCurso: cdCursoA, chave: "estrategiasDeQuestionarioAntigo", ordem: 2, valor: "Turmas novas" },
      ],
    });

    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({
      estrategiasDeQuestionarioAntigo: ["Parcerias", "Editais", "Turmas novas"],
    });
  });

  // RESP-05: a unicidade é constraint FÍSICA, não disciplina do repositório -
  // uma segunda linha para o mesmo (registro, chave, ordem) é recusada pelo
  // banco mesmo inserindo por fora das funções do repositório.
  it("recusa no banco duas linhas para a mesma chave e ordem", async () => {
    await prisma.respostaPreCurso.create({
      data: { cdCurso: cdCursoA, chave: "identifUf", ordem: 0, valor: "SP" },
    });

    await expect(
      prisma.respostaPreCurso.create({
        data: { cdCurso: cdCursoA, chave: "identifUf", ordem: 0, valor: "RJ" },
      }),
    ).rejects.toThrow(/[Uu]nique constraint/);
  });

  // RESP-21: duas gravações CONCORRENTES no mesmo registro, cada uma na sua
  // transação, em chaves diferentes.
  //
  // Roda com `ISOLAMENTO_RESPOSTAS`, o MESMO isolamento das seis rotas que
  // gravam - se este teste passasse sob um isolamento que a produção não usa,
  // não provaria nada sobre a produção.
  //
  // MEDIDO: sob o REPEATABLE READ padrão, estas duas transações batiam em
  // deadlock de gap lock e uma morria, de forma reprodutível (3 de 3). Sob
  // READ COMMITTED passam as duas, também 3 de 3. Trocar `ISOLAMENTO_RESPOSTAS`
  // de volta para o padrão quebra este teste - é o que o prende à decisão.
  it("preserva o merge raso sob duas gravações concorrentes", async () => {
    const alvo = { formulario: "preCurso" as const, cdCurso: cdCursoA };

    const resultados = await Promise.allSettled([
      prisma.$transaction(
        (tx) => gravarRespostas(tx, alvo, { identifUf: "SP" }),
        ISOLAMENTO_RESPOSTAS,
      ),
      prisma.$transaction(
        (tx) =>
          gravarRespostas(tx, alvo, {
            publicoPerfil: ["Mulheres", "Jovens", "Idosos"],
          }),
        ISOLAMENTO_RESPOSTAS,
      ),
    ]);

    // As DUAS vencem: nenhuma requisição do usuário é perdida.
    expect(resultados.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);

    // Merge raso preservado: nenhuma apagou a chave da outra, e a lista veio
    // inteira - uma lista truncada seria a "gravação parcial visível" que a
    // RESP-21 proíbe.
    expect(await lerRespostas(prisma, alvo)).toEqual({
      identifUf: "SP",
      publicoPerfil: ["Mulheres", "Jovens", "Idosos"],
    });

    // E nenhuma linha a mais ficou para trás.
    expect(
      await prisma.respostaPreCurso.count({ where: { cdCurso: cdCursoA } }),
    ).toBe(4);
  });

  // RESP-21: nada meio-gravado quando a transação falha.
  it("não deixa nenhuma linha quando a transação é revertida", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await gravarRespostas(tx, { formulario: "preCurso", cdCurso: cdCursoA }, {
          identifMunicipio: "Manaus",
          qualifNomeCurso: "Guiamento",
        });
        throw new Error("falha no meio da gravação");
      }),
    ).rejects.toThrow("falha no meio da gravação");

    expect(
      await prisma.respostaPreCurso.count({ where: { cdCurso: cdCursoA } }),
    ).toBe(0);
    expect(
      await lerRespostas(prisma, { formulario: "preCurso", cdCurso: cdCursoA }),
    ).toEqual({});
  });

  it("grava e lê respostas do pós-curso", async () => {
    await gravarRespostas(prisma, { formulario: "posCurso", cdCurso: cdCursoA }, {
      posParticNumInscritos: 30,
      posContEstrategias: ["Não foi adotada nenhuma estratégia de continuidade e ampliação."],
    });

    expect(
      await lerRespostas(prisma, { formulario: "posCurso", cdCurso: cdCursoA }),
    ).toEqual({
      posParticNumInscritos: 30,
      posContEstrategias: ["Não foi adotada nenhuma estratégia de continuidade e ampliação."],
    });

    expect(
      await prisma.respostaPreCurso.count({ where: { cdCurso: cdCursoA } }),
    ).toBe(0);
  });

  it("grava e lê respostas da avaliação pela chave composta", async () => {
    await gravarRespostas(
      prisma,
      { formulario: "avaliacao", cpf: CPF_ALUNO, cdCurso: cdCursoA },
      { avalGeralNota: 9, avalPessoalGenero: "Feminino" },
    );

    expect(
      await lerRespostas(prisma, {
        formulario: "avaliacao",
        cpf: CPF_ALUNO,
        cdCurso: cdCursoA,
      }),
    ).toEqual({ avalGeralNota: 9, avalPessoalGenero: "Feminino" });

    const linhas = await prisma.respostaAvaliacao.findMany({
      where: { cpf: CPF_ALUNO, cdCurso: cdCursoA },
      select: { cpf: true, cdCurso: true },
    });

    expect(linhas).toHaveLength(2);
    expect(linhas.every((linha) => linha.cpf === CPF_ALUNO)).toBe(true);
  });

  // RESP-06: FK com ON DELETE CASCADE, sem uma linha de código na aplicação.
  it("remove as linhas quando o registro-pai é removido", async () => {
    const verba = await prisma.verba.findFirst({ where: { cdOfertante } });
    const cursoDescartavel = await prisma.preCurso.create({
      data: {
        cdOfertante,
        cdVerba: verba!.cdVerba,
        vlCursoAlocado: 500,
        criadoPor: CPF_GO,
      },
    });

    await gravarRespostas(
      prisma,
      { formulario: "preCurso", cdCurso: cursoDescartavel.cdCurso },
      { identifMunicipio: "Manaus" },
    );

    await prisma.preCurso.delete({ where: { cdCurso: cursoDescartavel.cdCurso } });

    expect(
      await prisma.respostaPreCurso.count({
        where: { cdCurso: cursoDescartavel.cdCurso },
      }),
    ).toBe(0);
  });
});
