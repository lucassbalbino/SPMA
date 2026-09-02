// Raiz do site. Não tem conteúdo próprio: manda para o painel, e quem não
// tiver sessão é desviado para /login pelo proxy (que checa presença de
// cookie) e pela guarda de `(protegido)/layout.tsx`, que é a autoridade.
//
// `connection()` antes do redirect é o que impede o Next de resolver esta
// rota no build. Prerenderizada, ela servia um HTML com scripts sem nonce e
// o CSP de `src/proxy.ts` os bloqueava (mesma causa comentada em
// `(public)/login/page.tsx`). Dinâmica, o redirect vira resposta de servidor
// e nenhum HTML chega a ser servido daqui.
//
// Sem isto a rota `/` servia a página de boilerplate do create-next-app.
import { connection } from "next/server";
import { redirect } from "next/navigation";

export default async function Home() {
  await connection();
  redirect("/painel");
}
