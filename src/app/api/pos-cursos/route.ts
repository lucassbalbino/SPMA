// POST /api/pos-cursos - criação de pós-curso (REQ-PO-01/02/03).
// GET /api/pos-cursos - listagem escopada por Ofertante (REQ-PO-12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeGerenciarPosCurso } from "@/lib/auth/guards";
import { criarPosCursoSchema } from "@/lib/validation/schemas/pos-curso.schema";
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

async function criarPosCurso(request: Request) {
  const sessao = await exigirMutacao(request);
  const { cdCurso } = await corpoValidado(request, criarPosCursoSchema);

  const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCurso) {
    throw erroHttp(404, "Pré-curso não encontrado");
  }

  // REQ-PO-01/03: só o GO vinculado ao Ofertante do Pré-Curso pai cria o pós-curso.
  if (!podeGerenciarPosCurso(sessao.usuario, preCurso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // REQ-PO-02: relação 1:1 - checagem explícita antes do create para devolver
  // um 409 limpo em vez de deixar a constraint de PK do Prisma estourar como 500.
  const posCursoExistente = await prisma.posCurso.findUnique({ where: { cdCurso } });

  if (posCursoExistente) {
    throw erroHttp(409, "Este curso já tem um pós-curso");
  }

  const posCurso = await prisma.posCurso.create({
    data: { cdCurso, criadoPor: sessao.usuario.documento },
  });

  // Pós-curso nasce sem nenhuma linha de resposta - `null`, como a coluna
  // JSON devolvia.
  return NextResponse.json({ posCurso: { ...posCurso, respostas: null } }, { status: 201 });
}

async function listarPosCursos(request: Request) {
  const sessao = await exigirSessao();
  const filtro = new URL(request.url).searchParams.get("cdOfertante");

  // REQ-PO-12: escopo resolvido por `escopoDeLeitura` - GO/VO nunca confiam
  // no filtro do cliente (ver `lib/api/escopo.ts`). PosCurso não tem
  // CD_Ofertante próprio - o filtro é aplicado via o PreCurso pai (relação).
  const escopo = escopoDeLeitura(sessao.usuario, filtro);

  if (escopo.tipo === "proprioAluno") {
    throw erroHttp(403, "Acesso negado");
  }

  // Inclui o cdOfertante do PreCurso pai na resposta - PosCurso não tem essa
  // coluna própria, e a listagem precisa expor a que Ofertante cada item
  // pertence (mesmo formato "achatado" que GET /api/pre-cursos já entrega).
  const posCursos = await prisma.posCurso.findMany({
    where: whereDeEscopo(
      escopo,
      (cdOfertante) => ({ preCurso: { cdOfertante } }),
      () => ({ preCurso: { cdOfertante: "" } }),
    ),
    orderBy: { cdCurso: "asc" },
    include: {
      preCurso: { select: { cdOfertante: true } },
      linhasResposta: LINHAS_RESPOSTA_ORDENADAS,
    },
  });

  return NextResponse.json({
    posCursos: posCursos.map(({ preCurso, linhasResposta, ...posCurso }) => ({
      ...posCurso,
      cdOfertante: preCurso.cdOfertante,
      respostas: respostasOuNulo(montarRespostas("posCurso", linhasResposta)),
    })),
  });
}

export const POST = comTratamentoDeErro(criarPosCurso);
export const GET = comTratamentoDeErro(listarPosCursos);
