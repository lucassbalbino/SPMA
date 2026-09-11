-- AlterTable
ALTER TABLE `TB_Usuario` ADD COLUMN `Dados_Pessoais_Completos` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `TB_Dado_Pessoal_Aluno` (
    `ID_Dado` INTEGER NOT NULL AUTO_INCREMENT,
    `CPF` VARCHAR(11) NOT NULL,
    `Chave` VARCHAR(100) NOT NULL,
    `Ordem` INTEGER NOT NULL DEFAULT 0,
    `Valor` TEXT NOT NULL,

    INDEX `TB_Dado_Pessoal_Aluno_Chave_idx`(`Chave`),
    UNIQUE INDEX `TB_Dado_Pessoal_Aluno_CPF_Chave_Ordem_key`(`CPF`, `Chave`, `Ordem`),
    PRIMARY KEY (`ID_Dado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TB_Dado_Pessoal_Aluno` ADD CONSTRAINT `TB_Dado_Pessoal_Aluno_CPF_fkey` FOREIGN KEY (`CPF`) REFERENCES `TB_Usuario`(`CPF_Usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
