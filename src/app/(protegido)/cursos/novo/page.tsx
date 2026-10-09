// /cursos/novo (REQ-PC-01/02/03, tela) - O ATO DE CRIAR UM CURSO DO ZERO.
//
// Esta é a única tela de criação de curso que existe, e criar um curso cria os
// DOIS questionários: POST /api/cursos abre uma transação que grava PreCurso e
// PosCurso juntos. Não existe tela nem rota para criar um pré-curso ou um
// pós-curso isolado (decisão do usuário, 2026-10-09) - por isso ela mora em
// `/cursos/novo` e não em `/pre-cursos/novo`, que era um nome que prometia um
// ato que o sistema não oferece. `/pre-cursos` segue sendo a LISTA e
// `/pre-cursos/[id]` o questionário pré de um curso que já existe.
//
// Server Component: carrega as Verbas elegíveis e o saldo disponível de cada
// uma (reuso de calcularSaldoVerba, já usada em POST /api/cursos) para
// popular o seletor. A interatividade do formulário vive em `NovoCursoForm`
// (client component colocado) - o servidor reavalia tudo de novo em POST
// /api/cursos (AD-033), esta tela só evita escolher algo fora do escopo.
//
// AD-040: além do GO (só as Verbas do próprio Ofertante), o AM também cria
// curso, para qualquer Ofertante (autoridade nacional, AD-012) - por isso a
// lista inclui o nome do Ofertante quando o criador é AM.
import { requireSession, resolverEscopoOfertante } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { calcularSaldoVerba } from "@/lib/verba/saldo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoCursoForm } from "./NovoCursoForm";

export default async function NovoCursoPage() {
  const { usuario } = await requireSession();

  // UGO-14/AD-043: o escopo do GO é o próprio documento (`resolverEscopoOfertante`,
  // T6) - `usuario.cdOfertante` é sempre `null` para um GO, nunca a fonte da
  // verdade de escopo.
  const escopoOfertante = resolverEscopoOfertante(usuario);

  if (usuario.tipo !== "AM" && (usuario.tipo !== "GO" || escopoOfertante === null)) {
    return (
      <>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Novo curso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seu perfil não pode criar cursos.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const verbas = await prisma.verba.findMany({
    where: usuario.tipo === "AM" ? {} : { cdOfertante: escopoOfertante! },
    orderBy: { cdVerba: "asc" },
    include: { ofertante: { select: { nome: true } } },
  });

  const opcoesVerba = await Promise.all(
    verbas.map(async (verba) => {
      const { saldoDisponivel } = await calcularSaldoVerba(verba.cdVerba);
      return {
        cdVerba: verba.cdVerba,
        saldoDisponivel: saldoDisponivel.toNumber(),
        nomeOfertante: usuario.tipo === "AM" ? verba.ofertante.nome : undefined,
      };
    }),
  );

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo curso</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoCursoForm opcoesVerba={opcoesVerba} />
        </CardContent>
      </Card>
    </>
  );
}
