// e2e de PATCH /api/usuarios/me/perfil (RU-49 a RU-54): Editar Perfil pela
// rota real. A tela fica em `meus-dados.spec.ts`.
import { expect, test } from "@playwright/test";
import { deleteUsuarios, getUsuario, upsertUsuario } from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import { cabecalhosAutenticados, idCsrfDaResposta, idSessaoDaResposta, novoCliente } from "./helpers/http";

const SENHA = "SenhaValida123";
const CPF_GT = "62730405160";
const CPF_GT_OUTRO = "62730405240";
const CPF_AL = "62730405321";
const CNPJ_GO = geradorDeCnpj("62")(1);
const DOCUMENTOS = [CPF_GT, CPF_GT_OUTRO, CPF_AL, CNPJ_GO];

async function patchPerfil(documento: string, corpo: Record<string, unknown>) {
  const cliente = await novoCliente();
  const login = await cliente.post("/api/auth/login", { data: { documento, senha: SENHA } });
  const idSessao = idSessaoDaResposta(login);
  const idCsrf = idCsrfDaResposta(login);
  if (!idSessao || !idCsrf) throw new Error(`Login de ${documento} não emitiu sessão/CSRF`);

  const res = await cliente.patch("/api/usuarios/me/perfil", {
    data: corpo,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  const json = await res.json();
  await cliente.dispose();
  return { status: res.status(), json };
}

test.beforeAll(() => {
  deleteUsuarios(DOCUMENTOS);
  upsertUsuario({ cpf: CPF_GT, tipo: "GT", senha: SENHA, primeiraVez: false, nome: "GT Perfil" });
  upsertUsuario({ cpf: CPF_GT_OUTRO, tipo: "GT", senha: SENHA, primeiraVez: false, nome: "GT Intocado" });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false, nome: "AL Perfil" });
  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    dadosOrganizacionaisCompletos: true,
    nome: "GO Perfil",
    telefone: "6133334444",
  });
});

test.afterAll(() => deleteUsuarios(DOCUMENTOS));

test("RU-49: grava nome, e-mail e telefone (só dígitos) no próprio usuário", async () => {
  const { status } = await patchPerfil(CPF_GT, {
    nome: "GT Renomeado",
    email: "gt.novo@exemplo.dev",
    telefone: "(61) 99928-1374",
  });

  expect(status).toBe(200);
  const gt = getUsuario(CPF_GT);
  expect(gt?.nome).toBe("GT Renomeado");
  expect(gt?.email).toBe("gt.novo@exemplo.dev");
  expect(gt?.telefone).toBe("61999281374");
});

test("RU-50: e-mail inválido -> 400 e nada muda", async () => {
  const antes = getUsuario(CPF_GT);

  const { status, json } = await patchPerfil(CPF_GT, { nome: "Outro Nome", email: "sem-arroba" });

  expect(status).toBe(400);
  expect(json.erro).toBe("E-mail inválido");
  expect(getUsuario(CPF_GT)?.nome).toBe(antes?.nome);
});

test("RU-51: GO sem telefone -> 400 'Telefone é obrigatório' e o telefone continua", async () => {
  const { status, json } = await patchPerfil(CNPJ_GO, {
    nome: "GO Perfil",
    email: "go@exemplo.dev",
    telefone: "",
  });

  expect(status).toBe(400);
  expect(json.erro).toBe("Telefone é obrigatório");
  expect(getUsuario(CNPJ_GO)?.telefone).toBe("6133334444");
});

test("RU-52: Aluno -> 403", async () => {
  const { status } = await patchPerfil(CPF_AL, { nome: "AL Novo", email: "al@exemplo.dev" });

  expect(status).toBe(403);
  expect(getUsuario(CPF_AL)?.nome).toBe("AL Perfil");
});

test("RU-54: `documento` de outro usuário no corpo é ignorado - só o próprio muda", async () => {
  const { status } = await patchPerfil(CPF_GT, {
    nome: "GT Ainda Ele",
    email: "gt.ele@exemplo.dev",
    documento: CPF_GT_OUTRO,
  });

  expect(status).toBe(200);
  expect(getUsuario(CPF_GT)?.nome).toBe("GT Ainda Ele");
  expect(getUsuario(CPF_GT_OUTRO)?.nome).toBe("GT Intocado");
});
