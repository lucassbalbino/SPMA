-- CreateTable
CREATE TABLE `TB_Usuario` (
    `CPF_Usuario` VARCHAR(11) NOT NULL,
    `NM_Usuario` VARCHAR(255) NULL,
    `Email_Usuario` VARCHAR(255) NULL,
    `TP_Usuario` ENUM('AM', 'GT', 'VT', 'GO', 'VO', 'AL') NOT NULL,
    `CD_Ofertante` INTEGER NULL,
    `Senha_Hash` VARCHAR(255) NULL,
    `Primeira_Vez` BOOLEAN NOT NULL DEFAULT true,
    `Tentativas_Falhas` INTEGER NOT NULL DEFAULT 0,
    `Bloqueado_Ate` DATETIME(3) NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Criado_Por` VARCHAR(11) NULL,

    INDEX `TB_Usuario_CD_Ofertante_idx`(`CD_Ofertante`),
    INDEX `TB_Usuario_TP_Usuario_idx`(`TP_Usuario`),
    PRIMARY KEY (`CPF_Usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Sessao` (
    `ID_Sessao` VARCHAR(191) NOT NULL,
    `CPF_Usuario` VARCHAR(11) NOT NULL,
    `Criada_Em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Ultima_Atividade` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Expira_Em` DATETIME(3) NOT NULL,

    INDEX `TB_Sessao_CPF_Usuario_idx`(`CPF_Usuario`),
    PRIMARY KEY (`ID_Sessao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Ofertante` (
    `CD_Ofertante` INTEGER NOT NULL AUTO_INCREMENT,
    `NM_Ofertante` VARCHAR(255) NOT NULL,
    `Resp_Ofertante` VARCHAR(255) NULL,
    `Email_Ofertante` VARCHAR(255) NULL,
    `Tel_Ofertante` VARCHAR(50) NULL,
    `UF_Ofertante` VARCHAR(2) NOT NULL,
    `Municipio_Ofertante` VARCHAR(255) NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Criado_Por` VARCHAR(11) NULL,

    PRIMARY KEY (`CD_Ofertante`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Verba` (
    `CD_Verba` INTEGER NOT NULL AUTO_INCREMENT,
    `CD_Ofertante` INTEGER NOT NULL,
    `DT_Verba` DATE NULL,
    `VL_Verba` DECIMAL(10, 2) NOT NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TB_Verba_CD_Ofertante_idx`(`CD_Ofertante`),
    PRIMARY KEY (`CD_Verba`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Pre_Curso` (
    `CD_Curso` INTEGER NOT NULL AUTO_INCREMENT,
    `CD_Ofertante` INTEGER NOT NULL,
    `CD_Verba` INTEGER NOT NULL,
    `VL_Curso_Alocado` DECIMAL(10, 2) NOT NULL,
    `Status` ENUM('EM_ANDAMENTO', 'ENCERRADO') NOT NULL DEFAULT 'EM_ANDAMENTO',
    `Respostas` JSON NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Criado_Por` VARCHAR(11) NOT NULL,
    `Data_Encerramento` DATETIME(3) NULL,

    INDEX `TB_Pre_Curso_CD_Ofertante_idx`(`CD_Ofertante`),
    INDEX `TB_Pre_Curso_CD_Verba_idx`(`CD_Verba`),
    PRIMARY KEY (`CD_Curso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Pos_Curso` (
    `CD_Curso` INTEGER NOT NULL,
    `Status` ENUM('EM_ANDAMENTO', 'ENCERRADO') NOT NULL DEFAULT 'EM_ANDAMENTO',
    `Respostas` JSON NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Criado_Por` VARCHAR(11) NOT NULL,
    `Data_Ultima_Atualizacao` DATETIME(3) NOT NULL,
    `Data_Encerramento` DATETIME(3) NULL,

    PRIMARY KEY (`CD_Curso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TB_Avaliacao_Aluno` (
    `CPF` VARCHAR(11) NOT NULL,
    `CD_Curso` INTEGER NOT NULL,
    `Status` ENUM('EM_ANDAMENTO', 'ENCERRADO') NOT NULL DEFAULT 'EM_ANDAMENTO',
    `Parte1_Completa` BOOLEAN NOT NULL DEFAULT false,
    `Respostas` JSON NULL,
    `Data_Criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `Data_Encerramento` DATETIME(3) NULL,

    INDEX `TB_Avaliacao_Aluno_CD_Curso_idx`(`CD_Curso`),
    PRIMARY KEY (`CPF`, `CD_Curso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TB_Usuario` ADD CONSTRAINT `TB_Usuario_CD_Ofertante_fkey` FOREIGN KEY (`CD_Ofertante`) REFERENCES `TB_Ofertante`(`CD_Ofertante`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Usuario` ADD CONSTRAINT `TB_Usuario_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`CPF_Usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Sessao` ADD CONSTRAINT `TB_Sessao_CPF_Usuario_fkey` FOREIGN KEY (`CPF_Usuario`) REFERENCES `TB_Usuario`(`CPF_Usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Verba` ADD CONSTRAINT `TB_Verba_CD_Ofertante_fkey` FOREIGN KEY (`CD_Ofertante`) REFERENCES `TB_Ofertante`(`CD_Ofertante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Pre_Curso` ADD CONSTRAINT `TB_Pre_Curso_CD_Verba_fkey` FOREIGN KEY (`CD_Verba`) REFERENCES `TB_Verba`(`CD_Verba`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Pre_Curso` ADD CONSTRAINT `TB_Pre_Curso_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`CPF_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Pos_Curso` ADD CONSTRAINT `TB_Pos_Curso_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Pre_Curso`(`CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Pos_Curso` ADD CONSTRAINT `TB_Pos_Curso_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`CPF_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Avaliacao_Aluno` ADD CONSTRAINT `TB_Avaliacao_Aluno_CPF_fkey` FOREIGN KEY (`CPF`) REFERENCES `TB_Usuario`(`CPF_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TB_Avaliacao_Aluno` ADD CONSTRAINT `TB_Avaliacao_Aluno_CD_Curso_fkey` FOREIGN KEY (`CD_Curso`) REFERENCES `TB_Pre_Curso`(`CD_Curso`) ON DELETE RESTRICT ON UPDATE CASCADE;
