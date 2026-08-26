// CLI de apoio aos testes e2e: prepara e inspeciona dados no banco
// `spma_test`.
//
// Por que um processo separado: o loader de módulos do Playwright não
// consegue importar o client TS gerado pelo Prisma ("Cannot use
// 'import.meta' outside a module") - mesmo motivo que já obrigou
// `e2e/global-setup.ts` a rodar seed/reset via `tsx`. Os specs chamam este
// script por `e2e/helpers/db.ts`.
//
// O argumento chega em base64 para não depender de aspas do shell no
// Windows. O resultado sai em JSON entre marcadores, isolado do ruído que
// dotenv/tsx escrevem em stdout.
import { config as loadEnv } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import type { TipoUsuario } from "../src/generated/prisma/enums";

loadEnv({ path: ".env.test" });

export const MARCADOR_INICIO = "<<<E2E_JSON>>>";
export const MARCADOR_FIM = "<<<FIM_E2E_JSON>>>";

const CAMPOS_USUARIO = {
  cpf: true,
  nome: true,
  email: true,
  tipo: true,
  cdOfertante: true,
  senhaHash: true,
  primeiraVez: true,
  tentativasFalhas: true,
  bloqueadoAte: true,
  criadoPor: true,
  dataCriacao: true,
} as const;

type UsuarioFixture = {
  cpf: string;
  nome?: string;
  tipo: TipoUsuario;
  senha?: string | null;
  primeiraVez?: boolean;
  cdOfertante?: number | null;
};

async function executar(
  prisma: PrismaClient,
  comando: string,
  argumento: unknown,
): Promise<unknown> {
  switch (comando) {
    case "upsertUsuario": {
      const dados = argumento as UsuarioFixture;
      const senhaHash = dados.senha ? await hashPassword(dados.senha) : null;
      const comum = {
        nome: dados.nome ?? `Usuário ${dados.cpf}`,
        tipo: dados.tipo,
        senhaHash,
        primeiraVez: dados.primeiraVez ?? senhaHash === null,
        cdOfertante: dados.cdOfertante ?? null,
        // Zeradas sempre, para que cada spec comece de um estado previsível.
        tentativasFalhas: 0,
        bloqueadoAte: null,
      };
      return prisma.usuario.upsert({
        where: { cpf: dados.cpf },
        create: { cpf: dados.cpf, ...comum },
        update: comum,
        select: CAMPOS_USUARIO,
      });
    }

    case "getUsuario":
      return prisma.usuario.findUnique({
        where: { cpf: argumento as string },
        select: CAMPOS_USUARIO,
      });

    case "deleteUsuarios": {
      const cpfs = argumento as string[];
      await prisma.sessao.deleteMany({ where: { cpfUsuario: { in: cpfs } } });
      const { count } = await prisma.usuario.deleteMany({
        where: { cpf: { in: cpfs } },
      });
      return { count };
    }

    case "getSessao":
      return prisma.sessao.findUnique({ where: { id: argumento as string } });

    case "criarOfertante": {
      const dados = argumento as { nome: string; uf: string };
      return prisma.ofertante.create({ data: dados });
    }

    case "getOfertante":
      return prisma.ofertante.findUnique({
        where: { cdOfertante: argumento as number },
      });

    case "listarOfertantesPorNome":
      return prisma.ofertante.findMany({ where: { nome: argumento as string } });

    case "criarVerba": {
      const dados = argumento as {
        cdOfertante: number;
        vlVerba: number;
        dtVerba?: string;
      };
      return prisma.verba.create({
        data: {
          cdOfertante: dados.cdOfertante,
          vlVerba: dados.vlVerba,
          dtVerba: dados.dtVerba ? new Date(dados.dtVerba) : undefined,
        },
      });
    }

    case "getVerba":
      return prisma.verba.findUnique({ where: { cdVerba: argumento as number } });

    case "criarPreCurso": {
      const dados = argumento as {
        cdOfertante: number;
        cdVerba: number;
        vlCursoAlocado: number;
        criadoPor: string;
      };
      return prisma.preCurso.create({ data: dados });
    }

    // `db-test-reset.ts` não trunca TB_Tentativa_Login_Ip (tabela independente
    // de usuário, sem FK) - specs que testam o limite por IP (REQ-SEC-03)
    // limpam o próprio IP de teste antes/depois para não depender de estado
    // deixado por uma execução anterior.
    case "deleteTentativasIp": {
      const ips = argumento as string[];
      const { count } = await prisma.tentativaLoginIp.deleteMany({
        where: { ip: { in: ips } },
      });
      return { count };
    }

    default:
      throw new Error(`Comando desconhecido: ${comando}`);
  }
}

async function main() {
  const [comando, argumentoBase64] = process.argv.slice(2);
  const argumento = argumentoBase64
    ? JSON.parse(Buffer.from(argumentoBase64, "base64").toString("utf8"))
    : undefined;

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const prisma = new PrismaClient({ adapter });

  try {
    const resultado = await executar(prisma, comando, argumento);
    process.stdout.write(
      `${MARCADOR_INICIO}${JSON.stringify(resultado ?? null)}${MARCADOR_FIM}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
