// POST /api/cursos - O ATO DE CRIAR UM CURSO DO ZERO (REQ-PC-01/02/03).
//
// Criar um curso cria os DOIS questionários numa transação só: PreCurso e
// PosCurso (decisão do usuário, 2026-10-09). Não existe rota para criar um
// pré-curso nem um pós-curso isolado - era o que `POST /api/pre-cursos`
// parecia oferecer, e o nome foi corrigido junto da remoção de
// `POST /api/pos-cursos`.
//
// `/api/pre-cursos` segue existindo para LER: GET (listagem, REQ-PC-14),
// GET/PATCH de `[id]` (o questionário pré) e `[id]/encerrar`. O mesmo vale
// para `/api/pos-cursos`. Criar, não.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarPreCurso } from "@/lib/auth/guards";
import { criarCursoSchema } from "@/lib/validation/schemas/pre-curso.schema";
import { validarAlocacao } from "@/lib/verba/saldo";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";

async function criarCurso(request: Request) {
  const sessao = await exigirMutacao(request);
  const dados = await corpoValidado(request, criarCursoSchema);

  const verba = await prisma.verba.findUnique({ where: { cdVerba: dados.cdVerba } });

  if (!verba) {
    throw erroHttp(400, "Verba informada não existe");
  }

  // REQ-PC-01/03: só o GO vinculado ao Ofertante da Verba cria o curso (e o
  // AM, para qualquer Ofertante - AD-040).
  if (!podeGerenciarPreCurso(sessao.usuario, verba.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // REQ-PC-02: teto de valor (RN-10/AD-016), reuso de cadastro-ofertante-verba.
  const { valido, saldoDisponivel } = await validarAlocacao(
    dados.cdVerba,
    dados.vlCursoAlocado,
  );

  if (!valido) {
    throw erroHttp(400, "Valor alocado excede o saldo disponível da verba", {
      saldoDisponivel,
    });
  }

  // O CURSO É OS DOIS QUESTIONÁRIOS (decisão do usuário, 2026-10-09).
  // Pré-Curso e Pós-Curso não são dois cursos - `PosCurso.CD_Curso` é PK e FK
  // 1:1 para `PreCurso.CD_Curso`, sem identidade própria (AD-040) -, então
  // criar um curso grava os dois, e nenhum dos dois tem rota de criação
  // própria: `/pre-cursos/novo`, `POST /api/pre-cursos`, `/pos-cursos/novo` e
  // `POST /api/pos-cursos` foram todos removidos.
  //
  // Transação pelo mesmo motivo de POST /api/usuarios, que cria usuário +
  // verba + matrícula num passo só: um erro no meio não pode deixar curso pela
  // metade. Como esta é a ÚNICA origem de um PreCurso e de um PosCurso, mexer
  // aqui é mexer na criação de curso do sistema inteiro.
  const { preCurso, posCurso } = await prisma.$transaction(async (tx) => {
    const preCursoCriado = await tx.preCurso.create({
      data: {
        cdOfertante: verba.cdOfertante,
        cdVerba: dados.cdVerba,
        vlCursoAlocado: dados.vlCursoAlocado,
        criadoPor: sessao.usuario.documento,
      },
    });

    const posCursoCriado = await tx.posCurso.create({
      data: { cdCurso: preCursoCriado.cdCurso, criadoPor: sessao.usuario.documento },
    });

    return { preCurso: preCursoCriado, posCurso: posCursoCriado };
  });

  // Os dois nascem sem nenhuma linha de resposta - `null`, como a coluna
  // JSON devolvia.
  return NextResponse.json(
    {
      preCurso: { ...preCurso, respostas: null },
      posCurso: { ...posCurso, respostas: null },
    },
    { status: 201 },
  );
}

export const POST = comTratamentoDeErro(criarCurso);
