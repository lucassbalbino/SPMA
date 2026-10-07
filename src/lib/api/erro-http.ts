// Erro de rota com status e corpo próprios, lançado em vez de devolvido.
//
// Antes desta classe, cada route handler montava à mão o mesmo
// `NextResponse.json({ erro }, { status })` e, com ele, repetia a ORDEM dos
// gates (CSRF -> sessão -> validação) a cada arquivo novo. Lançar deixa os
// helpers de `./requisicao.ts` aplicarem essa ordem num lugar só; quem
// converte em resposta é `comTratamentoDeErro` (lib/errors/api-error.ts),
// que já envolve toda rota.
//
// Distinção que o wrapper precisa fazer: um `ErroHttp` é uma recusa
// PREVISTA (401/403/404/409...) e sai como o corpo que a rota pediu, sem log
// de erro interno; qualquer outra exceção continua virando 500 genérico +
// id de correlação (REQ-SEC-11).
export class ErroHttp extends Error {
  readonly status: number;
  readonly corpo: Record<string, unknown>;

  constructor(status: number, corpo: Record<string, unknown>) {
    super(typeof corpo.erro === "string" ? corpo.erro : `HTTP ${status}`);
    this.name = "ErroHttp";
    this.status = status;
    this.corpo = corpo;
  }
}

/**
 * Açúcar para o formato único de erro da API: `{ erro: "..." }` mais os
 * campos extra que algumas rotas anexam (`pendentes`, `saldoDisponivel`,
 * `totalAlocado`).
 */
export function erroHttp(
  status: number,
  erro: string,
  extra?: Record<string, unknown>,
): ErroHttp {
  return new ErroHttp(status, { erro, ...extra });
}
