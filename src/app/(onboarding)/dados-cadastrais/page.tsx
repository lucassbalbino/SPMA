// /dados-cadastrais (AD-050).
//
// Nome e e-mail obrigatórios de AM/GT/VT/VO logo depois de definir a senha:
// a criação só pede o documento. `requireDadosCadastraisCompletos` (layout de
// `(protegido)`) redireciona para cá enquanto o nome estiver vazio. Vive em
// `(onboarding)` pelo mesmo motivo de /dados-pessoais e /cadastro-ofertante -
// ver `(protegido)/layout.tsx` para o loop de redirect que isso evita.
//
// Server Component só para entregar ao formulário o e-mail que já exista
// (conta anterior a esta regra). Quem já informou o nome vê a tela se
// digitar a URL, e o envio responde 409.
import { requireSession } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DadosCadastraisForm } from "./DadosCadastraisForm";

export default async function DadosCadastraisPage() {
  const { usuario } = await requireSession();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
        </CardHeader>
        <CardContent>
          <DadosCadastraisForm emailInicial={usuario.email ?? ""} />
        </CardContent>
      </Card>
    </main>
  );
}
