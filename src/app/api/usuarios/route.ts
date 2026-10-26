// POST /api/usuarios - criação em cascata (REQ-AU-05, REQ-AU-06, REQ-AU-07,
// REQ-AU-08, REQ-SEC-15, REQ-SEC-11, REQ-OV-04, REQ-OV-08).
//
// PATCH /api/usuarios - correção de cadastro da gestão de usuários: nome,
// e-mail e documento (GU-24, GU-27, GU-29, GU-30, GU-32). O alvo vai no
// corpo (`documentoAtual`), nunca no caminho (GU-48, AD-029).
//
// Criar um Gestor Ofertante NÃO cria verba (GV-24, AD-046): AM/GT a vinculam
// depois, em /verbas (`POST /api/verbas`). `usuarioSchema` rejeita `verba`
// no payload com 400 (GV-26).
//
// Criar um Aluno cria também a matrícula dele (AvaliacaoAluno, AVAL-01): o
// `cdCurso` é obrigatório e o criador precisa poder matricular naquele curso
// (`podeMatricularAluno`, AVAL-05/06).
//
// A permissão é reavaliada aqui, no servidor, a cada request (AD-033):
// o que a interface mostra ou deixa de mostrar não vale como autorização.
//
// SPEC_DEVIATION: REQ-OV-04 também cita "atualiza" um usuário com
// `cdOfertante`. A rota de edição de `Usuario` agora existe (o `PATCH`
// abaixo, da gestão de usuários), mas ela não edita `cdOfertante`: trocar o
// vínculo está fora do escopo daquela feature, e `edicaoUsuarioSchema`
// (`.strict()`) recusa a chave com 400. Por isso a checagem de existência do
// Ofertante abaixo segue cobrindo só o caminho de criação, o único que grava
// `cdOfertante`. Se uma edição de vínculo for criada no futuro, ela precisa
// da mesma checagem.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { podeCriar, resolverOfertante } from "@/lib/auth/cascata";
import { podeMatricularAluno, resolverEscopoOfertante } from "@/lib/auth/guards";
import { usuarioSchema } from "@/lib/validation/schemas/usuario.schema";
import { comTratamentoDeErro } from "@/lib/errors/api-error";
import { exigirMutacao } from "@/lib/api/guardas";
import { corpoValidado } from "@/lib/api/requisicao";
import { erroHttp } from "@/lib/api/erro-http";
import { edicaoUsuarioSchema } from "@/lib/validation/schemas/gestao-usuario.schema";
import { exigirAlvoEditavel } from "@/lib/usuarios/consulta";
import { atualizarCadastro, validarDocumentoDoTipo } from "@/lib/usuarios/gestao";

async function criarUsuario(request: Request) {
  const sessao = await exigirMutacao(request);
  const dados = await corpoValidado(request, usuarioSchema);
  const criador = sessao.usuario;

  if (!podeCriar(criador.tipo, dados.tipo)) {
    throw erroHttp(403, "Você não tem permissão para criar este tipo de usuário");
  }

  // UGO-16 (P3 AC3): um GO só pode vincular VO ao PRÓPRIO CNPJ. Antes desta
  // correção, um `cdOfertante` forjado apontando para outro GO era
  // silenciosamente substituído pelo escopo do criador (`resolverOfertante`
  // abaixo ignora o valor informado quando `criador.tipo === "GO"`) - a
  // criação acabava indo para o lugar certo, mas sem avisar quem tentou
  // forjar o vínculo, e o gate de validação achou o caso indistinguível de
  // "não informou nada". Rejeitar explicitamente com 403 fecha essa
  // diferença (achado pelo Verifier independente, ranked gap #1).
  if (
    criador.tipo === "GO" &&
    dados.cdOfertante !== undefined &&
    dados.cdOfertante !== resolverEscopoOfertante(criador)
  ) {
    throw erroHttp(403, "Você não tem permissão para vincular a outro Gestor Ofertante");
  }

  // UGO-10 (P2 AC4): documento (CPF ou CNPJ) duplicado precisa de um erro
  // claro de duplicidade, não a exceção crua de unicidade do Prisma
  // convertida em 500 genérico por `comTratamentoDeErro` (achado pelo
  // Verifier independente, ranked gap #2 - design.md descrevia o 500
  // genérico como "mesmo padrão de CPF duplicado hoje", mas a spec sempre
  // exigiu um erro claro; não havia, de fato, nenhum precedente de "erro
  // claro" pré-existente para reaproveitar, então esta checagem passa a ser
  // esse precedente, unificado para CPF e CNPJ).
  const documentoExistente = await prisma.usuario.findUnique({
    where: { documento: dados.documento },
  });

  if (documentoExistente) {
    throw erroHttp(
      409,
      dados.tipo === "GO"
        ? "CNPJ já cadastrado para outro Gestor Ofertante"
        : "Documento já cadastrado",
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
      throw erroHttp(400, "Ofertante informado não existe");
    }
  }

  // AVAL-01: todo Aluno nasce matriculado - o curso é obrigatório e é
  // conferido aqui, não só no formulário.
  if (dados.tipo === "AL" && !dados.cdCurso) {
    throw erroHttp(400, "Curso é obrigatório para Aluno");
  }

  // Curso informado na criação de quem não é Aluno seria silenciosamente
  // descartado - é erro de quem chama, não um padrão a assumir.
  if (dados.cdCurso && dados.tipo !== "AL") {
    throw erroHttp(400, "Curso só se aplica à criação de Aluno");
  }

  const curso = dados.cdCurso
    ? await prisma.preCurso.findUnique({ where: { cdCurso: dados.cdCurso } })
    : null;

  if (dados.cdCurso && !curso) {
    throw erroHttp(404, "Curso não encontrado");
  }

  // AVAL-05/06: o escopo da matrícula é o Ofertante do curso, não o do Aluno
  // (AL não tem cdOfertante - AD-012). Esta é a ÚNICA guarda de matrícula que
  // existe: POST /api/avaliacoes e a tela /avaliacoes/novo foram removidas
  // (2026-10-09), então matricular só acontece aqui. A tela só oferece cursos
  // do escopo; o servidor é quem decide (AD-033).
  if (curso && !podeMatricularAluno(criador, curso.cdOfertante)) {
    throw erroHttp(403, "Você não pode matricular alunos neste curso");
  }

  // Usuário e matrícula são um passo só: um erro no meio não pode deixar um
  // Aluno sem a matrícula com que ele nasce (AVAL-01).
  //
  // Documento duplicado já foi barrado acima com 409 claro (UGO-10) - a
  // checagem prévia elimina a corrida óbvia (checa-então-cria não é atômico),
  // mas uma colisão residual entre a checagem e o `create` ainda é possível
  // sob concorrência; nesse caso raro, a violação de unicidade do Prisma
  // segue sem tratamento explícito aqui e cai no 500 genérico de
  // `comTratamentoDeErro` (REQ-SEC-11), nunca no erro cru do Prisma no corpo
  // da resposta.
  const { usuario, avaliacao } = await prisma.$transaction(async (tx) => {
    const usuarioCriado = await tx.usuario.create({
      data: {
        documento: dados.documento,
        // Só o AM nasce com nome e e-mail; os demais os declaram depois do
        // 1º login (AD-050).
        nome: dados.nome ?? null,
        email: dados.email ?? null,
        tipo: dados.tipo,
        cdOfertante,
        criadoPor: criador.documento,
        // OGO-11 (AD-044): nenhum dado organizacional nasce na criação - o GO
        // os declara no 1º acesso, e `dadosOrganizacionaisCompletos` fica no
        // default `false`. `usuarioSchema` já rejeita `responsavel`/
        // `telefone`/`municipio` para todo tipo e `uf` para GO; `uf`
        // ainda pode vir para os outros tipos (decisão fixada em teste) e,
        // se vier, é gravada.
        uf: dados.uf ?? null,
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

    return { usuario: usuarioCriado, avaliacao: avaliacaoCriada };
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
      avaliacao,
    },
    { status: 201 },
  );
}

/**
 * Corrige nome, e-mail e documento de um usuário que o editor poderia criar,
 * dentro do escopo dele (GU-21). A forma é validada antes de buscar o alvo,
 * como nas demais rotas: um 400 de forma não revela nada sobre o alvo.
 *
 * O documento novo só é validado depois de achar o alvo, porque o algoritmo
 * depende do tipo dele: CNPJ para GO, CPF para os demais (GU-37/GU-38).
 */
async function editarUsuario(request: Request) {
  const sessao = await exigirMutacao(request);
  const { documentoAtual, nome, email, documentoNovo } = await corpoValidado(
    request,
    edicaoUsuarioSchema,
  );

  const alvo = await exigirAlvoEditavel(sessao.usuario, documentoAtual);

  const usuario = await atualizarCadastro(alvo, {
    nome,
    email,
    documentoNovo:
      documentoNovo === undefined ? undefined : validarDocumentoDoTipo(alvo.tipo, documentoNovo),
  });

  return NextResponse.json({ usuario });
}

export const POST = comTratamentoDeErro(criarUsuario);
export const PATCH = comTratamentoDeErro(editarUsuario);
