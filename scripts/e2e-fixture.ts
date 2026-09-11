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
import {
  gravarRespostas,
  lerRespostas,
  respostasOuNulo,
  type AlvoRespostas,
} from "../src/lib/respostas/repositorio";
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
  dadosPessoaisCompletos: true,
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
  dadosPessoaisCompletos?: boolean;
};

/**
 * As respostas que os specs inspecionam saem das linhas de `TB_Resposta_*`,
 * não da coluna JSON (RESP-07).
 *
 * Registro sem nenhuma linha devolve `null`, e não `{}`: é exatamente o que a
 * coluna devolvia, e é o que os specs de criação afirmam ("respostas nulas").
 *
 * A regra vem de `respostasOuNulo`, a MESMA função que as rotas usam - o
 * fixture observa a produção, nunca reimplementa. Uma cópia da regra aqui
 * fazia o fixture concordar consigo mesmo enquanto a produção regredia: foi
 * exatamente assim que um mutante trocando `null` por `{}` sobreviveu a 83
 * testes e2e no sensor do Verifier.
 */
async function respostasPorLinha(
  prisma: PrismaClient,
  alvo: AlvoRespostas,
): Promise<Record<string, unknown> | null> {
  return respostasOuNulo(await lerRespostas(prisma, alvo));
}

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
        // Default true: a imensa maioria dos fixtures de AL neste conjunto de
        // specs não é sobre a feature de dados pessoais e não deve cair no
        // gate novo (requireDadosPessoaisCompletos) sem pedir. Só os specs
        // que testam esse gate passam `dadosPessoaisCompletos: false`
        // explicitamente.
        dadosPessoaisCompletos: dados.dadosPessoaisCompletos ?? true,
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

    // Lê o dado pessoal do Aluno pelo repositório (mesma regra de
    // `respostasPorLinha`) - `TB_Dado_Pessoal_Aluno`, chaveada só por CPF.
    case "getDadosPessoais": {
      const cpf = argumento as string;
      return respostasPorLinha(prisma, { formulario: "dadosPessoais", cpf });
    }

    // Semeia o dado pessoal de um Aluno de fixture direto pelo repositório -
    // atalho para os e2e de edição pelo perfil (T10) que não precisam
    // exercitar a tela de coleta obrigatória (T9) para chegar num Aluno já
    // completo. Não seta `Usuario.dadosPessoaisCompletos` - quem chama
    // decide isso via `upsertUsuario`, para os dois ficarem explícitos.
    case "criarDadosPessoais": {
      const { cpf, respostas } = argumento as {
        cpf: string;
        respostas: Record<string, unknown>;
      };
      await gravarRespostas(prisma, { formulario: "dadosPessoais", cpf }, respostas);
      return respostasPorLinha(prisma, { formulario: "dadosPessoais", cpf });
    }

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

    case "getPreCurso": {
      const cdCurso = argumento as number;
      const preCurso = await prisma.preCurso.findUnique({ where: { cdCurso } });

      if (!preCurso) return null;

      return {
        ...preCurso,
        respostas: await respostasPorLinha(prisma, { formulario: "preCurso", cdCurso }),
      };
    }

    // Marca um PreCurso de fixture como ENCERRADO direto no banco - usado
    // pelos e2e que precisam testar o gate de somente-leitura (REQ-PC-12)
    // sem depender da rota de encerramento (T7) já estar implementada.
    case "encerrarPreCursoFixture": {
      const cdCurso = argumento as number;
      return prisma.preCurso.update({
        where: { cdCurso },
        data: { status: "ENCERRADO", dataEncerramento: new Date() },
      });
    }

    case "criarPreCurso": {
      const dados = argumento as {
        cdOfertante: number;
        cdVerba: number;
        vlCursoAlocado: number;
        criadoPor: string;
      };
      return prisma.preCurso.create({ data: dados });
    }

    // Limpa PreCurso de teste antes de `deleteUsuarios` - `PreCurso.criadoPor`
    // é FK para Usuario, então um PreCurso de fixture bloquearia a exclusão
    // do usuário de teste que o criou. `PosCurso.cdCurso` tem `onDelete:
    // Cascade` para `PreCurso.cdCurso` - apagar o PreCurso já remove o
    // PosCurso associado, sem precisar de um comando de limpeza próprio.
    case "deletePreCursosPorOfertante": {
      const cdOfertantes = argumento as number[];
      const { count } = await prisma.preCurso.deleteMany({
        where: { cdOfertante: { in: cdOfertantes } },
      });
      return { count };
    }

    case "getPosCurso": {
      const cdCurso = argumento as number;
      const posCurso = await prisma.posCurso.findUnique({ where: { cdCurso } });

      if (!posCurso) return null;

      return {
        ...posCurso,
        respostas: await respostasPorLinha(prisma, { formulario: "posCurso", cdCurso }),
      };
    }

    // Marca um PosCurso de fixture como ENCERRADO direto no banco - usado
    // pelos e2e que precisam testar o gate de somente-leitura (REQ-PO-08)
    // sem depender da rota de encerramento (T6) já estar implementada.
    case "encerrarPosCursoFixture": {
      const cdCurso = argumento as number;
      return prisma.posCurso.update({
        where: { cdCurso },
        data: { status: "ENCERRADO", dataEncerramento: new Date() },
      });
    }

    case "criarPosCurso": {
      const dados = argumento as { cdCurso: number; criadoPor: string };
      return prisma.posCurso.create({ data: dados });
    }

    // Insere uma AvaliacaoAluno de fixture direto no banco - atalho para os
    // e2e de T5/T6 que não precisam exercitar a rota de matrícula (T4) em
    // si, ou que precisam de um estado inicial (respostas parciais,
    // parte1Completa) que a rota de matrícula nunca produz sozinha.
    //
    // As respostas entram pelo repositório (RESP-07), na mesma transação da
    // matrícula: o spec continua passando o mesmo objeto de sempre, e o que
    // fica no banco são as linhas de `TB_Resposta_Avaliacao` mais a coluna
    // JSON que o repositório espelha enquanto ela existir.
    case "criarAvaliacao": {
      const dados = argumento as {
        cpf: string;
        cdCurso: number;
        status?: "EM_ANDAMENTO" | "ENCERRADO";
        parte1Completa?: boolean;
        respostas?: Record<string, unknown>;
      };

      return prisma.$transaction(async (tx) => {
        const avaliacao = await tx.avaliacaoAluno.create({
          data: {
            cpf: dados.cpf,
            cdCurso: dados.cdCurso,
            status: dados.status ?? "EM_ANDAMENTO",
            parte1Completa: dados.parte1Completa ?? false,
          },
        });

        if (dados.respostas === undefined) {
          return avaliacao;
        }

        await gravarRespostas(
          tx,
          { formulario: "avaliacao", cpf: dados.cpf, cdCurso: dados.cdCurso },
          dados.respostas,
        );

        return tx.avaliacaoAluno.findUnique({
          where: { cpf_cdCurso: { cpf: dados.cpf, cdCurso: dados.cdCurso } },
        });
      });
    }

    // Marca uma AvaliacaoAluno de fixture como ENCERRADO direto no banco -
    // usado pelos e2e que precisam testar o gate de somente-leitura
    // (AVAL-17) sem depender da rota de encerramento (T6) já implementada.
    case "encerrarAvaliacaoFixture": {
      const { cpf, cdCurso } = argumento as { cpf: string; cdCurso: number };
      return prisma.avaliacaoAluno.update({
        where: { cpf_cdCurso: { cpf, cdCurso } },
        data: { status: "ENCERRADO", dataEncerramento: new Date() },
      });
    }

    case "getAvaliacao": {
      const { cpf, cdCurso } = argumento as { cpf: string; cdCurso: number };
      const avaliacao = await prisma.avaliacaoAluno.findUnique({
        where: { cpf_cdCurso: { cpf, cdCurso } },
      });

      if (!avaliacao) return null;

      return {
        ...avaliacao,
        respostas: await respostasPorLinha(prisma, {
          formulario: "avaliacao",
          cpf,
          cdCurso,
        }),
      };
    }

    // AvaliacaoAluno.cpf é FK para Usuario e AvaliacaoAluno.cdCurso é FK
    // para PreCurso, sem onDelete: Cascade em nenhuma das duas - uma
    // avaliação de teste bloquearia tanto `deleteUsuarios` quanto
    // `deletePreCursosPorOfertante` se não for limpa antes.
    case "deleteAvaliacoesPorCpf": {
      const cpfs = argumento as string[];
      const { count } = await prisma.avaliacaoAluno.deleteMany({
        where: { cpf: { in: cpfs } },
      });
      return { count };
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
