// e2e de DELETE /api/cursos/[cdCurso] (RU-23 a RU-27), pela rota real. As
// regras em si têm teste de integração (`src/lib/cursos/exclusao.integration
// .test.ts`); aqui fica o contrato HTTP: status, corpo e guarda de CSRF.
import { expect, test } from "@playwright/test";
import {
  criarAvaliacao,
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deleteAvaliacoesPorCpf,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
  encerrarPreCursoFixture,
  getPreCurso,
  upsertUsuario,
} from "./helpers/db";
import { geradorDeCnpj } from "./helpers/cnpj";
import {
  cabecalhoCookie,
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";
const gerarCnpjValido = geradorDeCnpj("61");

const CNPJ_GO = gerarCnpjValido(1);
const CNPJ_GO_OUTRO = gerarCnpjValido(2);
const CPF_VO = "61720304505";
const CPF_AL = "61720304696";
const CPFS = [CNPJ_GO, CNPJ_GO_OUTRO, CPF_VO, CPF_AL];

let cdVerba: number;

async function logarComCsrf(documento: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { documento, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) throw new Error(`Login não emitiu sessão/CSRF para ${documento}`);
  return { idSessao, idCsrf };
}

function criarFormacao(): number {
  const { cdCurso } = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
    respostas: { qualifNomeCurso: "Formação a excluir" },
  });
  criarPosCurso({ cdCurso, criadoPor: CNPJ_GO });
  return cdCurso;
}

async function excluir(documento: string, cdCurso: number) {
  const { idSessao, idCsrf } = await logarComCsrf(documento);
  const cliente = await novoCliente();
  const res = await cliente.delete(`/api/cursos/${cdCurso}`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  const corpo = await res.json();
  await cliente.dispose();
  return { status: res.status(), corpo };
}

test.beforeAll(() => {
  deleteAvaliacoesPorCpf([CPF_AL]);
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO]);
  deleteUsuarios(CPFS);

  upsertUsuario({ cpf: CNPJ_GO, tipo: "GO", senha: SENHA, primeiraVez: false, nome: "GO Excluir", uf: "DF" });
  upsertUsuario({
    cpf: CNPJ_GO_OUTRO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "GO Excluir Outro",
    uf: "GO",
  });
  upsertUsuario({ cpf: CPF_VO, tipo: "VO", senha: SENHA, primeiraVez: false, cdOfertante: CNPJ_GO });
  upsertUsuario({ cpf: CPF_AL, tipo: "AL", senha: SENHA, primeiraVez: false });

  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;
});

test.afterAll(() => {
  deleteAvaliacoesPorCpf([CPF_AL]);
  deletePreCursosPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO]);
  deleteVerbasPorOfertante([CNPJ_GO, CNPJ_GO_OUTRO]);
  deleteUsuarios(CPFS);
});

test("RU-23: GO exclui formação sem aluno e em andamento -> 200 e a formação some", async () => {
  const cdCurso = criarFormacao();

  const { status, corpo } = await excluir(CNPJ_GO, cdCurso);

  expect(status).toBe(200);
  expect(corpo).toEqual({ ok: true });
  expect(getPreCurso(cdCurso)).toBeNull();
});

test("RU-25: formação com aluno -> 409 com a mensagem, nada some", async () => {
  const cdCurso = criarFormacao();
  criarAvaliacao({ cpf: CPF_AL, cdCurso });

  const { status, corpo } = await excluir(CNPJ_GO, cdCurso);

  expect(status).toBe(409);
  expect(corpo).toEqual({ erro: "Esta formação tem aluno cadastrado e não pode ser excluída." });
  expect(getPreCurso(cdCurso)).not.toBeNull();
});

test("RU-26: Cadastro de Formação concluído -> 409 com a mensagem, nada some", async () => {
  const cdCurso = criarFormacao();
  encerrarPreCursoFixture(cdCurso);

  const { status, corpo } = await excluir(CNPJ_GO, cdCurso);

  expect(status).toBe(409);
  expect(corpo).toEqual({ erro: "Cadastro de Formação concluído não pode ser excluído." });
  expect(getPreCurso(cdCurso)).not.toBeNull();
});

test("RU-27: quem não gerencia a formação (GO de outro ofertante, VO) -> 403, nada some", async () => {
  const cdCurso = criarFormacao();

  for (const documento of [CNPJ_GO_OUTRO, CPF_VO]) {
    const { status } = await excluir(documento, cdCurso);
    expect(status).toBe(403);
  }
  expect(getPreCurso(cdCurso)).not.toBeNull();
});

test("RU-27: formação inexistente -> 404", async () => {
  const cdCurso = criarFormacao();
  await excluir(CNPJ_GO, cdCurso);

  const { status, corpo } = await excluir(CNPJ_GO, cdCurso);

  expect(status).toBe(404);
  expect(corpo).toEqual({ erro: "Formação não encontrada" });
});

test("sem o token de CSRF a exclusão é recusada e nada some", async () => {
  const cdCurso = criarFormacao();
  const { idSessao } = await logarComCsrf(CNPJ_GO);

  const cliente = await novoCliente();
  const res = await cliente.delete(`/api/cursos/${cdCurso}`, {
    headers: cabecalhoCookie(idSessao),
  });
  await cliente.dispose();

  expect(res.status()).toBe(403);
  expect(getPreCurso(cdCurso)).not.toBeNull();
});
