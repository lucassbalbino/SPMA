// POST /api/pre-cursos - criação de pré-curso (REQ-PC-01/02/03).
// GET /api/pre-cursos - listagem escopada por Ofertante (REQ-PC-14).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarPreCurso } from "@/lib/auth/guards";
import { criarPreCursoSchema } from "@/lib/validation/schemas/pre-curso.schema";
import { validarAlocacao } from "@/lib/verba/saldo";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { escopoDeLeitura, whereDeEscopo } from "@/lib/api/escopo";
import {
  LINHAS_RESPOSTA_ORDENADAS,
  montarRespostas,
  respostasOuNulo,
} from "@/lib/respostas/repositorio";

async function criarPreCurso(request: Request) {
  const sessao = await exigirMutacao(request);
  const dados = await corpoValidado(request, criarPreCursoSchema);

  const verba = await prisma.verba.findUnique({ where: { cdVerba: dados.cdVerba } });

  if (!verba) {
    throw erroHttp(400, "Verba informada não existe");
  }

  // REQ-PC-01/03: só o GO vinculado ao Ofertante da Verba cria o pré-curso.
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

  // O PÓS-CURSO NASCE JUNTO DO CURSO (decisão do usuário, 2026-10-09). Não é
  // duplicação acidental de POST /api/pos-cursos: Pré-Curso e Pós-Curso não
  // são dois cursos (AD-040 - `PosCurso.CD_Curso` é PK e FK 1:1 para
  // `PreCurso.CD_Curso`, sem identidade própria), então criar um curso cria os
  // dois questionários. Numa transação pelo mesmo motivo de POST
  // /api/usuarios, que já cria usuário + verba + matrícula num passo só: um
  // erro no meio não pode deixar curso sem pós-curso.
  //
  // É o ÚNICO jeito de um PosCurso nascer: a tela /pos-cursos/novo e o POST
  // /api/pos-cursos foram removidos (2026-10-09), porque criar pós-curso
  // avulso deixou de ser um ato possível. Mexer nesta transação é mexer na
  // criação de pós-curso do sistema inteiro.
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

async function listarPreCursos(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PC-14: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam
  // no filtro do cliente (ver `lib/api/escopo.ts`).
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  if (escopo.tipo === "proprioAluno") {
    throw erroHttp(403, "Acesso negado");
  }

  const registros = await prisma.preCurso.findMany({
    where: whereDeEscopo(
      escopo,
      (cdOfertante) => ({ cdOfertante }),
      () => ({ cdOfertante: "" }),
    ),
    orderBy: { cdCurso: "asc" },
    include: { linhasResposta: LINHAS_RESPOSTA_ORDENADAS },
  });

  return NextResponse.json({
    preCursos: registros.map(({ linhasResposta, ...preCurso }) => ({
      ...preCurso,
      respostas: respostasOuNulo(montarRespostas("preCurso", linhasResposta)),
    })),
  });
}

export const POST = comTratamentoDeErro(criarPreCurso);
export const GET = comTratamentoDeErro(listarPreCursos);
