// Popula o banco de DESENVOLVIMENTO (`.env` -> `spma`) com o cenário mínimo
// para navegar o sistema inteiro pela interface: um elemento de cada
// (Ofertante, Verba, Pré-Curso, Pós-Curso, matrícula do Aluno) e um usuário
// de cada um dos seis perfis (AM/GT/VT/GO/VO/AL), todos com senha.
//
// Não é seed de produção nem fixture de teste: `prisma/seed.ts` cria o
// Admin Master real, e `scripts/e2e-fixture.ts` serve a suíte e2e contra
// `spma_test`. Este aqui existe só para conseguir clicar nas telas.
//
// Idempotente: rodar de novo não duplica nada. `--limpar` remove tudo o que
// ele criou (na ordem das FKs) e devolve o banco ao estado anterior — o AM
// real de `prisma/seed.ts` não é tocado nem por um nem por outro, porque o AM
// de demonstração tem CPF próprio.
import { config as loadEnv } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import type { TipoUsuario } from "../src/generated/prisma/enums";

loadEnv();

const SENHA = "SenhaDemo123";
const NOME_OFERTANTE = "Instituto Turismo Litoral (demo)";

const CPF_AM = "70000000159";
const CPF_GT = "40200030094";
const CPF_VT = "70000000230";
const CPF_GO = "60000369900";
const CPF_VO = "70000000310";
const CPF_AL = "60000383643";

// Ordem importa: `criadoPor` é FK para a própria tabela, então cada linha só
// entra depois de quem a criou. A cascata reproduz `lib/auth/cascata.ts`
// (AM cria GT; GT cria VT e GO; GO cria VO e AL) e `vinculado` marca quem
// leva `cdOfertante` — só GO/VO (AD-012).
const USUARIOS: {
  cpf: string;
  nome: string;
  tipo: TipoUsuario;
  vinculado: boolean;
  criadoPor: string | null;
}[] = [
  { cpf: CPF_AM, nome: "Helena Souza (demo)", tipo: "AM", vinculado: false, criadoPor: null },
  { cpf: CPF_GT, nome: "Carlos Tavares (demo)", tipo: "GT", vinculado: false, criadoPor: CPF_AM },
  { cpf: CPF_VT, nome: "Rafael Nunes (demo)", tipo: "VT", vinculado: false, criadoPor: CPF_GT },
  { cpf: CPF_GO, nome: "Marina Duarte (demo)", tipo: "GO", vinculado: true, criadoPor: CPF_GT },
  { cpf: CPF_VO, nome: "Beatriz Lima (demo)", tipo: "VO", vinculado: true, criadoPor: CPF_GO },
  { cpf: CPF_AL, nome: "Joana Ribeiro (demo)", tipo: "AL", vinculado: false, criadoPor: CPF_GO },
];

const CPFS = USUARIOS.map((u) => u.cpf);

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
  // Criado_Por é ON DELETE SET NULL: apagar a cascata inteira de uma vez não
  // esbarra na auto-referência.
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
      criadoPor: usuario.criadoPor,
      tentativasFalhas: 0,
      bloqueadoAte: null,
    };
    await prisma.usuario.upsert({
      where: { cpf: usuario.cpf },
      create: { cpf: usuario.cpf, ...comum },
      update: comum,
    });
  }

  // Um curso só: é nele que ficam o Pós-Curso e a matrícula do Aluno, para
  // que as três telas de formulário falem do mesmo curso.
  const curso =
    (await prisma.preCurso.findFirst({
      where: { cdOfertante: ofertante.cdOfertante },
      orderBy: { cdCurso: "asc" },
    })) ??
    (await prisma.preCurso.create({
      data: {
        cdOfertante: ofertante.cdOfertante,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 12000,
        criadoPor: CPF_GO,
      },
    }));

  const posExistente = await prisma.posCurso.findUnique({
    where: { cdCurso: curso.cdCurso },
  });
  if (!posExistente) {
    await prisma.posCurso.create({
      data: { cdCurso: curso.cdCurso, criadoPor: CPF_GO },
    });
  }

  // Matrícula EM_ANDAMENTO e sem respostas: é o que deixa o formulário do
  // Aluno aberto para preenchimento por ele mesmo (AVAL-09, só o próprio).
  const avaliacaoExistente = await prisma.avaliacaoAluno.findUnique({
    where: { cpf_cdCurso: { cpf: CPF_AL, cdCurso: curso.cdCurso } },
  });
  if (!avaliacaoExistente) {
    await prisma.avaliacaoAluno.create({
      data: { cpf: CPF_AL, cdCurso: curso.cdCurso },
    });
  }

  console.log(`
Cenário de demonstração pronto. Senha de todos: ${SENHA}

  Ofertante  #${ofertante.cdOfertante}  ${NOME_OFERTANTE}
  Verba      #${verba.cdVerba}  R$ 250.000,00 (R$ 12.000,00 alocados no curso)
  Curso      #${curso.cdCurso}  pré-curso + pós-curso + matrícula da Aluna

  Admin Master     CPF ${CPF_AM}  (cria qualquer perfil)
  Gestor Turismo   CPF ${CPF_GT}  (cria usuários, gere ofertantes e verbas)
  Visualiz. Turismo CPF ${CPF_VT}  (leitura nacional, não escreve)
  Gestor Ofertante CPF ${CPF_GO}  (dono do ofertante; preenche pré/pós-curso)
  Visualiz. Ofertante CPF ${CPF_VO}  (leitura só do próprio ofertante)
  Aluno            CPF ${CPF_AL}  (matriculado no curso #${curso.cdCurso})

Roteiro das telas (http://localhost:3000):

  /login
  /painel
  /pre-cursos                          lista
  /pre-cursos/novo                     criação
  /pre-cursos/${curso.cdCurso}${" ".repeat(Math.max(0, 24 - String(curso.cdCurso).length))}formulário de 56 campos
  /pos-cursos                          lista
  /pos-cursos/novo                     criação
  /pos-cursos/${curso.cdCurso}${" ".repeat(Math.max(0, 24 - String(curso.cdCurso).length))}formulário de 26 campos
  /avaliacoes                          lista
  /avaliacoes/novo                     matrícula (só como Gestor Ofertante)
  /avaliacoes/${CPF_AL}/${curso.cdCurso}    formulário do Aluno (só logado como ele)
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
