// Casca comum de toda rota do grupo (protegido) - UI-01, UI-06, UI-07.
//
// Server Component: recebe o `usuario` já resolvido por requireSession() no
// layout, então nenhum componente daqui consulta o banco de novo. Só os
// pedaços que precisam de JavaScript (o realce do item ativo e o botão de
// saída) são Client Components.
//
// O cabeçalho identifica o usuário por nome e sigla do perfil, nunca por
// CPF (REQ-SEC-12).
import type { TipoUsuario } from "@/generated/prisma/enums";

export function CascaProtegida({
  usuario,
  children,
}: {
  usuario: { nome: string | null; tipo: TipoUsuario };
  children: React.ReactNode;
}) {
  return (
    <>
      {/* flex-wrap, sem drawer e sem JS: abaixo de 640px os itens quebram
          linha em vez de estourar a viewport (UI-07). */}
      <header
        className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3"
        data-testid="casca-cabecalho"
      >
        <span className="text-lg font-semibold tracking-tight">SPMA</span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="max-w-64 truncate text-sm font-medium">{usuario.nome}</span>
          <span className="text-sm text-muted-foreground">{usuario.tipo}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
