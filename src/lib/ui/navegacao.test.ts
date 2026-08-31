import { describe, expect, it } from "vitest";
import { TipoUsuario } from "../../generated/prisma/enums";
import {
  hrefAtivo,
  modulosDoPerfil,
  navegacaoDoPerfil,
  type ItemNavegacao,
} from "./navegacao";

// Tabela esperada escrita diretamente a partir de design.md ("A tabela de
// navegação"), não lida do módulo sob teste.
const HREFS_ESPERADOS: Record<TipoUsuario, string[]> = {
  AM: ["/painel", "/usuarios/novo", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  GT: ["/painel", "/usuarios/novo", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  VT: ["/painel", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  GO: ["/painel", "/usuarios/novo", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  VO: ["/painel", "/pre-cursos", "/pos-cursos", "/avaliacoes"],
  AL: ["/painel", "/avaliacoes"],
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
  "/pre-cursos/novo",
  "/pre-cursos/[id]",
  "/pos-cursos",
  "/pos-cursos/novo",
  "/pos-cursos/[cdCurso]",
  "/avaliacoes",
  "/avaliacoes/novo",
  "/avaliacoes/[cpf]/[cdCurso]",
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
