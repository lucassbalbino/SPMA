// Guardas de rota chamadas no topo de cada layout/página protegida.
//
// Esta é a autoridade real de autorização (REQ-SEC-14 / AD-033): `proxy.ts`
// só faz um redirect barato por presença de cookie e não pode consultar o
// banco, então toda checagem que vale roda aqui, a cada request.
//
// As rotas de API não usam `requireSession()`: `redirect()` produz um 307, e
// elas precisam responder 401. Lá o padrão é `obterSessao()` + resposta 401
// explícita (ver os route handlers em `src/app/api`).
import { redirect } from "next/navigation";
import { obterSessao, type SessaoComUsuario } from "./session";
import type { TipoUsuario } from "../../generated/prisma/enums";

/** Sessão válida ou volta para o login. */
export async function requireSession(): Promise<SessaoComUsuario> {
  const sessao = await obterSessao();

  if (!sessao) {
    redirect("/login");
  }

  return sessao;
}

/** Enquanto o 1º acesso não terminar, nenhum outro módulo abre (REQ-AU-02). */
export function requirePrimeiroAcessoConcluido(usuario: {
  primeiraVez: boolean;
}): void {
  if (usuario.primeiraVez) {
    redirect("/primeiro-acesso");
  }
}

/**
 * GO sem Ofertante vinculado cadastra o seu antes de seguir (REQ-AU-09).
 * Vale só para GO: AL tem escopo pelo curso e VO/GO são os únicos perfis
 * vinculados a Ofertante (AD-012).
 */
export function requireOfertanteVinculado(usuario: {
  tipo: TipoUsuario;
  cdOfertante: number | null;
}): void {
  if (usuario.tipo === "GO" && usuario.cdOfertante === null) {
    redirect("/cadastro-ofertante");
  }
}

/**
 * Guarda de LEITURA por escopo de Ofertante (REQ-SEC-14, REQ-OV-05/07,
 * AD-012), consumida por `cadastro-ofertante-verba` em toda rota de consulta
 * de Ofertante/Verba. Função pura, mesmo estilo de `podeCriar` em
 * `cascata.ts`: recebe os dados já carregados, não consulta nada.
 *
 * AM/GT/VT são os perfis de escopo nacional (AD-012, mesmo grupo que fica com
 * `cdOfertante` sempre null - ver schema.prisma) e sempre podem acessar
 * qualquer Ofertante. GO/VO só acessam o próprio Ofertante vinculado. AL tem
 * escopo pelo curso, não pelo Ofertante (AD-012), e nunca acessa por essa via.
 */
export function podeAcessarOfertante(
  usuario: { tipo: TipoUsuario; cdOfertante: number | null },
  cdOfertanteAlvo: number,
): boolean {
  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      return true;
    case "GO":
    case "VO":
      return usuario.cdOfertante === cdOfertanteAlvo;
    case "AL":
      return false;
  }
}

/**
 * Guarda de ESCRITA sobre um Ofertante (REQ-OV-02/03). Deliberadamente
 * separada de `podeAcessarOfertante`: aquela devolve `true` para VT (leitura
 * nacional), e VT nunca deve poder editar - "somente leitura" é a própria
 * definição do perfil. AM/GT sempre podem editar qualquer Ofertante; GO só o
 * próprio; VT/VO/AL nunca.
 */
export function podeEditarOfertante(
  usuario: { tipo: TipoUsuario; cdOfertante: number | null },
  cdOfertanteAlvo: number,
): boolean {
  switch (usuario.tipo) {
    case "AM":
    case "GT":
      return true;
    case "GO":
      return usuario.cdOfertante === cdOfertanteAlvo;
    case "VT":
    case "VO":
    case "AL":
      return false;
  }
}

/**
 * Guarda de ESCRITA sobre Verba (REQ-OV-08/09). O documento fonte (seção
 * 3.4) atribui a criação da Verba ao Gestor Turismo; o Gestor Ofertante a
 * consome (aloca a cursos, feature futura) mas não a cria nem a edita.
 */
export function podeGerenciarVerba(tipo: TipoUsuario): boolean {
  return tipo === "AM" || tipo === "GT";
}

/**
 * Guarda de ESCRITA sobre PreCurso (REQ-PC-15). Diferente de
 * `podeEditarOfertante`/`podeGerenciarVerba`, aqui nem AM nem GT escrevem:
 * a seção 4 do documento fonte atribui o preenchimento do pré-curso
 * exclusivamente ao Gestor Ofertante vinculado, sem exceção administrativa.
 */
export function podeGerenciarPreCurso(
  usuario: { tipo: TipoUsuario; cdOfertante: number | null },
  cdOfertanteAlvo: number,
): boolean {
  return usuario.tipo === "GO" && usuario.cdOfertante === cdOfertanteAlvo;
}
