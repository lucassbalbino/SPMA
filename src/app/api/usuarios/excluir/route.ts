// POST /api/usuarios/excluir - exclui um Aluno cadastrado por engano
// (RU-30 a RU-33, doc 13).
//
// O alvo vai no corpo (`documento`), nunca no caminho (GU-48, AD-029): é o
// CPF de um aluno. Mesma guarda de alvo do `PATCH /api/usuarios` e do reset
// de senha (`exigirAlvoEditavel`), reavaliada a cada request (AD-033). A
// regra do "filho" - o que impede e o que sai junto - é de `excluirAluno`.
import { NextResponse } from "next/server";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { resetarSenhaSchema } from "@/lib/validation/schemas/gestao-usuario.schema";
import { exigirAlvoEditavel } from "@/lib/usuarios/consulta";
import { excluirAluno } from "@/lib/usuarios/gestao";

async function excluir(request: Request) {
  const sessao = await exigirMutacao(request);
  // O corpo é o mesmo do reset: só `{ documento }`, estrito.
  const { documento } = await corpoValidado(request, resetarSenhaSchema);

  const alvo = await exigirAlvoEditavel(sessao.usuario, documento);
  await excluirAluno(alvo.documento);

  return NextResponse.json({ ok: true });
}

export const POST = comTratamentoDeErro(excluir);
