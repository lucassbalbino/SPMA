// /usuarios/novo (REQ-AU-05, REQ-OV-08).
//
// Formulário de criação de usuário em cascata: as opções de `tipo`
// mostradas ao usuário logado são filtradas por
// `TIPOS_PERMITIDOS[usuarioLogado.tipo]` (conveniência de UI - o servidor
// reavalia a permissão em POST /api/usuarios, AD-033). Server Component só
// para obter `usuario.tipo` via `requireSession()`; a interatividade do
// formulário vive em `NovoUsuarioForm` (client component colocado).
//
// UGO-14/AD-043: sem `model Ofertante` separado, quem gere verba (AM/GT) já
// não "escolhe um Ofertante" para o GO que cria - o GO É o Ofertante, e
// informa os próprios dados organizacionais (CNPJ/nome/UF) no mesmo passo.
// A lista carregada aqui passa a ser de GOs existentes, usada só para
// vincular um VO a um deles (`cdOfertante`, T15). Para os demais perfis a
// lista vem vazia: o Ofertante do usuário criado é sempre o do próprio
// criador, resolvido no servidor (REQ-AU-08).
//
// Todo Aluno nasce matriculado (AVAL-01), então a lista de cursos elegíveis
// também vem daqui, no mesmo escopo de quem matricula (AVAL-05/06): o AM vê
// os cursos de qualquer Ofertante, o GO só os do seu (via
// `resolverEscopoOfertante`, T6 - o GO não tem mais `cdOfertante` próprio).
import { podeGerenciarVerba, requireSession, resolverEscopoOfertante } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoUsuarioForm } from "./NovoUsuarioForm";

export default async function NovoUsuarioPage() {
  const { usuario } = await requireSession();

  const escolheOfertante = podeGerenciarVerba(usuario.tipo);
  const gos = escolheOfertante
    ? await prisma.usuario.findMany({
        where: { tipo: "GO" },
        select: { documento: true, nome: true },
        orderBy: { nome: "asc" },
      })
    : [];

  // Mesmo escopo de `podeMatricularAluno`, escrito como filtro que o banco
  // entende - o servidor reavalia o curso escolhido em POST /api/usuarios
  // (AD-033). AM não tem escopo de Ofertante (AD-012), então vê os cursos de
  // todos.
  const cursos =
    usuario.tipo === "AM"
      ? await prisma.preCurso.findMany({
          orderBy: { cdCurso: "asc" },
          select: { cdCurso: true },
        })
      : usuario.tipo === "GO"
        ? await prisma.preCurso.findMany({
            where: { cdOfertante: resolverEscopoOfertante(usuario) ?? "" },
            orderBy: { cdCurso: "asc" },
            select: { cdCurso: true },
          })
        : [];

  // O nome do curso não é coluna de `PreCurso` - é a resposta da Seção 2, Q8
  // ("Nome da Ação de Qualificação") do formulário de pré-curso, gravada em
  // `RespostaPreCurso` (RESP-01). Pode faltar se o GO ainda não preencheu
  // essa pergunta - o select cai pro "Curso #cd" nesse caso.
  const nomesCursos =
    cursos.length > 0
      ? await prisma.respostaPreCurso.findMany({
          where: {
            cdCurso: { in: cursos.map((curso) => curso.cdCurso) },
            chave: "qualifNomeCurso",
          },
          select: { cdCurso: true, valor: true },
        })
      : [];
  const nomePorCurso = new Map(nomesCursos.map((linha) => [linha.cdCurso, linha.valor]));

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
            gos={gos}
            cursosDisponiveis={cursos.map((curso) => ({
              cdCurso: curso.cdCurso,
              nome: nomePorCurso.get(curso.cdCurso) ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
