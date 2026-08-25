// Layout do grupo de rotas protegido (REQ-AU-02, REQ-AU-09, REQ-SEC-14).
//
// Autoridade real de autorização de borda: chama, nesta ordem exata,
// requireSession() -> requirePrimeiroAcessoConcluido() -> requireOfertanteVinculado().
// `proxy.ts` (T30) só redireciona por presença de cookie (UX); é aqui que a
// sessão é reavaliada contra o banco a cada request (ver design.md).
//
// SPEC_DEVIATION: design.md lista `/primeiro-acesso` e `/cadastro-ofertante`
// como páginas deste MESMO grupo (protegido). Isso não é possível: as duas
// são justamente o destino dos redirects de requirePrimeiroAcessoConcluido/
// requireOfertanteVinculado, e Server Components não têm como saber o
// pathname da requisição atual (next/headers não expõe isso - só
// usePathname, que é client-side; ver node_modules/next/dist/docs/.../
// layout.md, seção "Pathname"). Se essas duas páginas ficassem sob este
// layout, visitá-las diretamente causaria um redirect para si mesmas em
// loop - confirmado empiricamente (curl -v mostrou 307 com
// `location: /primeiro-acesso` ao pedir `/primeiro-acesso` com
// primeiraVez=true). Reason: por isso `/primeiro-acesso` e
// `/cadastro-ofertante` (T26/T27) vivem em `src/app/(onboarding)/`, um
// grupo irmão guardado só por requireSession() - mesmas URLs finais
// (grupos de rota são transparentes), sem o guard que criaria o loop.
import {
  requireOfertanteVinculado,
  requirePrimeiroAcessoConcluido,
  requireSession,
} from "@/lib/auth/guards";

export default async function ProtegidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario } = await requireSession();
  requirePrimeiroAcessoConcluido(usuario);
  requireOfertanteVinculado(usuario);

  return <>{children}</>;
}
