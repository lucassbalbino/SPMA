// GV-10: sem nenhum GO cadastrado, o formulário avisa e não deixa criar.
//
// Fica em teste unitário, não em e2e, porque os specs Playwright rodam em
// paralelo e criam GOs: "nenhum GO no banco" não é um estado que o e2e
// consiga garantir. `renderToStaticMarkup` renderiza o componente de verdade;
// só o roteador do Next é substituído, porque fora do app ele não existe.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const { NovaVerbaForm } = await import("./NovaVerbaForm");

describe("NovaVerbaForm sem GO cadastrado (GV-10)", () => {
  const html = renderToStaticMarkup(createElement(NovaVerbaForm, { gos: [] }));

  it("mostra o aviso de que não há Ofertante", () => {
    expect(html).toContain(
      "Nenhum Ofertante cadastrado - cadastre um GO antes de criar uma verba.",
    );
  });

  it("desabilita o botão 'Criar verba'", () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Criar verba<\/button>/);
  });
});

describe("NovaVerbaForm com GO cadastrado", () => {
  // Contraprova do GV-10: o aviso e o bloqueio dependem da lista vazia.
  const html = renderToStaticMarkup(
    createElement(NovaVerbaForm, { gos: [{ documento: "55000000000101", nome: "GO X" }] }),
  );

  it("não mostra o aviso e deixa o botão habilitado", () => {
    expect(html).not.toContain("Nenhum Ofertante cadastrado");
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Criar verba<\/button>/);
    expect(html).toContain(">Criar verba</button>");
  });
});
