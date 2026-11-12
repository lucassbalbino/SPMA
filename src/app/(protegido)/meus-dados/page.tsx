// /meus-dados - Editar Perfil (PESSOAL-16 a 19; RU-47 a RU-53).
//
// O Aluno edita os 7 dados pessoais, o nome, o e-mail e o telefone pelo
// formulário de dados pessoais. Os demais perfis - que antes recebiam
// `notFound()` aqui (PESSOAL-20) - editam nome, e-mail e telefone pelo
// `PerfilForm` (comentário 2 do documento do cliente: "isso vale para todos
// os perfis"). Esconder o item do menu continua não sendo autorização
// (AD-039): as duas rotas de gravação conferem o perfil da sessão.
//
// Nenhuma rota recebe documento - operam sempre sobre `usuario.documento` da
// sessão, então não existe parâmetro para apontar o cadastro de outro
// (PESSOAL-19, RU-54).
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { lerRespostas } from "@/lib/respostas/repositorio";
import type { RespostasDadosPessoais } from "@/lib/validation/schemas/dados-pessoais.schema";
import { DadosPessoaisForm } from "@/components/dados-pessoais/DadosPessoaisForm";
import { PerfilForm } from "@/components/perfil/PerfilForm";
import { AVISO_SENHA } from "@/lib/ui/perfil";

export default async function MeusDadosPage() {
  const { usuario } = await requireSession();

  if (usuario.tipo !== "AL") {
    return (
      <PerfilForm
        inicial={{
          nome: usuario.nome ?? "",
          email: usuario.email ?? "",
          telefone: usuario.telefone ?? "",
        }}
        // RU-53: o AM não tem gestor acima dele.
        mostrarAvisoSenha={usuario.tipo !== "AM"}
      />
    );
  }

  const respostasIniciais = (await lerRespostas(prisma, {
    formulario: "dadosPessoais",
    cpf: usuario.documento,
  })) as Partial<RespostasDadosPessoais>;

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <p className="text-sm text-muted-foreground" data-testid="aviso-senha">
        {AVISO_SENHA}
      </p>
      <DadosPessoaisForm
        cadastroInicial={{
          nome: usuario.nome ?? "",
          email: usuario.email ?? "",
          telefone: usuario.telefone ?? "",
        }}
        respostasIniciais={respostasIniciais}
        modo="perfil"
      />
    </div>
  );
}
