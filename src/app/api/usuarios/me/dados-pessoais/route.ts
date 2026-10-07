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
import { respostasDadosPessoaisSchema } from "@/lib/validation/schemas/dados-pessoais.schema";
import { validarCompletudeDadosPessoais } from "@/lib/dados-pessoais/completude";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { aplicarPatchRespostas } from "@/lib/respostas/patch";

async function gravarDadosPessoais(request: Request) {
  const sessao = await exigirMutacao(request);

  // PESSOAL-20: só o Aluno tem essa área, reforçado no backend (não só na
  // navegação escondida).
  if (sessao.usuario.tipo !== "AL") {
    throw erroHttp(403, "Acesso negado");
  }

  const patch = await corpoValidado(request, respostasDadosPessoaisSchema);
  const cpf = sessao.usuario.documento;

  const { respostas } = await aplicarPatchRespostas({
    alvo: { formulario: "dadosPessoais", cpf },
    patch,
    // PESSOAL-05/18: só persiste quando o resultado mesclado tem os 7 campos
    // válidos. Cobre tanto "faltou responder" (primeira gravação) quanto
    // "deixou vazia/inválida" (edição) sem regra própria para o segundo caso -
    // um valor vazio/inválido já falha no schema acima.
    validarMesclado: (mescladas) => {
      if (!validarCompletudeDadosPessoais(mescladas).completo) {
        throw erroHttp(400, "Complete todos os dados pessoais");
      }
    },
    gravarRegistro: (tx) =>
      tx.usuario.update({
        where: { documento: cpf },
        data: { dadosPessoaisCompletos: true },
      }),
  });

  return NextResponse.json({ respostas });
}

export const PATCH = comTratamentoDeErro(gravarDadosPessoais);
