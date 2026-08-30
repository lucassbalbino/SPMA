// Popula o banco de DESENVOLVIMENTO (`.env` -> `spma`) com um cenário
// mínimo para navegar o sistema inteiro pela interface: um Ofertante, uma
// Verba, dois cursos (um deles já com Pós-Curso), uma Avaliação matriculada,
// e um usuário de cada perfil que tem tela própria.
//
// Não é seed de produção nem fixture de teste: `prisma/seed.ts` cria o
// Admin Master real, e `scripts/e2e-fixture.ts` serve a suíte e2e contra
// `spma_test`. Este aqui existe só para conseguir clicar nas telas.
//
// Idempotente: rodar de novo não duplica nada. `--limpar` remove tudo o que
// ele criou (na ordem das FKs) e devolve o banco ao estado anterior.
import { config as loadEnv } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

loadEnv();

const SENHA = "SenhaDemo123";
const NOME_OFERTANTE = "Instituto Turismo Litoral (demo)";

const USUARIOS = [
  { cpf: "40200030094", nome: "Carlos Tavares (demo)", tipo: "GT" as const, vinculado: false },
  { cpf: "60000369900", nome: "Marina Duarte (demo)", tipo: "GO" as const, vinculado: true },
  { cpf: "60000383643", nome: "Joana Ribeiro (demo)", tipo: "AL" as const, vinculado: false },
];

const CPFS = USUARIOS.map((u) => u.cpf);
const CPF_GO = "60000369900";
const CPF_AL = "60000383643";

async function limpar(prisma: PrismaClient) {
  const ofertantes = await prisma.ofertante.findMany({
    where: { nome: NOME_OFERTANTE },
    select: { cdOfertante: true },
  });
  const cdOfertantes = ofertantes.map((o) => o.cdOfertante);

  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: { in: CPFS } } });
  // PosCurso cai por cascade junto com o PreCurso.
  await prisma.preCurso.deleteMany({ where: { cdOfertante: { in: cdOfertantes } } });
  await prisma.verba.deleteMany({ where: { cdOfertante: { in: cdOfertantes } } });
  await prisma.sessao.deleteMany({ where: { cpfUsuario: { in: CPFS } } });
  await prisma.usuario.deleteMany({ where: { cpf: { in: CPFS } } });
  await prisma.ofertante.deleteMany({ where: { cdOfertante: { in: cdOfertantes } } });

  console.log("Dados de demonstração removidos.");
}

async function semear(prisma: PrismaClient) {
  const ofertante =
    (await prisma.ofertante.findFirst({ where: { nome: NOME_OFERTANTE } })) ??
    (await prisma.ofertante.create({
      data: {
        nome: NOME_OFERTANTE,
        uf: "SP",
        municipio: "Santos",
        responsavel: "Marina Duarte",
        email: "contato@exemplo.dev",
      },
    }));

  const verba =
    (await prisma.verba.findFirst({ where: { cdOfertante: ofertante.cdOfertante } })) ??
    (await prisma.verba.create({
      data: { cdOfertante: ofertante.cdOfertante, vlVerba: 250000, dtVerba: new Date() },
    }));

  const senhaHash = await hashPassword(SENHA);
  for (const usuario of USUARIOS) {
    const comum = {
      nome: usuario.nome,
      tipo: usuario.tipo,
      senhaHash,
      primeiraVez: false,
      cdOfertante: usuario.vinculado ? ofertante.cdOfertante : null,
      tentativasFalhas: 0,
      bloqueadoAte: null,
    };
    await prisma.usuario.upsert({
      where: { cpf: usuario.cpf },
      create: { cpf: usuario.cpf, ...comum },
      update: comum,
    });
  }

  const cursos = await prisma.preCurso.findMany({
    where: { cdOfertante: ofertante.cdOfertante },
    orderBy: { cdCurso: "asc" },
  });

  let cursoComPos = cursos[0] ?? null;
  let cursoDaAvaliacao = cursos[1] ?? null;

  if (!cursoComPos) {
    cursoComPos = await prisma.preCurso.create({
      data: {
        cdOfertante: ofertante.cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 12000,
        criadoPor: CPF_GO,
      },
    });
  }
  if (!cursoDaAvaliacao) {
    cursoDaAvaliacao = await prisma.preCurso.create({
      data: {
        cdOfertante: ofertante.cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 8000,
        criadoPor: CPF_GO,
      },
    });
  }

  const posExistente = await prisma.posCurso.findUnique({
    where: { cdCurso: cursoComPos.cdCurso },
  });
  if (!posExistente) {
    await prisma.posCurso.create({
      data: { cdCurso: cursoComPos.cdCurso, criadoPor: CPF_GO },
    });
  }

  const avaliacaoExistente = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf: CPF_AL, cdCurso: cursoDaAvaliacao.cdCurso } },
  });
  if (!avaliacaoExistente) {
    await prisma.avaliacaoAluno.create({
      data: { cpf: CPF_AL, cdCurso: cursoDaAvaliacao.cdCurso },
    });
  }

  console.log(`
Cenário de demonstração pronto. Senha de todos: ${SENHA}

  Gestor Turismo   CPF 40200030094  (vê tudo, cria usuários)
  Gestor Ofertante CPF 60000369900  (dono do "${NOME_OFERTANTE}")
  Aluno            CPF 60000383643  (avaliação do curso #${cursoDaAvaliacao.cdCurso})

Roteiro das telas (http://localhost:3000):

  /login
  /painel
  /pre-cursos                          lista
  /pre-cursos/novo                     criação
  /pre-cursos/${cursoComPos.cdCurso}${" ".repeat(Math.max(0, 24 - String(cursoComPos.cdCurso).length))}formulário de 56 campos
  /pos-cursos                          lista
  /pos-cursos/novo                     criação
  /pos-cursos/${cursoComPos.cdCurso}${" ".repeat(Math.max(0, 24 - String(cursoComPos.cdCurso).length))}formulário de 26 campos
  /avaliacoes                          lista
  /avaliacoes/novo                     matrícula (só como Gestor Ofertante)
  /avaliacoes/${CPF_AL}/${cursoDaAvaliacao.cdCurso}    formulário do Aluno (só logado como ele)
  /usuarios/novo                       criação de usuário

Para desfazer: npm run dev:seed-demo:limpar
`);
}

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });
  try {
    if (process.argv.includes("--limpar")) {
      await limpar(prisma);
    } else {
      await semear(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
