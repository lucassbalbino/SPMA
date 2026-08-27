// e2e de POST /api/pos-cursos/[cdCurso]/encerrar (REQ-PO-08, REQ-PO-09, REQ-PO-10).
import { expect, test } from "@playwright/test";
import {
  criarOfertante,
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  getPosCurso,
  upsertUsuario,
} from "./helpers/db";
import {
  cabecalhosAutenticados,
  idCsrfDaResposta,
  idSessaoDaResposta,
  novoCliente,
} from "./helpers/http";

const SENHA = "SenhaValida123";
const CPF_GO = "52231005816";
const CPFS = [CPF_GO];

let cdOfertante: number;
let cdVerba: number;

async function logarComCsrf(cpf: string): Promise<{ idSessao: string; idCsrf: string }> {
  const cliente = await novoCliente();
  const res = await cliente.post("/api/auth/login", { data: { cpf, senha: SENHA } });
  const idSessao = idSessaoDaResposta(res);
  const idCsrf = idCsrfDaResposta(res);
  await cliente.dispose();

  if (!idSessao || !idCsrf) throw new Error(`Login não emitiu sessão/CSRF para ${cpf}`);
  return { idSessao, idCsrf };
}

// Os 26 campos do Dicionário de Campos (spec.md), incluindo o único
// condicional, aplicável nesta fixture.
const RESPOSTA_COMPLETA = {
  posAcompanhProblemasEstudo: ["Dificuldade de concentração"],
  posAcompanhConceitosTrabalhados: "Sustentabilidade e turismo de base comunitária",
  posAcompanhPlanoAcao: "Reforço individual semanal",
  posAcompanhAvaliacaoCognitiva: "Prova escrita",
  posAcompanhMonitoramento: ["Relatórios de frequência"],
  posExecDataInicioReal: "2026-03-01",
  posExecDataTerminoReal: "2026-06-01",
  posExecCargaHorariaRealizada: 120,
  posExecDificuldadesEnfrentadas: ["Evasão de alunos"],
  posExecHouveAlteracaoPlanejamento: "Sim",
  posExecAlteracaoDetalhe: "Curso estendido em 2 semanas por feriados",
  posParticNumInscritos: 40,
  posParticNumMatriculados: 35,
  posParticNumConcluintes: 30,
  posParticMotivosAbandono: "Conflito com trabalho",
  posParticRelacaoDemandaOferta: "Demanda superou a oferta de vagas",
  posParticIntencaoNovaOferta: "Sim",
  posFinValorTotalExecutado: 15000,
  posFinValorDespesaDocentes: 8000,
  posFinValorDespesaMaterialDidatico: 3000,
  posFinValorDespesaInfraestrutura: 4000,
  posFinHouveDevolucaoRecursos: "Não",
  posFinValorDevolvido: 0,
  posFinNecessidadeAditivo: "Não",
  posContEstrategiasContinuidade: ["Nova turma no mesmo local"],
  posContEstrategiasAmpliacao: ["Aumento do número de vagas"],
};

test.beforeAll(() => {
  deleteUsuarios(CPFS);

  cdOfertante = criarOfertante({ nome: "Ofertante Encerramento Pós-Curso", uf: "SP" }).cdOfertante;
  cdVerba = criarVerba({ cdOfertante, vlVerba: 10000 }).cdVerba;

  upsertUsuario({ cpf: CPF_GO, tipo: "GO", senha: SENHA, primeiraVez: false, cdOfertante });
});

test.afterAll(() => {
  deletePreCursosPorOfertante([cdOfertante]);
  deleteUsuarios(CPFS);
});

function criarPosCursoFixture(): number {
  const cdCurso = criarPreCurso({
    cdOfertante,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CPF_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso, criadoPor: CPF_GO });
  return cdCurso;
}

test("REQ-PO-09: encerramento com campo obrigatório faltando é rejeitado com 400 e a pendência listada", async () => {
  const cdCurso = criarPosCursoFixture();
  const { posAcompanhPlanoAcao: _omitido, ...respostaIncompleta } = RESPOSTA_COMPLETA;

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: respostaIncompleta,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/pos-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(400);
  const corpo = await res.json();
  expect(corpo.pendentes).toContain("posAcompanhPlanoAcao");

  const persistido = getPosCurso(cdCurso);
  expect(persistido?.status).toBe("EM_ANDAMENTO");

  await cliente.dispose();
});

test("REQ-PO-10: encerramento com os 26 campos completos -> 200, ENCERRADO, dataEncerramento preenchida", async () => {
  const cdCurso = criarPosCursoFixture();

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/pos-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const corpo = await res.json();
  expect(corpo.posCurso.status).toBe("ENCERRADO");
  expect(corpo.posCurso.dataEncerramento).not.toBeNull();

  const persistido = getPosCurso(cdCurso);
  expect(persistido?.status).toBe("ENCERRADO");
  expect(persistido?.dataEncerramento).not.toBeNull();

  await cliente.dispose();
});

test("REQ-PO-08: segunda tentativa de encerrar um pós-curso já ENCERRADO recebe 409", async () => {
  const cdCurso = criarPosCursoFixture();

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  await cliente.post(`/api/pos-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.post(`/api/pos-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});

test("REQ-PO-08: PATCH após o encerramento recebe 409 (fecha o gate fim-a-fim com T5)", async () => {
  const cdCurso = criarPosCursoFixture();

  const { idSessao, idCsrf } = await logarComCsrf(CPF_GO);
  const cliente = await novoCliente();
  await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  await cliente.post(`/api/pos-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  const res = await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: { posParticNumInscritos: 99 },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(409);

  await cliente.dispose();
});
