-- Identificação da verba (IDV-10, IDV-14).
--
-- A coluna nasce com default vazio só para o ALTER passar com linhas
-- existentes. O UPDATE dá a cada verba o rótulo que o seletor de curso já
-- mostrava ("Verba #12"), e o default sai no fim: daqui em diante a
-- identificação vem sempre da API. `CD_Verba` não muda, então os cursos
-- seguem ligados à mesma verba.
ALTER TABLE `TB_Verba` ADD COLUMN `DS_Verba` VARCHAR(60) NOT NULL DEFAULT '';

UPDATE `TB_Verba` SET `DS_Verba` = CONCAT('Verba #', `CD_Verba`) WHERE `DS_Verba` = '';

ALTER TABLE `TB_Verba` ALTER COLUMN `DS_Verba` DROP DEFAULT;
