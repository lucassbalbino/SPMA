// /cadastro-ofertante (UGO-01..04, OGO-02, OGO-17, OGO-18, OGO-20).
//
// Formulário obrigatório de dados organizacionais do GO no 1º acesso:
// `requireDadosOrganizacionaisCompletos` (layout de `(protegido)`) redireciona
// para cá enquanto a flag do GO for false. Vive em `(onboarding)`, guardado só
// por `requireSession()` (layout do grupo) - ver `(protegido)/layout.tsx` para
// o loop de redirect que isso evita.
//
// Server Component só para ler o nome já gravado (GO anterior à AD-050, que
// nascia com nome) e entregá-lo ao formulário (OGO-02). Não se blinda contra o GO que já concluiu: ele vê a
// tela se digitar a URL, e o envio responde 409 (OGO-17, Assumptions da spec).
import { requireSession } from "@/lib/auth/guards";
import { CadastroOrganizacaoForm } from "@/components/organizacao/CadastroOrganizacaoForm";

export default async function CadastroOfertantePage() {
  const { usuario } = await requireSession();

  return <CadastroOrganizacaoForm nomeInicial={usuario.nome ?? ""} />;
}
