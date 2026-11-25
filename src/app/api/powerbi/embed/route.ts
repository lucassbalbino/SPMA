// GET /api/powerbi/embed - ingresso do dashboard Power BI (dashboard-powerbi,
// AD-056). É o endpoint do manual do cliente, no padrão das rotas do SPMA.
//
// Ordem: sessão (401) -> perfil e identidade (403) -> limite por sessão
// (429) -> configuração (503) -> Microsoft (502) -> 200. As três primeiras
// recusas acontecem sem nenhuma chamada externa.
//
// Nada do pedido é lido: a identidade e o relatório saem só da sessão
// (PBI-05). Nenhum log leva documento, token ou segredo (AD-029, PBI-22).
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirSessao } from "@/lib/api/guardas";
import { erroHttp } from "@/lib/api/erro-http";
import { ROLE_POR_PAINEL, identidadePowerBi, painelDoPerfil } from "@/lib/powerbi/catalogo";
import { criarLimitador } from "@/lib/powerbi/limite";
import { ErroMicrosoft, obterServicoPowerBi } from "@/lib/powerbi/servico";

const limitador = criarLimitador();

async function embed() {
  const { usuario, sessao } = await exigirSessao();

  const painel = painelDoPerfil(usuario.tipo);
  const username = identidadePowerBi(usuario);
  if (!painel || !username) {
    throw erroHttp(403, "Acesso negado");
  }

  if (!limitador.permitir(sessao.id)) {
    throw erroHttp(429, "Muitas requisições. Tente novamente em instantes.");
  }

  const obtido = obterServicoPowerBi();
  if (!obtido.ok) {
    console.error("powerbi.config", obtido.motivo, obtido.variavel);
    throw erroHttp(503, "Dashboard não configurado");
  }

  let resultado;
  try {
    resultado = await obtido.servico.gerarEmbed({
      relatorio: obtido.config.relatorios[painel],
      username,
      role: ROLE_POR_PAINEL[painel],
    });
  } catch (erro) {
    if (erro instanceof ErroMicrosoft) {
      console.error(randomUUID(), "powerbi.embed falhou", erro.status);
      throw erroHttp(502, "Dashboard temporariamente indisponível");
    }
    throw erro;
  }

  console.info("powerbi.embed emitido", { perfil: usuario.tipo, painel });

  return NextResponse.json(
    {
      reportId: resultado.reportId,
      embedUrl: resultado.embedUrl,
      embedToken: resultado.embedToken,
      expiration: resultado.expiration,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = comTratamentoDeErro(embed);
