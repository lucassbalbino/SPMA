// Leitura e validação do que vem NA requisição - a parte do preâmbulo de
// rota que não toca banco nem sessão.
//
// Separado de `./guardas.ts` (que resolve a sessão e por isso arrasta
// Prisma) pela mesma razão de `lib/auth/session-cookie.ts`: assim estes dois
// helpers podem ser testados, e importados, sem um PrismaClient de carona.
import type { z } from "zod";
import { erroHttp } from "./erro-http";

/**
 * JSON do corpo, ou `null` quando ausente/malformado - nunca uma exceção de
 * parse, que `comTratamentoDeErro` transformaria em 500. Um corpo `null` cai
 * no schema e sai como 400, que é o contrato.
 *
 * O corpo de um `Request` só pode ser lido UMA vez. Quem precisa olhar as
 * chaves cruas antes de validar (`PATCH /api/avaliacoes/...`, que recusa
 * explicitamente chave de dado pessoal porque `z.object()` descartaria em
 * silêncio) lê aqui e passa o valor a `validado`, em vez de ler duas vezes.
 */
export async function corpoJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

/**
 * Valida um valor já lido, ou 400 com a primeira mensagem de issue - mesmo
 * formato que as 12 rotas já devolviam, escrito à mão em cada uma.
 */
export function validado<S extends z.ZodType>(corpo: unknown, schema: S): z.output<S> {
  const entrada = schema.safeParse(corpo);

  if (!entrada.success) {
    throw erroHttp(400, entrada.error.issues[0]?.message ?? "Dados inválidos");
  }

  return entrada.data;
}

/** O caso comum: ler o corpo e validá-lo num passo só. */
export async function corpoValidado<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  return validado(await corpoJson(request), schema);
}

/**
 * Id numérico de rota (`cdCurso`, `cdVerba`) ou 400. Era a mesma função
 * `parseId`/`parseCdCurso` copiada em 5 route handlers, cada cópia seguida do
 * mesmo `if (id === null) return 400`.
 */
export function idPositivo(valor: string): number {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    throw erroHttp(400, "Id inválido");
  }

  return id;
}
