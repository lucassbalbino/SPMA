// e2e de POST /api/pos-cursos/[cdCurso]/encerrar (REQ-PO-08, REQ-PO-09, REQ-PO-10).
//
// UGO-14/AD-043: sem `model Ofertante` separado, o Ofertante é o próprio GO,
// identificado por CNPJ - `criarOfertante` (removido em T5) dá lugar a
// `upsertUsuario({ tipo: "GO", ... })`.
import { expect, test } from "@playwright/test";
import {
  criarPosCurso,
  criarPreCurso,
  criarVerba,
  deletePreCursosPorOfertante,
  deleteUsuarios,
  deleteVerbasPorOfertante,
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

function calcularDvCnpj(digitos: number[]): number {
  let soma = 0;
  let peso = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += digitos[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCnpjValido(indice: number): string {
  const base12 = `39${String(indice).padStart(6, "0")}0001`;
  const digitos = base12.split("").map(Number);
  const d1 = calcularDvCnpj(digitos);
  const d2 = calcularDvCnpj([...digitos, d1]);
  return `${base12}${d1}${d2}`;
}

const CNPJ_GO = gerarCnpjValido(1);
const CPFS = [CNPJ_GO];

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

// As 26 chaves do questionário fonte
// (`docs/Questionario_do_Gestor_Pos_Curso.md`), incluindo o único condicional.
const RESPOSTA_COMPLETA = {
  posAcompanhProblemasEstudo:
    "Sim, foram definidos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.",
  posAcompanhConceitosTrabalhados:
    "Sim, foram detalhados os conceitos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.",
  posAcompanhPlanoAcao:
    "Sim, o Plano de Ação foi definido pelos Docentes em conjunto com a Coordenação Didático-Pedagógica responsável.",
  posAcompanhProvaSituacao:
    "Sim, foi elaborada pelos Docentes, mas só foi realizada pelos alunos no primeiro dia de aula.",
  posAcompanhLicaoIndividual: "Sim, foi realizada.",
  posAcompanhMonitoramento: ["Reuniões periódicas com alunos."],
  posExecDataInicioReal: "2026-03-01",
  posExecDataTerminoReal: "2026-06-01",
  posExecCargaHorariaRealizada: 120,
  posExecDificuldadesEnfrentadas: "Evasão de alunos nas semanas de chuva forte",
  posExecHouveAlteracaoPlanejamento: "Sim",
  posExecAlteracaoDetalhe: "Curso estendido em 2 semanas por feriados",
  posParticNumInscritos: 40,
  posParticNumMatriculados: 35,
  posParticNumConcluintes: 30,
  posParticMotivosAbandono: ["Dificuldades financeiras", "Horário inapropriado das aulas"],
  posParticDemandaMaiorQueOferta: "Sim",
  posParticIntencaoNovaOferta: "Sim",
  posFinValorTotal: 15000,
  posFinValorProfessores: 8000,
  posFinValorMateriais: 3000,
  posFinValorInfraestrutura: 4000,
  posFinValorBolsaPermanencia: 0,
  posFinHouveDevolucaoRecursos: "Não",
  posFinNecessidadeAditivo: "Não",
  posContEstrategias: ["Estabelecimento de parcerias junto a entidades públicas."],
};

test.beforeAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO]);
  deleteVerbasPorOfertante([CNPJ_GO]);
  deleteUsuarios(CPFS);

  upsertUsuario({
    cpf: CNPJ_GO,
    tipo: "GO",
    senha: SENHA,
    primeiraVez: false,
    nome: "Ofertante Encerramento Pós-Curso",
    uf: "SP",
  });
  cdVerba = criarVerba({ cdOfertante: CNPJ_GO, vlVerba: 10000 }).cdVerba;
});

test.afterAll(() => {
  deletePreCursosPorOfertante([CNPJ_GO]);
  deleteVerbasPorOfertante([CNPJ_GO]);
  deleteUsuarios(CPFS);
});

function criarPosCursoFixture(): number {
  const cdCurso = criarPreCurso({
    cdOfertante: CNPJ_GO,
    cdVerba,
    vlCursoAlocado: 100,
    criadoPor: CNPJ_GO,
  }).cdCurso;
  criarPosCurso({ cdCurso, criadoPor: CNPJ_GO });
  return cdCurso;
}

test("REQ-PO-09: encerramento com campo obrigatório faltando é rejeitado com 400 e a pendência listada", async () => {
  const cdCurso = criarPosCursoFixture();
  const { posAcompanhPlanoAcao: _omitido, ...respostaIncompleta } = RESPOSTA_COMPLETA;

  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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

  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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

  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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

  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
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

test("condicional órfã (Q12 preenchida com Q11='Não') é descartada no encerramento", async () => {
  const cdCurso = criarPosCursoFixture();

  const { idSessao, idCsrf } = await logarComCsrf(CNPJ_GO);
  const cliente = await novoCliente();

  // Q11="Sim" + Q12 detalhada...
  await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: RESPOSTA_COMPLETA,
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  // ...e o Gestor muda de ideia: Q11 vira "Não". A gravação PRESERVA o
  // detalhe (merge raso, REQ-PO-04) - é só no encerramento que ele sai.
  await cliente.patch(`/api/pos-cursos/${cdCurso}`, {
    data: { posExecHouveAlteracaoPlanejamento: "Não" },
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });
  expect(getPosCurso(cdCurso)?.respostas?.posExecAlteracaoDetalhe).toBe(
    "Curso estendido em 2 semanas por feriados",
  );

  const res = await cliente.post(`/api/pos-cursos/${cdCurso}/encerrar`, {
    headers: cabecalhosAutenticados(idSessao, idCsrf),
  });

  expect(res.status()).toBe(200);
  const persistido = getPosCurso(cdCurso);
  expect(persistido?.status).toBe("ENCERRADO");
  expect(persistido?.respostas?.posExecHouveAlteracaoPlanejamento).toBe("Não");
  expect(persistido?.respostas).not.toHaveProperty("posExecAlteracaoDetalhe");
  // o resto do questionário continua intacto
  expect(persistido?.respostas?.posExecDificuldadesEnfrentadas).toBe(
    "Evasão de alunos nas semanas de chuva forte",
  );

  await cliente.dispose();
});
