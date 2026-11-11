// /painel (REQ-AU-10).
//
// Landing pós-login/pós-gates: conteúdo mínimo condicionado a `usuario.tipo`
// (lista estática de módulos disponíveis ao perfil). Base para as próximas
// features - sem lógica de negócio adicional aqui (ver design.md).
import { requireSession } from "@/lib/auth/guards";
import { modulosDoPerfil } from "@/lib/ui/navegacao";
import { NOME_TIPO_USUARIO } from "@/lib/ui/tipos-usuario";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PainelPage() {
  const { usuario } = await requireSession();
  const modulos = modulosDoPerfil(usuario.tipo);

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Olá, {usuario.nome}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* RU-34 (doc 1): o perfil por extenso, não a sigla. */}
          <p className="text-sm text-muted-foreground" data-testid="painel-perfil">
            Você está no perfil de{" "}
            <strong className="font-medium text-foreground">{NOME_TIPO_USUARIO[usuario.tipo]}</strong>
          </p>
          <p className="mt-3 text-sm text-muted-foreground" data-testid="painel-apto">
            Portanto, está apto a realizar:
          </p>
          <ul data-testid="painel-modulos" className="mt-1 ml-4 list-disc text-sm">
            {modulos.map((modulo) => (
              <li key={modulo}>{modulo}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
