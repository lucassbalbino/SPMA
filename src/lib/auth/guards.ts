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
  podeAcessarAvaliacao,
  podeAcessarOfertante,
  podeEditarOfertante,
  podeEditarUsuario,
  podeGerenciarAvaliacao,
  podeGerenciarPosCurso,
  podeGerenciarPreCurso,
  podeGerenciarVerba,
  podeLerVerba,
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
 * GO que ainda não declarou os 6 dados organizacionais preenche o formulário
 * antes de seguir (OGO-01, AD-044). Decidido só pela flag persistida
 * `dadosOrganizacionaisCompletos`, nunca por campos preenchidos: um GO
 * anterior a esta regra tem nome e UF e ainda assim passa pela tela (OGO-15).
 * Vale só para GO (OGO-06) - mesmo desenho de `requireDadosPessoaisCompletos`.
 */
export function requireDadosOrganizacionaisCompletos(usuario: {
  tipo: TipoUsuario;
  dadosOrganizacionaisCompletos: boolean;
}): void {
  if (usuario.tipo === "GO" && !usuario.dadosOrganizacionaisCompletos) {
    redirect("/cadastro-ofertante");
  }
}

/**
 * AM/GT/VT/VO sem nome declaram nome e e-mail antes de seguir (AD-050): só o
 * AM nasce com eles, os demais os informam depois do 1º login. GO e AL ficam
 * de fora porque declaram os mesmos dados nas próprias telas de onboarding.
 *
 * Decidido pelo `nome` vazio, não por uma flag como as guardas vizinhas: toda
 * conta anterior a esta regra nasceu com nome, então passa sem migration e
 * sem ser mandada a uma tela que não lhe diz respeito.
 */
export function requireDadosCadastraisCompletos(usuario: {
  tipo: TipoUsuario;
  nome: string | null;
}): void {
  if (usuario.tipo !== "GO" && usuario.tipo !== "AL" && !usuario.nome) {
    redirect("/dados-cadastrais");
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
 * `requirePrimeiroAcessoConcluido`/`requireDadosOrganizacionaisCompletos` acima (Server
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
