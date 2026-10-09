import { describe, expect, it } from "vitest";
import { TipoUsuario } from "../../generated/prisma/enums";
import {
  hrefAtivo,
  modulosDoPerfil,
  navegacaoDoPerfil,
  ROTAS_COM_SESSAO,
  type ItemNavegacao,
} from "./navegacao";

// Tabela esperada escrita diretamente a partir de design.md ("A tabela de
// navegação"), não lida do módulo sob teste.
const HREFS_ESPERADOS: Record<TipoUsuario, string[]> = {
  AM: [
    "/painel",
    "/usuarios/novo",
    "/cursos/novo",
    "/pre-cursos",
    "/pos-cursos",
    "/avaliacoes",
  ],
  GT: ["/painel", "/usuarios/novo", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  VT: ["/painel", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  GO: [
    "/painel",
    "/usuarios/novo",
    "/cursos/novo",
    "/pre-cursos",
    "/pos-cursos",
    "/avaliacoes",
  ],
  VO: ["/painel", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  // PESSOAL-16: "/meus-dados" (edição do dado pessoal pelo perfil) some para
  // todo perfil que não seja AL.
  AL: ["/painel", "/avaliacoes", "/meus-dados"],
};

// Rótulos de módulo do painel de hoje (src/app/(protegido)/painel/page.tsx:10).
// Asserção literal: é o contrato que segura e2e/painel.spec.ts.
const MODULOS_ESPERADOS: Record<TipoUsuario, string[]> = {
  AM: ["Gestão de usuários", "Ofertantes", "Verbas", "Cursos", "Relatórios"],
  GT: ["Gestão de usuários", "Ofertantes", "Verbas", "Cursos"],
  VT: ["Cursos", "Relatórios"],
  GO: ["Gestão de usuários", "Meus cursos"],
  VO: ["Meus cursos"],
  AL: ["Minha avaliação"],
};

// Rotas realmente implementadas em src/app/(protegido) (uma page.tsx cada).
const ROTAS_IMPLEMENTADAS = [
  "/painel",
  "/usuarios/novo",
  "/pre-cursos",
  "/cursos/novo",
  "/pre-cursos/[id]",
  "/pos-cursos",
  "/pos-cursos/[cdCurso]",
  "/avaliacoes",
  "/avaliacoes/[cpf]/[cdCurso]",
  "/meus-dados",
];

const TODOS_OS_TIPOS = Object.values(TipoUsuario);

const hrefsDe = (tipo: TipoUsuario) => navegacaoDoPerfil(tipo).map((item) => item.href);

const rotuloDe = (tipo: TipoUsuario, href: string) =>
  navegacaoDoPerfil(tipo).find((item) => item.href === href)?.rotulo;

describe("navegacaoDoPerfil", () => {
  for (const tipo of TODOS_OS_TIPOS) {
    it(`${tipo} recebe exatamente os itens da tabela do design`, () => {
      expect(hrefsDe(tipo)).toEqual(HREFS_ESPERADOS[tipo]);
    });
  }

  it("AL não recebe /pre-cursos nem /pos-cursos", () => {
    const hrefs = hrefsDe(TipoUsuario.AL);
    expect(hrefs).not.toContain("/pre-cursos");
    expect(hrefs).not.toContain("/pos-cursos");
  });

  it("VT, VO e AL não recebem /usuarios/novo", () => {
    expect(hrefsDe(TipoUsuario.VT)).not.toContain("/usuarios/novo");
    expect(hrefsDe(TipoUsuario.VO)).not.toContain("/usuarios/novo");
    expect(hrefsDe(TipoUsuario.AL)).not.toContain("/usuarios/novo");
  });

  it("só AM e GO recebem /cursos/novo (AD-040, quem pode criar curso)", () => {
    expect(hrefsDe(TipoUsuario.AM)).toContain("/cursos/novo");
    expect(hrefsDe(TipoUsuario.GO)).toContain("/cursos/novo");
    expect(hrefsDe(TipoUsuario.GT)).not.toContain("/cursos/novo");
    expect(hrefsDe(TipoUsuario.VT)).not.toContain("/cursos/novo");
    expect(hrefsDe(TipoUsuario.VO)).not.toContain("/cursos/novo");
    expect(hrefsDe(TipoUsuario.AL)).not.toContain("/cursos/novo");
  });

  it("só AL recebe /meus-dados (PESSOAL-16, PESSOAL-20)", () => {
    expect(hrefsDe(TipoUsuario.AL)).toContain("/meus-dados");

    for (const tipo of TODOS_OS_TIPOS.filter((t) => t !== TipoUsuario.AL)) {
      expect(hrefsDe(tipo)).not.toContain("/meus-dados");
    }
  });

  it("o item de /avaliacoes se chama 'Minha avaliação' para AL", () => {
    expect(rotuloDe(TipoUsuario.AL, "/avaliacoes")).toBe("Minha avaliação");
  });

  it("o item de /avaliacoes se chama 'Avaliações' para os outros 5 perfis", () => {
    for (const tipo of TODOS_OS_TIPOS.filter((t) => t !== TipoUsuario.AL)) {
      expect(rotuloDe(tipo, "/avaliacoes")).toBe("Avaliações");
    }
  });

  it("todo perfil recebe /painel", () => {
    for (const tipo of TODOS_OS_TIPOS) {
      expect(hrefsDe(tipo)).toContain("/painel");
    }
  });

  it("nenhum href aponta para rota inexistente", () => {
    const distintos = [...new Set(TODOS_OS_TIPOS.flatMap(hrefsDe))];
    for (const href of distintos) {
      expect(ROTAS_IMPLEMENTADAS).toContain(href);
    }
  });
});

describe("modulosDoPerfil", () => {
  for (const tipo of TODOS_OS_TIPOS) {
    it(`${tipo} mantém os rótulos de módulo que o painel já exibe`, () => {
      expect(modulosDoPerfil(tipo)).toEqual(MODULOS_ESPERADOS[tipo]);
    });
  }
});

describe("hrefAtivo", () => {
  const itens: ItemNavegacao[] = [
    { rotulo: "Painel", href: "/painel" },
    { rotulo: "Usuários", href: "/usuarios" },
    { rotulo: "Novo usuário", href: "/usuarios/novo" },
    { rotulo: "Pré-cursos", href: "/pre-cursos" },
    { rotulo: "Novo curso", href: "/cursos/novo" },
    { rotulo: "Avaliações", href: "/avaliacoes" },
  ];

  it("casa a rota exata", () => {
    expect(hrefAtivo("/avaliacoes", itens)).toBe("/avaliacoes");
  });

  it("casa a rota-pai a partir de uma sub-rota nomeada", () => {
    expect(hrefAtivo("/avaliacoes/novo", itens)).toBe("/avaliacoes");
  });

  it("casa a rota-pai a partir de uma sub-rota dinâmica", () => {
    expect(hrefAtivo("/pre-cursos/12", itens)).toBe("/pre-cursos");
  });

  it("o href mais longo vence quando dois casam", () => {
    expect(hrefAtivo("/usuarios/novo", itens)).toBe("/usuarios/novo");
  });

  // A colisão que a AD-040/CURSO-08 vigiava ("Novo curso" ofuscado por
  // "Pré-cursos") deixou de existir em 2026-10-09: o ato de criar curso saiu
  // de `/pre-cursos/novo` para `/cursos/novo`, que não compartilha prefixo com
  // nenhum outro item. A REGRA do desempate segue coberta pelo caso de
  // `/usuarios/novo` logo acima - é a mesma linha de código.

  it("pathname desconhecido não marca nenhum item", () => {
    expect(hrefAtivo("/relatorios", itens)).toBeNull();
  });

  // Fronteira do separador: sem a barra, o prefixo compartilhado e uma
  // sub-rota de verdade sao coisas diferentes. Sem este caso, trocar
  // `startsWith(href + "/")` por `startsWith(href)` passaria despercebido.
  it("rota irma que so compartilha o prefixo, sem a barra, nao casa", () => {
    expect(hrefAtivo("/pre-cursos-antigos", itens)).toBeNull();
    expect(hrefAtivo("/painelx", itens)).toBeNull();
    expect(hrefAtivo("/usuarios-inativos", itens)).toBeNull();
  });

  it("lista vazia não marca nenhum item", () => {
    expect(hrefAtivo("/painel", [])).toBeNull();
  });
});

// `ROTAS_COM_SESSAO` alimenta o redirect por cookie do proxy. O que importa
// nao e a lista exata (ela cresce com as features), e sim que ela seja
// DERIVADA da tabela de navegacao: a versao anterior era um literal mantido a
// mao no proxy e ficou 4 rotas para tras.
describe("ROTAS_COM_SESSAO", () => {
  it("cobre toda rota oferecida a algum perfil", () => {
    const daTabela = Object.values(TipoUsuario).flatMap((tipo) =>
      navegacaoDoPerfil(tipo).map((item) => item.href),
    );

    for (const href of daTabela) {
      expect(ROTAS_COM_SESSAO).toContain(href);
    }
  });

  // Nao sao itens de menu - sao destino de guard -, entao nao viriam da
  // tabela sozinhas, mas exigem sessao igual.
  it.each(["/primeiro-acesso", "/cadastro-ofertante", "/dados-pessoais"])(
    "inclui a rota de onboarding %s",
    (rota) => {
      expect(ROTAS_COM_SESSAO).toContain(rota);
    },
  );

  it("inclui as rotas que o literal antigo do proxy esquecera", () => {
    expect(ROTAS_COM_SESSAO).toEqual(
      expect.arrayContaining([
        "/pre-cursos",
        "/pos-cursos",
        "/avaliacoes",
        "/meus-dados",
        "/dados-pessoais",
      ]),
    );
  });

  it("nao repete href (varios perfis compartilham as mesmas telas)", () => {
    expect(new Set(ROTAS_COM_SESSAO).size).toBe(ROTAS_COM_SESSAO.length);
  });

  // /login nao pode entrar: o proxy redirecionaria /login para /login.
  it("nao inclui rota publica", () => {
    expect(ROTAS_COM_SESSAO).not.toContain("/login");
    expect(ROTAS_COM_SESSAO).not.toContain("/");
  });
});
