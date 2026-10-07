// GET /api/pre-cursos/[id] - consulta escopada (REQ-PC-13).
// PATCH /api/pre-cursos/[id] - gravação parcial de respostas (REQ-PC-04/05/06,
// bloqueada em pré-curso ENCERRADO por REQ-PC-12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeAcessarOfertante, podeGerenciarPreCurso } from "@/lib/auth/guards";
import {
  ordemDatasValida,
  respostasPreCursoSchema,
} from "@/lib/validation/schemas/pre-curso.schema";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado, idPositivo } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { lerRespostasParaApi } from "@/lib/respostas/repositorio";
import { aplicarPatchRespostas } from "@/lib/respostas/patch";

type Contexto = { params: Promise<{ id: string }> };

async function consultarPreCurso(_request: Request, { params }: Contexto) {
  const sessao = await exigirSessao();
  const cdCurso = idPositivo((await params).id);

  const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCurso) {
    throw erroHttp(404, "Pré-curso não encontrado");
  }

  if (!podeAcessarOfertante(sessao.usuario, preCurso.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  const respostas = await lerRespostasParaApi(prisma, { formulario: "preCurso", cdCurso });

  return NextResponse.json({ preCurso: { ...preCurso, respostas } });
}

async function gravarRespostasPreCurso(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const cdCurso = idPositivo((await params).id);

  const preCursoExistente = await prisma.preCurso.findUnique({ where: { cdCurso } });

  if (!preCursoExistente) {
    throw erroHttp(404, "Pré-curso não encontrado");
  }

  if (!podeGerenciarPreCurso(sessao.usuario, preCursoExistente.cdOfertante)) {
    throw erroHttp(403, "Acesso negado");
  }

  // REQ-PC-12: somente leitura depois de encerrado, sem exceção.
  if (preCursoExistente.status === "ENCERRADO") {
    throw erroHttp(409, "Pré-curso já encerrado, somente leitura");
  }

  const patch = await corpoValidado(request, respostasPreCursoSchema.partial());

  // REQ-PC-04: merge raso - só as chaves enviadas são alteradas (RESP-01,
  // RESP-03). Edge case da spec (Planejamento): a validação de ordem das
  // datas roda contra o estado MESCLADO, não só o corpo do PATCH - cobre
  // tanto as duas datas chegando no mesmo PATCH quanto uma data setada num
  // PATCH anterior e a outra agora.
  const { registro, respostas } = await aplicarPatchRespostas({
    alvo: { formulario: "preCurso", cdCurso },
    patch,
    validarMesclado: (mescladas) => {
      if (!ordemDatasValida(mescladas)) {
        throw erroHttp(400, "Data de término não pode ser anterior à data de início");
      }
    },
    gravarRegistro: (tx) => tx.preCurso.findUniqueOrThrow({ where: { cdCurso } }),
  });

  return NextResponse.json({ preCurso: { ...registro, respostas } });
}

export const GET = comTratamentoDeErro(consultarPreCurso);
export const PATCH = comTratamentoDeErro(gravarRespostasPreCurso);
