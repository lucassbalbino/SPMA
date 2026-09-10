-- Backfill das respostas em JSON para linhas (RESP-13, RESP-14, RESP-15, RESP-16).
--
-- Roda entre a migration que cria as tabelas e a que dropa a coluna
-- `Respostas`. É migration SQL de propósito, e não um script TS avulso:
-- `start:prod` executa `prisma migrate deploy && next start`, então esta
-- etapa precisa acontecer sozinha no deploy. Um passo manual entre as duas
-- migrations seria fácil de esquecer, e esquecê-lo apaga todas as respostas
-- já gravadas.
--
-- Duas passagens por formulário:
--   1. valores escalares  -> uma linha, `Ordem` = 0
--   2. valores de lista   -> uma linha por opção, `Ordem` = posição (base 0)
--
-- `JSON_KEYS` enumera as chaves gravadas, não as do schema Zod vigente:
-- chave de questionário antigo migra como qualquer outra (RESP-14).
-- Registro com `Respostas` nulo produz zero linhas, sem erro: `JSON_KEYS`
-- de NULL é NULL e `JSON_TABLE` sobre NULL não gera linha (RESP-16).
-- Nenhuma coluna dos três formulários é lida para escrita aqui (RESP-15).
-- Chave com valor JSON `null` é ignorada: virar o texto "null" seria
-- inventar resposta.

-- Pré-Curso: escalares
INSERT INTO `TB_Resposta_Pre_Curso` (`CD_Curso`, `Chave`, `Ordem`, `Valor`)
SELECT p.`CD_Curso`, k.chave, 0,
       JSON_UNQUOTE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"')))
FROM `TB_Pre_Curso` p,
     JSON_TABLE(JSON_KEYS(p.`Respostas`), '$[*]' COLUMNS (chave VARCHAR(100) PATH '$')) k
WHERE JSON_TYPE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"'))) NOT IN ('ARRAY', 'NULL');

-- Pré-Curso: listas
INSERT INTO `TB_Resposta_Pre_Curso` (`CD_Curso`, `Chave`, `Ordem`, `Valor`)
SELECT p.`CD_Curso`, k.chave, a.ordinal - 1, a.valor
FROM `TB_Pre_Curso` p,
     JSON_TABLE(JSON_KEYS(p.`Respostas`), '$[*]' COLUMNS (chave VARCHAR(100) PATH '$')) k,
     JSON_TABLE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"')), '$[*]'
                COLUMNS (ordinal FOR ORDINALITY, valor VARCHAR(2000) PATH '$')) a
WHERE JSON_TYPE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"'))) = 'ARRAY';

-- Pós-Curso: escalares
INSERT INTO `TB_Resposta_Pos_Curso` (`CD_Curso`, `Chave`, `Ordem`, `Valor`)
SELECT p.`CD_Curso`, k.chave, 0,
       JSON_UNQUOTE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"')))
FROM `TB_Pos_Curso` p,
     JSON_TABLE(JSON_KEYS(p.`Respostas`), '$[*]' COLUMNS (chave VARCHAR(100) PATH '$')) k
WHERE JSON_TYPE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"'))) NOT IN ('ARRAY', 'NULL');

-- Pós-Curso: listas
INSERT INTO `TB_Resposta_Pos_Curso` (`CD_Curso`, `Chave`, `Ordem`, `Valor`)
SELECT p.`CD_Curso`, k.chave, a.ordinal - 1, a.valor
FROM `TB_Pos_Curso` p,
     JSON_TABLE(JSON_KEYS(p.`Respostas`), '$[*]' COLUMNS (chave VARCHAR(100) PATH '$')) k,
     JSON_TABLE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"')), '$[*]'
                COLUMNS (ordinal FOR ORDINALITY, valor VARCHAR(2000) PATH '$')) a
WHERE JSON_TYPE(JSON_EXTRACT(p.`Respostas`, CONCAT('$."', k.chave, '"'))) = 'ARRAY';

-- Avaliação do Aluno: escalares
INSERT INTO `TB_Resposta_Avaliacao` (`CPF`, `CD_Curso`, `Chave`, `Ordem`, `Valor`)
SELECT a.`CPF`, a.`CD_Curso`, k.chave, 0,
       JSON_UNQUOTE(JSON_EXTRACT(a.`Respostas`, CONCAT('$."', k.chave, '"')))
FROM `TB_Avaliacao_Aluno` a,
     JSON_TABLE(JSON_KEYS(a.`Respostas`), '$[*]' COLUMNS (chave VARCHAR(100) PATH '$')) k
WHERE JSON_TYPE(JSON_EXTRACT(a.`Respostas`, CONCAT('$."', k.chave, '"'))) NOT IN ('ARRAY', 'NULL');

-- Avaliação do Aluno: listas
INSERT INTO `TB_Resposta_Avaliacao` (`CPF`, `CD_Curso`, `Chave`, `Ordem`, `Valor`)
SELECT a.`CPF`, a.`CD_Curso`, k.chave, o.ordinal - 1, o.valor
FROM `TB_Avaliacao_Aluno` a,
     JSON_TABLE(JSON_KEYS(a.`Respostas`), '$[*]' COLUMNS (chave VARCHAR(100) PATH '$')) k,
     JSON_TABLE(JSON_EXTRACT(a.`Respostas`, CONCAT('$."', k.chave, '"')), '$[*]'
                COLUMNS (ordinal FOR ORDINALITY, valor VARCHAR(2000) PATH '$')) o
WHERE JSON_TYPE(JSON_EXTRACT(a.`Respostas`, CONCAT('$."', k.chave, '"'))) = 'ARRAY';
