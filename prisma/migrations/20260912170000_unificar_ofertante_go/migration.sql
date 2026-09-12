-- Unificação Ofertante/GO (AD-043): o Gestor Ofertante passa a SER o
-- Ofertante, identificado por CNPJ (14 dígitos) em vez de CPF. `TB_Ofertante`
-- deixa de existir como entidade separada.
--
-- SALVAGUARDA DE PRODUÇÃO (Decisão C, design.md secão 2): esta migration
-- reseta os dados de demonstração em vez de transformar CPF em CNPJ (um CNPJ
-- não é derivável de um CPF existente). Investigação direta ao banco antes de
-- escrever esta migration confirmou zero produção: 1 Ofertante, 1 GO, 1 VO,
-- 1 Verba, 1 PreCurso, 2 Avaliações, todos com sufixo "(demo)" produzidos por
-- `scripts/dev-seed-demo.ts`. SE ESTE PROJETO ALGUM DIA TIVER OFERTANTE/GO
-- REAIS ANTES DE RODAR ESTA MIGRATION: rode `SELECT COUNT(*) FROM
-- TB_Ofertante` antes - se > 0 fora de um ambiente de dev/teste, PARE e
-- obtenha os CNPJs reais do cliente antes de continuar.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Apaga a cadeia de dados de demonstração ligada ao único Ofertante hoje
--    existente (autorizado pelo usuário, Decisão C) - estas tabelas só
--    contêm dado de demo hoje (confirmado na investigação acima).
DELETE FROM `TB_Resposta_Avaliacao`;
DELETE FROM `TB_Avaliacao_Aluno`;
DELETE FROM `TB_Resposta_Pos_Curso`;
DELETE FROM `TB_Pos_Curso`;
DELETE FROM `TB_Resposta_Pre_Curso`;
DELETE FROM `TB_Pre_Curso`;
DELETE FROM `TB_Verba`;
DELETE FROM `TB_Usuario` WHERE `TP_Usuario` IN ('GO', 'VO');
DELETE FROM `TB_Ofertante`;

-- 2. Remove as FKs que apontam para `TB_Ofertante` ou para colunas cujo tipo
--    vai mudar, antes de alterar essas colunas.
ALTER TABLE `TB_Usuario` DROP FOREIGN KEY `TB_Usuario_CD_Ofertante_fkey`;
ALTER TABLE `TB_Usuario` DROP FOREIGN KEY `TB_Usuario_Criado_Por_fkey`;
ALTER TABLE `TB_Verba` DROP FOREIGN KEY `TB_Verba_CD_Ofertante_fkey`;
ALTER TABLE `TB_Sessao` DROP FOREIGN KEY `TB_Sessao_CPF_Usuario_fkey`;
ALTER TABLE `TB_Resposta_Avaliacao` DROP FOREIGN KEY `TB_Resposta_Avaliacao_CPF_CD_Curso_fkey`;
ALTER TABLE `TB_Avaliacao_Aluno` DROP FOREIGN KEY `TB_Avaliacao_Aluno_CPF_fkey`;
ALTER TABLE `TB_Dado_Pessoal_Aluno` DROP FOREIGN KEY `TB_Dado_Pessoal_Aluno_CPF_fkey`;
ALTER TABLE `TB_Pos_Curso` DROP FOREIGN KEY `TB_Pos_Curso_Criado_Por_fkey`;
ALTER TABLE `TB_Pre_Curso` DROP FOREIGN KEY `TB_Pre_Curso_Criado_Por_fkey`;

-- 3. `Usuario.cpf` -> `Usuario.documento` (UGO-07): renomeia e amplia a PK
--    para VARCHAR(14). Dados existentes (AM/GT/VT/AL) continuam CPF de 11
--    dígitos - cabem sem truncamento, nenhum dado perdido aqui.
ALTER TABLE `TB_Usuario` CHANGE COLUMN `CPF_Usuario` `Documento_Usuario` VARCHAR(14) NOT NULL;

-- 4. Dados organizacionais inline (Decisão B1) - fusão do antigo
--    `model Ofertante` no próprio GO. Nulos, só preenchidos para tipo=GO.
ALTER TABLE `TB_Usuario` ADD COLUMN `Resp_Organizacao` VARCHAR(255) NULL;
ALTER TABLE `TB_Usuario` ADD COLUMN `Tel_Organizacao` VARCHAR(50) NULL;
ALTER TABLE `TB_Usuario` ADD COLUMN `UF_Organizacao` VARCHAR(2) NULL;
ALTER TABLE `TB_Usuario` ADD COLUMN `Municipio_Organizacao` VARCHAR(255) NULL;

-- 5. `CD_Ofertante`: Int -> String(14) - passa a guardar o CNPJ do GO em vez
--    de um código substituto de Ofertante. Todo GO/VO de demo já foi
--    removido no passo 1, então toda linha remanescente tem CD_Ofertante
--    NULL (nenhuma conversão de valor Int->String é necessária).
ALTER TABLE `TB_Usuario` MODIFY COLUMN `CD_Ofertante` VARCHAR(14) NULL;

-- 6. Larguras que acompanham `Usuario.documento` - nomes de campo mantidos
--    (AD-043): estas colunas nunca deixam de guardar um CPF de 11 dígitos na
--    prática (Aluno, ou referência a AM/GT/VT), só a largura da coluna que
--    referenciam muda.
ALTER TABLE `TB_Usuario` MODIFY COLUMN `Criado_Por` VARCHAR(14) NULL;
ALTER TABLE `TB_Sessao` MODIFY COLUMN `CPF_Usuario` VARCHAR(14) NOT NULL;
ALTER TABLE `TB_Avaliacao_Aluno` MODIFY COLUMN `CPF` VARCHAR(14) NOT NULL;
ALTER TABLE `TB_Resposta_Avaliacao` MODIFY COLUMN `CPF` VARCHAR(14) NOT NULL;
ALTER TABLE `TB_Dado_Pessoal_Aluno` MODIFY COLUMN `CPF` VARCHAR(14) NOT NULL;
ALTER TABLE `TB_Pre_Curso` MODIFY COLUMN `Criado_Por` VARCHAR(14) NOT NULL;
ALTER TABLE `TB_Pos_Curso` MODIFY COLUMN `Criado_Por` VARCHAR(14) NOT NULL;

-- 7. `Verba.cdOfertante`/`PreCurso.cdOfertante`: Int -> String(14), passam a
--    apontar para `Usuario.documento` de um GO em vez de `TB_Ofertante`.
--    Ambas as tabelas já foram esvaziadas de linhas de demo no passo 1.
ALTER TABLE `TB_Verba` MODIFY COLUMN `CD_Ofertante` VARCHAR(14) NOT NULL;
ALTER TABLE `TB_Pre_Curso` MODIFY COLUMN `CD_Ofertante` VARCHAR(14) NOT NULL;

-- 8. `model Ofertante` removido (AD-043) - Ofertante deixa de ser entidade
--    separada, o GO passa a ser o próprio Ofertante.
DROP TABLE `TB_Ofertante`;

-- 9. Recria as FKs apontando para as colunas/tabela novas. Mesma convenção
--    ON DELETE/ON UPDATE que cada relação já usava antes desta migration.
ALTER TABLE `TB_Usuario` ADD CONSTRAINT `TB_Usuario_CD_Ofertante_fkey` FOREIGN KEY (`CD_Ofertante`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TB_Usuario` ADD CONSTRAINT `TB_Usuario_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `TB_Sessao` ADD CONSTRAINT `TB_Sessao_CPF_Usuario_fkey` FOREIGN KEY (`CPF_Usuario`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TB_Avaliacao_Aluno` ADD CONSTRAINT `TB_Avaliacao_Aluno_CPF_fkey` FOREIGN KEY (`CPF`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TB_Resposta_Avaliacao` ADD CONSTRAINT `TB_Resposta_Avaliacao_CPF_CD_Curso_fkey` FOREIGN KEY (`CPF`, `CD_Curso`) REFERENCES `TB_Avaliacao_Aluno`(`CPF`, `CD_Curso`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TB_Dado_Pessoal_Aluno` ADD CONSTRAINT `TB_Dado_Pessoal_Aluno_CPF_fkey` FOREIGN KEY (`CPF`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `TB_Pos_Curso` ADD CONSTRAINT `TB_Pos_Curso_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TB_Pre_Curso` ADD CONSTRAINT `TB_Pre_Curso_Criado_Por_fkey` FOREIGN KEY (`Criado_Por`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TB_Verba` ADD CONSTRAINT `TB_Verba_CD_Ofertante_fkey` FOREIGN KEY (`CD_Ofertante`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TB_Pre_Curso` ADD CONSTRAINT `TB_Pre_Curso_CD_Ofertante_fkey` FOREIGN KEY (`CD_Ofertante`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
