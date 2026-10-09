// Abre o túnel Cloudflare que publica a homologação (docs/DEPLOY_TESTE.md).
//
// Existe por causa de um atrito real: o instalador do `cloudflared` põe o
// binário no PATH de MÁQUINA, e só processos criados depois disso o veem.
// Dentro do VSCode isso é pior do que parece - o terminal integrado herda o
// ambiente da janela do VSCode, então abrir uma aba nova NÃO basta, e
// `cloudflared tunnel ...` morre com "is not recognized" mesmo com a
// instalação correta. Em vez de exigir que quem vai rodar lembre do
// contorno, este script procura o binário nos lugares conhecidos.
//
// A porta sai do `PORT` do `.env.uat`, a mesma fonte que o `uat:start` usa -
// para não existir um 3100 hardcoded aqui, capaz de divergir de lá.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.uat" });

const PORTA = process.env.PORT ?? "3100";

// Ordem: PATH primeiro (quem tem o ambiente em dia não depende de palpite
// sobre diretório de instalação), depois os caminhos do instalador MSI e o
// shim do winget.
const CANDIDATOS = [
  "cloudflared",
  // Barras normais de proposito: o Windows as aceita em caminhos de API, e
  // assim nao existe barra invertida nenhuma neste arquivo para alguem (ou
  // alguma ferramenta de edicao) colapsar em escape de string.
  "C:/Program Files (x86)/cloudflared/cloudflared.exe",
  "C:/Program Files/cloudflared/cloudflared.exe",
  join(process.env.LOCALAPPDATA ?? "", "Microsoft/WinGet/Links/cloudflared.exe"),
];

function resolverBinario(): string | null {
  for (const candidato of CANDIDATOS) {
    // O primeiro candidato não é um caminho: deixa o spawn resolver pelo
    // PATH e, se não houver, cai no ENOENT tratado abaixo.
    if (candidato === "cloudflared" || existsSync(candidato)) {
      return candidato;
    }
  }
  return null;
}

function executar(binario: string, ultimaChance: boolean) {
  const filho = spawn(binario, ["tunnel", "--url", `http://localhost:${PORTA}`], {
    stdio: "inherit",
  });

  filho.on("error", (erro: NodeJS.ErrnoException) => {
    if (erro.code === "ENOENT" && !ultimaChance) {
      // `cloudflared` não estava no PATH deste processo: tenta os caminhos
      // absolutos antes de desistir.
      const alternativa = CANDIDATOS.slice(1).find((c) => existsSync(c));
      if (alternativa) {
        console.error(
          `cloudflared não está no PATH deste terminal; usando ${alternativa}`,
        );
        executar(alternativa, true);
        return;
      }
    }
    console.error(
      "Não foi possível executar o cloudflared.\n" +
        "Instale com: winget install --id Cloudflare.cloudflared\n" +
        "Se já instalou, reinicie o VSCode inteiro (abrir aba nova não basta).",
    );
    process.exit(1);
  });

  filho.on("exit", (codigo) => process.exit(codigo ?? 0));
}

const binario = resolverBinario();
if (!binario) {
  console.error(
    "cloudflared não encontrado. Instale com:\n" +
      "  winget install --id Cloudflare.cloudflared",
  );
  process.exit(1);
}

executar(binario, false);
