import * as argon2 from "argon2";

/**
 * Hash e verificação de senha via argon2id (AD-030).
 */

/**
 * Hash argon2id pré-computado de uma string fixa, não a senha de ninguém
 * (REQ-SEC-04). Usado para normalizar o tempo do login: quando o CPF não
 * existe ou o usuário ainda não tem `senhaHash`, o código roda
 * `verifyPassword(DUMMY_HASH, senhaInformada)` mesmo assim, para que o custo
 * de um `argon2.verify` seja pago em todo caminho de falha - sem isso, CPF
 * inexistente responderia quase instantâneo enquanto senha errada custaria o
 * tempo do argon2, um oráculo de enumeração por tempo.
 */
export const DUMMY_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$9mHsGlw5LUxTjdv78BQ6eA$nIwWgqqiNMQ9weM8o3vguHdVjKsTDqBdPnxxZYL31+8";

export async function hashPassword(senha: string): Promise<string> {
  return argon2.hash(senha, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  senha: string,
): Promise<boolean> {
  return argon2.verify(hash, senha);
}
