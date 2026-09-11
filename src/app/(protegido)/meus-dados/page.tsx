// /meus-dados (PESSOAL-16 a 20).
//
// Edição posterior dos 7 dados pessoais, só para o Aluno. `notFound()` para
// qualquer outro perfil - mesmo padrão de acesso indevido de
// `avaliacoes/[cpf]/[cdCurso]/page.tsx`: esconder o item do menu (AD-039) não
// é autorização, o backend da própria tela reforça (PESSOAL-20).
//
// A rota nunca recebe CPF - opera sempre sobre `usuario.cpf` da sessão, então
// não existe parâmetro para um Aluno apontar o CPF de outro (PESSOAL-19).
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { lerRespostas } from "@/lib/respostas/repositorio";
import type { RespostasDadosPessoais } from "@/lib/validation/schemas/dados-pessoais.schema";
import { DadosPessoaisForm } from "@/components/dados-pessoais/DadosPessoaisForm";

export default async function MeusDadosPage() {
  const { usuario } = await requireSession();

  if (usuario.tipo !== "AL") {
    notFound();
  }

  const respostasIniciais = (await lerRespostas(prisma, {
    formulario: "dadosPessoais",
    cpf: usuario.cpf,
  })) as Partial<RespostasDadosPessoais>;

  return (
    <DadosPessoaisForm respostasIniciais={respostasIniciais} modo="perfil" />
  );
}
