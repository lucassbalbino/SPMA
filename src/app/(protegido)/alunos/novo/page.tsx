// /alunos/novo (REQ-AU-05, AVAL-01 - tela).
//
// Atalho para o caso mais frequente de `/usuarios/novo`: cadastrar um Aluno.
// A tela genérica continua existindo e fazendo a mesma coisa com `tipo=AL`
// escolhido no `select`; esta aqui é a "opção Cadastrar aluno" que aparece no
// menu de todo perfil autorizado a criar um AL (hoje AM e GO - a cascata do
// AD-009, `TIPOS_PERMITIDOS`), sem obrigar quem cadastra a saber que Aluno é
// um "tipo de usuário".
//
// Server Component só para obter a sessão e a lista de cursos; a
// interatividade vive em `NovoAlunoForm` (client component colocado).
//
// Nada aqui é autorização: quem digitar a URL sem poder criar Aluno vê a
// mensagem abaixo, e `POST /api/usuarios` reavalia `podeCriar` +
// `podeMatricularAluno` a cada request (AD-033).
import { podeCriar } from "@/lib/auth/cascata";
import { requireSession } from "@/lib/auth/guards";
import { cursosMatriculaveis } from "@/lib/pre-curso/cursos-matriculaveis";
import { TipoUsuario } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoAlunoForm } from "./NovoAlunoForm";

export default async function NovoAlunoPage() {
  const { usuario } = await requireSession();

  if (!podeCriar(usuario.tipo, TipoUsuario.AL)) {
    return (
      <>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Cadastrar aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="aviso-sem-permissao">
              Seu perfil não pode cadastrar alunos.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // AVAL-01: todo Aluno nasce matriculado, então o curso é parte do cadastro
  // e a lista vem no mesmo escopo de quem matricula (AVAL-05/06).
  const cdCursosDisponiveis = await cursosMatriculaveis(usuario);

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Cadastrar aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoAlunoForm cdCursosDisponiveis={cdCursosDisponiveis} />
        </CardContent>
      </Card>
    </>
  );
}
