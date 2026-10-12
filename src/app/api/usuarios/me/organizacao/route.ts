// PATCH /api/usuarios/me/organizacao (UGO-01..04, OGO-03, OGO-04, OGO-05, OGO-07).
//
// Auto-cadastro/completude dos dados organizacionais do próprio GO no 1º
// acesso (substitui o antigo POST /api/ofertantes de auto-cadastro, AD-014).
// Opera sempre sobre o documento da própria sessão, nunca recebe documento
// na URL nem no corpo - mesmo padrão de
// `PATCH /api/usuarios/me/dados-pessoais` (PESSOAL-19 por construção).
//
// Tudo-ou-nada: `organizacaoSchema` exige os 6 campos no mesmo corpo
// (OGO-04), e os 6 vão no mesmo `UPDATE` que liga a flag - ou o corpo inteiro
// valida e persiste, ou nada muda. Diferente de `dados-pessoais` (mescla
// incremental permitida mesmo após completo), este endpoint fecha para sempre
// após a primeira conclusão (OGO-05).
//
// É o ÚNICO escritor de `dadosOrganizacionaisCompletos` (AD-044): a flag
// significa "o GO declarou". `PATCH /api/usuarios/[documento]/organizacao`
// grava os mesmos 6 campos e nunca a liga.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { organizacaoSchema } from "@/lib/validation/schemas/organizacao.schema";
import {
  CAMPOS_ORGANIZACAO,
  dadosOrganizacao,
} from "@/lib/validation/schemas/organizacao-dados";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";

async function gravarOrganizacao(request: Request) {
  const sessao = await exigirMutacao(request);

  // Só o GO tem essa área, reforçado no backend (não só na navegação
  // escondida, AD-039).
  if (sessao.usuario.tipo !== "GO") {
    throw erroHttp(403, "Acesso negado");
  }

  // OGO-05: um GO que já concluiu não se cadastra de novo por aqui - dados
  // preservados, sem tocar no banco. Checado ANTES de validar o corpo: o
  // reenvio é recusado por quem o GO é, não pela forma do que mandou.
  if (sessao.usuario.dadosOrganizacionaisCompletos) {
    throw erroHttp(409, "Dados organizacionais já cadastrados");
  }

  const entrada = await corpoValidado(request, organizacaoSchema);

  const usuario = await prisma.usuario.update({
    where: { documento: sessao.usuario.documento },
    data: { ...dadosOrganizacao(entrada), dadosOrganizacionaisCompletos: true },
    select: CAMPOS_ORGANIZACAO,
  });

  return NextResponse.json({ usuario });
}

export const PATCH = comTratamentoDeErro(gravarOrganizacao);
