// VIEWs do banco `bi`, que o Power BI do cliente lê (AD-051). Cada VIEW
// espelha uma tabela do `spma` com uma lista fixa de colunas - as que o
// cliente já via mais as respostas `P*`, na ordem do questionário. Colunas
// sensíveis (senha, token de sessão) nunca entram.
//
// O SQL fica versionado em `scripts/views-bi.sql`, gerado por esta função
// (`npm run bi:views`); `views-bi.test.ts` falha se o arquivo ficar para trás
// do mapa, por exemplo quando uma pergunta nova entra sem entrar na VIEW.
import { MAPA, colunasDaEntrada, type Formulario } from "./colunas";

const VIEWS: { tabela: string; formulario: Formulario; colunas: string[] }[] = [
  {
    tabela: "TB_Pre_Curso",
    formulario: "preCurso",
    colunas: ["CD_Curso", "CD_Ofertante", "CD_Verba", "VL_Curso_Alocado", "Status", "Data_Criacao", "Criado_Por", "Data_Encerramento"],
  },
  {
    tabela: "TB_Pos_Curso",
    formulario: "posCurso",
    colunas: ["CD_Curso", "Status", "Data_Criacao", "Criado_Por", "Data_Ultima_Atualizacao", "Data_Encerramento"],
  },
  {
    tabela: "TB_Avaliacao_Aluno",
    formulario: "avaliacao",
    colunas: ["CPF", "CD_Curso", "Status", "Parte1_Completa", "Data_Criacao", "Data_Encerramento"],
  },
  { tabela: "TB_Dado_Pessoal_Aluno", formulario: "dadosPessoais", colunas: ["CPF"] },
];

// As tabelas `(Chave, Ordem, Valor)` saíram do `spma` na AD-051.
const VIEWS_REMOVIDAS = ["TB_Resposta_Pre_Curso", "TB_Resposta_Pos_Curso", "TB_Resposta_Avaliacao"];

const id = (nome: string) => `\`${nome}\``;

export function sqlDasViewsBi(): string {
  const criar = VIEWS.map(({ tabela, formulario, colunas }) => {
    const todas = [...colunas, ...MAPA[formulario].flatMap(colunasDaEntrada)];
    const lista = todas.map((coluna) => `  ${id(coluna)}`).join(",\n");
    return `CREATE OR REPLACE VIEW \`bi\`.${id(tabela)} AS SELECT\n${lista}\nFROM \`spma\`.${id(tabela)};`;
  });
  const remover = VIEWS_REMOVIDAS.map((tabela) => `DROP VIEW IF EXISTS \`bi\`.${id(tabela)};`);

  return `-- VIEWs do banco \`bi\` (Power BI). Gerado por \`npm run bi:views\` a partir de
-- src/lib/respostas/views-bi.ts - não edite à mão. Procedimento em
-- docs/DEPLOY_PRODUCAO.md, seção "VIEWs do banco bi".

${[...criar, ...remover].join("\n\n")}
`;
}
