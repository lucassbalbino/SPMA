// /usuarios/novo (REQ-AU-05, REQ-OV-08).
//
// Formulário de criação de usuário em cascata: as opções de `tipo`
// mostradas ao usuário logado são filtradas por
// `TIPOS_PERMITIDOS[usuarioLogado.tipo]` (conveniência de UI - o servidor
// reavalia a permissão em POST /api/usuarios, AD-033). Server Component só
// para obter `usuario.tipo` via `requireSession()`; a interatividade do
// formulário vive em `NovoUsuarioForm` (client component colocado).
//
// Quem gere verba (AM/GT) também escolhe aqui o Ofertante do GO/VO criado e,
// no caso do GO, informa a verba desse Ofertante no mesmo passo - por isso a
// lista de Ofertantes é carregada aqui e passada pronta ao formulário. Para
// os demais perfis a lista vem vazia: o Ofertante do usuário criado é sempre
// o do próprio criador, resolvido no servidor (REQ-AU-08).
//
// Todo Aluno nasce matriculado (AVAL-01), então a lista de cursos elegíveis
// também vem daqui, no mesmo escopo de quem matricula (AVAL-05/06): o AM vê
// os cursos de qualquer Ofertante, o GO só os do seu.
import { podeGerenciarVerba, requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoUsuarioForm } from "./NovoUsuarioForm";

export default async function NovoUsuarioPage() {
  const { usuario } = await requireSession();

  const escolheOfertante = podeGerenciarVerba(usuario.tipo);
  const ofertantes = escolheOfertante
    ? await prisma.ofertante.findMany({
        select: { cdOfertante: true, nome: true },
        orderBy: { nome: "asc" },
      })
    : [];

  // Mesmo escopo de `podeMatricularAluno`, escrito como filtro que o banco
  // entende - o servidor reavalia o curso escolhido em POST /api/usuarios
  // (AD-033). AM não tem cdOfertante (AD-012), então vê os cursos de todos.
  const cursos =
    usuario.tipo === "AM"
      ? await prisma.preCurso.findMany({
          orderBy: { cdCurso: "asc" },
          select: { cdCurso: true },
        })
      : usuario.tipo === "GO" && usuario.cdOfertante !== null
        ? await prisma.preCurso.findMany({
            where: { cdOfertante: usuario.cdOfertante },
            orderBy: { cdCurso: "asc" },
            select: { cdCurso: true },
          })
        : [];

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoUsuarioForm
            tipoCriador={usuario.tipo}
            escolheOfertante={escolheOfertante}
            ofertantes={ofertantes}
            cdCursosDisponiveis={cursos.map((curso) => curso.cdCurso)}
          />
        </CardContent>
      </Card>
    </>
  );
}
