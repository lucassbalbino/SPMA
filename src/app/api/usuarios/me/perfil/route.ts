// PATCH /api/usuarios/me/perfil - Editar Perfil (RU-49 a RU-54).
//
// Nome, e-mail e telefone do próprio usuário da sessão. Nunca recebe
// documento: um `documento` no corpo é descartado pelo schema, e o `UPDATE`
// usa sempre o da sessão (mesmo padrão de `/me/dados-cadastrais` e
// `/me/organizacao`). Diferente deles, não fecha depois da primeira
// gravação: é a edição posterior, que o cliente pediu para todos os perfis.
//
// O Aluno edita pelo formulário de dados pessoais, que já grava nome e
// e-mail (AD-050.3) e passou a gravar o telefone - por aqui, 403.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { perfilSchema } from "@/lib/validation/schemas/perfil.schema";

async function gravarPerfil(request: Request) {
  const sessao = await exigirMutacao(request);

  if (sessao.usuario.tipo === "AL") {
    throw erroHttp(403, "Acesso negado");
  }

  const entrada = await corpoValidado(request, perfilSchema);

  // RU-51: para o GO o telefone é o contato da organização, obrigatório desde
  // o cadastro (OGO-04).
  if (sessao.usuario.tipo === "GO" && entrada.telefone === null) {
    throw erroHttp(400, "Telefone é obrigatório");
  }

  const usuario = await prisma.usuario.update({
    where: { documento: sessao.usuario.documento },
    data: { nome: entrada.nome, email: entrada.email, telefone: entrada.telefone },
    select: { documento: true, nome: true, email: true, telefone: true },
  });

  return NextResponse.json({ usuario });
}

export const PATCH = comTratamentoDeErro(gravarPerfil);
