// Emissão do embed token do Power BI (dashboard-powerbi, AD-056).
//
// Port do `powerbi.service.mjs` da rotina do cliente, com três mudanças:
// relatório, identidade e role chegam por pedido (catálogo por perfil); o
// timeout cai de 30 s para 10 s, para o pior caso (Entra + GenerateToken +
// uma nova tentativa) ficar abaixo dos 60 s do nginx; e 429/503 ganham uma
// única nova tentativa (PBI-17).
//
// O token do Entra é do APLICATIVO e serve a todos os usuários: fica em
// cache até 120 s antes de vencer, e pedidos simultâneos esperam a mesma
// busca (`pendente`). O embed token é de UMA pessoa: um `GenerateToken` por
// pedido, nunca reaproveitado (PBI-19). Medido em 2026-11-25 com 2000
// pedidos simultâneos contra a Microsoft simulada.
//
// Nenhum erro daqui carrega corpo de resposta, token ou segredo (PBI-23).
import {
  lerConfiguracaoPowerBi,
  type ConfiguracaoPowerBi,
  type LeituraConfiguracao,
  type RelatorioPowerBi,
} from "./configuracao";

const ESCOPO = "https://analysis.windows.net/powerbi/api/.default";
const URL_GENERATE_TOKEN = "https://api.powerbi.com/v1.0/myorg/GenerateToken";
const TIMEOUT_MS = 10_000;
const MARGEM_TOKEN_ENTRA_MS = 120_000;
const ESPERA_PADRAO_MS = 1_000;
const ESPERA_MAXIMA_MS = 5_000;

export interface EmbedPowerBi {
  reportId: string;
  embedUrl: string;
  embedToken: string;
  expiration: string;
}

export interface PedidoEmbed {
  relatorio: RelatorioPowerBi;
  username: string;
  role: string;
}

/** Falha ao falar com a Microsoft. `status` null = sem resposta (rede ou timeout). */
export class ErroMicrosoft extends Error {
  constructor(readonly status: number | null) {
    super(status === null ? "Microsoft sem resposta" : `Microsoft HTTP ${status}`);
    this.name = "ErroMicrosoft";
  }
}

export interface OpcoesServico {
  http?: typeof fetch;
  agora?: () => number;
  esperar?: (ms: number) => Promise<void>;
}

/** `Retry-After` em segundos, limitado a 5 s; ausente ou inválido vale 1 s. */
function esperaDoRetryAfter(cabecalho: string | null): number {
  const segundos = cabecalho === null ? Number.NaN : Number(cabecalho);
  if (!Number.isFinite(segundos) || segundos < 0) {
    return ESPERA_PADRAO_MS;
  }
  return Math.min(segundos * 1000, ESPERA_MAXIMA_MS);
}

export function criarServicoPowerBi(config: ConfiguracaoPowerBi, opcoes: OpcoesServico = {}) {
  const http = opcoes.http ?? fetch;
  const agora = opcoes.agora ?? Date.now;
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let cache: { token: string; ate: number } | undefined;
  let pendente: Promise<string> | undefined;

  async function postar(
    url: string,
    headers: Record<string, string>,
    body: string | URLSearchParams,
  ): Promise<Record<string, unknown>> {
    for (let tentativa = 1; ; tentativa++) {
      let resposta: Response;
      try {
        resposta = await http(url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new ErroMicrosoft(null);
      }

      if (resposta.ok) {
        try {
          return (await resposta.json()) as Record<string, unknown>;
        } catch {
          throw new ErroMicrosoft(resposta.status);
        }
      }

      if (tentativa === 1 && (resposta.status === 429 || resposta.status === 503)) {
        await esperar(esperaDoRetryAfter(resposta.headers.get("retry-after")));
        continue;
      }

      throw new ErroMicrosoft(resposta.status);
    }
  }

  async function tokenEntra(): Promise<string> {
    if (cache && agora() < cache.ate) {
      return cache.token;
    }

    pendente ??= (async () => {
      const d = await postar(
        `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
        { "Content-Type": "application/x-www-form-urlencoded" },
        new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "client_credentials",
          scope: ESCOPO,
        }),
      );
      const expiraEm = Number(d.expires_in);
      if (typeof d.access_token !== "string" || !d.access_token || !Number.isFinite(expiraEm)) {
        throw new ErroMicrosoft(200);
      }
      cache = { token: d.access_token, ate: agora() + expiraEm * 1000 - MARGEM_TOKEN_ENTRA_MS };
      return cache.token;
    })().finally(() => {
      pendente = undefined;
    });

    return pendente;
  }

  return {
    async gerarEmbed(pedido: PedidoEmbed): Promise<EmbedPowerBi> {
      const token = await tokenEntra();
      const d = await postar(
        URL_GENERATE_TOKEN,
        { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        JSON.stringify({
          datasets: [{ id: config.datasetId }],
          reports: [{ id: pedido.relatorio.reportId, allowEdit: false }],
          identities: [
            { username: pedido.username, roles: [pedido.role], datasets: [config.datasetId] },
          ],
        }),
      );

      if (
        typeof d.token !== "string" ||
        !d.token ||
        typeof d.expiration !== "string" ||
        !Number.isFinite(Date.parse(d.expiration))
      ) {
        throw new ErroMicrosoft(200);
      }

      return {
        reportId: pedido.relatorio.reportId,
        embedUrl: pedido.relatorio.embedUrl,
        embedToken: d.token,
        expiration: d.expiration,
      };
    },
  };
}

export type ServicoPowerBi = ReturnType<typeof criarServicoPowerBi>;

export type ObtencaoServico =
  | { ok: true; servico: ServicoPowerBi; config: ConfiguracaoPowerBi }
  | Extract<LeituraConfiguracao, { ok: false }>;

// Em `globalThis`, como o PrismaClient (`lib/db/prisma.ts`): o hot reload do
// dev não descarta o cache do Entra. A chave é a própria configuração, então
// trocar uma variável e reiniciar cria um serviço novo.
const global = globalThis as unknown as {
  servicoPowerBi?: { chave: string; servico: ServicoPowerBi; config: ConfiguracaoPowerBi };
};

/** Serviço criado no primeiro uso, nunca no carregamento do módulo (o build roda sem config). */
export function obterServicoPowerBi(
  env: Record<string, string | undefined> = process.env,
): ObtencaoServico {
  const leitura = lerConfiguracaoPowerBi(env);
  if (!leitura.ok) {
    return leitura;
  }

  const chave = JSON.stringify(leitura.config);
  if (global.servicoPowerBi?.chave !== chave) {
    global.servicoPowerBi = { chave, servico: criarServicoPowerBi(leitura.config), config: leitura.config };
  }

  return { ok: true, servico: global.servicoPowerBi.servico, config: global.servicoPowerBi.config };
}
