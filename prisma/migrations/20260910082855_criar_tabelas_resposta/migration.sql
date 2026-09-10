-- CreateTable
CREATE TABLE `TB_Resposta_Pre_Curso` (
    `ID_Resposta` INTEGER NOT NULL AUTO_INCREMENT,
    `CD_Curso` INTEGER NOT NULL,
    `Chave` VARCHAR(100) NOT NULL,
    `Ordem` INTEGER NOT NULL DEFAULT 0,
    `Valor` TEXT NOT NULL,

    INDEX `TB_Resposta_Pre_Curso_Chave_idx`(`Chave`),
    UNIQUE INDEX `TB_Resposta_Pre_Curso_CD_Curso_Chave_Ordem_key`(`CD_Curso`, `Chave`, `Ordem`),
    PRIMARY KEY (`ID_Resposta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Resposta_Pos_Curso` (
    `ID_Resposta` INTEGER NOT NULL AUTO_INCREMENT,
    `CD_Curso` INTEGER NOT NULL,
    `Chave` VARCHAR(100) NOT NULL,
    `Ordem` INTEGER NOT NULL DEFAULT 0,
    `Valor` TEXT NOT NULL,

    INDEX `TB_Resposta_Pos_Curso_Chave_idx`(`Chave`),
    UNIQUE INDEX `TB_Resposta_Pos_Curso_CD_Curso_Chave_Ordem_key`(`CD_Curso`, `Chave`, `Ordem`),
    PRIMARY KEY (`ID_Resposta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Resposta_Avaliacao` (
    `ID_Resposta` INTEGER NOT NULL AUTO_INCREMENT,
    `CPF` VARCHAR(11) NOT NULL,
    `CD_Curso` INTEGER NOT NULL,
    `Chave` VARCHAR(100) NOT NULL,
    `Ordem` INTEGER NOT NULL DEFAULT 0,
    `Valor` TEXT NOT NULL,

    INDEX `TB_Resposta_Avaliacao_Chave_idx`(`Chave`),
    UNIQUE INDEX `TB_Resposta_Avaliacao_CPF_CD_Curso_Chave_Ordem_key`(`CPF`, `CD_Curso`, `Chave`, `Ordem`),
    PRIMARY KEY (`ID_Resposta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TB_Resposta_Pre_Curso` ADD CONSTRAINT `TB_Resposta_Pre_Curso_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Pre_Curso`(`CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Resposta_Pos_Curso` ADD CONSTRAINT `TB_Resposta_Pos_Curso_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Pos_Curso`(`CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Resposta_Avaliacao` ADD CONSTRAINT `TB_Resposta_Avaliacao_CPF_CD_Curso_fkey` FOREIGN KEY (`CPF`, `CD_Curso`) REFERENCES `TB_Avaliacao_Aluno`(`CPF`, `CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;
