// GET /api/avaliacoes/[cpf]/[cdCurso] - consulta escopada (AVAL-20/21/23).
// PATCH /api/avaliacoes/[cpf]/[cdCurso] - gravação parcial com os dois gates
// (AVAL-07/08/09/10/11/14, bloqueada em avaliação ENCERRADO por AVAL-17).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeAcessarAvaliacao, podeGerenciarAvaliacao } from "@/lib/auth/guards";
import {
  CHAVES_PARTE_1,
  respostasAvaliacaoParcialSchema,
} from "@/lib/validation/schemas/avaliacao.schema";
import { CHAVES_DADOS_PESSOAIS } from "@/lib/validation/schemas/dados-pessoais.schema";
import { validarCompletudeParte1 } from "@/lib/avaliacao/completude";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoJson, idPositivo, validado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { lerRespostas, lerRespostasParaApi } from "@/lib/respostas/repositorio";
import { aplicarPatchRespostas } from "@/lib/respostas/patch";

type Contexto = { params: Promise<{ cpf: string; cdCurso: string }> };

async function consultarAvaliacao(_request: Request, { params }: Contexto) {
  const sessao = await exigirSessao();
  const { cpf, cdCurso: cdCursoBruto } = await params;
  const cdCurso = idPositivo(cdCursoBruto);

  const avaliacao = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
    include: { curso: { select: { cdOfertante: true } } },
  });

  if (!avaliacao) {
    throw erroHttp(404, "Avaliação não encontrada");
  }

  // As guardas de Avaliação continuam recebendo `cpf` (é sempre a
  // identidade de um Aluno, ver design.md) - só a fonte do valor muda:
  // `usuario.documento`, não mais `usuario.cpf` (renomeado por T4).
  if (
    !podeAcessarAvaliacao(
      { ...sessao.usuario, cpf: sessao.usuario.documento },
      { cpfAluno: avaliacao.cpf, cdOfertante: avaliacao.curso.cdOfertante },
    )
  ) {
    throw erroHttp(403, "Acesso negado");
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
  const sessao = await exigirMutacao(request);
  const { cpf, cdCurso: cdCursoBruto } = await params;
  const cdCurso = idPositivo(cdCursoBruto);

  const avaliacaoExistente = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf, cdCurso } },
  });

  if (!avaliacaoExistente) {
    throw erroHttp(404, "Avaliação não encontrada");
  }

  // AVAL-09: só o próprio Aluno grava, nunca o GO que fez a matrícula.
  if (
    !podeGerenciarAvaliacao(
      { tipo: sessao.usuario.tipo, cpf: sessao.usuario.documento },
      avaliacaoExistente.cpf,
    )
  ) {
    throw erroHttp(403, "Acesso negado");
  }

  // AVAL-17: somente leitura depois de encerrado, sem exceção.
  if (avaliacaoExistente.status === "ENCERRADO") {
    throw erroHttp(
      409,
      "Esta avaliação já foi encerrada e não pode mais ser alterada",
    );
  }

  // PESSOAL-13: as 7 perguntas de dados pessoais não pertencem mais a este
  // formulário. A checagem é EXPLÍCITA, no mesmo estilo de `temChaveDeParte2`
  // logo abaixo, porque `z.object()` descarta chave desconhecida em silêncio:
  // sem ela o PATCH devolveria 200 e ignoraria o campo, em vez de 400.
  // Roda antes do `safeParse` e antes da transação, então nenhuma linha é
  // gravada - nem as chaves válidas que vieram no mesmo corpo. Por isso o
  // corpo é lido CRU uma vez e validado em seguida, em vez de duas leituras.
  const corpo = await corpoJson(request);
  const enviouChavePessoal = Object.keys(corpo ?? {}).some((chave) =>
    (CHAVES_DADOS_PESSOAIS as readonly string[]).includes(chave),
  );

  if (enviouChavePessoal) {
    throw erroHttp(400, "Dados inválidos");
  }

  const patch = validado(corpo, respostasAvaliacaoParcialSchema);

  // AVAL-08: `parte1Completa` é recalculado a cada gravação, sobre o estado
  // MESCLADO completo - por isso o merge é lido aqui e não só dentro de
  // `aplicarPatchRespostas`: o valor resultante é gravado na própria
  // AvaliacaoAluno, além de governar o gate abaixo.
  const alvo = { formulario: "avaliacao" as const, cpf, cdCurso };
  const mescladas = { ...(await lerRespostas(prisma, alvo)), ...patch };
  const { completo: parte1CompletaResultante } = validarCompletudeParte1(mescladas);

  // AVAL-10: uma chave de Parte 2 só é aceita se a Parte 1 já está completa
  // no estado RESULTANTE (considerando o próprio patch). O gate roda ANTES da
  // transação: quando reprova, nada é persistido, nem as chaves de Parte 1 do
  // mesmo PATCH (RESP-10).
  const temChaveDeParte2 = Object.keys(patch).some(
    (chave) => !(CHAVES_PARTE_1 as readonly string[]).includes(chave),
  );

  if (temChaveDeParte2 && !parte1CompletaResultante) {
    throw erroHttp(400, "Complete a Parte 1 antes de responder a avaliação do curso");
  }

  const { registro, respostas } = await aplicarPatchRespostas({
    alvo,
    patch,
    gravarRegistro: (tx) =>
      tx.avaliacaoAluno.update({
        where: { cpf_cdCurso: { cpf, cdCurso } },
        data: { parte1Completa: parte1CompletaResultante },
      }),
  });

  return NextResponse.json({ avaliacao: { ...registro, respostas } });
}

export const GET = comTratamentoDeErro(consultarAvaliacao);
export const PATCH = comTratamentoDeErro(gravarRespostasAvaliacao);
