// Guardas de rota chamadas no topo de cada layout/página protegida.
//
// Esta é a autoridade real de autorização (REQ-SEC-14 / AD-033): `proxy.ts`
// só faz um redirect barato por presença de cookie e não pode consultar o
// banco, então toda checagem que vale roda aqui, a cada request.
//
// As rotas de API não usam `requireSession()`: `redirect()` produz um 307, e
// elas precisam responder 401. Lá o padrão é `exigirSessao()`/`exigirMutacao()`
// de `lib/api/guardas.ts`, que lançam `ErroHttp` com o status certo.
//
// ESTE arquivo só contém as guardas que REDIRECIONAM (precisam de
// `next/navigation`) ou que consultam a sessão (precisam de Prisma). As
// regras de autorização puras vivem em `./permissoes.ts` e são reexportadas
// aqui para não mudar nenhum ponto de import existente - ver o cabeçalho
// daquele arquivo para o motivo da separação.
import { redirect } from "next/navigation";
import { obterSessao, type SessaoComUsuario } from "./session";
import type { TipoUsuario } from "../../generated/prisma/enums";

export {
  exigeOfertanteEVerba,
  podeAcessarAvaliacao,
  podeAcessarOfertante,
  podeEditarOfertante,
  podeGerenciarAvaliacao,
  podeGerenciarPosCurso,
  podeGerenciarPreCurso,
  podeGerenciarVerba,
  podeMatricularAluno,
  resolverEscopoOfertante,
  type UsuarioComEscopo,
} from "./permissoes";

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
 * GO sem dados organizacionais completos cadastra os seus antes de seguir
 * (REQ-AU-09, UGO-01/AD-043). Um GO É o próprio Ofertante (não tem mais
 * `cdOfertante` de terceiro para checar) - a completude passa a ser medida
 * pelos dois campos obrigatórios do cadastro organizacional (`nome`, `uf`).
 * Vale só para GO: AL tem escopo pelo curso e VO nunca cadastra dados
 * organizacionais próprios (AD-012).
 */
export function requireOfertanteVinculado(usuario: {
  tipo: TipoUsuario;
  nome: string | null;
  uf: string | null;
}): void {
  if (usuario.tipo === "GO" && (usuario.nome === null || usuario.uf === null)) {
    redirect("/cadastro-ofertante");
  }
}

/**
 * Enquanto o Aluno não responder as 7 perguntas de dado pessoal, nenhum
 * outro módulo abre (PESSOAL-02, PESSOAL-06). Vale só para AL: é o único
 * perfil afetado por esta feature (PESSOAL-04).
 *
 * SPEC_DEVIATION: spec.md (PESSOAL-02) descreve o redirect como indo "para a
 * tela principal" (`/painel`). `/painel` vive dentro de `(protegido)`, e este
 * guard roda no layout desse mesmo grupo - redirecionar para `/painel`
 * disparava o próprio guard de novo, em loop, pela mesma razão documentada em
 * `requirePrimeiroAcessoConcluido`/`requireOfertanteVinculado` acima (Server
 * Components não expõem o pathname da requisição ao layout). Mesma solução já
 * usada para `/primeiro-acesso` e `/cadastro-ofertante`: rota própria,
 * `/dados-pessoais`, em `src/app/(onboarding)/`. Ver design.md item 7.
 */
export function requireDadosPessoaisCompletos(usuario: {
  tipo: TipoUsuario;
  dadosPessoaisCompletos: boolean;
}): void {
  if (usuario.tipo === "AL" && !usuario.dadosPessoaisCompletos) {
    redirect("/dados-pessoais");
  }
}
