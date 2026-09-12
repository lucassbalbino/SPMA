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
import { obterSessao } from "@/lib/auth/session";
import { podeAcessarOfertante, podeEditarOfertante } from "@/lib/auth/guards";
import { organizacaoSchema } from "@/lib/validation/schemas/organizacao.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

type Contexto = { params: Promise<{ documento: string }> };

// Nunca seleciona `senhaHash`/campos de rate-limit: esta rota expõe só os
// dados organizacionais do GO, não o registro de Usuario inteiro.
const CAMPOS_ORGANIZACAO = {
  documento: true,
  nome: true,
  responsavel: true,
  email: true,
  telefone: true,
  uf: true,
  municipio: true,
} as const;

/** O alvo desta rota é sempre um GO - um documento que existe mas não é GO reprova igual a um documento inexistente. */
async function buscarGO(documento: string) {
  return prisma.usuario.findUnique({
    where: { documento, tipo: "GO" },
    select: CAMPOS_ORGANIZACAO,
  });
}

async function consultarOrganizacao(_request: Request, { params }: Contexto) {
  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { documento } = await params;

  // REQ-OV-05: escopo checado antes de revelar se o GO existe - um GO/VO
  // fora de escopo recebe 403, não 404 (não vaza existência fora do escopo).
  if (!podeAcessarOfertante(sessao.usuario, documento)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const usuario = await buscarGO(documento);

  if (!usuario) {
    return NextResponse.json({ erro: "Ofertante não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ usuario });
}

async function editarOrganizacao(request: Request, { params }: Contexto) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes até da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { documento } = await params;

  if (!podeEditarOfertante(sessao.usuario, documento)) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const existente = await buscarGO(documento);

  if (!existente) {
    return NextResponse.json({ erro: "Ofertante não encontrado" }, { status: 404 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = organizacaoSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;
  const usuario = await prisma.usuario.update({
    where: { documento },
    data: {
      nome: dados.nome,
      responsavel: dados.responsavel ?? null,
      email: dados.email ?? null,
      telefone: dados.telefone ?? null,
      uf: dados.uf,
      municipio: dados.municipio ?? null,
    },
    select: CAMPOS_ORGANIZACAO,
  });

  return NextResponse.json({ usuario });
}

export const GET = comTratamentoDeErro(consultarOrganizacao);
export const PATCH = comTratamentoDeErro(editarOrganizacao);
