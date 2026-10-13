// POST /api/usuarios/consulta - uma página da lista da gestão de usuários
// (GU-16, GU-17, GU-18, GU-19, GU-20).
//
// É `POST`, e não `GET` com query string, de propósito (GU-48, AD-029): a
// busca pode ser um CPF, e uma URL vai para histórico de navegador, log de
// acesso e proxy. Filtro, busca e página trafegam só no corpo.
//
// Escopo e matriz são reavaliados aqui a cada request (AD-033), pela mesma
// `consultarUsuarios` que a página usa para renderizar a página 1.
import { NextResponse } from "next/server";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { consultaUsuariosSchema } from "@/lib/validation/schemas/gestao-usuario.schema";
import { consultarUsuarios, whereUsuariosVisiveis } from "@/lib/usuarios/consulta";

async function consultar(request: Request) {
  const sessao = await exigirMutacao(request);
  const filtro = await corpoValidado(request, consultaUsuariosSchema);
  const editor = sessao.usuario;

  // GU-19: VT, VO e AL não têm lista. `consultarUsuarios` não aceita esses
  // perfis, então a recusa sai aqui, antes da chamada.
  if (whereUsuariosVisiveis(editor) === null) {
    throw erroHttp(403, "Acesso negado");
  }

  return NextResponse.json(await consultarUsuarios(editor, filtro));
}

export const POST = comTratamentoDeErro(consultar);
