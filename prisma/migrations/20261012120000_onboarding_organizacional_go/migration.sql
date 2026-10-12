-- Gate de dados organizacionais do GO (OGO-14, OGO-16, AD-044).
--
-- O GO passa a declarar os 6 dados organizacionais no 1º acesso, e a
-- completude deixa de ser deduzida de `Nome`/`UF` não-nulos. O default
-- `false` é o requisito inteiro desta migration: todo GO que já existe cai
-- no formulário no próximo acesso, mesmo com nome e UF preenchidos. Nenhum
-- dado organizacional é apagado; o envio do formulário sobrescreve.
ALTER TABLE `TB_Usuario` ADD COLUMN `Dados_Organizacionais_Completos` BOOLEAN NOT NULL DEFAULT false;
