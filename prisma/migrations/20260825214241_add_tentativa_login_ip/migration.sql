-- CreateTable
CREATE TABLE `TB_Tentativa_Login_Ip` (
    `IP` VARCHAR(45) NOT NULL,
    `Tentativas` INTEGER NOT NULL DEFAULT 0,
    `Bloqueado_Ate` DATETIME(3) NULL,
    `Atualizado_Em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`IP`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
