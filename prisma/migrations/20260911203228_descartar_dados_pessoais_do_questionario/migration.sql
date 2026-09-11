-- Descarte das respostas pessoais já gravadas no questionário do curso
-- (PESSOAL-21, PESSOAL-22, PESSOAL-23, PESSOAL-24).
--
-- As 7 perguntas de dados pessoais saíram da Avaliação e passaram a viver em
-- `TB_Dado_Pessoal_Aluno`, chaveadas só pelo CPF. Aqui não há nada a mover: o
-- usuário autorizou recoletar, e mover exigiria decidir qual curso vence
-- quando o mesmo Aluno respondeu em dois. Todo Aluno existente cai no gate e
-- responde de novo no próximo acesso.
--
-- Só as linhas destas 7 chaves são removidas. Nenhuma conta de Aluno, nenhuma
-- `TB_Avaliacao_Aluno` e nenhuma resposta de chave não-pessoal é tocada.
--
-- As 7 chaves aparecem literais, e não derivadas da constante TypeScript, de
-- propósito: uma migration é registro histórico imutável e não pode mudar de
-- comportamento porque alguém editou `CHAVES_DADOS_PESSOAIS` depois.
DELETE FROM `TB_Resposta_Avaliacao`
WHERE `Chave` IN (
    'avalPessoalEstado',
    'avalPessoalMunicipio',
    'avalPessoalGenero',
    'avalPessoalFaixaEtaria',
    'avalPessoalEscolaridade',
    'avalPessoalRacaEtnia',
    'avalPessoalCondicaoPcd'
);
