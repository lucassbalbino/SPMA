// /usuarios/novo (REQ-AU-05).
//
// Formulário de criação de usuário em cascata: as opções de `tipo`
// mostradas ao usuário logado são filtradas por
// `TIPOS_PERMITIDOS[usuarioLogado.tipo]` (conveniência de UI - o servidor
// reavalia a permissão em POST /api/usuarios, AD-033). Server Component só
// para obter `usuario.tipo` via `requireSession()`; a interatividade do
// formulário vive em `NovoUsuarioForm` (client component colocado).
import { requireSession } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoUsuarioForm } from "./NovoUsuarioForm";

export default async function NovoUsuarioPage() {
  const { usuario } = await requireSession();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoUsuarioForm tipoCriador={usuario.tipo} />
        </CardContent>
      </Card>
    </main>
  );
}
