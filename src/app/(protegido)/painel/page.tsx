// /painel (REQ-AU-10).
//
// Landing pós-login/pós-gates: conteúdo mínimo condicionado a `usuario.tipo`
// (lista estática de módulos disponíveis ao perfil). Base para as próximas
// features - sem lógica de negócio adicional aqui (ver design.md).
import { requireSession } from "@/lib/auth/guards";
import { TipoUsuario } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULOS_POR_PERFIL: Record<TipoUsuario, string[]> = {
  [TipoUsuario.AM]: ["Gestão de usuários", "Ofertantes", "Verbas", "Cursos", "Relatórios"],
  [TipoUsuario.GT]: ["Gestão de usuários", "Ofertantes", "Verbas", "Cursos"],
  [TipoUsuario.VT]: ["Cursos", "Relatórios"],
  [TipoUsuario.GO]: ["Gestão de usuários", "Meus cursos"],
  [TipoUsuario.VO]: ["Meus cursos"],
  [TipoUsuario.AL]: ["Minha avaliação"],
};

export default async function PainelPage() {
  const { usuario } = await requireSession();
  const modulos = MODULOS_POR_PERFIL[usuario.tipo];

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Olá, {usuario.nome}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="painel-perfil">
            Perfil: {usuario.tipo}
          </p>
          <ul data-testid="painel-modulos">
            {modulos.map((modulo) => (
              <li key={modulo}>{modulo}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
