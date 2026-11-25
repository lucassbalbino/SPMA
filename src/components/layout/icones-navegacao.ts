// Ícone de cada destino do menu e de cada módulo do painel (design system
// SPMA, docs/design-system.md: Lucide, traço 1.75, 22px).
//
// Fica fora de `src/lib/ui/navegacao.ts` de propósito: aquele módulo é lido
// por `src/proxy.ts` e não deve arrastar dependência de UI para o proxy. Aqui
// não existe lista de navegação, só a figura de cada href que já está lá
// (AD-039: a fonte única continua sendo navegacao.ts).
import {
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  FilePlus,
  GraduationCap,
  House,
  LayoutGrid,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Modulo } from "@/lib/ui/navegacao";

const ICONE_POR_HREF: Record<string, LucideIcon> = {
  "/painel": House,
  "/usuarios": Users,
  "/verbas": Wallet,
  "/cursos/novo": FilePlus,
  "/pre-cursos": ClipboardList,
  "/pos-cursos": ClipboardCheck,
  "/avaliacoes": GraduationCap,
  "/meus-dados": UserCog,
  "/relatorios": ChartColumn,
};

/**
 * Itens que abrem um grupo novo no menu lateral: a linha divisória da
 * referência (que separa os módulos do trabalho dos itens da conta) entra
 * antes deles. Só aparência - a ordem dos itens continua em navegacao.ts.
 */
const HREFS_COM_SEPARADOR_ANTES = new Set(["/meus-dados"]);

export function separadorAntes(href: string): boolean {
  return HREFS_COM_SEPARADOR_ANTES.has(href);
}

export function iconeDoHref(href: string): LucideIcon {
  return ICONE_POR_HREF[href] ?? LayoutGrid;
}

/**
 * Destino do cartão do módulo no painel: a primeira tela de consulta. O atalho
 * de criação (`/cursos/novo`) abre a lista de Gestão de Formações para AM/GO,
 * mas o cartão do módulo leva à listagem, não a um formulário em branco.
 */
export function destinoDoModulo(modulo: Modulo) {
  return modulo.itens.find((item) => !item.href.endsWith("/novo")) ?? modulo.itens[0];
}

export function iconeDoModulo(modulo: Modulo): LucideIcon {
  const destino = destinoDoModulo(modulo);
  return destino ? iconeDoHref(destino.href) : LayoutGrid;
}
