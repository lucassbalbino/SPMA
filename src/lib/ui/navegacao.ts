// Fonte única da navegação por perfil: o cabeçalho das rotas protegidas e o
// /painel leem esta tabela, nunca uma lista própria (UI-02).
//
// Isto é conveniência de UI, não autorização. STATE.md, seção "Autorização":
// a cascata (AD-009) e o escopo (AD-012) são reavaliados no backend a cada
// request - nunca confiar em ocultação de menu. Esconder um item só evita
// oferecer um beco sem saída; digitar a URL continua caindo nos guards.
//
// O critério de cada linha é "que página desse perfil abre e mostra algo"
// (ver design.md, "A tabela de navegação"), derivado do escopo já
// implementado nas telas.
import { TipoUsuario } from "../../generated/prisma/enums";

export interface ItemNavegacao {
  rotulo: string;
  href: string;
}

/** Um módulo do painel. `itens` vazio = módulo sem tela (não vira link). */
export interface Modulo {
  rotulo: string;
  itens: ItemNavegacao[];
}

const PAINEL: ItemNavegacao = { rotulo: "Painel", href: "/painel" };
const NOVO_USUARIO: ItemNavegacao = { rotulo: "Novo usuário", href: "/usuarios/novo" };
const PRE_CURSOS: ItemNavegacao = { rotulo: "Pré-cursos", href: "/pre-cursos" };
const POS_CURSOS: ItemNavegacao = { rotulo: "Pós-cursos", href: "/pos-cursos" };
const AVALIACOES: ItemNavegacao = { rotulo: "Avaliações", href: "/avaliacoes" };
// Mesma rota, nome diferente: para o Aluno ela nunca lista mais que a própria.
const MINHA_AVALIACAO: ItemNavegacao = { rotulo: "Minha avaliação", href: "/avaliacoes" };

const CURSOS = [PRE_CURSOS, POS_CURSOS, AVALIACOES];

// "Ofertantes", "Verbas" e "Relatórios" só existem como API, ou nem isso:
// ficam listados no painel com o texto de hoje e não viram link.
export const MODULOS_POR_PERFIL: Record<TipoUsuario, Modulo[]> = {
  [TipoUsuario.AM]: [
    { rotulo: "Gestão de usuários", itens: [NOVO_USUARIO] },
    { rotulo: "Ofertantes", itens: [] },
    { rotulo: "Verbas", itens: [] },
    { rotulo: "Cursos", itens: CURSOS },
    { rotulo: "Relatórios", itens: [] },
  ],
  [TipoUsuario.GT]: [
    { rotulo: "Gestão de usuários", itens: [NOVO_USUARIO] },
    { rotulo: "Ofertantes", itens: [] },
    { rotulo: "Verbas", itens: [] },
    { rotulo: "Cursos", itens: CURSOS },
  ],
  [TipoUsuario.VT]: [
    { rotulo: "Cursos", itens: CURSOS },
    { rotulo: "Relatórios", itens: [] },
  ],
  [TipoUsuario.GO]: [
    { rotulo: "Gestão de usuários", itens: [NOVO_USUARIO] },
    { rotulo: "Meus cursos", itens: CURSOS },
  ],
  [TipoUsuario.VO]: [{ rotulo: "Meus cursos", itens: CURSOS }],
  [TipoUsuario.AL]: [{ rotulo: "Minha avaliação", itens: [MINHA_AVALIACAO] }],
};

/** Itens do cabeçalho: "Painel" + os itens de todos os módulos do perfil. */
export function navegacaoDoPerfil(tipo: TipoUsuario): ItemNavegacao[] {
  return [PAINEL, ...MODULOS_POR_PERFIL[tipo].flatMap((modulo) => modulo.itens)];
}

/** Rótulos para `data-testid="painel-modulos"` - preserva os textos atuais. */
export function modulosDoPerfil(tipo: TipoUsuario): string[] {
  return MODULOS_POR_PERFIL[tipo].map((modulo) => modulo.rotulo);
}

/**
 * href do item ativo, ou null. Um item casa quando o pathname é o próprio
 * href ou uma sub-rota dele; havendo mais de um casamento, vence o href mais
 * longo, para que `/usuarios/novo` não seja ofuscado por um `/usuarios`.
 */
export function hrefAtivo(pathname: string, itens: ItemNavegacao[]): string | null {
  const candidatos = itens
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));

  if (candidatos.length === 0) {
    return null;
  }

  return candidatos.reduce((maisLongo, href) =>
    href.length > maisLongo.length ? href : maisLongo,
  );
}
