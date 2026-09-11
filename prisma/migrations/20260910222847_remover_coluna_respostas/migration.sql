/*
  Warnings:

  - You are about to drop the column `Respostas` on the `TB_Avaliacao_Aluno` table. All the data in the column will be lost.
  - You are about to drop the column `Respostas` on the `TB_Pos_Curso` table. All the data in the column will be lost.
  - You are about to drop the column `Respostas` on the `TB_Pre_Curso` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TB_Avaliacao_Aluno` DROP COLUMN `Respostas`;

-- AlterTable
ALTER TABLE `TB_Pos_Curso` DROP COLUMN `Respostas`;

-- AlterTable
ALTER TABLE `TB_Pre_Curso` DROP COLUMN `Respostas`;
