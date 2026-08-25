// Layout do grupo `(onboarding)`: só exige sessão válida (REQ-SEC-14).
//
// SPEC_DEVIATION: design.md original descrevia `/primeiro-acesso` e
// `/cadastro-ofertante` como páginas de `(protegido)`, guardadas pelas três
// guardas (sessão + primeiro acesso + ofertante). Isso causaria um redirect
// para si mesma em loop, já que essas rotas são justamente o destino das
// duas últimas guardas e Server Components não expõem o pathname da
// requisição atual para o layout poder pular o guard "estou indo pra lá
// mesmo" (ver nota de execução em `src/app/(protegido)/layout.tsx`,
// confirmado empiricamente com curl). Reason: por isso este grupo irmão
// existe, guardado só por requireSession() - a URL final (`/primeiro-acesso`,
// `/cadastro-ofertante`) é a mesma, já que grupos de rota não aparecem na
// URL.
import { requireSession } from "@/lib/auth/guards";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <>{children}</>;
}
