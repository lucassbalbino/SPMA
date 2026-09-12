// PATCH /api/usuarios/me/organizacao (UGO-01, UGO-02, UGO-03, UGO-04,
// UGO-20).
//
// Auto-cadastro/completude dos dados organizacionais do próprio GO no 1º
// acesso (substitui o antigo POST /api/ofertantes de auto-cadastro, AD-014).
// Opera sempre sobre o documento da própria sessão, nunca recebe documento
// na URL nem no corpo - mesmo padrão de
// `PATCH /api/usuarios/me/dados-pessoais` (PESSOAL-19 por construção).
//
// Tudo-ou-nada: `organizacaoSchema` já exige `nome`/`uf` no mesmo corpo (T10),
// então não há estado "parcialmente preenchido" possível por este endpoint -
// ou o corpo inteiro valida e persiste, ou nada muda. Diferente de
// `dados-pessoais` (mescla incremental permitida mesmo após completo), este
// endpoint fecha para sempre após a primeira conclusão (UGO-01 AC4): editar
// depois é `PATCH /api/usuarios/[documento]/organizacao` (T12).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { obterSessao } from "@/lib/auth/session";
import { organizacaoSchema } from "@/lib/validation/schemas/organizacao.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function gravarOrganizacao(request: Request) {
  // REQ-SEC-15: mesma ordem RH->CSRF->Sessão->Guard das demais rotas mutantes.
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  // Só o GO tem essa área, reforçado no backend (não só na navegação
  // escondida, AD-039).
  if (sessao.usuario.tipo !== "GO") {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  // UGO-01 AC4: um GO que já concluiu o cadastro organizacional (nome/uf
  // completos) não pode se auto-cadastrar de novo por aqui - dados
  // preservados, sem tocar no banco.
  if (sessao.usuario.nome !== null && sessao.usuario.uf !== null) {
    return NextResponse.json(
      { erro: "Dados organizacionais já cadastrados" },
      { status: 409 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const entrada = organizacaoSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const dados = entrada.data;
  const usuario = await prisma.usuario.update({
    where: { documento: sessao.usuario.documento },
    data: {
      nome: dados.nome,
      responsavel: dados.responsavel ?? null,
      email: dados.email ?? null,
      telefone: dados.telefone ?? null,
      uf: dados.uf,
      municipio: dados.municipio ?? null,
    },
    select: {
      documento: true,
      nome: true,
      responsavel: true,
      email: true,
      telefone: true,
      uf: true,
      municipio: true,
    },
  });

  return NextResponse.json({ usuario });
}

export const PATCH = comTratamentoDeErro(gravarOrganizacao);
