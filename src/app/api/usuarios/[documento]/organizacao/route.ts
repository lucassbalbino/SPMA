// GET/PATCH /api/usuarios/[documento]/organizacao - consulta e edição dos
// dados organizacionais do GO (REQ-OV-02, REQ-OV-03, REQ-OV-05, UGO-01,
// UGO-05, UGO-15, UGO-16).
//
// Substitui GET/PATCH /api/ofertantes/[id]: sem `model Ofertante` separado
// (AD-043), o GO É o próprio Ofertante - os 6 campos organizacionais (nome,
// responsavel, email, telefone, uf, municipio) vivem inline em `Usuario`,
// endereçados pelo próprio documento (CNPJ) do GO, não mais por um id
// substituto de uma tabela à parte.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeAcessarOfertante, podeEditarOfertante } from "@/lib/auth/guards";
import { organizacaoSchema } from "@/lib/validation/schemas/organizacao.schema";
import {
  CAMPOS_ORGANIZACAO,
  dadosOrganizacao,
} from "@/lib/validation/schemas/organizacao-dados";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao, exigirSessao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";

type Contexto = { params: Promise<{ documento: string }> };

/**
 * O alvo desta rota é sempre um GO - um documento que existe mas não é GO
 * reprova igual a um documento inexistente. Lança 404 em vez de devolver
 * `null`: as duas rotas abaixo faziam exatamente a mesma checagem depois da
 * chamada.
 */
async function exigirGO(documento: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { documento, tipo: "GO" },
    select: CAMPOS_ORGANIZACAO,
  });

  if (!usuario) {
    throw erroHttp(404, "Ofertante não encontrado");
  }

  return usuario;
}

async function consultarOrganizacao(_request: Request, { params }: Contexto) {
  const sessao = await exigirSessao();
  const { documento } = await params;

  // REQ-OV-05: escopo checado antes de revelar se o GO existe - um GO/VO
  // fora de escopo recebe 403, não 404 (não vaza existência fora do escopo).
  if (!podeAcessarOfertante(sessao.usuario, documento)) {
    throw erroHttp(403, "Acesso negado");
  }

  return NextResponse.json({ usuario: await exigirGO(documento) });
}

async function editarOrganizacao(request: Request, { params }: Contexto) {
  const sessao = await exigirMutacao(request);
  const { documento } = await params;

  if (!podeEditarOfertante(sessao.usuario, documento)) {
    throw erroHttp(403, "Acesso negado");
  }

  await exigirGO(documento);

  const entrada = await corpoValidado(request, organizacaoSchema);

  const usuario = await prisma.usuario.update({
    where: { documento },
    data: dadosOrganizacao(entrada),
    select: CAMPOS_ORGANIZACAO,
  });

  return NextResponse.json({ usuario });
}

export const GET = comTratamentoDeErro(consultarOrganizacao);
export const PATCH = comTratamentoDeErro(editarOrganizacao);
