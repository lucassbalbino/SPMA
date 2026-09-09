// /pre-cursos/novo (REQ-PC-01/02/03, AD-040, tela).
//
// Server Component: monta a lista que o perfil pode escolher e delega a
// interatividade a `NovoPreCursoForm` (client component colocado) - o
// servidor reavalia tudo de novo em POST /api/pre-cursos (AD-033), esta tela
// só evita oferecer o que a rota rejeitaria.
//
// Dois perfis criam pré-curso, e escolhem coisas diferentes:
//  - GO: as Verbas do próprio Ofertante, com o saldo disponível de cada uma
//    (reuso de calcularSaldoVerba, a mesma usada em POST /api/pre-cursos);
//  - AM: o Ofertante do curso, em escopo nacional (AD-012). Verba ele não
//    escolhe - o custeio sai sempre da verba ilimitada (AD-040), e por isso
//    não há saldo a mostrar aqui.
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { calcularSaldoVerba } from "@/lib/verba/saldo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoPreCursoForm, type OpcaoDoCurso } from "./NovoPreCursoForm";

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Novo pré-curso</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function NovoPreCursoPage() {
  const { usuario } = await requireSession();

  if (usuario.tipo === "AM") {
    const ofertantes = await prisma.ofertante.findMany({
      orderBy: { nome: "asc" },
      select: { cdOfertante: true, nome: true },
    });

    const opcoes: OpcaoDoCurso[] = ofertantes.map((ofertante) => ({
      valor: ofertante.cdOfertante,
      rotulo: ofertante.nome,
    }));

    return (
      <Moldura>
        <p className="mb-4 text-sm text-muted-foreground" data-testid="aviso-verba-ilimitada">
          O curso é custeado pela verba ilimitada da administração: nenhuma verba
          de Ofertante é consumida.
        </p>
        <NovoPreCursoForm fonte="ofertante" opcoes={opcoes} />
      </Moldura>
    );
  }

  if (usuario.tipo !== "GO" || usuario.cdOfertante === null) {
    return (
      <Moldura>
        <p className="text-sm text-muted-foreground">
          Seu perfil não pode criar pré-cursos.
        </p>
      </Moldura>
    );
  }

  const verbas = await prisma.verba.findMany({
    where: { cdOfertante: usuario.cdOfertante },
    orderBy: { cdVerba: "asc" },
  });

  const opcoes: OpcaoDoCurso[] = await Promise.all(
    verbas.map(async (verba) => {
      const { saldoDisponivel } = await calcularSaldoVerba(verba.cdVerba);
      // Verba de Ofertante nunca é ilimitada (AD-040: só a da administração
      // é, e ela não tem Ofertante), então aqui o saldo é sempre um número.
      const saldo = saldoDisponivel?.toFixed(2) ?? "sem teto";
      return { valor: verba.cdVerba, rotulo: `Verba #${verba.cdVerba} — saldo R$ ${saldo}` };
    }),
  );

  return (
    <Moldura>
      <NovoPreCursoForm fonte="verba" opcoes={opcoes} />
    </Moldura>
  );
}
