-- Oportunidades de Trabalho, Efetivação e Renda (P30-P34) voltam ao
-- formulário do aluno (AD-055).
--
-- As seis colunas entram vazias, depois de P29f e antes de P35. Nenhuma
-- avaliação tem resposta para elas: as de antes foram apagadas na migration
-- 20261020120000_alteracoes_mtur_1. As perguntas são da Parte 2 e só são
-- cobradas no encerramento, então nenhuma outra coluna muda (OPT-13).
ALTER TABLE `TB_Avaliacao_Aluno`
    ADD COLUMN `P30` CHAR(1) NULL AFTER `P29f`,
    ADD COLUMN `P30Qual` TEXT NULL AFTER `P30`,
    ADD COLUMN `P31` CHAR(1) NULL AFTER `P30Qual`,
    ADD COLUMN `P32` CHAR(1) NULL AFTER `P31`,
    ADD COLUMN `P33` CHAR(1) NULL AFTER `P32`,
    ADD COLUMN `P34` CHAR(1) NULL AFTER `P33`;
