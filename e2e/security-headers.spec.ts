// e2e de CA-SEC-16, CA-SEC-13 e CA-SEC-10 (T22), via browser real
// (Playwright `page`, não `APIRequestContext`) para capturar navegação,
// console e respostas de rede ao longo do fluxo completo login ->
// primeiro-acesso. Reusa o mesmo fluxo de UI já exercitado por
// e2e/login-page.spec.ts e e2e/primeiro-acesso-page.spec.ts, agora
// observado pela camada de segurança em vez de só pelo resultado funcional.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, upsertUsuario } from "./helpers/db";

const NOVA_SENHA = "NovaSenhaValida123";
const SENHA_OUTRO_USUARIO = "SenhaDeOutroUsuario123";

// CPF do fluxo (1º acesso pendente) e CPF de um usuário totalmente alheio a
// este cenário (CA-SEC-10: nenhum CPF de terceiros pode vazar).
const CPF_FLUXO = "50040050017";
const CPF_OUTRO_USUARIO = "50050060015";

const CPFS = [CPF_FLUXO, CPF_OUTRO_USUARIO];

test.beforeAll(() => {
  deleteUsuarios(CPFS);
  upsertUsuario({ cpf: CPF_FLUXO, tipo: "AL", senha: null, primeiraVez: true });
  upsertUsuario({
    cpf: CPF_OUTRO_USUARIO,
    tipo: "AL",
    senha: SENHA_OUTRO_USUARIO,
    primeiraVez: false,
  });
});

test.afterAll(() => {
  deleteUsuarios(CPFS);
});

test("CA-SEC-16/CA-SEC-13/CA-SEC-10: headers de segurança presentes, nenhum dado sensível em URL, console ou rede durante login -> primeiro-acesso", async ({
  page,
}) => {
  const urlsVisitadas: string[] = [];
  const mensagensConsole: string[] = [];
  const corposDeResposta: string[] = [];
  const respostasPendentes: Promise<void>[] = [];

  page.on("request", (request) => {
    urlsVisitadas.push(request.url());
  });

  page.on("console", (msg) => {
    mensagensConsole.push(msg.text());
  });

  page.on("response", (response) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json") && !contentType.includes("text")) {
      return;
    }
    respostasPendentes.push(
      response
        .text()
        .then((texto) => {
          corposDeResposta.push(texto);
        })
        .catch(() => {
          // Corpo indisponível (ex.: resposta abortada) - nada a checar.
        }),
    );
  });

  // CA-SEC-16: CSP, X-Content-Type-Options e Referrer-Policy presentes na
  // resposta de documento de /login (next.config.ts headers estáticos + CSP
  // por nonce do proxy.ts).
  const respostaLogin = await page.goto("/login");
  expect(respostaLogin).not.toBeNull();
  const headersLogin = respostaLogin!.headers();
  expect(headersLogin["content-security-policy"]).toBeTruthy();
  expect(headersLogin["x-content-type-options"]).toBe("nosniff");
  expect(headersLogin["referrer-policy"]).toBeTruthy();

  await page.getByLabel("CPF").fill(CPF_FLUXO);
  await page.getByLabel("Senha").fill("irrelevante");
  await Promise.all([
    page.waitForURL(/\/primeiro-acesso$/),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);

  await page.getByLabel("Nova senha").fill(NOVA_SENHA);
  await page.getByLabel("Confirme a senha").fill(NOVA_SENHA);
  await Promise.all([
    page.waitForURL(/\/painel$/),
    page.getByRole("button", { name: "Salvar senha" }).click(),
  ]);

  // Só depois do login existem valores de sessão/CSRF reais para checar
  // contra as URLs visitadas.
  const cookies = await page.context().cookies();
  const idSessao = cookies.find((c) => c.name === "spma_sessao")?.value;
  const idCsrf = cookies.find((c) => c.name === "spma_csrf")?.value;
  expect(idSessao).toBeTruthy();
  expect(idCsrf).toBeTruthy();

  // CA-SEC-13: nenhuma URL visitada durante o fluxo contém CPF, senha ou
  // token de sessão/CSRF (nem em query string nem em path).
  for (const url of urlsVisitadas) {
    expect(url).not.toContain(CPF_FLUXO);
    expect(url).not.toContain(NOVA_SENHA);
    expect(url).not.toContain(idSessao);
    expect(url).not.toContain(idCsrf);
  }

  // CA-SEC-10: console do navegador e respostas de rede não expõem nenhum
  // dos 5 tipos de dado sensível listados no critério - senha, hash, token
  // de sessão/CSRF, CPF de um usuário fora do escopo do solicitante, e
  // stack trace de servidor.
  await Promise.all(respostasPendentes);
  const textoConsole = mensagensConsole.join("\n");
  const textoRespostas = corposDeResposta.join("\n");
  for (const texto of [textoConsole, textoRespostas]) {
    expect(texto).not.toMatch(/senhaHash/i);
    expect(texto).not.toMatch(/\$argon2/i);
    expect(texto).not.toContain(NOVA_SENHA);
    expect(texto).not.toContain(CPF_OUTRO_USUARIO);
    expect(texto).not.toContain(idSessao);
    expect(texto).not.toContain(idCsrf);
    // Padrão típico de linha de stack trace do Node/V8 ("at Foo (arquivo:l:c)").
    expect(texto).not.toMatch(/\bat\s+\S+\s*\([^)]*:\d+:\d+\)/);
  }
});
