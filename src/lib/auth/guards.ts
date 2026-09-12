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

/**
 * Único ponto que resolve o escopo de Ofertante EFETIVO de um usuário
 * (UGO-14/AD-043). Sem `model Ofertante` separado, um GO não "pertence" a um
 * Ofertante - ele É um, identificado pelo próprio `documento` (CNPJ); seu
 * `cdOfertante` fica sempre null (não é FK de terceiro, é a origem do
 * escopo). Um VO continua vinculado via `cdOfertante`, agora apontando para o
 * `documento` do GO. Os demais tipos não têm escopo por Ofertante.
 *
 * As 5 guardas abaixo consomem esta função em vez de ler `usuario.cdOfertante`
 * diretamente - design.md, Componente `resolverEscopoOfertante`.
 */
export function resolverEscopoOfertante(usuario: {
  tipo: TipoUsuario;
  documento: string;
  cdOfertante: string | null;
}): string | null {
  if (usuario.tipo === "GO") {
    return usuario.documento;
  }

  if (usuario.tipo === "VO") {
    return usuario.cdOfertante;
  }

  return null;
}

/**
 * Guarda de LEITURA por escopo de Ofertante (REQ-SEC-14, REQ-OV-05/07,
 * AD-012), consumida por `cadastro-ofertante-verba` em toda rota de consulta
 * de Ofertante/Verba. Função pura, mesmo estilo de `podeCriar` em
 * `cascata.ts`: recebe os dados já carregados, não consulta nada.
 *
 * AM/GT/VT são os perfis de escopo nacional (AD-012, mesmo grupo que fica com
 * `cdOfertante` sempre null - ver schema.prisma) e sempre podem acessar
 * qualquer Ofertante. GO/VO só acessam o próprio Ofertante vinculado (via
 * `resolverEscopoOfertante`). AL tem escopo pelo curso, não pelo Ofertante
 * (AD-012), e nunca acessa por essa via.
 */
export function podeAcessarOfertante(
  usuario: { tipo: TipoUsuario; documento: string; cdOfertante: string | null },
  cdOfertanteAlvo: string,
): boolean {
  switch (usuario.tipo) {
    case "AM":
    case "GT":
    case "VT":
      return true;
    case "GO":
    case "VO":
      return resolverEscopoOfertante(usuario) === cdOfertanteAlvo;
    case "AL":
      return false;
  }
}

/**
 * Guarda de ESCRITA sobre um Ofertante (REQ-OV-02/03). Deliberadamente
 * separada de `podeAcessarOfertante`: aquela devolve `true` para VT (leitura
 * nacional), e VT nunca deve poder editar - "somente leitura" é a própria
 * definição do perfil. AM/GT sempre podem editar qualquer Ofertante; GO só o
 * próprio (via `resolverEscopoOfertante`); VT/VO/AL nunca.
 */
export function podeEditarOfertante(
  usuario: { tipo: TipoUsuario; documento: string; cdOfertante: string | null },
  cdOfertanteAlvo: string,
): boolean {
  switch (usuario.tipo) {
    case "AM":
    case "GT":
      return true;
    case "GO":
      return resolverEscopoOfertante(usuario) === cdOfertanteAlvo;
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
 * Guarda de ESCRITA sobre PreCurso (REQ-PC-15). A seção 4 do documento fonte
 * atribui o preenchimento do pré-curso ao Gestor Ofertante vinculado; AD-040
 * abriu exceção administrativa para o AM (autoridade nacional, AD-012),
 * mesmo padrão já usado em `podeMatricularAluno`. GT continua de fora - só
 * gere Verba, não Curso.
 */
export function podeGerenciarPreCurso(
  usuario: { tipo: TipoUsuario; documento: string; cdOfertante: string | null },
  cdOfertanteAlvo: string,
): boolean {
  return (
    usuario.tipo === "AM" ||
    (usuario.tipo === "GO" && resolverEscopoOfertante(usuario) === cdOfertanteAlvo)
  );
}

/**
 * Guarda de ESCRITA sobre PosCurso (REQ-PO-14). Mesma regra de
 * `podeGerenciarPreCurso` - o `cdOfertanteAlvo` aqui é o do PreCurso pai
 * (PosCurso não tem CD_Ofertante próprio). Alias, não uma função nova: se
 * essa regra um dia divergir da do Pré-Curso, separe-a em vez de reaproveitar
 * este alias.
 */
export const podeGerenciarPosCurso = podeGerenciarPreCurso;

/**
 * Guarda de criação da matrícula (AvaliacaoAluno) - AVAL-06. O
 * `cdOfertanteAlvo` é o do curso em que o Aluno está sendo matriculado.
 *
 * Deixou de ser alias de `podeGerenciarPreCurso` (era, até a criação de Aluno
 * passar a exigir o curso): o AM cria Aluno em qualquer Ofertante
 * (REQ-AU-05/06) e, para o Aluno nascer matriculado, precisa matricular
 * também - autoridade nacional, coerente com AD-012. Fora isso a regra é a
 * mesma: só o GO vinculado ao Ofertante do curso. Preencher respostas ou
 * encerrar continua sendo só do próprio Aluno (`podeGerenciarAvaliacao`).
 */
export function podeMatricularAluno(
  usuario: { tipo: TipoUsuario; documento: string; cdOfertante: string | null },
  cdOfertanteAlvo: string,
): boolean {
  return usuario.tipo === "AM" || podeGerenciarPreCurso(usuario, cdOfertanteAlvo);
}

/**
 * Guarda de ESCRITA sobre a própria AvaliacaoAluno (AVAL-09/18) - primeira
 * guarda de identidade pura do projeto: nenhum perfil de gestão escreve
 * respostas ou encerra, só a própria pessoa (seção 6 do documento fonte,
 * "preenchido pelo próprio aluno"; seção 3.7, "acionada pelo aluno"). O GO
 * que fez a matrícula não tem essa autoridade.
 */
export function podeGerenciarAvaliacao(
  usuario: { tipo: TipoUsuario; cpf: string },
  cpfAvaliacao: string,
): boolean {
  return usuario.tipo === "AL" && usuario.cpf === cpfAvaliacao;
}

/**
 * Guarda de LEITURA sobre AvaliacaoAluno (AVAL-20/21/23). Combina duas
 * autoridades: o próprio Aluno (por identidade) e o escopo por Ofertante já
 * usado em Pré-Curso/Pós-Curso (`podeAcessarOfertante`), porque o mesmo
 * recurso é lido tanto pelo dono quanto pela gestão do Ofertante do curso.
 */
export function podeAcessarAvaliacao(
  usuario: {
    tipo: TipoUsuario;
    cpf: string;
    documento: string;
    cdOfertante: string | null;
  },
  alvo: { cpfAluno: string; cdOfertante: string },
): boolean {
  if (usuario.tipo === "AL") {
    return usuario.cpf === alvo.cpfAluno;
  }

  return podeAcessarOfertante(usuario, alvo.cdOfertante);
}

/**
 * Criar um Gestor Ofertante é criar, no mesmo passo, o Ofertante a que ele
 * responde e a verba desse Ofertante: quem pode gerir verba (AM/GT,
 * REQ-OV-08) informa `cdOfertante` + `verba` junto do usuário.
 *
 * Um GO criando outro GO não cai nesta regra: o escopo dele é herdado do
 * criador (REQ-AU-08) e o GO consome verba, não a cria (REQ-OV-08).
 */
export function exigeOfertanteEVerba(
  criadorTipo: TipoUsuario,
  alvoTipo: TipoUsuario,
): boolean {
  return alvoTipo === "GO" && podeGerenciarVerba(criadorTipo);
}
