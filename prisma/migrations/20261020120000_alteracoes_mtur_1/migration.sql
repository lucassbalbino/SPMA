-- Revisão dos questionários pelo MTur (`docs/Alteracoes_MTur_1.md`,
-- feature `alteracoes-mtur-1`, MTUR-13 a MTUR-17).
--
-- Os textos aparecem literais, e não derivados das constantes TypeScript, de
-- propósito: uma migration é registro histórico imutável e não pode mudar de
-- comportamento porque alguém editou o schema Zod depois.
--
-- Nenhum comentário deste arquivo pode conter ponto e vírgula: o teste de
-- integração separa os comandos por esse caractere.

-- 1. Pré-curso, Q10 (itens 1.5 a 1.8 e 1.10). A troca não altera `Ordem`,
-- então a unicidade (CD_Curso, Chave, Ordem) se mantém.
UPDATE `TB_Resposta_Pre_Curso`
SET `Valor` = 'Hospedagem (recepcionista / camareiro(a) / copeiro(a))'
WHERE `Chave` = 'qualifCaracteristicas'
  AND `Valor` = 'Alojamento (recepcionista / camareiro(a) / copeiro(a) / outros)';

UPDATE `TB_Resposta_Pre_Curso`
SET `Valor` = 'Serviços de Alimentação (bartender / auxiliar de cozinha)'
WHERE `Chave` = 'qualifCaracteristicas'
  AND `Valor` = 'Serviços de Alimentação (bartender / auxiliar de cozinha / outros)';

UPDATE `TB_Resposta_Pre_Curso`
SET `Valor` = 'Cultura e Lazer (produtor(a) / recreacionista / artesã(o))'
WHERE `Chave` = 'qualifCaracteristicas'
  AND `Valor` = 'Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)';

UPDATE `TB_Resposta_Pre_Curso`
SET `Valor` = 'Eventos (cerimonialista / organizador(a) de eventos)'
WHERE `Chave` = 'qualifCaracteristicas'
  AND `Valor` = 'Eventos';

-- 2. Dado pessoal do Aluno, Q8 (item 3.1) e Q9 (item 3.2). Os quatro tipos de
-- deficiência colapsam em "Sim." e o tipo se perde - consequência aceita da
-- decisão de reduzir Q9 a Sim/Não.
UPDATE `TB_Dado_Pessoal_Aluno`
SET `Valor` = 'Preto'
WHERE `Chave` = 'avalPessoalRacaEtnia'
  AND `Valor` = 'Negro';

UPDATE `TB_Dado_Pessoal_Aluno`
SET `Valor` = 'Sim.'
WHERE `Chave` = 'avalPessoalCondicaoPcd'
  AND `Valor` IN (
    'Sim, tenho deficiência física (paralisias, amputações, ausência de membros, lesões nervosas ou musculares, etc.)',
    'Sim, tenho deficiência auditiva.',
    'Sim, tenho deficiência visual.',
    'Sim, tenho deficiência intelectual/mental.'
  );

-- 3. Avaliação do Aluno, itens 3.3 a 3.6: as 11 chaves dos blocos removidos
-- (Q10-Q13, Q28, Q30, Q30.j, Q31, Q32, Q33, Q34). Vale para avaliação
-- encerrada também. Irreversível, autorizado pelo usuário.
DELETE FROM `TB_Resposta_Avaliacao`
WHERE `Chave` IN (
    'avalProfissCondicaoTrabalho',
    'avalProfissAtuaTurismo',
    'avalProfissAtividadeEspecifica',
    'avalProfissFaixaRenda',
    'avalContinuidadeRetomadaEstudos',
    'avalOportunSituacaoTrabalho',
    'avalOportunSituacaoTrabalhoOutra',
    'avalOportunIntencaoAtuarTurismo',
    'avalEfetivEmprego',
    'avalEfetivAumentoRenda',
    'avalEfetivMelhoriaPadraoVida'
);

-- 4. `Parte1_Completa` é recalculado pela aplicação a cada gravação, mas só
-- então. Com a Parte 1 sem Situação Profissional, o aluno que já respondeu o
-- resto ficaria com a Parte 2 bloqueada sem nada pendente na tela. A regra
-- abaixo é a de `validarCompletudeParte1` na data desta migration: as 7
-- chaves sempre exigidas, mais Q16 quando Q15 = 'Sim'. A presença da linha
-- basta, porque o valor passou pelo Zod ao ser gravado e as opções dessas
-- chaves não mudaram. Só vai de false para true: a Parte 1 perdeu
-- exigências, não ganhou.
UPDATE `TB_Avaliacao_Aluno` AS a
SET a.`Parte1_Completa` = true
WHERE a.`Parte1_Completa` = false
  AND (
    SELECT COUNT(DISTINCT r.`Chave`)
    FROM `TB_Resposta_Avaliacao` AS r
    WHERE r.`CPF` = a.`CPF`
      AND r.`CD_Curso` = a.`CD_Curso`
      AND r.`Chave` IN (
        'avalExperienciaTrabalhoPrevio',
        'avalExperienciaCursoAnterior',
        'avalMotivMotivosParticipacao',
        'avalMotivFormaConhecimento',
        'avalExpectAtendimento',
        'avalExpectEmprego',
        'avalExpectRenda'
      )
  ) = 7
  AND NOT EXISTS (
    SELECT 1
    FROM `TB_Resposta_Avaliacao` AS q15
    WHERE q15.`CPF` = a.`CPF`
      AND q15.`CD_Curso` = a.`CD_Curso`
      AND q15.`Chave` = 'avalExperienciaCursoAnterior'
      AND q15.`Valor` = 'Sim'
      AND NOT EXISTS (
        SELECT 1
        FROM `TB_Resposta_Avaliacao` AS q16
        WHERE q16.`CPF` = a.`CPF`
          AND q16.`CD_Curso` = a.`CD_Curso`
          AND q16.`Chave` = 'avalExperienciaTipoCursoAnterior'
      )
  );
