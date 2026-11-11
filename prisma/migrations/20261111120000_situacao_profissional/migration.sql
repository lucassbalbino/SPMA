-- Situação Profissional (P10-P13) volta ao formulário do aluno (AD-053).
--
-- 1. As quatro colunas entram vazias, antes de P14. Nenhuma avaliação tem
-- resposta para elas: as de antes foram apagadas na migration
-- 20261020120000_alteracoes_mtur_1.
ALTER TABLE `TB_Avaliacao_Aluno`
    ADD COLUMN `P10` CHAR(1) NULL AFTER `Data_Encerramento`,
    ADD COLUMN `P11` CHAR(1) NULL AFTER `P10`,
    ADD COLUMN `P12` CHAR(1) NULL AFTER `P11`,
    ADD COLUMN `P13` CHAR(1) NULL AFTER `P12`;

-- 2. P10, P11 e P13 passam a ser exigidas na Parte 1. Toda avaliação em
-- andamento fica com a Parte 1 incompleta até o aluno respondê-las (SPR-14).
-- A aplicação só recalcula `Parte1_Completa` na próxima gravação. Sem este
-- UPDATE, a tela mostraria a Parte 2 liberada sem a Parte 1 estar completa.
-- As respostas já gravadas ficam como estão. Avaliações encerradas não mudam
-- (SPR-15).
UPDATE `TB_Avaliacao_Aluno`
SET `Parte1_Completa` = false
WHERE `Status` = 'EM_ANDAMENTO';
