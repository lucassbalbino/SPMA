// Nome do cookie de sessão, isolado num módulo sem nenhuma dependência de
// Prisma/banco.
//
// Motivo de existir separado de session.ts: session.ts importa
// `lib/db/prisma.ts`, que instancia um PrismaClient (com driver adapter) no
// top-level do módulo - um import estático de qualquer export de session.ts
// arrasta esse client junto, mesmo que só o nome do cookie seja usado. O
// proxy (T30, src/proxy.ts) precisa do nome para checar a presença do
// cookie, mas não pode ter NENHUMA dependência de banco, nem transitiva
// (design.md: "thin proxy"). Reexportado por session.ts para não mudar a
// API pública que as rotas já usam.
export const COOKIE_SESSAO = "spma_sessao";
