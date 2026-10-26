// /dados-pessoais (PESSOAL-01, PESSOAL-02, PESSOAL-06).
//
// Coleta obrigatória dos 7 dados pessoais do Aluno, logo após criar a senha.
// Vive em (onboarding), não em (protegido): requireDadosPessoaisCompletos
// (src/lib/auth/guards.ts) roda no layout protegido e redireciona pra cá -
// se esta página também vivesse lá, o redirect faria loop nela mesma (mesmo
// motivo documentado em `(protegido)/layout.tsx` para /primeiro-acesso e
// /cadastro-ofertante - Server Components não expõem o pathname da
// requisição ao layout).
//
// As respostas sempre partem de estado vazio: o PATCH tudo-ou-nada
// (`/api/usuarios/me/dados-pessoais`) nunca deixa gravação parcial no banco,
// então não há nada para pré-carregar. Nome e e-mail vêm da sessão - um Aluno
// criado antes da AD-050 já nasceu com nome.
import { requireSession } from "@/lib/auth/guards";
import { DadosPessoaisForm } from "@/components/dados-pessoais/DadosPessoaisForm";

export default async function DadosPessoaisPage() {
  const { usuario } = await requireSession();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <DadosPessoaisForm
        cadastroInicial={{ nome: usuario.nome ?? "", email: usuario.email ?? "" }}
        respostasIniciais={{}}
        modo="onboarding"
      />
    </main>
  );
}
