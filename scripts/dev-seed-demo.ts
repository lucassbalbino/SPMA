// Popula o banco de DESENVOLVIMENTO (`.env` -> `spma`) com o cenário mínimo
// para navegar o sistema inteiro pela interface: uma Verba, um Pré-Curso, um
// Pós-Curso, a matrícula do Aluno, e um usuário de cada um dos seis perfis
// (AM/GT/VT/GO/VO/AL), todos com senha.
//
// UGO-14/AD-043 (Decisão C): sem `model Ofertante` separado, o GO de demo É
// o Ofertante - identificado por CNPJ, com nome/uf/responsavel/email/
// municipio gravados direto no próprio `Usuario`. `Verba`/`PreCurso`
// referenciam o CNPJ do GO diretamente, sem uma tabela intermediária.
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
const NOME_ORGANIZACAO = "Instituto Turismo Litoral (demo)";

const CPF_AM = "70000000159";
const CPF_GT = "40200030094";
const CPF_VT = "70000000230";
// CNPJ (14 dígitos, dígitos verificadores válidos) - GO se identifica por
// CNPJ desde a unificação (UGO-07/AD-043); os demais perfis continuam CPF.
const CNPJ_GO = "60000369000126";
const CPF_VO = "70000000310";
const CPF_AL = "60000383643";

// Ordem importa: `criadoPor` é FK para a própria tabela, então cada linha só
// entra depois de quem a criou. A cascata reproduz `lib/auth/cascata.ts`
// (AM cria GT; GT cria VT e GO; GO cria VO e AL) e `cdOfertante` marca quem
// se vincula a um GO existente - só VO agora (AD-043; o GO É o Ofertante,
// o próprio `cdOfertante` dele fica sempre `null`).
const USUARIOS: {
  documento: string;
  nome: string;
  tipo: TipoUsuario;
  cdOfertante: string | null;
  criadoPor: string | null;
  uf?: string;
  responsavel?: string;
  telefone?: string;
  municipio?: string;
  email?: string;
}[] = [
  { documento: CPF_AM, nome: "Helena Souza (demo)", tipo: "AM", cdOfertante: null, criadoPor: null },
  { documento: CPF_GT, nome: "Carlos Tavares (demo)", tipo: "GT", cdOfertante: null, criadoPor: CPF_AM },
  { documento: CPF_VT, nome: "Rafael Nunes (demo)", tipo: "VT", cdOfertante: null, criadoPor: CPF_GT },
  {
    documento: CNPJ_GO,
    nome: NOME_ORGANIZACAO,
    tipo: "GO",
    cdOfertante: null,
    criadoPor: CPF_GT,
    uf: "SP",
    municipio: "Santos",
    responsavel: "Marina Duarte (demo)",
    email: "contato@exemplo.dev",
  },
  { documento: CPF_VO, nome: "Beatriz Lima (demo)", tipo: "VO", cdOfertante: CNPJ_GO, criadoPor: CNPJ_GO },
  { documento: CPF_AL, nome: "Joana Ribeiro (demo)", tipo: "AL", cdOfertante: null, criadoPor: CNPJ_GO },
];

const DOCUMENTOS = USUARIOS.map((u) => u.documento);

async function limpar(prisma: PrismaClient) {
  await prisma.avaliacaoAluno.deleteMany({ where: { cpf: CPF_AL } });
  // PosCurso cai por cascade junto com o PreCurso.
  await prisma.preCurso.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.verba.deleteMany({ where: { cdOfertante: CNPJ_GO } });
  await prisma.sessao.deleteMany({ where: { cpfUsuario: { in: DOCUMENTOS } } });
  // Criado_Por e CD_Ofertante são ON DELETE SET NULL: apagar a cascata
  // inteira de uma vez não esbarra nas duas auto-referências.
  await prisma.usuario.deleteMany({ where: { documento: { in: DOCUMENTOS } } });

  console.log("Dados de demonstração removidos.");
}

async function semear(prisma: PrismaClient) {
  const senhaHash = await hashPassword(SENHA);
  for (const usuario of USUARIOS) {
    const comum = {
      nome: usuario.nome,
      tipo: usuario.tipo,
      senhaHash,
      primeiraVez: false,
      cdOfertante: usuario.cdOfertante,
      criadoPor: usuario.criadoPor,
      tentativasFalhas: 0,
      bloqueadoAte: null,
      uf: usuario.uf ?? null,
      responsavel: usuario.responsavel ?? null,
      telefone: usuario.telefone ?? null,
      municipio: usuario.municipio ?? null,
      email: usuario.email ?? null,
    };
    await prisma.usuario.upsert({
      where: { documento: usuario.documento },
      create: { documento: usuario.documento, ...comum },
      update: comum,
    });
  }

  const verba =
    (await prisma.verba.findFirst({ where: { cdOfertante: CNPJ_GO } })) ??
    (await prisma.verba.create({
      data: { cdOfertante: CNPJ_GO, vlVerba: 250000, dtVerba: new Date() },
    }));

  // Um curso só: é nele que ficam o Pós-Curso e a matrícula do Aluno, para
  // que as três telas de formulário falem do mesmo curso.
  const curso =
    (await prisma.preCurso.findFirst({
      where: { cdOfertante: CNPJ_GO },
      orderBy: { cdCurso: "asc" },
    })) ??
    (await prisma.preCurso.create({
      data: {
        cdOfertante: CNPJ_GO,
        cdVerba: verba.cdVerba,
        vlCursoAlocado: 12000,
        criadoPor: CNPJ_GO,
      },
    }));

  const posExistente = await prisma.posCurso.findUnique({
    where: { cdCurso: curso.cdCurso },
  });
  if (!posExistente) {
    await prisma.posCurso.create({
      data: { cdCurso: curso.cdCurso, criadoPor: CNPJ_GO },
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

  Ofertante  ${NOME_ORGANIZACAO} (CNPJ ${CNPJ_GO})
  Verba      #${verba.cdVerba}  R$ 250.000,00 (R$ 12.000,00 alocados no curso)
  Curso      #${curso.cdCurso}  pré-curso + pós-curso + matrícula da Aluna

  Admin Master     CPF  ${CPF_AM}  (cria qualquer perfil)
  Gestor Turismo   CPF  ${CPF_GT}  (cria usuários, gere ofertantes e verbas)
  Visualiz. Turismo CPF ${CPF_VT}  (leitura nacional, não escreve)
  Gestor Ofertante CNPJ ${CNPJ_GO}  (é o próprio ofertante; preenche pré/pós-curso)
  Visualiz. Ofertante CPF ${CPF_VO}  (leitura só do ofertante vinculado)
  Aluno            CPF  ${CPF_AL}  (matriculado no curso #${curso.cdCurso})

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
