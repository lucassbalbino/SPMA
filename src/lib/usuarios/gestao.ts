// Escritas da gestão de usuários: corrigir o cadastro (nome, e-mail e
// documento) e, na T7, resetar a senha (design.md, "Serviço de escrita").
//
// Quem chama já passou pela guarda de alvo (`exigirAlvoEditavel`): aqui não
// se reavalia escopo nem matriz, só se grava.
import { Prisma } from "../../generated/prisma/client";
import type { TipoUsuario } from "../../generated/prisma/enums";
import { prisma } from "../db/prisma";
import { erroHttp } from "../api/erro-http";
import { validarCNPJ } from "../validation/cnpj";
import { validarCPF } from "../validation/cpf";
import { normalizarDocumento } from "../validation/documento";
import { COLUNAS_LISTADAS, type UsuarioListado } from "./consulta";

const DOCUMENTO_JA_CADASTRADO = "Documento já cadastrado";

/**
 * O documento novo normalizado, ou 400 (GU-37/GU-38). CNPJ para GO, CPF para
 * os demais (REQ-AU-03/UGO-07), com as mesmas mensagens de `usuarioSchema`.
 */
export function validarDocumentoDoTipo(tipo: TipoUsuario, valor: string): string {
  const documento = normalizarDocumento(valor);

  if (tipo === "GO") {
    if (!validarCNPJ(documento)) {
      throw erroHttp(400, "CNPJ inválido");
    }
  } else if (!validarCPF(documento)) {
    throw erroHttp(400, "CPF inválido");
  }

  return documento;
}

export type DadosCadastro = {
  nome?: string;
  email?: string | null;
  /** Já normalizado e validado por `validarDocumentoDoTipo`. */
  documentoNovo?: string;
};

function violouUnicidade(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/**
 * Grava nome, e-mail e, se veio, o documento novo (GU-24/GU-32).
 *
 * Trocar o documento é trocar a chave primária de `Usuario` (AD-045). As 6
 * tabelas externas seguem sozinhas pelas FKs `ON UPDATE CASCADE`, mas o MySQL
 * não cascateia um update de volta para a mesma tabela: as duas
 * auto-referências (`criadoPor` e `cdOfertante`) agem como RESTRICT e o
 * update daria `ERROR 1451`. Por isso, numa transação só (GU-33):
 * soltar os filhos auto-referentes → trocar o PK → religar os mesmos filhos
 * ao documento novo → encerrar as sessões do alvo (GU-34). Qualquer falha
 * no meio desfaz tudo.
 *
 * Os demais campos do alvo (`senhaHash`, `primeiraVez`, `tipo`, `criadoPor`,
 * `dataCriacao`, dados organizacionais e pessoais) não são tocados (GU-35).
 */
export async function atualizarCadastro(
  alvo: UsuarioListado,
  dados: DadosCadastro,
): Promise<UsuarioListado> {
  const antigo = alvo.documento;
  const { nome, email, documentoNovo } = dados;

  // GU-39: reenviar o mesmo documento não é troca, e não derruba sessão.
  if (documentoNovo === undefined || documentoNovo === antigo) {
    return prisma.usuario.update({
      where: { documento: antigo },
      data: { nome, email },
      select: COLUNAS_LISTADAS,
    });
  }

  // GU-36: o caso comum de colisão sai aqui, sem abrir transação.
  const existente = await prisma.usuario.findUnique({
    where: { documento: documentoNovo },
    select: { documento: true },
  });

  if (existente) {
    throw erroHttp(409, DOCUMENTO_JA_CADASTRADO);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const criados = await tx.usuario.findMany({
        where: { criadoPor: antigo },
        select: { documento: true },
      });
      const vinculados = await tx.usuario.findMany({
        where: { cdOfertante: antigo },
        select: { documento: true },
      });

      await tx.usuario.updateMany({ where: { criadoPor: antigo }, data: { criadoPor: null } });
      await tx.usuario.updateMany({ where: { cdOfertante: antigo }, data: { cdOfertante: null } });

      const atualizado = await tx.usuario.update({
        where: { documento: antigo },
        data: { documento: documentoNovo, nome, email },
        select: COLUNAS_LISTADAS,
      });

      await tx.usuario.updateMany({
        where: { documento: { in: criados.map((u) => u.documento) } },
        data: { criadoPor: documentoNovo },
      });
      await tx.usuario.updateMany({
        where: { documento: { in: vinculados.map((u) => u.documento) } },
        data: { cdOfertante: documentoNovo },
      });

      // A cascata já moveu as sessões para o documento novo.
      await tx.sessao.deleteMany({ where: { cpfUsuario: documentoNovo } });

      return atualizado;
    });
  } catch (erro) {
    // GU-36, a corrida: outro pedido gravou o mesmo documento entre a
    // checagem acima e o update. A transação já foi desfeita.
    if (violouUnicidade(erro)) {
      throw erroHttp(409, DOCUMENTO_JA_CADASTRADO);
    }

    throw erro;
  }
}
