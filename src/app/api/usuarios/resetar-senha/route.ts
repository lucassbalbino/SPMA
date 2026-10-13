// POST /api/usuarios/resetar-senha - volta um usuário ao estado de 1º acesso
// (GU-41, GU-42, GU-43, GU-44).
//
// O alvo vai no corpo (`documento`), nunca no caminho (GU-48, AD-029). O
// corpo não aceita mais nada além dele (`.strict()`): o gestor nunca define
// a senha de outro usuário, só a apaga (GU-47).
//
// Mesma guarda de alvo do `PATCH /api/usuarios` (`exigirAlvoEditavel`),
// reavaliada a cada request (AD-033).
import { NextResponse } from "next/server";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { resetarSenhaSchema } from "@/lib/validation/schemas/gestao-usuario.schema";
import { exigirAlvoEditavel } from "@/lib/usuarios/consulta";
import { resetarSenha } from "@/lib/usuarios/gestao";

async function resetar(request: Request) {
  const sessao = await exigirMutacao(request);
  const { documento } = await corpoValidado(request, resetarSenhaSchema);

  const alvo = await exigirAlvoEditavel(sessao.usuario, documento);
  await resetarSenha(alvo.documento);

  return NextResponse.json({ ok: true });
}

export const POST = comTratamentoDeErro(resetar);
