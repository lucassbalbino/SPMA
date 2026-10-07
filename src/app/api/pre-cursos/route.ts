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

  const preCurso = await prisma.preCurso.create({
    data: {
      cdOfertante: verba.cdOfertante,
      cdVerba: dados.cdVerba,
      vlCursoAlocado: dados.vlCursoAlocado,
      criadoPor: sessao.usuario.documento,
    },
  });

  // Pré-curso nasce sem nenhuma linha de resposta - `null`, como a coluna
  // JSON devolvia.
  return NextResponse.json({ preCurso: { ...preCurso, respostas: null } }, { status: 201 });
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
