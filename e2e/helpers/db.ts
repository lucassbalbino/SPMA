// Acesso ao banco `spma_test` a partir dos specs e2e.
//
// Cada chamada roda `scripts/e2e-fixture.ts` como processo `tsx` separado:
// o loader do Playwright não importa o client gerado pelo Prisma direto
// (ver comentário no script). Serve para preparar usuários antes do
// cenário e para conferir o estado persistido depois dele - o que a
// resposta HTTP sozinha não prova.
import { execFileSync } from "node:child_process";

const MARCADOR_INICIO = "<<<E2E_JSON>>>";
const MARCADOR_FIM = "<<<FIM_E2E_JSON>>>";

export type TipoUsuarioFixture = "AM" | "GT" | "VT" | "GO" | "VO" | "AL";

export type UsuarioFixture = {
  cpf: string;
  nome?: string;
  tipo: TipoUsuarioFixture;
  senha?: string | null;
  primeiraVez?: boolean;
  cdOfertante?: number | null;
};

export type UsuarioPersistido = {
  cpf: string;
  nome: string | null;
  email: string | null;
  tipo: TipoUsuarioFixture;
  cdOfertante: number | null;
  senhaHash: string | null;
  primeiraVez: boolean;
  tentativasFalhas: number;
  bloqueadoAte: string | null;
  criadoPor: string | null;
  dataCriacao: string;
};

export type SessaoPersistida = { id: string; cpfUsuario: string; expiraEm: string };
export type OfertantePersistido = { cdOfertante: number; nome: string; uf: string };

function executar<T>(comando: string, argumento?: unknown): T {
  const argumentoBase64 = Buffer.from(JSON.stringify(argumento ?? null)).toString(
    "base64",
  );

  const saida = execFileSync(
    "npx",
    ["tsx", "scripts/e2e-fixture.ts", comando, argumentoBase64],
    { env: process.env, shell: true, encoding: "utf8" },
  );

  const inicio = saida.indexOf(MARCADOR_INICIO);
  const fim = saida.indexOf(MARCADOR_FIM);
  if (inicio === -1 || fim === -1) {
    throw new Error(`Saída inesperada de e2e-fixture (${comando}): ${saida}`);
  }

  return JSON.parse(saida.slice(inicio + MARCADOR_INICIO.length, fim)) as T;
}

export function upsertUsuario(dados: UsuarioFixture): UsuarioPersistido {
  return executar<UsuarioPersistido>("upsertUsuario", dados);
}

export function getUsuario(cpf: string): UsuarioPersistido | null {
  return executar<UsuarioPersistido | null>("getUsuario", cpf);
}

export function deleteUsuarios(cpfs: string[]): void {
  executar("deleteUsuarios", cpfs);
}

export function getSessao(id: string): SessaoPersistida | null {
  return executar<SessaoPersistida | null>("getSessao", id);
}

export function criarOfertante(dados: {
  nome: string;
  uf: string;
}): OfertantePersistido {
  return executar<OfertantePersistido>("criarOfertante", dados);
}

export function getOfertante(cdOfertante: number): OfertantePersistido | null {
  return executar<OfertantePersistido | null>("getOfertante", cdOfertante);
}

export function listarOfertantesPorNome(nome: string): OfertantePersistido[] {
  return executar<OfertantePersistido[]>("listarOfertantesPorNome", nome);
}

/** Limpa o registro de rate-limit por IP (REQ-SEC-03) dos IPs de teste informados. */
export function deleteTentativasIp(ips: string[]): void {
  executar("deleteTentativasIp", ips);
}
