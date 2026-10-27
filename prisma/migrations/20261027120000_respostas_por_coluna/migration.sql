-- Respostas por coluna (AD-051, feature respostas-por-coluna).
--
-- Cada pergunta dos questionários passa a ser uma coluna P* da tabela do
-- próprio formulário, para o Power BI filtrar e cruzar por pergunta. Rescinde
-- o formato por linhas (Chave, Ordem, Valor) da AD-041.
--
-- Ordem dos passos, que é o que torna a migração segura:
--   1. expand: colunas novas nos três formulários e tabela nova de dados pessoais
--   2. backfill: o texto da opção vira a letra, a múltipla vira 1/0 por opção
--   3. conferência: um CHECK por formulário compara o que existia com o que foi
--      gravado. Se divergir, o INSERT falha com o nome do formulário
--      (respostas_<formulario>_divergentes) e nenhuma tabela antiga foi tocada
--   4. contract: só então as tabelas antigas saem
--
-- Até o passo 3 tudo só acrescenta. Se a migração abortar ali, as tabelas
-- antigas seguem intactas e a versão anterior do app continua funcionando.
-- A reversão está em docs/DEPLOY_PRODUCAO.md.
--
-- Chaves que já saíram dos questionários (órfãs) não têm coluna e são
-- descartadas: ficam fora da contagem esperada e só existem no backup.
--
-- O texto é comparado com COLLATE utf8mb4_bin: a opção precisa bater byte a
-- byte, como no Zod. Um texto que não bate vira NULL e é pego na conferência.

-- 1. Expand

ALTER TABLE `TB_Avaliacao_Aluno` ADD COLUMN `P14` CHAR(1) NULL,
    ADD COLUMN `P15` CHAR(1) NULL,
    ADD COLUMN `P16` CHAR(1) NULL,
    ADD COLUMN `P17a` BOOLEAN NULL,
    ADD COLUMN `P17b` BOOLEAN NULL,
    ADD COLUMN `P17c` BOOLEAN NULL,
    ADD COLUMN `P17d` BOOLEAN NULL,
    ADD COLUMN `P17e` BOOLEAN NULL,
    ADD COLUMN `P17f` BOOLEAN NULL,
    ADD COLUMN `P18` CHAR(1) NULL,
    ADD COLUMN `P19` CHAR(1) NULL,
    ADD COLUMN `P20` CHAR(1) NULL,
    ADD COLUMN `P21` CHAR(1) NULL,
    ADD COLUMN `P22` CHAR(1) NULL,
    ADD COLUMN `P22.1a` BOOLEAN NULL,
    ADD COLUMN `P22.1b` BOOLEAN NULL,
    ADD COLUMN `P22.1c` BOOLEAN NULL,
    ADD COLUMN `P22.1d` BOOLEAN NULL,
    ADD COLUMN `P22.1e` BOOLEAN NULL,
    ADD COLUMN `P22.1f` BOOLEAN NULL,
    ADD COLUMN `P22.1g` BOOLEAN NULL,
    ADD COLUMN `P22.1h` BOOLEAN NULL,
    ADD COLUMN `P22.1i` BOOLEAN NULL,
    ADD COLUMN `P22.1j` BOOLEAN NULL,
    ADD COLUMN `P23` CHAR(1) NULL,
    ADD COLUMN `P24.1` TINYINT NULL,
    ADD COLUMN `P24.2` TINYINT NULL,
    ADD COLUMN `P24.3` TINYINT NULL,
    ADD COLUMN `P24.4` TINYINT NULL,
    ADD COLUMN `P24.5` TINYINT NULL,
    ADD COLUMN `P24.6` TINYINT NULL,
    ADD COLUMN `P24.7` TINYINT NULL,
    ADD COLUMN `P24.8` TINYINT NULL,
    ADD COLUMN `P25` CHAR(1) NULL,
    ADD COLUMN `P26` CHAR(1) NULL,
    ADD COLUMN `P27` CHAR(1) NULL,
    ADD COLUMN `P29a` BOOLEAN NULL,
    ADD COLUMN `P29b` BOOLEAN NULL,
    ADD COLUMN `P29c` BOOLEAN NULL,
    ADD COLUMN `P29d` BOOLEAN NULL,
    ADD COLUMN `P29e` BOOLEAN NULL,
    ADD COLUMN `P29f` BOOLEAN NULL,
    ADD COLUMN `P35` TINYINT NULL,
    ADD COLUMN `P36` TEXT NULL,
    ADD COLUMN `P37` CHAR(1) NULL,
    ADD COLUMN `P38` TEXT NULL;

ALTER TABLE `TB_Pos_Curso` ADD COLUMN `P1` CHAR(1) NULL,
    ADD COLUMN `P10` TEXT NULL,
    ADD COLUMN `P11` CHAR(1) NULL,
    ADD COLUMN `P12` TEXT NULL,
    ADD COLUMN `P13` INTEGER NULL,
    ADD COLUMN `P14` INTEGER NULL,
    ADD COLUMN `P15` INTEGER NULL,
    ADD COLUMN `P16a` BOOLEAN NULL,
    ADD COLUMN `P16b` BOOLEAN NULL,
    ADD COLUMN `P16c` BOOLEAN NULL,
    ADD COLUMN `P16d` BOOLEAN NULL,
    ADD COLUMN `P16e` BOOLEAN NULL,
    ADD COLUMN `P16f` BOOLEAN NULL,
    ADD COLUMN `P16g` BOOLEAN NULL,
    ADD COLUMN `P16h` BOOLEAN NULL,
    ADD COLUMN `P16i` BOOLEAN NULL,
    ADD COLUMN `P16j` BOOLEAN NULL,
    ADD COLUMN `P17` CHAR(1) NULL,
    ADD COLUMN `P18` CHAR(1) NULL,
    ADD COLUMN `P19` DECIMAL(12, 2) NULL,
    ADD COLUMN `P2` CHAR(1) NULL,
    ADD COLUMN `P20` DECIMAL(12, 2) NULL,
    ADD COLUMN `P21` DECIMAL(12, 2) NULL,
    ADD COLUMN `P22` DECIMAL(12, 2) NULL,
    ADD COLUMN `P23` DECIMAL(12, 2) NULL,
    ADD COLUMN `P24` CHAR(1) NULL,
    ADD COLUMN `P25` CHAR(1) NULL,
    ADD COLUMN `P26a` BOOLEAN NULL,
    ADD COLUMN `P26b` BOOLEAN NULL,
    ADD COLUMN `P26c` BOOLEAN NULL,
    ADD COLUMN `P26d` BOOLEAN NULL,
    ADD COLUMN `P26e` BOOLEAN NULL,
    ADD COLUMN `P26f` BOOLEAN NULL,
    ADD COLUMN `P3` CHAR(1) NULL,
    ADD COLUMN `P4` CHAR(1) NULL,
    ADD COLUMN `P5` CHAR(1) NULL,
    ADD COLUMN `P6a` BOOLEAN NULL,
    ADD COLUMN `P6b` BOOLEAN NULL,
    ADD COLUMN `P6c` BOOLEAN NULL,
    ADD COLUMN `P6d` BOOLEAN NULL,
    ADD COLUMN `P6e` BOOLEAN NULL,
    ADD COLUMN `P6f` BOOLEAN NULL,
    ADD COLUMN `P7` DATE NULL,
    ADD COLUMN `P8` DATE NULL,
    ADD COLUMN `P9` INTEGER NULL;

ALTER TABLE `TB_Pre_Curso` ADD COLUMN `P1` CHAR(2) NULL,
    ADD COLUMN `P10Qual` TEXT NULL,
    ADD COLUMN `P10a` BOOLEAN NULL,
    ADD COLUMN `P10b` BOOLEAN NULL,
    ADD COLUMN `P10c` BOOLEAN NULL,
    ADD COLUMN `P10d` BOOLEAN NULL,
    ADD COLUMN `P10e` BOOLEAN NULL,
    ADD COLUMN `P10f` BOOLEAN NULL,
    ADD COLUMN `P10g` BOOLEAN NULL,
    ADD COLUMN `P10h` BOOLEAN NULL,
    ADD COLUMN `P10i` BOOLEAN NULL,
    ADD COLUMN `P10j` BOOLEAN NULL,
    ADD COLUMN `P10k` BOOLEAN NULL,
    ADD COLUMN `P10l` BOOLEAN NULL,
    ADD COLUMN `P11` CHAR(1) NULL,
    ADD COLUMN `P12` CHAR(1) NULL,
    ADD COLUMN `P13` DATE NULL,
    ADD COLUMN `P14` DATE NULL,
    ADD COLUMN `P15` INTEGER NULL,
    ADD COLUMN `P16` INTEGER NULL,
    ADD COLUMN `P17a` INTEGER NULL,
    ADD COLUMN `P17b` DATE NULL,
    ADD COLUMN `P17c` DATE NULL,
    ADD COLUMN `P17d` INTEGER NULL,
    ADD COLUMN `P18` DECIMAL(5, 2) NULL,
    ADD COLUMN `P19` TEXT NULL,
    ADD COLUMN `P2` TEXT NULL,
    ADD COLUMN `P20a` BOOLEAN NULL,
    ADD COLUMN `P20b` BOOLEAN NULL,
    ADD COLUMN `P20c` BOOLEAN NULL,
    ADD COLUMN `P20d` BOOLEAN NULL,
    ADD COLUMN `P20e` BOOLEAN NULL,
    ADD COLUMN `P20f` BOOLEAN NULL,
    ADD COLUMN `P20g` BOOLEAN NULL,
    ADD COLUMN `P20h` BOOLEAN NULL,
    ADD COLUMN `P20i` BOOLEAN NULL,
    ADD COLUMN `P20j` BOOLEAN NULL,
    ADD COLUMN `P20k` BOOLEAN NULL,
    ADD COLUMN `P21` CHAR(1) NULL,
    ADD COLUMN `P21.1` TEXT NULL,
    ADD COLUMN `P22a` BOOLEAN NULL,
    ADD COLUMN `P22b` BOOLEAN NULL,
    ADD COLUMN `P22c` BOOLEAN NULL,
    ADD COLUMN `P22d` BOOLEAN NULL,
    ADD COLUMN `P22e` BOOLEAN NULL,
    ADD COLUMN `P22f` BOOLEAN NULL,
    ADD COLUMN `P22g` BOOLEAN NULL,
    ADD COLUMN `P22h` BOOLEAN NULL,
    ADD COLUMN `P23.1` TINYINT NULL,
    ADD COLUMN `P23.2` TINYINT NULL,
    ADD COLUMN `P23.3` TINYINT NULL,
    ADD COLUMN `P23.4` TINYINT NULL,
    ADD COLUMN `P23.5` TINYINT NULL,
    ADD COLUMN `P23.6` TINYINT NULL,
    ADD COLUMN `P23.7` TINYINT NULL,
    ADD COLUMN `P23.8` TINYINT NULL,
    ADD COLUMN `P23.9` TINYINT NULL,
    ADD COLUMN `P24.1` TINYINT NULL,
    ADD COLUMN `P24.2` TINYINT NULL,
    ADD COLUMN `P24.3` TINYINT NULL,
    ADD COLUMN `P24.4` TINYINT NULL,
    ADD COLUMN `P24.5` TINYINT NULL,
    ADD COLUMN `P24.6` TINYINT NULL,
    ADD COLUMN `P24.7` TINYINT NULL,
    ADD COLUMN `P24.8` TINYINT NULL,
    ADD COLUMN `P25` CHAR(1) NULL,
    ADD COLUMN `P25.1` CHAR(1) NULL,
    ADD COLUMN `P25.2` CHAR(1) NULL,
    ADD COLUMN `P25.3` CHAR(1) NULL,
    ADD COLUMN `P26a` BOOLEAN NULL,
    ADD COLUMN `P26b` BOOLEAN NULL,
    ADD COLUMN `P26c` BOOLEAN NULL,
    ADD COLUMN `P26d` BOOLEAN NULL,
    ADD COLUMN `P26e` BOOLEAN NULL,
    ADD COLUMN `P26f` BOOLEAN NULL,
    ADD COLUMN `P26g` BOOLEAN NULL,
    ADD COLUMN `P26h` BOOLEAN NULL,
    ADD COLUMN `P27` CHAR(1) NULL,
    ADD COLUMN `P27Qual` TEXT NULL,
    ADD COLUMN `P28` CHAR(1) NULL,
    ADD COLUMN `P29` CHAR(1) NULL,
    ADD COLUMN `P3` TEXT NULL,
    ADD COLUMN `P30Qual` TEXT NULL,
    ADD COLUMN `P30a` BOOLEAN NULL,
    ADD COLUMN `P30b` BOOLEAN NULL,
    ADD COLUMN `P30c` BOOLEAN NULL,
    ADD COLUMN `P30d` BOOLEAN NULL,
    ADD COLUMN `P30e` BOOLEAN NULL,
    ADD COLUMN `P30f` BOOLEAN NULL,
    ADD COLUMN `P30g` BOOLEAN NULL,
    ADD COLUMN `P30h` BOOLEAN NULL,
    ADD COLUMN `P30i` BOOLEAN NULL,
    ADD COLUMN `P31a` BOOLEAN NULL,
    ADD COLUMN `P31b` BOOLEAN NULL,
    ADD COLUMN `P31c` BOOLEAN NULL,
    ADD COLUMN `P31d` BOOLEAN NULL,
    ADD COLUMN `P31e` BOOLEAN NULL,
    ADD COLUMN `P31f` BOOLEAN NULL,
    ADD COLUMN `P31g` BOOLEAN NULL,
    ADD COLUMN `P31h` BOOLEAN NULL,
    ADD COLUMN `P32Qual` TEXT NULL,
    ADD COLUMN `P32a` BOOLEAN NULL,
    ADD COLUMN `P32b` BOOLEAN NULL,
    ADD COLUMN `P32c` BOOLEAN NULL,
    ADD COLUMN `P32d` BOOLEAN NULL,
    ADD COLUMN `P32e` BOOLEAN NULL,
    ADD COLUMN `P32f` BOOLEAN NULL,
    ADD COLUMN `P32g` BOOLEAN NULL,
    ADD COLUMN `P32h` BOOLEAN NULL,
    ADD COLUMN `P32i` BOOLEAN NULL,
    ADD COLUMN `P32j` BOOLEAN NULL,
    ADD COLUMN `P4` TEXT NULL,
    ADD COLUMN `P5` TEXT NULL,
    ADD COLUMN `P6` TEXT NULL,
    ADD COLUMN `P7a` TEXT NULL,
    ADD COLUMN `P7b` TEXT NULL,
    ADD COLUMN `P7c` CHAR(2) NULL,
    ADD COLUMN `P7d` CHAR(1) NULL,
    ADD COLUMN `P7e` TEXT NULL,
    ADD COLUMN `P8` TEXT NULL,
    ADD COLUMN `P9` CHAR(1) NULL,
    ADD COLUMN `P9Qual` TEXT NULL;

CREATE TABLE `TB_Dado_Pessoal_Aluno_Novo` (
    `CPF` VARCHAR(14) NOT NULL,
    `P3` CHAR(2) NULL,
    `P4` TEXT NULL,
    `P5` CHAR(1) NULL,
    `P6` CHAR(1) NULL,
    `P7` CHAR(1) NULL,
    `P8` CHAR(1) NULL,
    `P9` CHAR(1) NULL,

    PRIMARY KEY (`CPF`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Backfill

UPDATE `TB_Pre_Curso` t
JOIN (
  SELECT
    `CD_Curso`,
    MAX(CASE WHEN `Chave` = 'identifUf' THEN `Valor` END) AS `P1`,
    MAX(CASE WHEN `Chave` = 'identifMunicipio' THEN `Valor` END) AS `P2`,
    MAX(CASE WHEN `Chave` = 'identifEntidadeResponsavel' THEN `Valor` END) AS `P3`,
    MAX(CASE WHEN `Chave` = 'identifCoordenador' THEN `Valor` END) AS `P4`,
    MAX(CASE WHEN `Chave` = 'identifEmail' THEN `Valor` END) AS `P5`,
    MAX(CASE WHEN `Chave` = 'identifTelefone' THEN `Valor` END) AS `P6`,
    MAX(CASE WHEN `Chave` = 'qualifEndereco' THEN `Valor` END) AS `P7a`,
    MAX(CASE WHEN `Chave` = 'qualifMunicipio' THEN `Valor` END) AS `P7b`,
    MAX(CASE WHEN `Chave` = 'qualifUf' THEN `Valor` END) AS `P7c`,
    MAX(CASE WHEN `Chave` = 'qualifOutrosMunicipios' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P7d`,
    MAX(CASE WHEN `Chave` = 'qualifOutrosMunicipiosQuais' THEN `Valor` END) AS `P7e`,
    MAX(CASE WHEN `Chave` = 'qualifNomeCurso' THEN `Valor` END) AS `P8`,
    MAX(CASE WHEN `Chave` = 'qualifVinculoPrograma' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P9`,
    MAX(CASE WHEN `Chave` = 'qualifVinculoProgramaQual' THEN `Valor` END) AS `P9Qual`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Hospedagem (recepcionista / camareiro(a) / copeiro(a))') END AS `P10a`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Agenciamento e Operação') END AS `P10b`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Serviços de Alimentação (bartender / auxiliar de cozinha)') END AS `P10c`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Transporte (Terrestre, Aquaviário ou Aéreo)') END AS `P10d`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Aluguel de Transportes') END AS `P10e`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Guiamento de Turismo / Condução de Turismo') END AS `P10f`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Ecoturismo / Turismo de Natureza') END AS `P10g`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Turismo de Base Comunitária') END AS `P10h`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Cultura e Lazer (produtor(a) / recreacionista / artesã(o))') END AS `P10i`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Eventos (cerimonialista / organizador(a) de eventos)') END AS `P10j`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Idiomas') END AS `P10k`,
    CASE WHEN SUM(`Chave` = 'qualifCaracteristicas') > 0 THEN MAX(`Chave` = 'qualifCaracteristicas' AND `Valor` COLLATE utf8mb4_bin = 'Outro') END AS `P10l`,
    MAX(CASE WHEN `Chave` = 'qualifCaracteristicasOutra' THEN `Valor` END) AS `P10Qual`,
    MAX(CASE WHEN `Chave` = 'qualifModalidade' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Presencial' THEN 'a' WHEN 'À distância (online)' THEN 'b' WHEN 'Híbrido (parte presencial parte à distância)' THEN 'c' END END) AS `P11`,
    MAX(CASE WHEN `Chave` = 'qualifRegiao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Zona Urbana' THEN 'a' WHEN 'Zona Periurbana' THEN 'b' WHEN 'Zona Rural' THEN 'c' WHEN 'Zona Natural' THEN 'd' END END) AS `P12`,
    MAX(CASE WHEN `Chave` = 'planejDataInicioPrevista' THEN CAST(`Valor` AS DATE) END) AS `P13`,
    MAX(CASE WHEN `Chave` = 'planejDataTerminoPrevista' THEN CAST(`Valor` AS DATE) END) AS `P14`,
    MAX(CASE WHEN `Chave` = 'planejCargaHoraria' THEN CAST(`Valor` AS SIGNED) END) AS `P15`,
    MAX(CASE WHEN `Chave` = 'planejNumTurmas' THEN CAST(`Valor` AS SIGNED) END) AS `P16`,
    MAX(CASE WHEN `Chave` = 'planejNumAlunosPrevistos' THEN CAST(`Valor` AS SIGNED) END) AS `P17a`,
    MAX(CASE WHEN `Chave` = 'planejDataInicioInscricao' THEN CAST(`Valor` AS DATE) END) AS `P17b`,
    MAX(CASE WHEN `Chave` = 'planejDataTerminoInscricao' THEN CAST(`Valor` AS DATE) END) AS `P17c`,
    MAX(CASE WHEN `Chave` = 'planejNumVagas' THEN CAST(`Valor` AS SIGNED) END) AS `P17d`,
    MAX(CASE WHEN `Chave` = 'planejTaxaEvasaoEsperada' THEN CAST(`Valor` AS DECIMAL(5, 2)) END) AS `P18`,
    MAX(CASE WHEN `Chave` = 'planejObjetivo' THEN `Valor` END) AS `P19`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Jovens') END AS `P20a`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Mulheres') END AS `P20b`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Idosos') END AS `P20c`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Pessoas com Deficiência (PCDs)') END AS `P20d`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Representantes de Comunidades Originárias (quilombolas, indígenas, outras)') END AS `P20e`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Representantes da Comunidade LGBTQIA+') END AS `P20f`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Desempregados') END AS `P20g`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Trabalhadores(as) do Turismo') END AS `P20h`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Empreendedores Locais') END AS `P20i`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Comunidade Turística (gestores públicos, setor empresarial e sociedade civil)') END AS `P20j`,
    CASE WHEN SUM(`Chave` = 'publicoPerfil') > 0 THEN MAX(`Chave` = 'publicoPerfil' AND `Valor` COLLATE utf8mb4_bin = 'Outro') END AS `P20k`,
    MAX(CASE WHEN `Chave` = 'publicoInstituicaoExecutora' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Atores da Rede de Base Territorial' THEN 'a' WHEN 'Própria Entidade' THEN 'b' WHEN 'Empresa contratada' THEN 'c' WHEN 'Parceria entre Entidade Responsável e Entidade Executora' THEN 'd' END END) AS `P21`,
    MAX(CASE WHEN `Chave` = 'publicoInstituicaoExecutoraNome' THEN `Valor` END) AS `P21.1`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Setor Produtivo (Empresários do Turismo): associação empresarial, sindicato patronal ou outros.') END AS `P22a`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Sociedade Civil Organizada: associações, sindicatos, colônias, cooperativas ou outros.') END AS `P22b`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Terceiro Setor: ONGs, OSCIPs, Convention & Visitors Bureau ou outros.') END AS `P22c`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'IES: Universidades, Faculdades, Institutos ou outros.') END AS `P22d`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Sistema de Ensino Médio: escolas públicas e privadas.') END AS `P22e`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Poder Público: Secretarias, Prefeitura ou outros.') END AS `P22f`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Instância de Governança: Conselhos, Fóruns, Diretorias ou outros.') END AS `P22g`,
    CASE WHEN SUM(`Chave` = 'diagnosticoConsultas') > 0 THEN MAX(`Chave` = 'diagnosticoConsultas' AND `Valor` COLLATE utf8mb4_bin = 'Não foram realizadas consultas individuais prévias e/ou reuniões com nenhum dos representantes dos grupos de atores locais.') END AS `P22h`,
    MAX(CASE WHEN `Chave` = 'infraBasicaBanheiros' THEN CAST(`Valor` AS SIGNED) END) AS `P23.1`,
    MAX(CASE WHEN `Chave` = 'infraBasicaBebedouros' THEN CAST(`Valor` AS SIGNED) END) AS `P23.2`,
    MAX(CASE WHEN `Chave` = 'infraBasicaEnergia' THEN CAST(`Valor` AS SIGNED) END) AS `P23.3`,
    MAX(CASE WHEN `Chave` = 'infraBasicaSalaAula' THEN CAST(`Valor` AS SIGNED) END) AS `P23.4`,
    MAX(CASE WHEN `Chave` = 'infraBasicaRecepcao' THEN CAST(`Valor` AS SIGNED) END) AS `P23.5`,
    MAX(CASE WHEN `Chave` = 'infraBasicaBiblioteca' THEN CAST(`Valor` AS SIGNED) END) AS `P23.6`,
    MAX(CASE WHEN `Chave` = 'infraBasicaMobiliario' THEN CAST(`Valor` AS SIGNED) END) AS `P23.7`,
    MAX(CASE WHEN `Chave` = 'infraBasicaAcessibilidade' THEN CAST(`Valor` AS SIGNED) END) AS `P23.8`,
    MAX(CASE WHEN `Chave` = 'infraBasicaLaboratorio' THEN CAST(`Valor` AS SIGNED) END) AS `P23.9`,
    MAX(CASE WHEN `Chave` = 'infraComplSalaProfessores' THEN CAST(`Valor` AS SIGNED) END) AS `P24.1`,
    MAX(CASE WHEN `Chave` = 'infraComplSalaGestores' THEN CAST(`Valor` AS SIGNED) END) AS `P24.2`,
    MAX(CASE WHEN `Chave` = 'infraComplSalaEstudo' THEN CAST(`Valor` AS SIGNED) END) AS `P24.3`,
    MAX(CASE WHEN `Chave` = 'infraComplCopa' THEN CAST(`Valor` AS SIGNED) END) AS `P24.4`,
    MAX(CASE WHEN `Chave` = 'infraComplLanchonete' THEN CAST(`Valor` AS SIGNED) END) AS `P24.5`,
    MAX(CASE WHEN `Chave` = 'infraComplAuditorio' THEN CAST(`Valor` AS SIGNED) END) AS `P24.6`,
    MAX(CASE WHEN `Chave` = 'infraComplAudiovisual' THEN CAST(`Valor` AS SIGNED) END) AS `P24.7`,
    MAX(CASE WHEN `Chave` = 'infraComplTecnologicos' THEN CAST(`Valor` AS SIGNED) END) AS `P24.8`,
    MAX(CASE WHEN `Chave` = 'infraEspecificaNecessidade' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim, alguns equipamentos específicos são necessários' THEN 'a' WHEN 'Não, apenas equipamentos básicos' THEN 'b' END END) AS `P25`,
    MAX(CASE WHEN `Chave` = 'infraEspecificaDisponibilidade' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Não há disponibilidade desses equipamentos' THEN 'a' WHEN 'Há disponibilidade, porém, não em sua totalidade' THEN 'b' WHEN 'Há disponibilidade de todos os equipamentos, porém, encontram-se em condições insatisfatórias' THEN 'c' WHEN 'Há disponibilidade de todos os equipamentos, em condições satisfatórias' THEN 'd' END END) AS `P25.1`,
    MAX(CASE WHEN `Chave` = 'infraEspecificaSuficiencia' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P25.2`,
    MAX(CASE WHEN `Chave` = 'infraEspecificaManutencao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P25.3`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Análise do Currículo (Vitae ou Lattes).') END AS `P26a`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Análise de experiência prévia no mercado.') END AS `P26b`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Análise dos documentos comprobatórios.') END AS `P26c`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Realização de prova de conhecimento específico.') END AS `P26d`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Realização de prova didática (aula ministrada).') END AS `P26e`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Realização de entrevista (presencial ou remota).') END AS `P26f`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Indicação de outros profissionais do setor.') END AS `P26g`,
    CASE WHEN SUM(`Chave` = 'docenteCriteriosSelecao') > 0 THEN MAX(`Chave` = 'docenteCriteriosSelecao' AND `Valor` COLLATE utf8mb4_bin = 'Não foi realizada a avaliação da trajetória profissional e do histórico de formação do(a) candidato(a).') END AS `P26h`,
    MAX(CASE WHEN `Chave` = 'docenteFormaContratacao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Edital Público.' THEN 'a' WHEN 'Indicação.' THEN 'b' WHEN 'Outro sistema seletivo' THEN 'c' END END) AS `P27`,
    MAX(CASE WHEN `Chave` = 'docenteFormaContratacaoOutra' THEN `Valor` END) AS `P27Qual`,
    MAX(CASE WHEN `Chave` = 'docenteNivelFormacao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Mestres de Ofícios.' THEN 'a' WHEN 'Graduação incompleta.' THEN 'b' WHEN 'Graduação completa.' THEN 'c' WHEN 'Pós-Graduação incompleta.' THEN 'd' WHEN 'Pós-Graduação completa.' THEN 'e' END END) AS `P28`,
    MAX(CASE WHEN `Chave` = 'docentePoliticasReparacao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P29`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Linguagem condizente com o público-alvo que se espera atingir.') END AS `P30a`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Clareza na exposição das informações sobre o Curso.') END AS `P30b`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Divulgação via redes sociais (Facebook, Instagram, X, LinkedIn).') END AS `P30c`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Divulgação via listas de e-mails.') END AS `P30d`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Divulgação via panfletos, folders e cartazes.') END AS `P30e`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Divulgação via chamadas no rádio e em programas de TV locais, jornais e revistas.') END AS `P30f`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Divulgação via carro de som.') END AS `P30g`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Não foram adotadas estratégias de divulgação do Curso.') END AS `P30h`,
    CASE WHEN SUM(`Chave` = 'divulgacaoEstrategias') > 0 THEN MAX(`Chave` = 'divulgacaoEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Divulgação via outros canais') END AS `P30i`,
    MAX(CASE WHEN `Chave` = 'divulgacaoEstrategiasOutra' THEN `Valor` END) AS `P30Qual`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Disponibilização de espaço físico para realização de aulas práticas e/ou vivência de campo.') END AS `P31a`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Disponibilização de profissionais para realização de palestras e relatos sobre o dia a dia na função que atua.') END AS `P31b`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Concessão ou empréstimo de materiais e/ou de equipamentos.') END AS `P31c`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Viabilização de oportunidades de primeiro emprego e de estágios para jovens, adultos e/ou idosos.') END AS `P31d`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Viabilização de meios de transporte.') END AS `P31e`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Viabilização de alimentos e insumos que ajudem a compor o lanche (coffee break) coletivo, no intervalo das aulas.') END AS `P31f`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Contribuição financeira, por meio de bolsas de estudo (auxílio ao aluno).') END AS `P31g`,
    CASE WHEN SUM(`Chave` = 'parceriasEstabelecidas') > 0 THEN MAX(`Chave` = 'parceriasEstabelecidas' AND `Valor` COLLATE utf8mb4_bin = 'Não foram estabelecidas parcerias para realização do Curso.') END AS `P31h`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Logísticas: deslocamento dos Docentes até os grupamentos comunitários de difícil acesso/zonas rurais.') END AS `P32a`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Logísticas: viabilização de meios de transportes seguros.') END AS `P32b`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Financeiras: auxílio financeiro para alimentação.') END AS `P32c`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Financeiras: auxílio financeiro para transporte público.') END AS `P32d`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Financeiras: auxílio financeiro para combustível.') END AS `P32e`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Financeiras: auxílio financeiro para creche.') END AS `P32f`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Políticas: articulação e alinhamento das propostas educacionais do Curso com políticas públicas (locais, distritais e/ou estaduais).') END AS `P32g`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estratégias Políticas: parcerias com os setores público e/ou privado, visando a disponibilização de meios de transporte, seguros e gratuitos.') END AS `P32h`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Outros') END AS `P32i`,
    CASE WHEN SUM(`Chave` = 'suporteEstrategias') > 0 THEN MAX(`Chave` = 'suporteEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Não foram adotadas estratégias logísticas, políticas ou financeiras de suporte ao aluno.') END AS `P32j`,
    MAX(CASE WHEN `Chave` = 'suporteEstrategiasOutra' THEN `Valor` END) AS `P32Qual`
  FROM `TB_Resposta_Pre_Curso`
  GROUP BY `CD_Curso`
) r ON r.`CD_Curso` = t.`CD_Curso`
SET
  t.`P1` = r.`P1`,
  t.`P2` = r.`P2`,
  t.`P3` = r.`P3`,
  t.`P4` = r.`P4`,
  t.`P5` = r.`P5`,
  t.`P6` = r.`P6`,
  t.`P7a` = r.`P7a`,
  t.`P7b` = r.`P7b`,
  t.`P7c` = r.`P7c`,
  t.`P7d` = r.`P7d`,
  t.`P7e` = r.`P7e`,
  t.`P8` = r.`P8`,
  t.`P9` = r.`P9`,
  t.`P9Qual` = r.`P9Qual`,
  t.`P10a` = r.`P10a`,
  t.`P10b` = r.`P10b`,
  t.`P10c` = r.`P10c`,
  t.`P10d` = r.`P10d`,
  t.`P10e` = r.`P10e`,
  t.`P10f` = r.`P10f`,
  t.`P10g` = r.`P10g`,
  t.`P10h` = r.`P10h`,
  t.`P10i` = r.`P10i`,
  t.`P10j` = r.`P10j`,
  t.`P10k` = r.`P10k`,
  t.`P10l` = r.`P10l`,
  t.`P10Qual` = r.`P10Qual`,
  t.`P11` = r.`P11`,
  t.`P12` = r.`P12`,
  t.`P13` = r.`P13`,
  t.`P14` = r.`P14`,
  t.`P15` = r.`P15`,
  t.`P16` = r.`P16`,
  t.`P17a` = r.`P17a`,
  t.`P17b` = r.`P17b`,
  t.`P17c` = r.`P17c`,
  t.`P17d` = r.`P17d`,
  t.`P18` = r.`P18`,
  t.`P19` = r.`P19`,
  t.`P20a` = r.`P20a`,
  t.`P20b` = r.`P20b`,
  t.`P20c` = r.`P20c`,
  t.`P20d` = r.`P20d`,
  t.`P20e` = r.`P20e`,
  t.`P20f` = r.`P20f`,
  t.`P20g` = r.`P20g`,
  t.`P20h` = r.`P20h`,
  t.`P20i` = r.`P20i`,
  t.`P20j` = r.`P20j`,
  t.`P20k` = r.`P20k`,
  t.`P21` = r.`P21`,
  t.`P21.1` = r.`P21.1`,
  t.`P22a` = r.`P22a`,
  t.`P22b` = r.`P22b`,
  t.`P22c` = r.`P22c`,
  t.`P22d` = r.`P22d`,
  t.`P22e` = r.`P22e`,
  t.`P22f` = r.`P22f`,
  t.`P22g` = r.`P22g`,
  t.`P22h` = r.`P22h`,
  t.`P23.1` = r.`P23.1`,
  t.`P23.2` = r.`P23.2`,
  t.`P23.3` = r.`P23.3`,
  t.`P23.4` = r.`P23.4`,
  t.`P23.5` = r.`P23.5`,
  t.`P23.6` = r.`P23.6`,
  t.`P23.7` = r.`P23.7`,
  t.`P23.8` = r.`P23.8`,
  t.`P23.9` = r.`P23.9`,
  t.`P24.1` = r.`P24.1`,
  t.`P24.2` = r.`P24.2`,
  t.`P24.3` = r.`P24.3`,
  t.`P24.4` = r.`P24.4`,
  t.`P24.5` = r.`P24.5`,
  t.`P24.6` = r.`P24.6`,
  t.`P24.7` = r.`P24.7`,
  t.`P24.8` = r.`P24.8`,
  t.`P25` = r.`P25`,
  t.`P25.1` = r.`P25.1`,
  t.`P25.2` = r.`P25.2`,
  t.`P25.3` = r.`P25.3`,
  t.`P26a` = r.`P26a`,
  t.`P26b` = r.`P26b`,
  t.`P26c` = r.`P26c`,
  t.`P26d` = r.`P26d`,
  t.`P26e` = r.`P26e`,
  t.`P26f` = r.`P26f`,
  t.`P26g` = r.`P26g`,
  t.`P26h` = r.`P26h`,
  t.`P27` = r.`P27`,
  t.`P27Qual` = r.`P27Qual`,
  t.`P28` = r.`P28`,
  t.`P29` = r.`P29`,
  t.`P30a` = r.`P30a`,
  t.`P30b` = r.`P30b`,
  t.`P30c` = r.`P30c`,
  t.`P30d` = r.`P30d`,
  t.`P30e` = r.`P30e`,
  t.`P30f` = r.`P30f`,
  t.`P30g` = r.`P30g`,
  t.`P30h` = r.`P30h`,
  t.`P30i` = r.`P30i`,
  t.`P30Qual` = r.`P30Qual`,
  t.`P31a` = r.`P31a`,
  t.`P31b` = r.`P31b`,
  t.`P31c` = r.`P31c`,
  t.`P31d` = r.`P31d`,
  t.`P31e` = r.`P31e`,
  t.`P31f` = r.`P31f`,
  t.`P31g` = r.`P31g`,
  t.`P31h` = r.`P31h`,
  t.`P32a` = r.`P32a`,
  t.`P32b` = r.`P32b`,
  t.`P32c` = r.`P32c`,
  t.`P32d` = r.`P32d`,
  t.`P32e` = r.`P32e`,
  t.`P32f` = r.`P32f`,
  t.`P32g` = r.`P32g`,
  t.`P32h` = r.`P32h`,
  t.`P32i` = r.`P32i`,
  t.`P32j` = r.`P32j`,
  t.`P32Qual` = r.`P32Qual`;

UPDATE `TB_Pos_Curso` t
JOIN (
  SELECT
    `CD_Curso`,
    MAX(CASE WHEN `Chave` = 'posAcompanhProblemasEstudo' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim, foram definidos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.' THEN 'a' WHEN 'Sim, foram definidos pelos Docentes, porém, sem a participação da Coordenação Didática-Pedagógica.' THEN 'b' WHEN 'Não, não foram definidos pelos Docentes.' THEN 'c' WHEN 'Não se aplica.' THEN 'd' END END) AS `P1`,
    MAX(CASE WHEN `Chave` = 'posAcompanhConceitosTrabalhados' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim, foram detalhados os conceitos pelos Docentes em conjunto com a Coordenação Didático-Pedagógica.' THEN 'a' WHEN 'Sim, foram detalhados os conceitos pelos Docentes, porém, não conjunto com a Coordenação Didático-Pedagógica.' THEN 'b' WHEN 'Não, não foram detalhados os conceitos pelos Docentes.' THEN 'c' WHEN 'Não se aplica.' THEN 'd' END END) AS `P2`,
    MAX(CASE WHEN `Chave` = 'posAcompanhPlanoAcao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim, o Plano de Ação foi definido pelos Docentes em conjunto com a Coordenação Didático-Pedagógica responsável.' THEN 'a' WHEN 'Sim, o Plano de Ação foi definido pelos Docentes, porém, não em conjunto com a Coordenação Didático-Pedagógica.' THEN 'b' WHEN 'Não, o Plano de Ação não foi definido pelos Docentes.' THEN 'c' WHEN 'Não se aplica.' THEN 'd' END END) AS `P3`,
    MAX(CASE WHEN `Chave` = 'posAcompanhProvaSituacao' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim, foi elaborada pelos Docentes, e foi devidamente realizada pelos alunos no primeiro dia de aula e ao longo do curso.' THEN 'a' WHEN 'Sim, foi elaborada pelos Docentes, mas só foi realizada pelos alunos no primeiro dia de aula.' THEN 'b' WHEN 'Não, não foi devidamente elaborada pelos Docentes.' THEN 'c' WHEN 'Não se aplica.' THEN 'd' END END) AS `P4`,
    MAX(CASE WHEN `Chave` = 'posAcompanhLicaoIndividual' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim, foi realizada.' THEN 'a' WHEN 'Não foi realizada.' THEN 'b' WHEN 'Não se aplica.' THEN 'c' END END) AS `P5`,
    CASE WHEN SUM(`Chave` = 'posAcompanhMonitoramento') > 0 THEN MAX(`Chave` = 'posAcompanhMonitoramento' AND `Valor` COLLATE utf8mb4_bin = 'Reuniões periódicas com alunos.') END AS `P6a`,
    CASE WHEN SUM(`Chave` = 'posAcompanhMonitoramento') > 0 THEN MAX(`Chave` = 'posAcompanhMonitoramento' AND `Valor` COLLATE utf8mb4_bin = 'Reuniões periódicas com professores/instrutores.') END AS `P6b`,
    CASE WHEN SUM(`Chave` = 'posAcompanhMonitoramento') > 0 THEN MAX(`Chave` = 'posAcompanhMonitoramento' AND `Valor` COLLATE utf8mb4_bin = 'Acompanhamento individualizado (quando necessário) com alunos.') END AS `P6c`,
    CASE WHEN SUM(`Chave` = 'posAcompanhMonitoramento') > 0 THEN MAX(`Chave` = 'posAcompanhMonitoramento' AND `Valor` COLLATE utf8mb4_bin = 'Reuniões de acompanhamento com parceiros.') END AS `P6d`,
    CASE WHEN SUM(`Chave` = 'posAcompanhMonitoramento') > 0 THEN MAX(`Chave` = 'posAcompanhMonitoramento' AND `Valor` COLLATE utf8mb4_bin = 'Acompanhamento de registros administrativos periódicos, em que conste o número de egressos, as taxas mensais de evasão, e os respectivos motivos atestados.') END AS `P6e`,
    CASE WHEN SUM(`Chave` = 'posAcompanhMonitoramento') > 0 THEN MAX(`Chave` = 'posAcompanhMonitoramento' AND `Valor` COLLATE utf8mb4_bin = 'Nenhuma ação de monitoramento foi realizada durante o desenvolvimento do Curso/Ação de Qualificação.') END AS `P6f`,
    MAX(CASE WHEN `Chave` = 'posExecDataInicioReal' THEN CAST(`Valor` AS DATE) END) AS `P7`,
    MAX(CASE WHEN `Chave` = 'posExecDataTerminoReal' THEN CAST(`Valor` AS DATE) END) AS `P8`,
    MAX(CASE WHEN `Chave` = 'posExecCargaHorariaRealizada' THEN CAST(`Valor` AS SIGNED) END) AS `P9`,
    MAX(CASE WHEN `Chave` = 'posExecDificuldadesEnfrentadas' THEN `Valor` END) AS `P10`,
    MAX(CASE WHEN `Chave` = 'posExecHouveAlteracaoPlanejamento' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P11`,
    MAX(CASE WHEN `Chave` = 'posExecAlteracaoDetalhe' THEN `Valor` END) AS `P12`,
    MAX(CASE WHEN `Chave` = 'posParticNumInscritos' THEN CAST(`Valor` AS SIGNED) END) AS `P13`,
    MAX(CASE WHEN `Chave` = 'posParticNumMatriculados' THEN CAST(`Valor` AS SIGNED) END) AS `P14`,
    MAX(CASE WHEN `Chave` = 'posParticNumConcluintes' THEN CAST(`Valor` AS SIGNED) END) AS `P15`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Falta de motivação/interesse') END AS `P16a`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Dificuldades financeiras') END AS `P16b`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Dificuldades de aprendizagem') END AS `P16c`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Problemas pessoais/familiares') END AS `P16d`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Não ter com quem deixar o(s) filho(s)') END AS `P16e`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Horário inapropriado das aulas') END AS `P16f`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Impeditivos no trabalho (Ex: chefe não liberou)') END AS `P16g`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Local muito distante de casa') END AS `P16h`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Professores/Instrutores não qualificados') END AS `P16i`,
    CASE WHEN SUM(`Chave` = 'posParticMotivosAbandono') > 0 THEN MAX(`Chave` = 'posParticMotivosAbandono' AND `Valor` COLLATE utf8mb4_bin = 'Outro') END AS `P16j`,
    MAX(CASE WHEN `Chave` = 'posParticDemandaMaiorQueOferta' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P17`,
    MAX(CASE WHEN `Chave` = 'posParticIntencaoNovaOferta' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P18`,
    MAX(CASE WHEN `Chave` = 'posFinValorTotal' THEN CAST(`Valor` AS DECIMAL(12, 2)) END) AS `P19`,
    MAX(CASE WHEN `Chave` = 'posFinValorProfessores' THEN CAST(`Valor` AS DECIMAL(12, 2)) END) AS `P20`,
    MAX(CASE WHEN `Chave` = 'posFinValorMateriais' THEN CAST(`Valor` AS DECIMAL(12, 2)) END) AS `P21`,
    MAX(CASE WHEN `Chave` = 'posFinValorInfraestrutura' THEN CAST(`Valor` AS DECIMAL(12, 2)) END) AS `P22`,
    MAX(CASE WHEN `Chave` = 'posFinValorBolsaPermanencia' THEN CAST(`Valor` AS DECIMAL(12, 2)) END) AS `P23`,
    MAX(CASE WHEN `Chave` = 'posFinHouveDevolucaoRecursos' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P24`,
    MAX(CASE WHEN `Chave` = 'posFinNecessidadeAditivo' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P25`,
    CASE WHEN SUM(`Chave` = 'posContEstrategias') > 0 THEN MAX(`Chave` = 'posContEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estabelecimento de parcerias junto a entidades públicas.') END AS `P26a`,
    CASE WHEN SUM(`Chave` = 'posContEstrategias') > 0 THEN MAX(`Chave` = 'posContEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estabelecimento de parcerias junto a entidades privadas.') END AS `P26b`,
    CASE WHEN SUM(`Chave` = 'posContEstrategias') > 0 THEN MAX(`Chave` = 'posContEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Estabelecimento de parcerias junto a instituições de ensino superior (IES), públicas e/ou privadas, visando projetos de extensão conjuntos.') END AS `P26c`,
    CASE WHEN SUM(`Chave` = 'posContEstrategias') > 0 THEN MAX(`Chave` = 'posContEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Integração do Curso a projetos e/ou programas desenvolvidos no território.') END AS `P26d`,
    CASE WHEN SUM(`Chave` = 'posContEstrategias') > 0 THEN MAX(`Chave` = 'posContEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Participação em editais voltados ao financiamento de propostas técnicas na área de educação, inclusão social, desenvolvimento local e/ou turismo.') END AS `P26e`,
    CASE WHEN SUM(`Chave` = 'posContEstrategias') > 0 THEN MAX(`Chave` = 'posContEstrategias' AND `Valor` COLLATE utf8mb4_bin = 'Não foi adotada nenhuma estratégia de continuidade e ampliação.') END AS `P26f`
  FROM `TB_Resposta_Pos_Curso`
  GROUP BY `CD_Curso`
) r ON r.`CD_Curso` = t.`CD_Curso`
SET
  t.`P1` = r.`P1`,
  t.`P2` = r.`P2`,
  t.`P3` = r.`P3`,
  t.`P4` = r.`P4`,
  t.`P5` = r.`P5`,
  t.`P6a` = r.`P6a`,
  t.`P6b` = r.`P6b`,
  t.`P6c` = r.`P6c`,
  t.`P6d` = r.`P6d`,
  t.`P6e` = r.`P6e`,
  t.`P6f` = r.`P6f`,
  t.`P7` = r.`P7`,
  t.`P8` = r.`P8`,
  t.`P9` = r.`P9`,
  t.`P10` = r.`P10`,
  t.`P11` = r.`P11`,
  t.`P12` = r.`P12`,
  t.`P13` = r.`P13`,
  t.`P14` = r.`P14`,
  t.`P15` = r.`P15`,
  t.`P16a` = r.`P16a`,
  t.`P16b` = r.`P16b`,
  t.`P16c` = r.`P16c`,
  t.`P16d` = r.`P16d`,
  t.`P16e` = r.`P16e`,
  t.`P16f` = r.`P16f`,
  t.`P16g` = r.`P16g`,
  t.`P16h` = r.`P16h`,
  t.`P16i` = r.`P16i`,
  t.`P16j` = r.`P16j`,
  t.`P17` = r.`P17`,
  t.`P18` = r.`P18`,
  t.`P19` = r.`P19`,
  t.`P20` = r.`P20`,
  t.`P21` = r.`P21`,
  t.`P22` = r.`P22`,
  t.`P23` = r.`P23`,
  t.`P24` = r.`P24`,
  t.`P25` = r.`P25`,
  t.`P26a` = r.`P26a`,
  t.`P26b` = r.`P26b`,
  t.`P26c` = r.`P26c`,
  t.`P26d` = r.`P26d`,
  t.`P26e` = r.`P26e`,
  t.`P26f` = r.`P26f`;

UPDATE `TB_Avaliacao_Aluno` t
JOIN (
  SELECT
    `CPF`,
    `CD_Curso`,
    MAX(CASE WHEN `Chave` = 'avalExperienciaTrabalhoPrevio' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P14`,
    MAX(CASE WHEN `Chave` = 'avalExperienciaCursoAnterior' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P15`,
    MAX(CASE WHEN `Chave` = 'avalExperienciaTipoCursoAnterior' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Atualização profissional' THEN 'a' WHEN 'Técnico' THEN 'b' WHEN 'Tecnológico-Superior' THEN 'c' WHEN 'Graduação' THEN 'd' WHEN 'Especialização / MBA' THEN 'e' WHEN 'Mestrado/Doutorado' THEN 'f' WHEN 'Outro.' THEN 'g' END END) AS `P16`,
    CASE WHEN SUM(`Chave` = 'avalMotivMotivosParticipacao') > 0 THEN MAX(`Chave` = 'avalMotivMotivosParticipacao' AND `Valor` COLLATE utf8mb4_bin = 'Conseguir um emprego/trabalho') END AS `P17a`,
    CASE WHEN SUM(`Chave` = 'avalMotivMotivosParticipacao') > 0 THEN MAX(`Chave` = 'avalMotivMotivosParticipacao' AND `Valor` COLLATE utf8mb4_bin = 'Melhorar ou complementar a minha renda/me emancipar financeiramente') END AS `P17b`,
    CASE WHEN SUM(`Chave` = 'avalMotivMotivosParticipacao') > 0 THEN MAX(`Chave` = 'avalMotivMotivosParticipacao' AND `Valor` COLLATE utf8mb4_bin = 'Abrir o meu próprio negócio') END AS `P17c`,
    CASE WHEN SUM(`Chave` = 'avalMotivMotivosParticipacao') > 0 THEN MAX(`Chave` = 'avalMotivMotivosParticipacao' AND `Valor` COLLATE utf8mb4_bin = 'Melhor a minha qualificação profissional') END AS `P17d`,
    CASE WHEN SUM(`Chave` = 'avalMotivMotivosParticipacao') > 0 THEN MAX(`Chave` = 'avalMotivMotivosParticipacao' AND `Valor` COLLATE utf8mb4_bin = 'Aplicar o conhecimento adquirido') END AS `P17e`,
    CASE WHEN SUM(`Chave` = 'avalMotivMotivosParticipacao') > 0 THEN MAX(`Chave` = 'avalMotivMotivosParticipacao' AND `Valor` COLLATE utf8mb4_bin = 'Contribuir com o turismo no meu território') END AS `P17f`,
    MAX(CASE WHEN `Chave` = 'avalMotivFormaConhecimento' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'pela Prefeitura Municipal' THEN 'a' WHEN 'pelas Redes Sociais' THEN 'b' WHEN 'pela comunidade' THEN 'c' WHEN 'por indicação de amigo(s)' THEN 'd' WHEN 'pelo rádio/tv local' THEN 'e' WHEN 'por carro de som' THEN 'f' WHEN 'por panfletos / outdoors' THEN 'g' WHEN 'Outro' THEN 'h' END END) AS `P18`,
    MAX(CASE WHEN `Chave` = 'avalExpectAtendimento' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Parcialmente' THEN 'b' WHEN 'Não' THEN 'c' END END) AS `P19`,
    MAX(CASE WHEN `Chave` = 'avalExpectEmprego' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Talvez' THEN 'b' WHEN 'Não' THEN 'c' END END) AS `P20`,
    MAX(CASE WHEN `Chave` = 'avalExpectRenda' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Nenhuma' THEN 'a' WHEN 'Baixa' THEN 'b' WHEN 'Média' THEN 'c' WHEN 'Alta' THEN 'd' END END) AS `P21`,
    MAX(CASE WHEN `Chave` = 'avalParticipConcluiuCurso' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P22`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Falta de motivação/interesse') END AS `P22.1a`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Dificuldades financeiras') END AS `P22.1b`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Dificuldades de aprendizagem') END AS `P22.1c`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Problemas pessoais/familiares') END AS `P22.1d`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Não ter com quem deixar o(s) filho(s)') END AS `P22.1e`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Horário inapropriado das aulas') END AS `P22.1f`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Impeditivos no trabalho (Ex: chefe não liberou)') END AS `P22.1g`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Local muito distante de casa') END AS `P22.1h`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Professores/Instrutores não qualificados') END AS `P22.1i`,
    CASE WHEN SUM(`Chave` = 'avalParticipMotivoNaoConclusao') > 0 THEN MAX(`Chave` = 'avalParticipMotivoNaoConclusao' AND `Valor` COLLATE utf8mb4_bin = 'Outro') END AS `P22.1j`,
    MAX(CASE WHEN `Chave` = 'avalParticipPercentualFrequencia' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Até 25%' THEN 'a' WHEN '26% a 50%' THEN 'b' WHEN '51% a 75%' THEN 'c' WHEN '76% a 100%' THEN 'd' END END) AS `P23`,
    MAX(CASE WHEN `Chave` = 'avalCursoDinamicasInclusao' THEN CAST(`Valor` AS SIGNED) END) AS `P24.1`,
    MAX(CASE WHEN `Chave` = 'avalCursoMaterialDidatico' THEN CAST(`Valor` AS SIGNED) END) AS `P24.2`,
    MAX(CASE WHEN `Chave` = 'avalCursoConteudo' THEN CAST(`Valor` AS SIGNED) END) AS `P24.3`,
    MAX(CASE WHEN `Chave` = 'avalCursoClareza' THEN CAST(`Valor` AS SIGNED) END) AS `P24.4`,
    MAX(CASE WHEN `Chave` = 'avalCursoConhecimentoInstrutores' THEN CAST(`Valor` AS SIGNED) END) AS `P24.5`,
    MAX(CASE WHEN `Chave` = 'avalCursoOrganizacao' THEN CAST(`Valor` AS SIGNED) END) AS `P24.6`,
    MAX(CASE WHEN `Chave` = 'avalCursoInfraestruturaBasica' THEN CAST(`Valor` AS SIGNED) END) AS `P24.7`,
    MAX(CASE WHEN `Chave` = 'avalCursoInfraestruturaSalaAula' THEN CAST(`Valor` AS SIGNED) END) AS `P24.8`,
    MAX(CASE WHEN `Chave` = 'avalAprendizAmpliacaoConhecimento' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Ampliou / Melhorou' THEN 'a' WHEN 'Não ampliou / Não Melhorou' THEN 'b' WHEN 'Indiferente' THEN 'c' END END) AS `P25`,
    MAX(CASE WHEN `Chave` = 'avalAprendizAtendimentoExpectativas' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Parcialmente' THEN 'b' WHEN 'Não' THEN 'c' END END) AS `P26`,
    MAX(CASE WHEN `Chave` = 'avalAprendizSensacaoPreparo' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Parcialmente' THEN 'b' WHEN 'Não' THEN 'c' END END) AS `P27`,
    CASE WHEN SUM(`Chave` = 'avalMotivacoesPosPercepcoes') > 0 THEN MAX(`Chave` = 'avalMotivacoesPosPercepcoes' AND `Valor` COLLATE utf8mb4_bin = 'tem condições de atuar na área do Turismo') END AS `P29a`,
    CASE WHEN SUM(`Chave` = 'avalMotivacoesPosPercepcoes') > 0 THEN MAX(`Chave` = 'avalMotivacoesPosPercepcoes' AND `Valor` COLLATE utf8mb4_bin = 'desenvolveu novas percepções de mundo') END AS `P29b`,
    CASE WHEN SUM(`Chave` = 'avalMotivacoesPosPercepcoes') > 0 THEN MAX(`Chave` = 'avalMotivacoesPosPercepcoes' AND `Valor` COLLATE utf8mb4_bin = 'se sente motivado(a) a retomar os estudos') END AS `P29c`,
    CASE WHEN SUM(`Chave` = 'avalMotivacoesPosPercepcoes') > 0 THEN MAX(`Chave` = 'avalMotivacoesPosPercepcoes' AND `Valor` COLLATE utf8mb4_bin = 'se sente motivado(a) a melhor as suas condições de vida') END AS `P29d`,
    CASE WHEN SUM(`Chave` = 'avalMotivacoesPosPercepcoes') > 0 THEN MAX(`Chave` = 'avalMotivacoesPosPercepcoes' AND `Valor` COLLATE utf8mb4_bin = 'se sente motivado(a) a combater práticas de violência (física, psicológica, moral, sexual ou patrimonial) contra você') END AS `P29e`,
    CASE WHEN SUM(`Chave` = 'avalMotivacoesPosPercepcoes') > 0 THEN MAX(`Chave` = 'avalMotivacoesPosPercepcoes' AND `Valor` COLLATE utf8mb4_bin = 'melhorou as suas percepções/ações sobre as mudanças climáticas') END AS `P29f`,
    MAX(CASE WHEN `Chave` = 'avalGeralNota' THEN CAST(`Valor` AS SIGNED) END) AS `P35`,
    MAX(CASE WHEN `Chave` = 'avalGeralMelhoriasComunidade' THEN `Valor` END) AS `P36`,
    MAX(CASE WHEN `Chave` = 'avalGeralRecomendaCurso' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sim' THEN 'a' WHEN 'Não' THEN 'b' END END) AS `P37`,
    MAX(CASE WHEN `Chave` = 'avalGeralComentariosFinais' THEN `Valor` END) AS `P38`
  FROM `TB_Resposta_Avaliacao`
  GROUP BY `CPF`, `CD_Curso`
) r ON r.`CPF` = t.`CPF` AND r.`CD_Curso` = t.`CD_Curso`
SET
  t.`P14` = r.`P14`,
  t.`P15` = r.`P15`,
  t.`P16` = r.`P16`,
  t.`P17a` = r.`P17a`,
  t.`P17b` = r.`P17b`,
  t.`P17c` = r.`P17c`,
  t.`P17d` = r.`P17d`,
  t.`P17e` = r.`P17e`,
  t.`P17f` = r.`P17f`,
  t.`P18` = r.`P18`,
  t.`P19` = r.`P19`,
  t.`P20` = r.`P20`,
  t.`P21` = r.`P21`,
  t.`P22` = r.`P22`,
  t.`P22.1a` = r.`P22.1a`,
  t.`P22.1b` = r.`P22.1b`,
  t.`P22.1c` = r.`P22.1c`,
  t.`P22.1d` = r.`P22.1d`,
  t.`P22.1e` = r.`P22.1e`,
  t.`P22.1f` = r.`P22.1f`,
  t.`P22.1g` = r.`P22.1g`,
  t.`P22.1h` = r.`P22.1h`,
  t.`P22.1i` = r.`P22.1i`,
  t.`P22.1j` = r.`P22.1j`,
  t.`P23` = r.`P23`,
  t.`P24.1` = r.`P24.1`,
  t.`P24.2` = r.`P24.2`,
  t.`P24.3` = r.`P24.3`,
  t.`P24.4` = r.`P24.4`,
  t.`P24.5` = r.`P24.5`,
  t.`P24.6` = r.`P24.6`,
  t.`P24.7` = r.`P24.7`,
  t.`P24.8` = r.`P24.8`,
  t.`P25` = r.`P25`,
  t.`P26` = r.`P26`,
  t.`P27` = r.`P27`,
  t.`P29a` = r.`P29a`,
  t.`P29b` = r.`P29b`,
  t.`P29c` = r.`P29c`,
  t.`P29d` = r.`P29d`,
  t.`P29e` = r.`P29e`,
  t.`P29f` = r.`P29f`,
  t.`P35` = r.`P35`,
  t.`P36` = r.`P36`,
  t.`P37` = r.`P37`,
  t.`P38` = r.`P38`;

INSERT INTO `TB_Dado_Pessoal_Aluno_Novo` (`CPF`, `P3`, `P4`, `P5`, `P6`, `P7`, `P8`, `P9`)
SELECT
    `CPF`,
    MAX(CASE WHEN `Chave` = 'avalPessoalEstado' THEN `Valor` END),
    MAX(CASE WHEN `Chave` = 'avalPessoalMunicipio' THEN `Valor` END),
    MAX(CASE WHEN `Chave` = 'avalPessoalGenero' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Feminino' THEN 'a' WHEN 'Masculino' THEN 'b' WHEN 'Prefiro não informar' THEN 'c' END END),
    MAX(CASE WHEN `Chave` = 'avalPessoalFaixaEtaria' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Até 18 anos' THEN 'a' WHEN '19 a 25 anos' THEN 'b' WHEN '26 a 35 anos' THEN 'c' WHEN '36 a 50 anos' THEN 'd' WHEN 'Acima de 50 anos' THEN 'e' END END),
    MAX(CASE WHEN `Chave` = 'avalPessoalEscolaridade' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Sem escolaridade' THEN 'a' WHEN 'Ensino fundamental incompleto' THEN 'b' WHEN 'Ensino fundamental completo' THEN 'c' WHEN 'Ensino médio incompleto' THEN 'd' WHEN 'Ensino médio completo' THEN 'e' WHEN 'Ensino técnico' THEN 'f' WHEN 'Ensino superior incompleto' THEN 'g' WHEN 'Ensino superior completo' THEN 'h' WHEN 'Pós-graduação incompleta' THEN 'i' WHEN 'Pós-graduação completa' THEN 'j' END END),
    MAX(CASE WHEN `Chave` = 'avalPessoalRacaEtnia' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Branco' THEN 'a' WHEN 'Preto' THEN 'b' WHEN 'Pardo' THEN 'c' WHEN 'Amarelo' THEN 'd' WHEN 'Indígena' THEN 'e' END END),
    MAX(CASE WHEN `Chave` = 'avalPessoalCondicaoPcd' THEN CASE `Valor` COLLATE utf8mb4_bin WHEN 'Não sou uma Pessoa com Deficiência.' THEN 'a' WHEN 'Sim.' THEN 'b' END END)
FROM `TB_Dado_Pessoal_Aluno`
GROUP BY `CPF`;

-- 3. Conferência

CREATE TABLE `_Conferencia_Respostas_Por_Coluna` (
    `pre_curso_esperado` INT NOT NULL,
    `pre_curso_gravado` INT NOT NULL,
    `pos_curso_esperado` INT NOT NULL,
    `pos_curso_gravado` INT NOT NULL,
    `avaliacao_esperado` INT NOT NULL,
    `avaliacao_gravado` INT NOT NULL,
    `dados_pessoais_esperado` INT NOT NULL,
    `dados_pessoais_gravado` INT NOT NULL,
    CONSTRAINT `respostas_pre_curso_divergentes` CHECK (`pre_curso_esperado` = `pre_curso_gravado`),
    CONSTRAINT `respostas_pos_curso_divergentes` CHECK (`pos_curso_esperado` = `pos_curso_gravado`),
    CONSTRAINT `respostas_avaliacao_divergentes` CHECK (`avaliacao_esperado` = `avaliacao_gravado`),
    CONSTRAINT `respostas_dados_pessoais_divergentes` CHECK (`dados_pessoais_esperado` = `dados_pessoais_gravado`)
);

INSERT INTO `_Conferencia_Respostas_Por_Coluna`
SELECT
  (SELECT COUNT(*) FROM `TB_Resposta_Pre_Curso` WHERE `Chave` IN ('identifUf', 'identifMunicipio', 'identifEntidadeResponsavel', 'identifCoordenador', 'identifEmail', 'identifTelefone', 'qualifEndereco', 'qualifMunicipio', 'qualifUf', 'qualifOutrosMunicipios', 'qualifOutrosMunicipiosQuais', 'qualifNomeCurso', 'qualifVinculoPrograma', 'qualifVinculoProgramaQual', 'qualifCaracteristicas', 'qualifCaracteristicasOutra', 'qualifModalidade', 'qualifRegiao', 'planejDataInicioPrevista', 'planejDataTerminoPrevista', 'planejCargaHoraria', 'planejNumTurmas', 'planejNumAlunosPrevistos', 'planejDataInicioInscricao', 'planejDataTerminoInscricao', 'planejNumVagas', 'planejTaxaEvasaoEsperada', 'planejObjetivo', 'publicoPerfil', 'publicoInstituicaoExecutora', 'publicoInstituicaoExecutoraNome', 'diagnosticoConsultas', 'infraBasicaBanheiros', 'infraBasicaBebedouros', 'infraBasicaEnergia', 'infraBasicaSalaAula', 'infraBasicaRecepcao', 'infraBasicaBiblioteca', 'infraBasicaMobiliario', 'infraBasicaAcessibilidade', 'infraBasicaLaboratorio', 'infraComplSalaProfessores', 'infraComplSalaGestores', 'infraComplSalaEstudo', 'infraComplCopa', 'infraComplLanchonete', 'infraComplAuditorio', 'infraComplAudiovisual', 'infraComplTecnologicos', 'infraEspecificaNecessidade', 'infraEspecificaDisponibilidade', 'infraEspecificaSuficiencia', 'infraEspecificaManutencao', 'docenteCriteriosSelecao', 'docenteFormaContratacao', 'docenteFormaContratacaoOutra', 'docenteNivelFormacao', 'docentePoliticasReparacao', 'divulgacaoEstrategias', 'divulgacaoEstrategiasOutra', 'parceriasEstabelecidas', 'suporteEstrategias', 'suporteEstrategiasOutra')),
  (SELECT COALESCE(SUM(
      (`P1` IS NOT NULL) +
      (`P2` IS NOT NULL) +
      (`P3` IS NOT NULL) +
      (`P4` IS NOT NULL) +
      (`P5` IS NOT NULL) +
      (`P6` IS NOT NULL) +
      (`P7a` IS NOT NULL) +
      (`P7b` IS NOT NULL) +
      (`P7c` IS NOT NULL) +
      (`P7d` IS NOT NULL) +
      (`P7e` IS NOT NULL) +
      (`P8` IS NOT NULL) +
      (`P9` IS NOT NULL) +
      (`P9Qual` IS NOT NULL) +
      COALESCE(`P10a`, 0) +
      COALESCE(`P10b`, 0) +
      COALESCE(`P10c`, 0) +
      COALESCE(`P10d`, 0) +
      COALESCE(`P10e`, 0) +
      COALESCE(`P10f`, 0) +
      COALESCE(`P10g`, 0) +
      COALESCE(`P10h`, 0) +
      COALESCE(`P10i`, 0) +
      COALESCE(`P10j`, 0) +
      COALESCE(`P10k`, 0) +
      COALESCE(`P10l`, 0) +
      (`P10Qual` IS NOT NULL) +
      (`P11` IS NOT NULL) +
      (`P12` IS NOT NULL) +
      (`P13` IS NOT NULL) +
      (`P14` IS NOT NULL) +
      (`P15` IS NOT NULL) +
      (`P16` IS NOT NULL) +
      (`P17a` IS NOT NULL) +
      (`P17b` IS NOT NULL) +
      (`P17c` IS NOT NULL) +
      (`P17d` IS NOT NULL) +
      (`P18` IS NOT NULL) +
      (`P19` IS NOT NULL) +
      COALESCE(`P20a`, 0) +
      COALESCE(`P20b`, 0) +
      COALESCE(`P20c`, 0) +
      COALESCE(`P20d`, 0) +
      COALESCE(`P20e`, 0) +
      COALESCE(`P20f`, 0) +
      COALESCE(`P20g`, 0) +
      COALESCE(`P20h`, 0) +
      COALESCE(`P20i`, 0) +
      COALESCE(`P20j`, 0) +
      COALESCE(`P20k`, 0) +
      (`P21` IS NOT NULL) +
      (`P21.1` IS NOT NULL) +
      COALESCE(`P22a`, 0) +
      COALESCE(`P22b`, 0) +
      COALESCE(`P22c`, 0) +
      COALESCE(`P22d`, 0) +
      COALESCE(`P22e`, 0) +
      COALESCE(`P22f`, 0) +
      COALESCE(`P22g`, 0) +
      COALESCE(`P22h`, 0) +
      (`P23.1` IS NOT NULL) +
      (`P23.2` IS NOT NULL) +
      (`P23.3` IS NOT NULL) +
      (`P23.4` IS NOT NULL) +
      (`P23.5` IS NOT NULL) +
      (`P23.6` IS NOT NULL) +
      (`P23.7` IS NOT NULL) +
      (`P23.8` IS NOT NULL) +
      (`P23.9` IS NOT NULL) +
      (`P24.1` IS NOT NULL) +
      (`P24.2` IS NOT NULL) +
      (`P24.3` IS NOT NULL) +
      (`P24.4` IS NOT NULL) +
      (`P24.5` IS NOT NULL) +
      (`P24.6` IS NOT NULL) +
      (`P24.7` IS NOT NULL) +
      (`P24.8` IS NOT NULL) +
      (`P25` IS NOT NULL) +
      (`P25.1` IS NOT NULL) +
      (`P25.2` IS NOT NULL) +
      (`P25.3` IS NOT NULL) +
      COALESCE(`P26a`, 0) +
      COALESCE(`P26b`, 0) +
      COALESCE(`P26c`, 0) +
      COALESCE(`P26d`, 0) +
      COALESCE(`P26e`, 0) +
      COALESCE(`P26f`, 0) +
      COALESCE(`P26g`, 0) +
      COALESCE(`P26h`, 0) +
      (`P27` IS NOT NULL) +
      (`P27Qual` IS NOT NULL) +
      (`P28` IS NOT NULL) +
      (`P29` IS NOT NULL) +
      COALESCE(`P30a`, 0) +
      COALESCE(`P30b`, 0) +
      COALESCE(`P30c`, 0) +
      COALESCE(`P30d`, 0) +
      COALESCE(`P30e`, 0) +
      COALESCE(`P30f`, 0) +
      COALESCE(`P30g`, 0) +
      COALESCE(`P30h`, 0) +
      COALESCE(`P30i`, 0) +
      (`P30Qual` IS NOT NULL) +
      COALESCE(`P31a`, 0) +
      COALESCE(`P31b`, 0) +
      COALESCE(`P31c`, 0) +
      COALESCE(`P31d`, 0) +
      COALESCE(`P31e`, 0) +
      COALESCE(`P31f`, 0) +
      COALESCE(`P31g`, 0) +
      COALESCE(`P31h`, 0) +
      COALESCE(`P32a`, 0) +
      COALESCE(`P32b`, 0) +
      COALESCE(`P32c`, 0) +
      COALESCE(`P32d`, 0) +
      COALESCE(`P32e`, 0) +
      COALESCE(`P32f`, 0) +
      COALESCE(`P32g`, 0) +
      COALESCE(`P32h`, 0) +
      COALESCE(`P32i`, 0) +
      COALESCE(`P32j`, 0) +
      (`P32Qual` IS NOT NULL)
    ), 0) FROM `TB_Pre_Curso`),
  (SELECT COUNT(*) FROM `TB_Resposta_Pos_Curso` WHERE `Chave` IN ('posAcompanhProblemasEstudo', 'posAcompanhConceitosTrabalhados', 'posAcompanhPlanoAcao', 'posAcompanhProvaSituacao', 'posAcompanhLicaoIndividual', 'posAcompanhMonitoramento', 'posExecDataInicioReal', 'posExecDataTerminoReal', 'posExecCargaHorariaRealizada', 'posExecDificuldadesEnfrentadas', 'posExecHouveAlteracaoPlanejamento', 'posExecAlteracaoDetalhe', 'posParticNumInscritos', 'posParticNumMatriculados', 'posParticNumConcluintes', 'posParticMotivosAbandono', 'posParticDemandaMaiorQueOferta', 'posParticIntencaoNovaOferta', 'posFinValorTotal', 'posFinValorProfessores', 'posFinValorMateriais', 'posFinValorInfraestrutura', 'posFinValorBolsaPermanencia', 'posFinHouveDevolucaoRecursos', 'posFinNecessidadeAditivo', 'posContEstrategias')),
  (SELECT COALESCE(SUM(
      (`P1` IS NOT NULL) +
      (`P2` IS NOT NULL) +
      (`P3` IS NOT NULL) +
      (`P4` IS NOT NULL) +
      (`P5` IS NOT NULL) +
      COALESCE(`P6a`, 0) +
      COALESCE(`P6b`, 0) +
      COALESCE(`P6c`, 0) +
      COALESCE(`P6d`, 0) +
      COALESCE(`P6e`, 0) +
      COALESCE(`P6f`, 0) +
      (`P7` IS NOT NULL) +
      (`P8` IS NOT NULL) +
      (`P9` IS NOT NULL) +
      (`P10` IS NOT NULL) +
      (`P11` IS NOT NULL) +
      (`P12` IS NOT NULL) +
      (`P13` IS NOT NULL) +
      (`P14` IS NOT NULL) +
      (`P15` IS NOT NULL) +
      COALESCE(`P16a`, 0) +
      COALESCE(`P16b`, 0) +
      COALESCE(`P16c`, 0) +
      COALESCE(`P16d`, 0) +
      COALESCE(`P16e`, 0) +
      COALESCE(`P16f`, 0) +
      COALESCE(`P16g`, 0) +
      COALESCE(`P16h`, 0) +
      COALESCE(`P16i`, 0) +
      COALESCE(`P16j`, 0) +
      (`P17` IS NOT NULL) +
      (`P18` IS NOT NULL) +
      (`P19` IS NOT NULL) +
      (`P20` IS NOT NULL) +
      (`P21` IS NOT NULL) +
      (`P22` IS NOT NULL) +
      (`P23` IS NOT NULL) +
      (`P24` IS NOT NULL) +
      (`P25` IS NOT NULL) +
      COALESCE(`P26a`, 0) +
      COALESCE(`P26b`, 0) +
      COALESCE(`P26c`, 0) +
      COALESCE(`P26d`, 0) +
      COALESCE(`P26e`, 0) +
      COALESCE(`P26f`, 0)
    ), 0) FROM `TB_Pos_Curso`),
  (SELECT COUNT(*) FROM `TB_Resposta_Avaliacao` WHERE `Chave` IN ('avalExperienciaTrabalhoPrevio', 'avalExperienciaCursoAnterior', 'avalExperienciaTipoCursoAnterior', 'avalMotivMotivosParticipacao', 'avalMotivFormaConhecimento', 'avalExpectAtendimento', 'avalExpectEmprego', 'avalExpectRenda', 'avalParticipConcluiuCurso', 'avalParticipMotivoNaoConclusao', 'avalParticipPercentualFrequencia', 'avalCursoDinamicasInclusao', 'avalCursoMaterialDidatico', 'avalCursoConteudo', 'avalCursoClareza', 'avalCursoConhecimentoInstrutores', 'avalCursoOrganizacao', 'avalCursoInfraestruturaBasica', 'avalCursoInfraestruturaSalaAula', 'avalAprendizAmpliacaoConhecimento', 'avalAprendizAtendimentoExpectativas', 'avalAprendizSensacaoPreparo', 'avalMotivacoesPosPercepcoes', 'avalGeralNota', 'avalGeralMelhoriasComunidade', 'avalGeralRecomendaCurso', 'avalGeralComentariosFinais')),
  (SELECT COALESCE(SUM(
      (`P14` IS NOT NULL) +
      (`P15` IS NOT NULL) +
      (`P16` IS NOT NULL) +
      COALESCE(`P17a`, 0) +
      COALESCE(`P17b`, 0) +
      COALESCE(`P17c`, 0) +
      COALESCE(`P17d`, 0) +
      COALESCE(`P17e`, 0) +
      COALESCE(`P17f`, 0) +
      (`P18` IS NOT NULL) +
      (`P19` IS NOT NULL) +
      (`P20` IS NOT NULL) +
      (`P21` IS NOT NULL) +
      (`P22` IS NOT NULL) +
      COALESCE(`P22.1a`, 0) +
      COALESCE(`P22.1b`, 0) +
      COALESCE(`P22.1c`, 0) +
      COALESCE(`P22.1d`, 0) +
      COALESCE(`P22.1e`, 0) +
      COALESCE(`P22.1f`, 0) +
      COALESCE(`P22.1g`, 0) +
      COALESCE(`P22.1h`, 0) +
      COALESCE(`P22.1i`, 0) +
      COALESCE(`P22.1j`, 0) +
      (`P23` IS NOT NULL) +
      (`P24.1` IS NOT NULL) +
      (`P24.2` IS NOT NULL) +
      (`P24.3` IS NOT NULL) +
      (`P24.4` IS NOT NULL) +
      (`P24.5` IS NOT NULL) +
      (`P24.6` IS NOT NULL) +
      (`P24.7` IS NOT NULL) +
      (`P24.8` IS NOT NULL) +
      (`P25` IS NOT NULL) +
      (`P26` IS NOT NULL) +
      (`P27` IS NOT NULL) +
      COALESCE(`P29a`, 0) +
      COALESCE(`P29b`, 0) +
      COALESCE(`P29c`, 0) +
      COALESCE(`P29d`, 0) +
      COALESCE(`P29e`, 0) +
      COALESCE(`P29f`, 0) +
      (`P35` IS NOT NULL) +
      (`P36` IS NOT NULL) +
      (`P37` IS NOT NULL) +
      (`P38` IS NOT NULL)
    ), 0) FROM `TB_Avaliacao_Aluno`),
  (SELECT COUNT(*) FROM `TB_Dado_Pessoal_Aluno` WHERE `Chave` IN ('avalPessoalEstado', 'avalPessoalMunicipio', 'avalPessoalGenero', 'avalPessoalFaixaEtaria', 'avalPessoalEscolaridade', 'avalPessoalRacaEtnia', 'avalPessoalCondicaoPcd')),
  (SELECT COALESCE(SUM(
      (`P3` IS NOT NULL) +
      (`P4` IS NOT NULL) +
      (`P5` IS NOT NULL) +
      (`P6` IS NOT NULL) +
      (`P7` IS NOT NULL) +
      (`P8` IS NOT NULL) +
      (`P9` IS NOT NULL)
    ), 0) FROM `TB_Dado_Pessoal_Aluno_Novo`);

DROP TABLE `_Conferencia_Respostas_Por_Coluna`;

-- 4. Contract

DROP TABLE `TB_Resposta_Avaliacao`;

DROP TABLE `TB_Resposta_Pos_Curso`;

DROP TABLE `TB_Resposta_Pre_Curso`;

DROP TABLE `TB_Dado_Pessoal_Aluno`;

RENAME TABLE `TB_Dado_Pessoal_Aluno_Novo` TO `TB_Dado_Pessoal_Aluno`;

ALTER TABLE `TB_Dado_Pessoal_Aluno` ADD CONSTRAINT `TB_Dado_Pessoal_Aluno_CPF_fkey` FOREIGN KEY (`CPF`) REFERENCES `TB_Usuario`(`Documento_Usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
