-- Curso como tabela própria (AD-052). O ofertante, a verba, o valor alocado,
-- o criador e a data de criação saem de TB_Pre_Curso (e o criador e a data,
-- também de TB_Pos_Curso) e passam a viver em TB_Curso. O pré-curso, o
-- pós-curso e a avaliação apontam para ela pelo mesmo CD_Curso.
--
-- O DDL do MySQL não é transacional, então a ordem é a da AD-051: tudo antes
-- do passo 4 só acrescenta. Se a conferência (passo 3) não bater, a migration
-- para ali, com as colunas antigas intactas; a reversão de uma tentativa
-- abortada está em reversao.sql e em docs/DEPLOY_PRODUCAO.md.

-- 1. Expand

-- CreateTable
CREATE TABLE `TB_Curso` (
    `CD_Curso` INTEGER NOT NULL AUTO_INCREMENT,
    `CD_Ofertante` VARCHAR(14) NOT NULL,
    `CD_Verba` INTEGER NOT NULL,
    `VL_Curso_Alocado` DECIMAL(10, 2) NOT NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Criado_Por` VARCHAR(14) NOT NULL,

    INDEX `TB_Curso_CD_Ofertante_idx`(`CD_Ofertante`),
    INDEX `TB_Curso_CD_Verba_idx`(`CD_Verba`),
    PRIMARY KEY (`CD_Curso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Backfill: um curso por pré-curso, com o mesmo CD_Curso. O criador e a
-- data de criação vêm do pré-curso; os do pós-curso, iguais desde que os dois
-- nascem juntos em POST /api/cursos, ficam só no backup. Inserir CD_Curso
-- explícito avança o AUTO_INCREMENT para depois do maior código migrado.

INSERT INTO `TB_Curso` (`CD_Curso`, `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Data_Criacao`, `Criado_Por`)
SELECT `CD_Curso`, `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Data_Criacao`, `Criado_Por`
FROM `TB_Pre_Curso`;

-- 3. Conferência: o MySQL aborta com o nome do CHECK que falhar.
--   cursos_divergentes: contagem diferente, ou algum curso com valor diferente
--                       do pré-curso de origem.
--   cursos_orfaos:      algum pós-curso ou avaliação sem curso.

CREATE TABLE `_Conferencia_Tabela_Curso` (
    `cursos_esperados` INTEGER NOT NULL,
    `cursos_gravados` INTEGER NOT NULL,
    `cursos_diferentes` INTEGER NOT NULL,
    `etapas_sem_curso` INTEGER NOT NULL,
    CONSTRAINT `cursos_divergentes` CHECK (`cursos_esperados` = `cursos_gravados` AND `cursos_diferentes` = 0),
    CONSTRAINT `cursos_orfaos` CHECK (`etapas_sem_curso` = 0)
);

INSERT INTO `_Conferencia_Tabela_Curso` SELECT
  (SELECT COUNT(*) FROM `TB_Pre_Curso`),
  (SELECT COUNT(*) FROM `TB_Curso`),
  (SELECT COUNT(*) FROM `TB_Pre_Curso` p LEFT JOIN `TB_Curso` c ON c.`CD_Curso` = p.`CD_Curso`
    WHERE NOT (c.`CD_Ofertante` <=> p.`CD_Ofertante`
      AND c.`CD_Verba` <=> p.`CD_Verba`
      AND c.`VL_Curso_Alocado` <=> p.`VL_Curso_Alocado`
      AND c.`Data_Criacao` <=> p.`Data_Criacao`
      AND c.`Criado_Por` <=> p.`Criado_Por`)),
  (SELECT COUNT(*) FROM `TB_Pos_Curso` x WHERE NOT EXISTS (SELECT 1 FROM `TB_Curso` c WHERE c.`CD_Curso` = x.`CD_Curso`))
    + (SELECT COUNT(*) FROM `TB_Avaliacao_Aluno` x WHERE NOT EXISTS (SELECT 1 FROM `TB_Curso` c WHERE c.`CD_Curso` = x.`CD_Curso`));

DROP TABLE `_Conferencia_Tabela_Curso`;

-- 4. Contract

-- DropForeignKey
ALTER TABLE `TB_Avaliacao_Aluno` DROP FOREIGN KEY `TB_Avaliacao_Aluno_CD_Curso_fkey`;

-- DropForeignKey
ALTER TABLE `TB_Pos_Curso` DROP FOREIGN KEY `TB_Pos_Curso_CD_Curso_fkey`;

-- DropForeignKey
ALTER TABLE `TB_Pos_Curso` DROP FOREIGN KEY `TB_Pos_Curso_Criado_Por_fkey`;

-- DropForeignKey
ALTER TABLE `TB_Pre_Curso` DROP FOREIGN KEY `TB_Pre_Curso_CD_Ofertante_fkey`;

-- DropForeignKey
ALTER TABLE `TB_Pre_Curso` DROP FOREIGN KEY `TB_Pre_Curso_CD_Verba_fkey`;

-- DropForeignKey
ALTER TABLE `TB_Pre_Curso` DROP FOREIGN KEY `TB_Pre_Curso_Criado_Por_fkey`;

-- DropIndex
DROP INDEX `TB_Pos_Curso_Criado_Por_fkey` ON `TB_Pos_Curso`;

-- DropIndex
DROP INDEX `TB_Pre_Curso_CD_Ofertante_idx` ON `TB_Pre_Curso`;

-- DropIndex
DROP INDEX `TB_Pre_Curso_CD_Verba_idx` ON `TB_Pre_Curso`;

-- DropIndex
DROP INDEX `TB_Pre_Curso_Criado_Por_fkey` ON `TB_Pre_Curso`;

-- AlterTable
ALTER TABLE `TB_Pos_Curso` DROP COLUMN `Criado_Por`,
    DROP COLUMN `Data_Criacao`;

-- AlterTable
ALTER TABLE `TB_Pre_Curso` DROP COLUMN `CD_Ofertante`,
    DROP COLUMN `CD_Verba`,
    DROP COLUMN `Criado_Por`,
    DROP COLUMN `Data_Criacao`,
    DROP COLUMN `VL_Curso_Alocado`,
    MODIFY `CD_Curso` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `TB_Curso` ADD CONSTRAINT `TB_Curso_CD_Ofertante_fkey` FOREIGN KEY (`CD_Ofertante`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Curso` ADD CONSTRAINT `TB_Curso_CD_Verba_fkey` FOREIGN KEY (`CD_Verba`) REFERENCES `TB_Verba`(`CD_Verba`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Curso` ADD CONSTRAINT `TB_Curso_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Pre_Curso` ADD CONSTRAINT `TB_Pre_Curso_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Curso`(`CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Pos_Curso` ADD CONSTRAINT `TB_Pos_Curso_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Curso`(`CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Avaliacao_Aluno` ADD CONSTRAINT `TB_Avaliacao_Aluno_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Curso`(`CD_Curso`) ON DELETE RESTRICT ON UPDATE CASCADE;
