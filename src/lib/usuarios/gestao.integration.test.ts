// Testes de integração das escritas da gestão de usuários (GU-24, GU-32 a
// GU-39, GU-41/42), contra o banco real `spma_test`.
//
// A troca de documento é provada tabela a tabela (L-014): cada registro
// filho aponta para o documento novo E não sobra nenhuma linha com o antigo.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ErroHttp } from "@/lib/api/erro-http";
import { Prisma } from "@/generated/prisma/client";
import { geradorDeCnpj } from "../../../e2e/helpers/cnpj";
import { edicaoUsuarioSchema } from "@/lib/validation/schemas/gestao-usuario.schema";
import { atualizarCadastro, resetarSenha, validarDocumentoDoTipo } from "./gestao";

// Prefixo "49": espaço de numeração deste arquivo (ver `e2e/helpers/cnpj.ts`).
const cnpj = geradorDeCnpj("49");

function digitoCpf(digitos: number[]): number {
  const peso = digitos.length + 1;
  const resto = digitos.reduce((soma, d, i) => soma + d * (peso - i), 0) % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** CPF válido no mesmo espaço de numeração "49". */
function cpf(indice: number): string {
  const base = `49${String(indice).padStart(7, "0")}`.split("").map(Number);
  const d1 = digitoCpf(base);
  return [...base, d1, digitoCpf([...base, d1])].join("");
}

function formatarCpf(valor: string): string {
  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
}

// Todo documento que algum teste cria ou passa a usar, para a limpeza.
const DOCUMENTOS = [
  ...Array.from({ length: 10 }, (_, i) => cnpj(i + 1)),
  ...Array.from({ length: 10 }, (_, i) => cpf(i + 1)),
];

async function limpar() {
  const em = { in: DOCUMENTOS };
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: em } });
  // Pré e pós caem por cascata junto com o curso (AD-052).
  await prisma.curso.deleteMany({ where: { OR: [{ cdOfertante: em }, { criadoPor: em }] } });
  await prisma.verba.deleteMany({ where: { cdOfertante: em } });
  await prisma.usuario.updateMany({
    where: { documento: em },
    data: { criadoPor: null, cdOfertante: null },
  });
  await prisma.usuario.deleteMany({ where: { documento: em } });
}

function novaSessao(documento: string) {
  return prisma.sessao.create({
    data: { cpfUsuario: documento, expiraEm: new Date(Date.now() + 60 * 60 * 1000) },
  });
}

/** A recusa precisa ser um `ErroHttp` com o status E a mensagem do spec. */
async function capturarRecusa(acao: () => unknown): Promise<ErroHttp> {
  try {
    await acao();
  } catch (erro) {
    expect(erro).toBeInstanceOf(ErroHttp);
    return erro as ErroHttp;
  }
  throw new Error("era esperada uma recusa");
}

/**
 * GO com tudo que aponta para o documento dele: um VO que ele criou
 * (`criadoPor`) e que está vinculado a ele (`cdOfertante`), verba, pré-curso
 * (ofertante e autor), pós-curso e uma sessão.
 */
async function criarGoComFilhos(documentoGo: string, documentoVo: string) {
  await prisma.usuario.create({ data: { documento: documentoGo, nome: "GU-T GO", tipo: "GO" } });
  await prisma.usuario.create({
    data: {
      documento: documentoVo,
      nome: "GU-T VO",
      tipo: "VO",
      criadoPor: documentoGo,
      cdOfertante: documentoGo,
    },
  });
  const verba = await prisma.verba.create({ data: { dsVerba: "Verba teste", cdOfertante: documentoGo, vlVerba: 1000 } });
  const curso = await prisma.curso.create({
    data: {
      preCurso: { create: {} },
      cdOfertante: documentoGo,
      cdVerba: verba.cdVerba,
      vlCursoAlocado: 100,
      criadoPor: documentoGo,
    },
  });
  await prisma.posCurso.create({ data: { cdCurso: curso.cdCurso } });
  await novaSessao(documentoGo);

  return { cdVerba: verba.cdVerba, cdCurso: curso.cdCurso };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("atualizarCadastro (integration)", () => {
  beforeAll(limpar);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(limpar);

  it("GU-24: só nome e e-mail são gravados, e a sessão do alvo continua", async () => {
    const documento = cpf(1);
    await prisma.usuario.create({ data: { documento, nome: "GU-T VT", tipo: "VT" } });
    await novaSessao(documento);

    const resultado = await atualizarCadastro(
      { documento, nome: "GU-T VT", email: null, tipo: "VT" },
      { nome: "GU-T VT Corrigido", email: "vt@exemplo.com" },
    );

    expect(resultado).toEqual({
      documento,
      nome: "GU-T VT Corrigido",
      email: "vt@exemplo.com",
      tipo: "VT",
    });
    const gravado = await prisma.usuario.findUniqueOrThrow({ where: { documento } });
    expect(gravado.nome).toBe("GU-T VT Corrigido");
    expect(gravado.email).toBe("vt@exemplo.com");
    expect(await prisma.sessao.count({ where: { cpfUsuario: documento } })).toBe(1);
  });

  it("GU-32/33/34: trocar o CNPJ de um GO move cada referência ao documento novo", async () => {
    const antigo = cnpj(1);
    const novo = cnpj(2);
    const vo = cpf(2);
    const { cdVerba, cdCurso } = await criarGoComFilhos(antigo, vo);

    const resultado = await atualizarCadastro(
      { documento: antigo, nome: "GU-T GO", email: null, tipo: "GO" },
      { documentoNovo: validarDocumentoDoTipo("GO", novo) },
    );

    // GU-32: responde com o documento novo.
    expect(resultado).toEqual({ documento: novo, nome: "GU-T GO", email: null, tipo: "GO" });

    // GU-33: cada registro aponta para o novo...
    const voDepois = await prisma.usuario.findUniqueOrThrow({ where: { documento: vo } });
    expect(voDepois.criadoPor).toBe(novo);
    expect(voDepois.cdOfertante).toBe(novo);
    expect((await prisma.verba.findUniqueOrThrow({ where: { cdVerba } })).cdOfertante).toBe(novo);
    // Ofertante e criador são do curso, um só para o pré e o pós (AD-052).
    const cursoDepois = await prisma.curso.findUniqueOrThrow({ where: { cdCurso } });
    expect(cursoDepois.cdOfertante).toBe(novo);
    expect(cursoDepois.criadoPor).toBe(novo);

    // ...e não sobra nenhuma linha com o antigo, em nenhuma tabela.
    expect(await prisma.usuario.count({ where: { documento: antigo } })).toBe(0);
    expect(await prisma.usuario.count({ where: { criadoPor: antigo } })).toBe(0);
    expect(await prisma.usuario.count({ where: { cdOfertante: antigo } })).toBe(0);
    expect(await prisma.verba.count({ where: { cdOfertante: antigo } })).toBe(0);
    expect(await prisma.curso.count({ where: { cdOfertante: antigo } })).toBe(0);
    expect(await prisma.curso.count({ where: { criadoPor: antigo } })).toBe(0);
    expect(await prisma.sessao.count({ where: { cpfUsuario: antigo } })).toBe(0);

    // GU-34: a sessão migrada pela cascata foi encerrada.
    expect(await prisma.sessao.count({ where: { cpfUsuario: novo } })).toBe(0);
  });

  it("GU-33/35: trocar o CPF de um AL move avaliação, respostas e dados pessoais e preserva o resto", async () => {
    const go = cnpj(3);
    const antigo = cpf(3);
    const novo = cpf(4);
    await prisma.usuario.create({ data: { documento: go, nome: "GU-T GO AL", tipo: "GO" } });
    await prisma.usuario.create({
      data: {
        documento: antigo,
        nome: "GU-T AL",
        tipo: "AL",
        senhaHash: "hash-de-teste",
        primeiraVez: false,
        criadoPor: go,
        dadosPessoaisCompletos: true,
      },
    });
    const verba = await prisma.verba.create({ data: { dsVerba: "Verba teste", cdOfertante: go, vlVerba: 1000 } });
    const curso = await prisma.curso.create({
      data: {
        cdOfertante: go,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 100,
        criadoPor: go,
        preCurso: { create: {} },
      },
    });
    // As respostas são colunas da própria avaliação e da linha de dados
    // pessoais (AD-051): trocar o documento leva as duas linhas inteiras.
    await prisma.avaliacaoAluno.create({ data: { cpf: antigo, cdCurso: curso.cdCurso, p35: 9 } });
    await prisma.dadoPessoalAluno.create({ data: { cpf: antigo, p5: "a" } });
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { documento: antigo } });

    await atualizarCadastro(
      { documento: antigo, nome: "GU-T AL", email: null, tipo: "AL" },
      { documentoNovo: validarDocumentoDoTipo("AL", novo) },
    );

    // GU-33: as duas tabelas apontam para o novo, com as respostas, e nenhuma
    // linha fica no antigo.
    expect(
      await prisma.avaliacaoAluno.findMany({ where: { cpf: novo }, select: { p35: true } }),
    ).toEqual([{ p35: 9 }]);
    expect(await prisma.avaliacaoAluno.count({ where: { cpf: antigo } })).toBe(0);
    expect(
      await prisma.dadoPessoalAluno.findMany({ where: { cpf: novo }, select: { p5: true } }),
    ).toEqual([{ p5: "a" }]);
    expect(await prisma.dadoPessoalAluno.count({ where: { cpf: antigo } })).toBe(0);

    // GU-35: só o documento mudou; senha, 1º acesso, tipo, autoria, data de
    // criação e as flags de dados pessoais seguem idênticos.
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { documento: novo } });
    // A linha inteira é comparada: cobre os cinco campos de GU-35 de uma vez,
    // e `antes` tem senha, `primeiraVez: false` e autor de propósito.
    expect(depois).toEqual({ ...antes, documento: novo });
  });

  it("GU-35: trocar o CNPJ de um GO preserva os 6 dados organizacionais", async () => {
    const antigo = cnpj(9);
    const novo = cnpj(10);
    await prisma.usuario.create({
      data: {
        documento: antigo,
        tipo: "GO",
        nome: "GU-T GO Organizado",
        responsavel: "GU-T Responsavel",
        email: "go.organizado@exemplo.com",
        telefone: "11999990000",
        uf: "SP",
        municipio: "São Paulo",
        dadosOrganizacionaisCompletos: true,
      },
    });
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { documento: antigo } });

    await atualizarCadastro(
      {
        documento: antigo,
        nome: "GU-T GO Organizado",
        email: "go.organizado@exemplo.com",
        tipo: "GO",
      },
      { documentoNovo: validarDocumentoDoTipo("GO", novo) },
    );

    // Campo a campo: são estes que uma troca de documento poderia zerar.
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { documento: novo } });
    expect(depois.nome).toBe("GU-T GO Organizado");
    expect(depois.responsavel).toBe("GU-T Responsavel");
    expect(depois.email).toBe("go.organizado@exemplo.com");
    expect(depois.telefone).toBe("11999990000");
    expect(depois.uf).toBe("SP");
    expect(depois.municipio).toBe("São Paulo");
    expect(depois.dadosOrganizacionaisCompletos).toBe(true);
    expect(depois).toEqual({ ...antes, documento: novo });
  });

  it("GU-25: e-mail vazio na edição é gravado como null", async () => {
    const documento = cpf(10);
    await prisma.usuario.create({
      data: { documento, nome: "GU-T VT Email", email: "x@exemplo.com", tipo: "VT" },
    });

    // O mesmo caminho da rota: o corpo passa pelo schema, que troca "" por null.
    const dados = edicaoUsuarioSchema.parse({ documentoAtual: documento, email: "" });
    await atualizarCadastro(
      { documento, nome: "GU-T VT Email", email: "x@exemplo.com", tipo: "VT" },
      dados,
    );

    const gravado = await prisma.usuario.findUniqueOrThrow({ where: { documento } });
    expect(gravado.email).toBeNull();
    expect(gravado.nome).toBe("GU-T VT Email");
  });

  it("GU-36: documento novo já cadastrado dá 409 e nada muda", async () => {
    const antigo = cnpj(5);
    const ocupado = cnpj(6);
    const vo = cpf(5);
    const { cdVerba } = await criarGoComFilhos(antigo, vo);
    await prisma.usuario.create({ data: { documento: ocupado, nome: "GU-T OCUPADO", tipo: "GO" } });

    const recusa = await capturarRecusa(() =>
      atualizarCadastro(
        { documento: antigo, nome: "GU-T GO", email: null, tipo: "GO" },
        { nome: "GU-T GO Novo", documentoNovo: ocupado },
      ),
    );

    expect(recusa.status).toBe(409);
    expect(recusa.corpo).toEqual({ erro: "Documento já cadastrado" });
    const alvo = await prisma.usuario.findUniqueOrThrow({ where: { documento: antigo } });
    expect(alvo.nome).toBe("GU-T GO");
    const voDepois = await prisma.usuario.findUniqueOrThrow({ where: { documento: vo } });
    expect(voDepois.criadoPor).toBe(antigo);
    expect(voDepois.cdOfertante).toBe(antigo);
    expect((await prisma.verba.findUniqueOrThrow({ where: { cdVerba } })).cdOfertante).toBe(
      antigo,
    );
    expect(await prisma.sessao.count({ where: { cpfUsuario: antigo } })).toBe(1);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { documento: ocupado } })).nome).toBe(
      "GU-T OCUPADO",
    );
  });

  it("GU-38: CPF inválido para um AL dá 400 'CPF inválido'", async () => {
    const recusa = await capturarRecusa(() => validarDocumentoDoTipo("AL", "529.982.247-26"));

    expect(recusa.status).toBe(400);
    expect(recusa.corpo).toEqual({ erro: "CPF inválido" });
  });

  it("GU-37: um CPF válido para um GO dá 400 'CNPJ inválido'", async () => {
    const recusa = await capturarRecusa(() => validarDocumentoDoTipo("GO", "52998224725"));

    expect(recusa.status).toBe(400);
    expect(recusa.corpo).toEqual({ erro: "CNPJ inválido" });
  });

  it("GU-39: o mesmo documento com pontuação não é troca, e a sessão continua", async () => {
    const documento = cpf(7);
    await prisma.usuario.create({ data: { documento, nome: "GU-T VO", tipo: "VO" } });
    await novaSessao(documento);

    const resultado = await atualizarCadastro(
      { documento, nome: "GU-T VO", email: null, tipo: "VO" },
      {
        nome: "GU-T VO Corrigido",
        documentoNovo: validarDocumentoDoTipo("VO", formatarCpf(documento)),
      },
    );

    expect(resultado).toEqual({ documento, nome: "GU-T VO Corrigido", email: null, tipo: "VO" });
    expect(await prisma.sessao.count({ where: { cpfUsuario: documento } })).toBe(1);
  });

  it("GU-36: P2002 dentro da transação (corrida) dá 409 e desfaz o que já tinha sido solto", async () => {
    const antigo = cnpj(7);
    const novo = cnpj(8);
    const vo = cpf(8);
    await criarGoComFilhos(antigo, vo);

    // A colisão da corrida acontece no `tx.usuario.update` (passo 3), depois
    // de os filhos auto-referentes já terem sido soltos (passo 2). Para
    // atingir o `update` de dentro da transação interativa, o `$transaction`
    // real é envolvido e o `tx` entregue ao serviço é o real, com só
    // `usuario.update` trocado por um que lança o P2002 que o MySQL daria.
    const transacaoReal = prisma.$transaction.bind(prisma) as (
      fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
    ) => Promise<unknown>;
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "teste",
    });
    vi.spyOn(prisma, "$transaction").mockImplementation(((
      fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
    ) =>
      transacaoReal(async (tx) => {
        vi.spyOn(tx.usuario, "update").mockRejectedValue(p2002);
        return fn(tx);
      })) as never);

    const recusa = await capturarRecusa(() =>
      atualizarCadastro(
        { documento: antigo, nome: "GU-T GO", email: null, tipo: "GO" },
        { documentoNovo: novo },
      ),
    );

    expect(recusa.status).toBe(409);
    expect(recusa.corpo).toEqual({ erro: "Documento já cadastrado" });
    // Rollback: o VO solto no passo 2 voltou ao documento antigo.
    const voDepois = await prisma.usuario.findUniqueOrThrow({ where: { documento: vo } });
    expect(voDepois.criadoPor).toBe(antigo);
    expect(voDepois.cdOfertante).toBe(antigo);
    expect(await prisma.usuario.count({ where: { documento: antigo } })).toBe(1);
    expect(await prisma.usuario.count({ where: { documento: novo } })).toBe(0);
    expect(await prisma.sessao.count({ where: { cpfUsuario: antigo } })).toBe(1);
  });
});

describe("resetarSenha (integration)", () => {
  const documento = cpf(9);

  beforeAll(async () => {
    await prisma.usuario.deleteMany({ where: { documento } });
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { documento } });
  });

  it("GU-41/42: volta ao 1º acesso, destrava a conta e encerra as sessões", async () => {
    await prisma.usuario.create({
      data: {
        documento,
        nome: "GU-T VT RESET",
        tipo: "VT",
        senhaHash: "hash-de-teste",
        primeiraVez: false,
        tentativasFalhas: 3,
        bloqueadoAte: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await novaSessao(documento);
    await novaSessao(documento);

    await resetarSenha(documento);

    const depois = await prisma.usuario.findUniqueOrThrow({ where: { documento } });
    expect(depois.senhaHash).toBeNull();
    expect(depois.primeiraVez).toBe(true);
    expect(depois.tentativasFalhas).toBe(0);
    expect(depois.bloqueadoAte).toBeNull();
    expect(await prisma.sessao.count({ where: { cpfUsuario: documento } })).toBe(0);
  });
});
