// PATCH /api/usuarios/me/dados-pessoais (PESSOAL-01, PESSOAL-03, PESSOAL-05,
// PESSOAL-17 a 20).
//
// Primeira rota do projeto em /api/usuarios/me/*: opera sempre sobre o CPF da
// própria sessão, nunca recebe CPF na URL nem no corpo. Isso satisfaz
// PESSOAL-19 (recusar qualquer tentativa sobre outro CPF) por construção -
// não existe parâmetro para apontar outro CPF.
//
// Tudo-ou-nada, deliberadamente diferente do merge raso da Avaliação
// (AVAL-07): só persiste quando o estado RESULTANTE (mesclado) tem os 7
// campos válidos - senão nada é gravado, nem os campos que vieram válidos no
// mesmo corpo (design.md, item 8). É o que permite este único endpoint
// servir tanto a primeira gravação obrigatória (estado anterior vazio, só
// passa com os 7 de uma vez) quanto a edição pelo perfil (estado anterior já
// completo, um PATCH de 1 campo mescla e o resultado continua completo).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { respostasDadosPessoaisSchema } from "@/lib/validation/schemas/dados-pessoais.schema";
import { validarCompletudeDadosPessoais } from "@/lib/dados-pessoais/completude";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import {
  gravarRespostas,
  lerRespostas,
  lerRespostasParaApi,
  ISOLAMENTO_RESPOSTAS,
} from "@/lib/respostas/repositorio";

async function gravarDadosPessoais(request: Request) {
  // REQ-SEC-15: mesma ordem RH->CSRF->Sessão->Guard das demais rotas mutantes.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  // PESSOAL-20: só o Aluno tem essa área, reforçado no backend (não só na
  // navegação escondida).
  if (sessao.usuario.tipo !== "AL") {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = respostasDadosPessoaisSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const alvo = { formulario: "dadosPessoais" as const, cpf: sessao.usuario.cpf };

  const atuais = await lerRespostas(prisma, alvo);
  const mescladas = { ...atuais, ...entrada.data };

  // PESSOAL-05/18: só persiste quando o resultado mesclado tem os 7 campos
  // válidos. Cobre tanto "faltou responder" (primeira gravação) quanto
  // "deixou vazia/inválida" (edição) sem regra própria para o segundo caso -
  // um valor vazio/inválido já falha no safeParse acima.
  const { completo } = validarCompletudeDadosPessoais(mescladas);

  if (!completo) {
    return NextResponse.json(
      { erro: "Complete todos os dados pessoais" },
      { status: 400 },
    );
  }

  const { respostas } = await prisma.$transaction(async (tx) => {
    await gravarRespostas(tx, alvo, entrada.data);
    await tx.usuario.update({
      where: { cpf: sessao.usuario.cpf },
      data: { dadosPessoaisCompletos: true },
    });

    return { respostas: await lerRespostasParaApi(tx, alvo) };
  }, ISOLAMENTO_RESPOSTAS);

  return NextResponse.json({ respostas });
}

export const PATCH = comTratamentoDeErro(gravarDadosPessoais);
