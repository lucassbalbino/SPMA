// GET /api/avaliacoes/[cpf]/[cdCurso] - consulta escopada (AVAL-20/21/23).
// PATCH /api/avaliacoes/[cpf]/[cdCurso] - gravação parcial com os dois gates
// (AVAL-07/08/09/10/11/14, bloqueada em avaliação ENCERRADO por AVAL-17).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { podeAcessarAvaliacao, podeGerenciarAvaliacao } from "@/lib/auth/guards";
import {
  CHAVES_PARTE_1,
  respostasAvaliacaoParcialSchema,
} from "@/lib/validation/schemas/avaliacao.schema";
import { CHAVES_DADOS_PESSOAIS } from "@/lib/validation/schemas/dados-pessoais.schema";
import { validarCompletudeParte1 } from "@/lib/avaliacao/completude";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import {
  gravarRespostas,
  lerRespostas,
  lerRespostasParaApi,
  ISOLAMENTO_RESPOSTAS,
} from "@/lib/respostas/repositorio";

type Contexto = { params: Promise<{ cpf: string; cdCurso: string }> };

function parseCdCurso(id: string): number | null {
  const cdCurso = Number(id);
  return Number.isInteger(cdCurso) && cdCurso > 0 ? cdCurso : null;
}

async function consultarAvaliacao(_request: Request, { params }: Contexto) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { cpf } = await params;
  const cdCurso = parseCdCurso((await params).cdCurso);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const avaliacao = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
    include: { curso: { select: { cdOfertante: true } } },
  });

  if (!avaliacao) {
    return NextResponse.json({ erro: "Avaliação não encontrada" }, { status: 404 });
  }

  if (
    !podeAcessarAvaliacao(sessao.usuario, {
      cpfAluno: avaliacao.cpf,
      cdOfertante: avaliacao.curso.cdOfertante,
    })
  ) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const { curso, ...dados } = avaliacao;
  const respostas = await lerRespostasParaApi(prisma, {
    formulario: "avaliacao",
    cpf,
    cdCurso,
  });

  return NextResponse.json({
    avaliacao: { ...dados, cdOfertante: curso.cdOfertante, respostas },
  });
}

async function gravarRespostasAvaliacao(request: Request, { params }: Contexto) {
  // REQ-SEC-15: mesma ordem RH→CSRF→Sessão→Guard das demais rotas mutantes.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { cpf } = await params;
  const cdCurso = parseCdCurso((await params).cdCurso);

  if (cdCurso === null) {
    return NextResponse.json({ erro: "Id inválido" }, { status: 400 });
  }

  const avaliacaoExistente = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });

  if (!avaliacaoExistente) {
    return NextResponse.json({ erro: "Avaliação não encontrada" }, { status: 404 });
  }

  // AVAL-09: só o próprio Aluno grava, nunca o GO que fez a matrícula.
  if (!podeGerenciarAvaliacao(sessao.usuario, avaliacaoExistente.cpf)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // AVAL-17: somente leitura depois de encerrado, sem exceção.
  if (avaliacaoExistente.status === "ENCERRADO") {
    return NextResponse.json(
      { erro: "Esta avaliação já foi encerrada e não pode mais ser alterada" },
      { status: 409 },
    );
  }

  const corpo = await request.json().catch(() => null);

  // PESSOAL-13: as 7 perguntas de dados pessoais não pertencem mais a este
  // formulário. A checagem é EXPLÍCITA, no mesmo estilo de `temChaveDeParte2`
  // logo abaixo, porque `z.object()` descarta chave desconhecida em silêncio:
  // sem ela o PATCH devolveria 200 e ignoraria o campo, em vez de 400.
  // Roda antes do `safeParse` e antes da transação, então nenhuma linha é
  // gravada - nem as chaves válidas que vieram no mesmo corpo.
  const chavesPessoaisEnviadas = Object.keys(corpo ?? {}).filter((chave) =>
    (CHAVES_DADOS_PESSOAIS as readonly string[]).includes(chave),
  );

  if (chavesPessoaisEnviadas.length > 0) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const entrada = respostasAvaliacaoParcialSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const alvo = { formulario: "avaliacao" as const, cpf, cdCurso };

  // AVAL-07: merge raso - só as chaves enviadas são alteradas (RESP-01,
  // RESP-03).
  const respostasAtuais = await lerRespostas(prisma, alvo);
  const respostasMescladas = { ...respostasAtuais, ...entrada.data };

  // AVAL-08: parte1Completa é recalculado a cada gravação que toca a Parte 1
  // (e a cada gravação, na prática, já que o cálculo roda sobre o estado
  // mesclado completo).
  const { completo: parte1CompletaResultante } = validarCompletudeParte1(
    respostasMescladas,
  );

  // AVAL-10: uma chave de Parte 2 só é aceita se a Parte 1 já está completa
  // no estado RESULTANTE (considerando o próprio patch) - nada é persistido
  // quando o gate não é satisfeito, nem as chaves de Parte 1 do mesmo PATCH.
  const chavesEnviadas = Object.keys(entrada.data);
  const temChaveDeParte2 = chavesEnviadas.some(
    (chave) => !(CHAVES_PARTE_1 as readonly string[]).includes(chave),
  );

  if (temChaveDeParte2 && !parte1CompletaResultante) {
    return NextResponse.json(
      { erro: "Complete a Parte 1 antes de responder a avaliação do curso" },
      { status: 400 },
    );
  }

  // O gate acima roda ANTES da transação: quando ele reprova, nenhuma linha
  // é gravada, nem as chaves de Parte 1 que vieram no mesmo PATCH (RESP-10).
  const { avaliacao, respostas } = await prisma.$transaction(async (tx) => {
    await gravarRespostas(tx, alvo, entrada.data);
    return {
      avaliacao: await tx.avaliacaoAluno.update({
        where: { cpf_cdCurso: { cpf, cdCurso } },
        data: { parte1Completa: parte1CompletaResultante },
      }),
      // Estado MESCLADO relido do banco, não `respostasMescladas` calculado
      // antes da gravação: o cliente vê o que ficou persistido de fato.
      respostas: await lerRespostasParaApi(tx, alvo),
    };
  }, ISOLAMENTO_RESPOSTAS);

  return NextResponse.json({ avaliacao: { ...avaliacao, respostas } });
}

export const GET = comTratamentoDeErro(consultarAvaliacao);
export const PATCH = comTratamentoDeErro(gravarRespostasAvaliacao);
