// PATCH /api/usuarios/me/organizacao (UGO-01, UGO-02, UGO-03, UGO-04).
//
// Auto-cadastro/completude dos dados organizacionais do próprio GO no 1º
// acesso (substitui o antigo POST /api/ofertantes de auto-cadastro, AD-014).
// Opera sempre sobre o documento da própria sessão, nunca recebe documento
// na URL nem no corpo - mesmo padrão de
// `PATCH /api/usuarios/me/dados-pessoais` (PESSOAL-19 por construção).
//
// Tudo-ou-nada: `organizacaoSchema` já exige `nome`/`uf` no mesmo corpo (T10),
// então não há estado "parcialmente preenchido" possível por este endpoint -
// ou o corpo inteiro valida e persiste, ou nada muda. Diferente de
// `dados-pessoais` (mescla incremental permitida mesmo após completo), este
// endpoint fecha para sempre após a primeira conclusão (UGO-01 AC4): editar
// depois é `PATCH /api/usuarios/[documento]/organizacao` (T12).
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

  // UGO-01 AC4: um GO que já concluiu o cadastro organizacional (nome/uf
  // completos) não pode se auto-cadastrar de novo por aqui - dados
  // preservados, sem tocar no banco.
  if (sessao.usuario.nome !== null && sessao.usuario.uf !== null) {
    throw erroHttp(409, "Dados organizacionais já cadastrados");
  }

  const entrada = await corpoValidado(request, organizacaoSchema);

  const usuario = await prisma.usuario.update({
    where: { documento: sessao.usuario.documento },
    data: dadosOrganizacao(entrada),
    select: CAMPOS_ORGANIZACAO,
  });

  return NextResponse.json({ usuario });
}

export const PATCH = comTratamentoDeErro(gravarOrganizacao);
