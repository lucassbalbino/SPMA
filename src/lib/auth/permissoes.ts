// As regras de autorização PURAS do projeto - função de (usuário já
// carregado, alvo) para booleano. Nenhuma consulta, nenhum redirect, nenhuma
// dependência de Prisma ou de `next/*`.
//
// Por que separado de `guards.ts`: aquele arquivo importa `./session`, que
// importa `lib/db/prisma.ts`, que instancia um PrismaClient no top-level do
// módulo. Um import estático de QUALQUER export de `guards.ts` arrastava esse
// client junto - mesmo quem só queria `resolverEscopoOfertante`, que não toca
// o banco. Consequência concreta: todo consumidor puro (incluindo testes
// unitários) precisava mockar `./session` para conseguir importar uma função
// de 3 linhas. Mesma razão, e mesma solução, de `session-cookie.ts`.
//
// `guards.ts` reexporta tudo daqui, então nenhum ponto de import existente
// mudou.
import type { TipoUsuario } from "../../generated/prisma/enums";

/** O que toda regra de escopo por Ofertante precisa saber do usuário. */
export type UsuarioComEscopo = {
  tipo: TipoUsuario;
  documento: string;
  cdOfertante: string | null;
};

/**
 * Único ponto que resolve o escopo de Ofertante EFETIVO de um usuário
 * (UGO-14/AD-043). Sem `model Ofertante` separado, um GO não "pertence" a um
 * Ofertante - ele É um, identificado pelo próprio `documento` (CNPJ); seu
 * `cdOfertante` fica sempre null (não é FK de terceiro, é a origem do
 * escopo). Um VO continua vinculado via `cdOfertante`, agora apontando para o
 * `documento` do GO. Os demais tipos não têm escopo por Ofertante.
 *
 * As guardas abaixo consomem esta função em vez de ler `usuario.cdOfertante`
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
  usuario: UsuarioComEscopo,
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
  usuario: UsuarioComEscopo,
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
  usuario: UsuarioComEscopo,
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
  usuario: UsuarioComEscopo,
  cdOfertanteAlvo: string,
): boolean {
  return usuario.tipo === "AM" || podeGerenciarPreCurso(usuario, cdOfertanteAlvo);
}

/**
 * Existe ALGUM Ofertante em que este perfil pode criar curso/matricular? É a
 * pergunta que uma TELA DE LISTA faz para decidir se mostra o atalho de
 * criação - ela não tem um Ofertante-alvo em mãos, ao contrário de
 * `podeGerenciarPreCurso`/`podeMatricularAluno`, que decidem o acesso a um
 * recurso concreto.
 *
 * Deriva daquelas duas, e é só isso que as três listas usavam escrito à mão
 * como `usuario.tipo === "GO"` - o que escondia o atalho do AM, embora AD-040
 * lhe dê a exceção administrativa, a navegação (`lib/ui/navegacao.ts`) já lhe
 * oferecesse "Novo curso" e a API aceitasse a chamada.
 *
 * Continua sendo conveniência de UI, nunca autorização: quem decide de fato é
 * a guarda por Ofertante, reavaliada no servidor a cada request (AD-033).
 */
export function podeCriarCursoOuMatricular(tipo: TipoUsuario): boolean {
  return tipo === "AM" || tipo === "GO";
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
  usuario: UsuarioComEscopo & { cpf: string },
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
