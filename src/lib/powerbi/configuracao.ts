// Leitura e validação das variáveis do Power BI (dashboard-powerbi, PBI-06,
// PBI-15).
//
// Nunca lança: o CI compila sem nenhuma variável `SPMA_*`, e uma config
// ausente ou errada só desliga o dashboard (503), nunca o resto do sistema.
// As regras de formato são as da rotina do cliente (`powerbi.service.mjs`).
//
// Uma falha devolve o NOME da variável, nunca o valor: o segredo não pode
// chegar a um log por aqui (PBI-23).
import type { Painel } from "./catalogo";

export interface RelatorioPowerBi {
  reportId: string;
  embedUrl: string;
}

export interface ConfiguracaoPowerBi {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  datasetId: string;
  relatorios: Record<Painel, RelatorioPowerBi>;
}

export type LeituraConfiguracao =
  | { ok: true; config: ConfiguracaoPowerBi }
  | { ok: false; motivo: "ausente" | "invalida"; variavel: string };

type Ambiente = Record<string, string | undefined>;

const GUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const PAINEIS: Painel[] = ["nacional", "ofertante"];

class ConfiguracaoInvalida extends Error {
  constructor(
    readonly motivo: "ausente" | "invalida",
    readonly variavel: string,
  ) {
    super(variavel);
  }
}

function valor(env: Ambiente, nome: string): string | undefined {
  return env[nome]?.trim() || undefined;
}

function obrigatoria(env: Ambiente, nome: string): string {
  const v = valor(env, nome);
  if (!v) {
    throw new ConfiguracaoInvalida("ausente", nome);
  }
  return v;
}

function guid(v: string, nome: string): string {
  if (!GUID.test(v)) {
    throw new ConfiguracaoInvalida("invalida", nome);
  }
  return v;
}

/** Embed URL de `app.powerbi.com/reportEmbed` apontando para o próprio relatório. */
function relatorio(
  reportId: string,
  embedUrl: string,
  nomeId: string,
  nomeUrl: string,
): RelatorioPowerBi {
  guid(reportId, nomeId);

  let url: URL;
  try {
    url = new URL(embedUrl);
  } catch {
    throw new ConfiguracaoInvalida("invalida", nomeUrl);
  }

  if (
    url.origin !== "https://app.powerbi.com" ||
    url.pathname !== "/reportEmbed" ||
    url.searchParams.get("reportId")?.toLowerCase() !== reportId.toLowerCase()
  ) {
    throw new ConfiguracaoInvalida("invalida", nomeUrl);
  }

  return { reportId, embedUrl };
}

export function lerConfiguracaoPowerBi(env: Ambiente): LeituraConfiguracao {
  try {
    const tenantId = obrigatoria(env, "SPMA_TENANT_ID");
    const clientId = obrigatoria(env, "SPMA_CLIENT_ID");
    const clientSecret = obrigatoria(env, "SPMA_CLIENT_SECRET");
    const datasetId = obrigatoria(env, "SPMA_DATASET_ID");
    const reportId = obrigatoria(env, "SPMA_REPORT_ID");
    const embedUrl = obrigatoria(env, "SPMA_EMBED_URL");

    guid(tenantId, "SPMA_TENANT_ID");
    guid(clientId, "SPMA_CLIENT_ID");
    guid(datasetId, "SPMA_DATASET_ID");
    const padrao = relatorio(reportId, embedUrl, "SPMA_REPORT_ID", "SPMA_EMBED_URL");

    // Relatório próprio por painel: o par é tudo ou nada, para metade dele
    // nunca cair no padrão em silêncio.
    const relatorios = {} as Record<Painel, RelatorioPowerBi>;
    for (const painel of PAINEIS) {
      const sufixo = painel.toUpperCase();
      const nomeId = `SPMA_REPORT_ID_${sufixo}`;
      const nomeUrl = `SPMA_EMBED_URL_${sufixo}`;
      const id = valor(env, nomeId);
      const url = valor(env, nomeUrl);

      if (!id && !url) {
        relatorios[painel] = padrao;
      } else if (!id || !url) {
        throw new ConfiguracaoInvalida("invalida", id ? nomeUrl : nomeId);
      } else {
        relatorios[painel] = relatorio(id, url, nomeId, nomeUrl);
      }
    }

    return {
      ok: true,
      config: { tenantId, clientId, clientSecret, datasetId, relatorios },
    };
  } catch (erro) {
    if (erro instanceof ConfiguracaoInvalida) {
      return { ok: false, motivo: erro.motivo, variavel: erro.variavel };
    }
    throw erro;
  }
}
