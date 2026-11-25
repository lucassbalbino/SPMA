import { describe, expect, it } from "vitest";
import { lerConfiguracaoPowerBi } from "./configuracao";

const TENANT = "11111111-1111-1111-1111-111111111111";
const CLIENT = "22222222-2222-2222-2222-222222222222";
const DATASET = "33333333-3333-3333-3333-333333333333";
const REPORT = "44444444-4444-4444-4444-44444444abcd";
const REPORT_OFERTANTE = "55555555-5555-5555-5555-555555555555";
const SEGREDO = "segredo-de-teste~nao-real";

const urlDe = (reportId: string) =>
  `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=66666666-6666-6666-6666-666666666666&w=2`;

function envValido(extra: Record<string, string | undefined> = {}) {
  return {
    SPMA_TENANT_ID: TENANT,
    SPMA_CLIENT_ID: CLIENT,
    SPMA_CLIENT_SECRET: SEGREDO,
    SPMA_DATASET_ID: DATASET,
    SPMA_REPORT_ID: REPORT,
    SPMA_EMBED_URL: urlDe(REPORT),
    ...extra,
  };
}

const OBRIGATORIAS = [
  "SPMA_TENANT_ID",
  "SPMA_CLIENT_ID",
  "SPMA_CLIENT_SECRET",
  "SPMA_DATASET_ID",
  "SPMA_REPORT_ID",
  "SPMA_EMBED_URL",
] as const;

describe("lerConfiguracaoPowerBi - configuração válida (PBI-06)", () => {
  it("as 6 obrigatórias válidas dão os dois painéis no relatório padrão", () => {
    expect(lerConfiguracaoPowerBi(envValido())).toEqual({
      ok: true,
      config: {
        tenantId: TENANT,
        clientId: CLIENT,
        clientSecret: SEGREDO,
        datasetId: DATASET,
        relatorios: {
          nacional: { reportId: REPORT, embedUrl: urlDe(REPORT) },
          ofertante: { reportId: REPORT, embedUrl: urlDe(REPORT) },
        },
      },
    });
  });

  it("aceita o reportId da embed URL em maiúsculas", () => {
    const leitura = lerConfiguracaoPowerBi(envValido({ SPMA_EMBED_URL: urlDe(REPORT.toUpperCase()) }));
    expect(leitura.ok).toBe(true);
  });

  it("o par do painel ofertante troca só o relatório do ofertante", () => {
    const leitura = lerConfiguracaoPowerBi(
      envValido({
        SPMA_REPORT_ID_OFERTANTE: REPORT_OFERTANTE,
        SPMA_EMBED_URL_OFERTANTE: urlDe(REPORT_OFERTANTE),
      }),
    );

    expect(leitura.ok && leitura.config.relatorios).toEqual({
      nacional: { reportId: REPORT, embedUrl: urlDe(REPORT) },
      ofertante: { reportId: REPORT_OFERTANTE, embedUrl: urlDe(REPORT_OFERTANTE) },
    });
  });

  it("o par do painel nacional troca só o relatório nacional", () => {
    const leitura = lerConfiguracaoPowerBi(
      envValido({
        SPMA_REPORT_ID_NACIONAL: REPORT_OFERTANTE,
        SPMA_EMBED_URL_NACIONAL: urlDe(REPORT_OFERTANTE),
      }),
    );

    expect(leitura.ok && leitura.config.relatorios).toEqual({
      nacional: { reportId: REPORT_OFERTANTE, embedUrl: urlDe(REPORT_OFERTANTE) },
      ofertante: { reportId: REPORT, embedUrl: urlDe(REPORT) },
    });
  });
});

describe("lerConfiguracaoPowerBi - ausente (PBI-15)", () => {
  it.each(OBRIGATORIAS)("%s ausente → ausente, com o nome da variável", (variavel) => {
    expect(lerConfiguracaoPowerBi(envValido({ [variavel]: undefined }))).toEqual({
      ok: false,
      motivo: "ausente",
      variavel,
    });
  });

  it.each(OBRIGATORIAS)("%s só com espaços → ausente", (variavel) => {
    expect(lerConfiguracaoPowerBi(envValido({ [variavel]: "   " }))).toEqual({
      ok: false,
      motivo: "ausente",
      variavel,
    });
  });

  it("ambiente vazio → ausente na primeira obrigatória", () => {
    expect(lerConfiguracaoPowerBi({})).toEqual({
      ok: false,
      motivo: "ausente",
      variavel: "SPMA_TENANT_ID",
    });
  });
});

describe("lerConfiguracaoPowerBi - inválida (PBI-15)", () => {
  it.each(["SPMA_TENANT_ID", "SPMA_CLIENT_ID", "SPMA_DATASET_ID"] as const)(
    "%s fora do formato GUID → invalida",
    (variavel) => {
      expect(lerConfiguracaoPowerBi(envValido({ [variavel]: "nao-e-guid" }))).toEqual({
        ok: false,
        motivo: "invalida",
        variavel,
      });
    },
  );

  it("SPMA_REPORT_ID fora do formato GUID → invalida", () => {
    expect(
      lerConfiguracaoPowerBi(envValido({ SPMA_REPORT_ID: "x", SPMA_EMBED_URL: urlDe("x") })),
    ).toEqual({ ok: false, motivo: "invalida", variavel: "SPMA_REPORT_ID" });
  });

  it.each([
    ["outra origem", `https://evil.example.com/reportEmbed?reportId=${REPORT}`],
    ["http em vez de https", `http://app.powerbi.com/reportEmbed?reportId=${REPORT}`],
    ["outro caminho", `https://app.powerbi.com/dashboardEmbed?reportId=${REPORT}`],
    ["outro reportId", urlDe(REPORT_OFERTANTE)],
    ["sem reportId", "https://app.powerbi.com/reportEmbed"],
    ["texto que não é URL", "não é url"],
  ])("SPMA_EMBED_URL com %s → invalida", (_caso, url) => {
    expect(lerConfiguracaoPowerBi(envValido({ SPMA_EMBED_URL: url }))).toEqual({
      ok: false,
      motivo: "invalida",
      variavel: "SPMA_EMBED_URL",
    });
  });

  // Edge case da spec: metade do par não cai no padrão em silêncio.
  it("SPMA_REPORT_ID_OFERTANTE sem a URL → invalida, apontando a URL que falta", () => {
    expect(
      lerConfiguracaoPowerBi(envValido({ SPMA_REPORT_ID_OFERTANTE: REPORT_OFERTANTE })),
    ).toEqual({ ok: false, motivo: "invalida", variavel: "SPMA_EMBED_URL_OFERTANTE" });
  });

  it("SPMA_EMBED_URL_OFERTANTE sem o ID → invalida, apontando o ID que falta", () => {
    expect(
      lerConfiguracaoPowerBi(envValido({ SPMA_EMBED_URL_OFERTANTE: urlDe(REPORT_OFERTANTE) })),
    ).toEqual({ ok: false, motivo: "invalida", variavel: "SPMA_REPORT_ID_OFERTANTE" });
  });

  it("par do painel com a URL de outro relatório → invalida", () => {
    expect(
      lerConfiguracaoPowerBi(
        envValido({
          SPMA_REPORT_ID_OFERTANTE: REPORT_OFERTANTE,
          SPMA_EMBED_URL_OFERTANTE: urlDe(REPORT),
        }),
      ),
    ).toEqual({ ok: false, motivo: "invalida", variavel: "SPMA_EMBED_URL_OFERTANTE" });
  });
});

describe("lerConfiguracaoPowerBi - o segredo nunca vaza (PBI-23)", () => {
  it.each([
    ["ausente", { SPMA_DATASET_ID: undefined }],
    ["inválida", { SPMA_TENANT_ID: "nao-e-guid" }],
    ["par incompleto", { SPMA_REPORT_ID_NACIONAL: REPORT_OFERTANTE }],
  ])("a falha %s não contém o valor do segredo", (_caso, extra) => {
    const leitura = lerConfiguracaoPowerBi(envValido(extra));
    expect(leitura.ok).toBe(false);
    expect(JSON.stringify(leitura)).not.toContain(SEGREDO);
  });
});
