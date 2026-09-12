// POST /api/usuarios - criação em cascata (REQ-AU-05, REQ-AU-06, REQ-AU-07,
// REQ-AU-08, REQ-SEC-15, REQ-SEC-11, REQ-OV-04, REQ-OV-08).
//
// Criar um Gestor Ofertante cria também a verba do Ofertante dele, na mesma
// transação: AM/GT informam `cdOfertante` + `verba` no próprio payload do
// usuário (ver `exigeOfertanteEVerba` em lib/auth/guards.ts).
//
// Criar um Aluno cria também a matrícula dele (AvaliacaoAluno, AVAL-01): o
// `cdCurso` é obrigatório e o criador precisa poder matricular naquele curso
// (`podeMatricularAluno`, AVAL-05/06).
//
// A permissão é reavaliada aqui, no servidor, a cada request (AD-033):
// o que a interface mostra ou deixa de mostrar não vale como autorização.
//
// SPEC_DEVIATION: REQ-OV-04 também cita "atualiza" um usuário com
// `cdOfertante`, mas não existe rota de edição de `Usuario` na base hoje -
// nenhuma feature construiu isso ainda. A checagem de existência do
// Ofertante abaixo cobre só o caminho de criação, que é o único que existe.
// Se uma rota de edição for criada no futuro, ela precisa da mesma checagem.
//
// Não usa `requireSession()` (que redireciona): rota de API responde 401 -
// ver comentário em lib/auth/guards.ts.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeCriar, resolverOfertante } from "@/lib/auth/cascata";
import {
  exigeOfertanteEVerba,
  podeGerenciarVerba,
  podeMatricularAluno,
  resolverEscopoOfertante,
} from "@/lib/auth/guards";
import { obterSessao } from "@/lib/auth/session";
import { usuarioSchema } from "@/lib/validation/schemas/usuario.schema";
import { verificarCSRF } from "@/lib/security/csrf";
import { comTratamentoDeErro } from "@/lib/errors/api-error";

async function criarUsuario(request: Request) {
  // REQ-SEC-15: mutação autenticada por cookie exige token anti-CSRF válido,
  // checado antes da sessão (design.md - RH -> CSRF -> Guard).
  if (!(await verificarCSRF(request))) {
    return NextResponse.json({ erro: "Requisição inválida" }, { status: 403 });
  }

  const sessao = await obterSessao();

  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const corpo = await request.json().catch(() => null);
  const entrada = usuarioSchema.safeParse(corpo);

  if (!entrada.success) {
    return NextResponse.json(
      { erro: entrada.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const criador = sessao.usuario;
  const dados = entrada.data;

  if (!podeCriar(criador.tipo, dados.tipo)) {
    return NextResponse.json(
      { erro: "Você não tem permissão para criar este tipo de usuário" },
      { status: 403 },
    );
  }

  // SPEC_DEVIATION: antes da unificação (AD-043), o alvo GO sempre precisava
  // de um `cdOfertante` informado apontando para um Ofertante autônomo já
  // existente - hoje o GO É o próprio Ofertante (design.md, "Consequência de
  // B1"), então o `cdOfertante` do PRÓPRIO registro criado fica sempre null
  // quando o alvo é GO, nunca apontando para outro GO. Só VO/AL herdam um
  // `cdOfertante` de terceiro (do criador GO, via `resolverEscopoOfertante`,
  // ou informado por AM/GT no payload). Reason: nenhuma tarefa de tasks.md
  // resolve esse detalhe explicitamente; sem este ajuste, o novo teste
  // exigido ("AM/GT cria GO com CNPJ válido -> 201") seria estruturalmente
  // impossível, porque o GO recém-criado não existe ainda para ser apontado
  // por si mesmo no momento da checagem de existência abaixo.
  const alvoEhGO = dados.tipo === "GO";
  const cdOfertante = alvoEhGO
    ? null
    : resolverOfertante(
        { tipo: criador.tipo, cdOfertante: resolverEscopoOfertante(criador) },
        dados.tipo,
        dados.cdOfertante,
      );

  // REQ-OV-04: erro claro quando o GO informado (para vincular um VO/AL) não
  // existe, em vez de deixar a constraint de FK do MySQL virar um 500
  // genérico via `comTratamentoDeErro`. Não se aplica ao próprio GO sendo
  // criado agora (ver acima) - um documento que existe mas não é GO (ex.:
  // AL) reprova aqui do mesmo jeito que um inexistente.
  if (cdOfertante !== null) {
    const ofertante = await prisma.usuario.findUnique({
      where: { documento: cdOfertante, tipo: "GO" },
    });

    if (!ofertante) {
      return NextResponse.json({ erro: "Ofertante informado não existe" }, { status: 400 });
    }
  }

  // REQ-OV-08: quem não gere verba não cria verba, nem de carona na criação
  // de um usuário.
  if (dados.verba && !podeGerenciarVerba(criador.tipo)) {
    return NextResponse.json(
      { erro: "Você não tem permissão para criar verba" },
      { status: 403 },
    );
  }

  // Um GO criado por AM/GT nasce com a verba dele no mesmo passo (REQ-OV-08).
  // A verba passa a mirar o documento do próprio GO recém-criado (dentro da
  // transação abaixo), não mais um `cdOfertante` informado à parte - a única
  // exigência que sobra aqui é a presença da verba em si.
  const comVerba = exigeOfertanteEVerba(criador.tipo, dados.tipo);

  if (comVerba && !dados.verba) {
    return NextResponse.json(
      { erro: "Gestor Ofertante exige um Ofertante e o valor da verba" },
      { status: 400 },
    );
  }

  // AVAL-01: todo Aluno nasce matriculado - o curso é obrigatório e é
  // conferido aqui, não só no formulário.
  if (dados.tipo === "AL" && !dados.cdCurso) {
    return NextResponse.json({ erro: "Curso é obrigatório para Aluno" }, { status: 400 });
  }

  // Curso informado na criação de quem não é Aluno seria silenciosamente
  // descartado - é erro de quem chama, não um padrão a assumir.
  if (dados.cdCurso && dados.tipo !== "AL") {
    return NextResponse.json(
      { erro: "Curso só se aplica à criação de Aluno" },
      { status: 400 },
    );
  }

  const curso = dados.cdCurso
    ? await prisma.preCurso.findUnique({ where: { cdCurso: dados.cdCurso } })
    : null;

  if (dados.cdCurso && !curso) {
    return NextResponse.json({ erro: "Curso não encontrado" }, { status: 404 });
  }

  // AVAL-05/06: o escopo da matrícula é o Ofertante do curso, não o do Aluno
  // (AL não tem cdOfertante - AD-012). Reavaliado aqui pelo mesmo motivo de
  // POST /api/avaliacoes: a tela só oferece cursos do escopo, o servidor é
  // quem decide.
  if (curso && !podeMatricularAluno(criador, curso.cdOfertante)) {
    return NextResponse.json(
      { erro: "Você não pode matricular alunos neste curso" },
      { status: 403 },
    );
  }

  // Usuário, verba e matrícula são um passo só: um erro no meio não pode deixar uma
  // verba órfã nem um GO sem orçamento (mesmo motivo da transação do
  // auto-cadastro em POST /api/ofertantes).
  //
  // Documento duplicado (violação de unicidade, `documento` é @id) lança uma
  // exceção do Prisma não tratada aqui de propósito - `comTratamentoDeErro`
  // (REQ-SEC-11) é quem a converte num 500 genérico com id de correlação,
  // nunca o erro cru do Prisma no corpo da resposta. Dentro da transação,
  // ela também desfaz a verba que porventura já tenha sido criada.
  const { usuario, verba, avaliacao } = await prisma.$transaction(async (tx) => {
    const usuarioCriado = await tx.usuario.create({
      data: {
        documento: dados.documento,
        nome: dados.nome,
        email: dados.email ?? null,
        tipo: dados.tipo,
        cdOfertante,
        criadoPor: criador.documento,
      },
    });

    // AVAL-03/04 (par já matriculado, outra avaliação em andamento) não
    // podem ocorrer aqui: o documento acabou de ser criado, então não há
    // nenhuma AvaliacaoAluno anterior - se o documento já existisse, o
    // create acima teria falhado na unicidade.
    const avaliacaoCriada = curso
      ? await tx.avaliacaoAluno.create({
          data: { cpf: usuarioCriado.documento, cdCurso: curso.cdCurso },
        })
      : null;

    // Fora do caso GO (único que exige verba, ver `comVerba` acima), um
    // `cdOfertante` nulo significa que não há para onde apontar a verba -
    // mesma rede de segurança de antes desta tarefa.
    if (!dados.verba || (!alvoEhGO && cdOfertante === null)) {
      return { usuario: usuarioCriado, verba: null, avaliacao: avaliacaoCriada };
    }

    const verbaCriada = await tx.verba.create({
      data: {
        cdOfertante: alvoEhGO ? usuarioCriado.documento : (cdOfertante as string),
        vlVerba: dados.verba.vlVerba,
        dtVerba: dados.verba.dtVerba,
      },
    });

    return { usuario: usuarioCriado, verba: verbaCriada, avaliacao: avaliacaoCriada };
  });

  return NextResponse.json(
    {
      usuario: {
        documento: usuario.documento,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        cdOfertante: usuario.cdOfertante,
        criadoPor: usuario.criadoPor,
        dataCriacao: usuario.dataCriacao,
      },
      verba,
      avaliacao,
    },
    { status: 201 },
  );
}

export const POST = comTratamentoDeErro(criarUsuario);
