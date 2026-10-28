-- Reverte uma tentativa ABORTADA da migration 20261028120000_tabela_curso
-- (AD-052). Procedimento completo em docs/DEPLOY_PRODUCAO.md.
--
-- Só serve para o caso em que a migration parou antes do contract (passo 4):
-- as seis chaves estrangeiras antigas e as colunas de TB_Pre_Curso e
-- TB_Pos_Curso ainda existem e guardam todos os dados do curso. A trava abaixo
-- confere as seis FKs: se o contract já começou, alguma falta, o CHECK falha
-- e este arquivo para aqui com erro, sem apagar nada.
--
-- Rode com o cliente mysql, sem --force, para ele parar no primeiro erro.

CREATE TEMPORARY TABLE `_Trava_Reversao_Tabela_Curso` (
    `fks_antigas` INTEGER NOT NULL,
    CONSTRAINT `contract_ja_comecou` CHECK (`fks_antigas` = 6)
);

INSERT INTO `_Trava_Reversao_Tabela_Curso`
SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME IN (
    'TB_Avaliacao_Aluno_CD_Curso_fkey',
    'TB_Pos_Curso_CD_Curso_fkey',
    'TB_Pos_Curso_Criado_Por_fkey',
    'TB_Pre_Curso_CD_Ofertante_fkey',
    'TB_Pre_Curso_CD_Verba_fkey',
    'TB_Pre_Curso_Criado_Por_fkey'
) AND REFERENCED_TABLE_NAME IN ('TB_Pre_Curso', 'TB_Usuario', 'TB_Verba');

DROP TEMPORARY TABLE `_Trava_Reversao_Tabela_Curso`;

DROP TABLE IF EXISTS `_Conferencia_Tabela_Curso`;

DROP TABLE IF EXISTS `TB_Curso`;
