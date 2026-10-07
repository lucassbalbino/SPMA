// GET /api/pos-cursos/[cdCurso] - consulta escopada (REQ-PO-11).
// PATCH /api/pos-cursos/[cdCurso] - gravação parcial de respostas
// (REQ-PO-04/05/06, bloqueada em pós-curso ENCERRADO por REQ-PO-08).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeAcessarOfertante, podeGerenciarPosCurso } from "@/lib/auth/guards";
import {
  datasReaisEmOrdem,
  respostasPosCursoSchema,
} from "@/lib/validation/schemas/pos-curso.schema";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado, idPositivo } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { lerRespostasParaApi } from "@/lib/respostas/repositorio";
import { aplicarPatchRespostas } from "@/lib/respostas/patch";

type Contexto = { params: Promise<{ cdCurso: string }> };

/** PosCurso não tem CD_Ofertante próprio - o escopo vem do PreCurso pai. */
const COM_OFERTANTE_DO_PAI = {
  preCurso: { select: { cdOfertante: true } },
} as const;

async function consultarPosCurso(_request: Request, { params }: Contexto) {
  const sessao = await exigirSessao();
  const cdCurso = idPositivo((await params).cdCurso);

  const posCurso = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: COM_OFERTANTE_DO_PAI,
  });

  if (!posCurso) {
    throw erroHttp(404, "Pós-curso não encontrado");
  }

  if (!podeAcessarOfertante(sessao.usuario, posCurso.preCurso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  const { preCurso, ...dados } = posCurso;
  const respostas = await lerRespostasParaApi(prisma, { formulario: "posCurso", cdCurso });

  return NextResponse.json({
    posCurso: { ...dados, cdOfertante: preCurso.cdOfertante, respostas },
  });
}

async function gravarRespostasPosCurso(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const cdCurso = idPositivo((await params).cdCurso);

  const posCursoExistente = await prisma.posCurso.findUnique({
    where: { cdCurso },
    include: COM_OFERTANTE_DO_PAI,
  });

  if (!posCursoExistente) {
    throw erroHttp(404, "Pós-curso não encontrado");
  }

  if (!podeGerenciarPosCurso(sessao.usuario, posCursoExistente.preCurso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // REQ-PO-08: somente leitura depois de encerrado, sem exceção.
  if (posCursoExistente.status === "ENCERRADO") {
    throw erroHttp(409, "Pós-curso já encerrado, somente leitura");
  }

  const patch = await corpoValidado(request, respostasPosCursoSchema.partial());

  // REQ-PO-04: merge raso - só as chaves enviadas são alteradas (RESP-01,
  // RESP-03). REQ-PO-06: a validação roda contra o estado MESCLADO, não só o
  // corpo do PATCH - cobre tanto as duas datas chegando no mesmo PATCH quanto
  // uma data setada num PATCH anterior e a outra agora.
  const { registro, respostas } = await aplicarPatchRespostas({
    alvo: { formulario: "posCurso", cdCurso },
    patch,
    validarMesclado: (mescladas) => {
      if (!datasReaisEmOrdem(mescladas)) {
        throw erroHttp(400, "Data de término não pode ser anterior à data de início");
      }
    },
    gravarRegistro: (tx) => tx.posCurso.findUniqueOrThrow({ where: { cdCurso } }),
  });

  return NextResponse.json({ posCurso: { ...registro, respostas } });
}

export const GET = comTratamentoDeErro(consultarPosCurso);
export const PATCH = comTratamentoDeErro(gravarRespostasPosCurso);
