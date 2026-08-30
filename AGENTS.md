<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Convenções do projeto

**Camada visual em arquivo único (AD-039).** Toda cor, raio e fonte vive em `src/app/globals.css`, como token. Nenhum `.tsx` carrega cor literal — use os tokens (`bg-background`, `text-muted-foreground`, `border-border`) em vez de valores hexadecimais ou `oklch()` soltos no componente. É o que permite trocar a estética depois editando só `:root` e `@theme inline`, sem tocar em tela nenhuma. Convenção documentada, não gate de CI.

**Navegação tem fonte única (AD-039).** Os itens de menu e os módulos do painel saem de `src/lib/ui/navegacao.ts`. Não escreva lista de módulos direto numa página. Esconder um item ali é conveniência de UI e **nunca** autorização: os guards de backend seguem valendo a cada request.
