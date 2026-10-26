// PATCH /api/usuarios/me/dados-cadastrais (AD-050).
//
// Nome e e-mail que AM/GT/VT/VO declaram depois do 1º login: a criação só
// pede o documento, e quem decide quando a tela abre é
// `requireDadosCadastraisCompletos` (nome vazio). Opera sempre sobre o
// documento da própria sessão, nunca recebe documento na URL nem no corpo -
// mesmo padrão de `PATCH /api/usuarios/me/organizacao`.
//
// Fecha depois da primeira gravação, como os dados organizacionais (OGO-05):
// correções seguintes são da gestão de usuários, não desta tela.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { dadosCadastraisSchema } from "@/lib/validation/schemas/dados-cadastrais.schema";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";

async function gravarDadosCadastrais(request: Request) {
  const sessao = await exigirMutacao(request);

  // GO e AL declaram nome e e-mail nas próprias telas de onboarding.
  if (sessao.usuario.tipo === "GO" || sessao.usuario.tipo === "AL") {
    throw erroHttp(403, "Acesso negado");
  }

  if (sessao.usuario.nome) {
    throw erroHttp(409, "Dados cadastrais já informados");
  }

  const entrada = await corpoValidado(request, dadosCadastraisSchema);

  const usuario = await prisma.usuario.update({
    where: { documento: sessao.usuario.documento },
    data: { nome: entrada.nome, email: entrada.email },
    select: { documento: true, nome: true, email: true },
  });

  return NextResponse.json({ usuario, proximaRota: "/painel" });
}

export const PATCH = comTratamentoDeErro(gravarDadosCadastrais);
