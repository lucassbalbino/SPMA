# Respostas por Coluna Specification

**Escopo:** Complex. Rescinde a AD-041 (e a forma física da AD-042), mexe em schema físico com migração de dados reais de produção, e atravessa as quatro features de formulário já DONE (`formulario-pre-curso`, `formulario-pos-curso`, `avaliacao-aluno`, `dados-pessoais-separados`) na camada de persistência.

**Fonte funcional:** pedido do usuário em 2026-10-27. O formato foi aprovado pelo usuário e pelo cliente no documento "Formato das respostas no banco de dados" (https://claude.ai/artifact/KAh9ydyRJt66cXyazMqkLY). As decisões tomadas em conversa estão registradas na tabela de Assumptions.

## Problem Statement

Hoje as respostas ficam em tabelas de forma `(pai, Chave, Ordem, Valor)`: a pergunta é um *valor* da coluna `Chave`, não um atributo, e a resposta é o texto inteiro da opção. O cliente vai analisar os dados no Power BI, que espera uma linha por formulário e uma coluna por pergunta. No formato atual, filtrar ou cruzar duas perguntas exige pivotar a tabela antes de cada análise. A mudança é transformar cada pergunta em coluna da tabela do próprio formulário, com nomes e valores que seguem a numeração do questionário em papel.

## Goals

- [ ] Cada pergunta dos quatro formulários (Pré-Curso, Pós-Curso, Avaliação do Aluno, Dados pessoais) é uma coluna, e cada formulário preenchido é uma linha.
- [ ] Os nomes de coluna e os valores seguem o questionário em papel: `P` + número, letra da opção nas objetivas.
- [ ] As tabelas `TB_Resposta_Pre_Curso`, `TB_Resposta_Pos_Curso` e `TB_Resposta_Avaliacao` deixam de existir, e `TB_Dado_Pessoal_Aluno` passa a ter uma linha por aluno.
- [ ] As respostas de produção migram sem perda, e a migração aborta sozinha se a conferência não bater.
- [ ] Zero regressão de comportamento: telas, contrato HTTP, completude, condicionais, encerramento, autorização.
- [ ] AD nova em `.specs/STATE.md` rescinde a AD-041.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Tabela-dicionário (texto das perguntas e opções no banco) | O usuário decidiu que o texto das opções não precisa ficar no banco; a referência é o questionário em papel. Pode ser criada depois sem mexer nas colunas. |
| VIEW longa ou VIEW de cruzamento para o Power BI | Decisão do usuário: "só se precisar". |
| Acesso do Power BI ao banco (porta 3306, usuário só-leitura, TLS) | Decisão do usuário: entrega posterior. |
| Renomear as chaves internas do código (`qualifModalidade` etc.) para `P*` | Decisão do usuário: a tradução fica só na camada do banco. |
| Mudança em telas, perguntas, opções ou regras de completude | Esta feature troca onde o dado repousa, não o conteúdo. |
| Versionamento de questionário | Não pedido. |
| Dashboard (AD-024) | Continua adiado. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde ficam as colunas | Na própria `TB_Pre_Curso`, `TB_Pos_Curso` e `TB_Avaliacao_Aluno`; dados pessoais em `TB_Dado_Pessoal_Aluno`, uma linha por CPF | Escolha do usuário; segue a especificação original do cliente ("campos do questionário" dentro da tabela do formulário) | y |
| Nome da coluna | `P` + número do questionário vigente, sem prefixo por formulário. Letra de opção colada sem ponto (`P20a`, `P22.1b`); ponto só em subnúmero (`P25.1`) e item de quadro de notas (`P23.4`); texto do "Qual?" em `P<n>Qual` | Escolha do usuário, aprovada pelo cliente no documento de formato | y |
| Numeração de referência | Os questionários em `docs/Questionario_*.md` com as alterações já aplicadas (`docs/Alteracoes_MTur_1.md`, `docs/Alteracoes_Questionario_Gestor_Pre_Curso.md`, `docs/Alteracoes_Cliente_2.md`), com as lacunas do papel (o Aluno não tem P10–P13, P28, P30–P34) | Escolha do usuário ("a do papel, com lacunas") | y |
| Itens dos quadros de notas | Numerados pela ordem da linha no papel (`P23.1`…`P23.9`, `P24.1`…`P24.8`; Aluno `P24.1`…`P24.8`), guardando a nota como número | Escolha do usuário | y |
| Valor da escolha única | A letra da opção no papel (`a`, `b`, …), derivada da posição da opção na lista do schema, conferida contra o papel no Design | Escolha do usuário: "quando não for discursiva, salve apenas a letra da opção" | y |
| Perguntas de UF/Estado | Gravam a sigla (`BA`), porque o papel não dá letra às 27 UFs | Não há letra no papel; a sigla já é um código curto e estável | n (decisão do agente, baixo risco) |
| Múltipla escolha | Uma coluna por opção: `1` marcou, `0` não marcou (pergunta respondida), `NULL` (pergunta não respondida) | Escolha do usuário | y |
| Ordem da seleção múltipla | Não é guardada; a leitura devolve as opções na ordem do questionário | O usuário decidiu que a Q17 do Aluno só precisa de 1/0; a tela é de caixas de seleção e não registra prioridade | y |
| Não se aplica / não respondida | `NULL` | Escolha do usuário | y |
| Tipos | Letra em `CHAR(1)`, sigla em `CHAR(2)`, 1/0 em `BOOLEAN`, nota em `TINYINT`, número inteiro em `INT`, valor/percentual em `DECIMAL`, data em `DATE`, texto livre em `TEXT` | Escolha do usuário (tipo forte) | y |
| Respostas de chaves que já saíram do questionário (órfãs) | Descartadas na migração, preservadas apenas no backup | Escolha do usuário; não têm número no papel atual | y |
| Conferência da migração | Antes de remover qualquer tabela antiga, a migração confere cada formulário e aborta se uma contagem não bater ou se algum texto gravado não corresponder a uma opção atual | Escolha do usuário ("migração se autoverifica") | y |
| Mudanças futuras no questionário | Opção nova entra no fim da lista (orientação ao cliente). Mudar a ordem exige uma migration que converte as letras gravadas. Pergunta retirada mantém a coluna | Escolha do usuário; registrado na AD nova | y |
| Contrato HTTP e telas | Inalterados: a API continua recebendo e devolvendo `{ chave: valor }` com o texto das opções | A tradução chave↔coluna e texto↔letra fica no repositório (escolha do usuário) | y |
| `null` num PATCH | Mantém a semântica atual: limpa a resposta (coluna(s) da chave viram `NULL`) | É o comportamento de hoje (`gravarRespostas` apaga as linhas da chave e não insere nada) | n (decisão do agente: preservação de comportamento) |
| Backup antes do deploy | Fora do código: o backup diário da VPS (`/opt/spma/backups/`) existe; o passo de backup manual e o procedimento de recuperação de uma migração abortada ficam em `docs/DEPLOY_PRODUCAO.md` | O `push` na `main` dispara `migrate deploy` sozinho (AD-047) | n (decisão do agente) |

**Open questions:** none - todas resolvidas na conversa ou registradas acima.

---

## User Stories

### P1: Cada pergunta é uma coluna ⭐ MVP

**User Story**: Como analista do programa no Power BI, quero cada pergunta como uma coluna da tabela do formulário, para filtrar e cruzar os dados por pergunta sem tratar a tabela antes.

**Why P1**: É o pedido central.

**Acceptance Criteria**:

1. The system SHALL guardar as respostas do Pré-Curso, do Pós-Curso e da Avaliação do Aluno em colunas da própria `TB_Pre_Curso`, `TB_Pos_Curso` e `TB_Avaliacao_Aluno`, uma linha por formulário. (COL-01)
2. The system SHALL guardar os dados pessoais do Aluno em `TB_Dado_Pessoal_Aluno` com uma única linha por CPF e uma coluna por pergunta (`P3` a `P9`). (COL-02)
3. The system SHALL nomear cada coluna de resposta segundo a regra de nomes da tabela de Assumptions, e cada pergunta vigente dos quatro questionários SHALL ter a(s) sua(s) coluna(s). (COL-03)
4. WHEN uma pergunta de escolha única é respondida THEN o sistema SHALL gravar na coluna a letra da opção no questionário em papel (ou a sigla, nas perguntas de UF/Estado), nunca o texto da opção. (COL-04)
5. WHEN uma pergunta de múltipla escolha é respondida THEN o sistema SHALL gravar `1` na coluna de cada opção marcada e `0` na coluna de cada opção não marcada. (COL-05)
6. WHEN uma pergunta discursiva ou um campo "Qual?" é respondido THEN o sistema SHALL gravar o texto digitado na coluna. (COL-06)
7. WHEN uma pergunta numérica, de valor, de data ou de nota é respondida THEN o sistema SHALL gravar o valor no tipo da coluna (`INT`, `DECIMAL`, `DATE` ou `TINYINT`), não como texto. (COL-07)
8. WHILE uma pergunta não foi respondida ou não se aplica, the system SHALL manter `NULL` em todas as colunas dela. (COL-08)
9. The system SHALL não ter as tabelas `TB_Resposta_Pre_Curso`, `TB_Resposta_Pos_Curso` e `TB_Resposta_Avaliacao` nem as colunas `Chave`, `Ordem` e `Valor` em `TB_Dado_Pessoal_Aluno`. (COL-09)
10. The system SHALL ter um mapeamento único em que cada chave dos quatro schemas Zod corresponde a colunas existentes no modelo, e cada coluna de resposta do modelo corresponde a exatamente uma chave. (COL-10)

**Independent Test**: preencher um Pré-Curso pela API (escolha única, múltipla, discursiva, "Qual?", nota, número e data) e conferir no banco uma linha com as colunas `P*` nos valores da tabela do documento de formato.

---

### P1: Nenhum comportamento existente regride ⭐ MVP

**User Story**: Como usuário dos formulários, quero que tudo funcione exatamente como antes, para que a troca de formato no banco seja invisível nas telas.

**Why P1**: A feature atravessa quatro features DONE e em produção.

**Acceptance Criteria**:

1. WHEN um formulário é lido pela API depois de gravado THEN o sistema SHALL devolver o mesmo objeto `{ chave: valor }`, com o texto das opções, que devolvia antes desta feature para as mesmas respostas, com duas exceções decididas nas premissas: a múltipla escolha volta na ordem do questionário, e um decimal volta arredondado para 2 casas, a precisão da coluna. (COL-11)
2. WHEN um `PATCH` regrava uma chave THEN o sistema SHALL substituir só as colunas daquela chave e SHALL deixar as colunas das demais chaves inalteradas. (COL-12)
3. WHEN uma chave de múltipla escolha é regravada com menos opções THEN o sistema SHALL gravar `0` nas colunas das opções que saíram da seleção. (COL-13)
4. WHEN um `PATCH` envia `null` para uma chave THEN o sistema SHALL gravar `NULL` em todas as colunas daquela chave. (COL-14)
5. WHEN um formulário é encerrado THEN o sistema SHALL gravar `NULL` nas colunas das respostas condicionais que não se aplicam (AD-038), na mesma transação que grava `status=ENCERRADO`. (COL-15)
6. The system SHALL manter, sem alteração de asserção, o comportamento já especificado de completude, condicionais, recusa HTTP 409 em formulário encerrado, recusa HTTP 400 por validação ou pelo gate da Parte 1, e autorização dos quatro formulários. A única asserção que muda é a ordem esperada da múltipla escolha, pela mesma premissa do COL-11. (COL-16)

**Independent Test**: as suítes existentes das quatro features passam; só mudam fixtures e asserções que leem as tabelas antigas direto no banco.

---

### P1: Migração das respostas de produção ⭐ MVP

**User Story**: Como responsável pelo dado, quero as respostas já gravadas no formato novo, para que a mudança não custe o histórico de produção.

**Why P1**: Há respostas reais em produção.

**Acceptance Criteria**:

1. WHEN a migração roda sobre respostas de chaves vigentes THEN o sistema SHALL gravar cada resposta na(s) coluna(s) correspondente(s), convertendo o texto da opção para a letra, com o mesmo valor que a gravação pela API produziria. (COL-17)
2. WHEN a migração encontra uma pergunta de múltipla escolha respondida THEN o sistema SHALL gravar `1` nas opções presentes e `0` nas demais opções da pergunta. (COL-18)
3. WHEN a migração encontra linhas de chaves ausentes do schema atual THEN o sistema SHALL descartá-las sem abortar. (COL-19)
4. IF algum valor gravado de uma chave vigente não corresponder a nenhuma opção atual daquela pergunta THEN a migração SHALL abortar antes de remover qualquer tabela antiga, com erro que nomeia o formulário. (COL-20)
5. IF, para algum formulário, o número de respostas de chaves vigentes nas tabelas antigas diferir do número de valores gravados nas colunas novas (escalares não nulas + opções com `1`) THEN a migração SHALL abortar antes de remover qualquer tabela antiga, com erro que nomeia o formulário. (COL-21)
6. IF a migração aborta THEN o sistema SHALL manter as tabelas antigas e o seu conteúdo inalterados. (COL-22)
7. WHEN a migração termina THEN o sistema SHALL ter preservado status, datas e todas as demais colunas já existentes dos formulários. (COL-23)
8. WHEN a migração roda sobre um formulário sem nenhuma resposta THEN o sistema SHALL deixar todas as colunas de resposta dele em `NULL` e SHALL concluir sem erro. (COL-24)

**Independent Test**: semear as tabelas antigas com respostas dos quatro formulários (incluindo múltipla, "Qual?", nota, data, uma chave órfã), rodar a migração e conferir coluna a coluna; semear um texto inválido e conferir que a migração aborta e as tabelas antigas ficam intactas.

---

### P1: Filtro e cruzamento por pergunta direto na tabela

**User Story**: Como analista no Power BI, quero filtrar uma pergunta e agrupar por outra numa única tabela, para montar as análises sem pivotar dados.

**Why P1**: É a razão de ser da mudança.

**Acceptance Criteria**:

1. WHEN uma consulta filtra uma coluna de pergunta e agrupa por outra do mesmo formulário THEN o sistema SHALL responder com um `SELECT` sobre uma única tabela, sem `JOIN`, subconsulta ou pivot. (COL-25)
2. WHEN uma consulta soma a coluna de uma opção de múltipla escolha THEN o sistema SHALL devolver o número de formulários que marcaram aquela opção. (COL-26)

**Independent Test**: com cursos semeados, `SELECT P12, COUNT(*) FROM TB_Pre_Curso WHERE P11 = 'b' GROUP BY P12` e `SELECT SUM(P20a) FROM TB_Pre_Curso` devolvem as contagens esperadas.

---

### P2: Regra de manutenção registrada

**User Story**: Como mantenedor, quero a regra de nomes e de mudanças futuras registrada, para que a próxima alteração de questionário não quebre a série histórica.

**Why P2**: Não muda comportamento, mas evita retrabalho e perda de dado na próxima revisão do MTur.

**Acceptance Criteria**:

1. The system SHALL ter em `.specs/STATE.md` uma AD que rescinde a AD-041 e registra a regra de nomes, a regra "opção nova no fim da lista" e a regra "pergunta retirada mantém a coluna". (COL-27)
2. The system SHALL ter em `docs/DEPLOY_PRODUCAO.md` o passo de backup antes do deploy desta migração e o procedimento para quando ela abortar. (COL-28)

---

## Edge Cases

- IF uma chave é regravada com o mesmo valor que já tem THEN o sistema SHALL manter as colunas com o mesmo valor, sem erro. (COL-29)
- IF duas gravações concorrentes tocam o mesmo formulário THEN o sistema SHALL aplicar cada `PATCH` por inteiro numa única transação, sem que uma gravação parcial fique visível. (COL-30)
- WHEN o Aluno é removido THEN o sistema SHALL remover a linha dele em `TB_Dado_Pessoal_Aluno` por constraint física (PESSOAL-09 preservado). (COL-31)
- WHEN uma pergunta de múltipla escolha tem opção exclusiva ("Não foram…") THEN o sistema SHALL tratá-la como uma coluna 1/0 igual às demais. (COL-32)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| COL-01 | P1: Pergunta é coluna | Execute | Implementing (T2) |
| COL-02 | P1: Pergunta é coluna | Execute | Implementing (T2) |
| COL-03 | P1: Pergunta é coluna | Execute | Implementing (T1) |
| COL-04 | P1: Pergunta é coluna | Execute | Implementing (T1) |
| COL-05 | P1: Pergunta é coluna | Execute | Implementing (T1) |
| COL-06 | P1: Pergunta é coluna | Execute | Implementing (T1) |
| COL-07 | P1: Pergunta é coluna | Execute | Implementing (T9) |
| COL-08 | P1: Pergunta é coluna | Execute | Implementing (T1) |
| COL-09 | P1: Pergunta é coluna | Execute | Implementing (T2) |
| COL-10 | P1: Pergunta é coluna | Execute | Implementing (T2) |
| COL-11 | P1: Sem regressão | Execute | Implementing (T8) |
| COL-12 | P1: Sem regressão | Execute | Implementing (T2, verificado no T3) |
| COL-13 | P1: Sem regressão | Execute | Implementing (T2, verificado no T3) |
| COL-14 | P1: Sem regressão | Execute | Implementing (T2, verificado no T3) |
| COL-15 | P1: Sem regressão | Execute | Implementing (T2, verificado no T3) |
| COL-16 | P1: Sem regressão | Execute | Implementing (T10) |
| COL-17 | P1: Migração | Execute | Implementing (T7) |
| COL-18 | P1: Migração | Execute | Implementing (T11) |
| COL-19 | P1: Migração | Execute | Implementing (T3) |
| COL-20 | P1: Migração | Execute | Implementing (T7) |
| COL-21 | P1: Migração | Execute | Implementing (T3) |
| COL-22 | P1: Migração | Execute | Implementing (T3) |
| COL-23 | P1: Migração | Execute | Implementing (T3) |
| COL-24 | P1: Migração | Execute | Implementing (T3) |
| COL-25 | P1: Filtro e cruzamento | Execute | Implementing (T4) |
| COL-26 | P1: Filtro e cruzamento | Execute | Implementing (T4) |
| COL-27 | P2: Regra registrada | Execute | Implementing (T6) |
| COL-28 | P2: Regra registrada | Execute | Implementing (T10) |
| COL-29 | Edge case | Execute | Implementing (T2, verificado no T3) |
| COL-30 | Edge case | Execute | Implementing (T2, verificado no T3) |
| COL-31 | Edge case | Execute | Implementing (T2, verificado no T3) |
| COL-32 | Edge case | Execute | Implementing (T1) |

**Coverage:** 32 total, 0 mapped to tasks, 32 unmapped ⚠️ (mapeamento no Tasks).

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Zod segue a autoridade, sem mudança (COL-16); tipos de coluna fixam os limites físicos (COL-07). |
| Failure / partial-failure states | Migração que aborta sem tocar nas tabelas antigas (COL-20, COL-21, COL-22); `PATCH` em transação (COL-30). |
| Idempotency / retry / duplicate handling | Regravação idempotente (COL-29); a migração roda uma vez pelo registro do Prisma, e o reprocessamento depois de um aborto está no procedimento de COL-28. |
| Auth boundaries & rate limits | N/A because a feature não toca guardas nem rotas; coberto pela invariância de COL-16. |
| Concurrency / ordering | COL-30. |
| Data lifecycle / expiry | Cascata do Aluno (COL-31); remover um formulário remove as respostas porque estão na mesma linha. |
| Observability | O erro de aborto da migração nomeia o formulário (COL-20, COL-21). |
| External-dependency failure | N/A because não há chamada externa; o acesso do Power BI está fora do escopo. |
| State-transition integrity | Encerramento irreversível e limpeza das condicionais preservados (COL-15, COL-16). |

---

## Success Criteria

- [ ] As quatro tabelas de formulário têm uma linha por formulário e uma coluna `P*` por pergunta; as tabelas antigas não existem mais.
- [ ] Um banco semeado no formato antigo migra coluna a coluna para os valores esperados, e um banco com texto inválido faz a migração abortar sem perda.
- [ ] As suítes existentes passam sem enfraquecer nenhuma asserção.
- [ ] Gate completo verde: `lint && typecheck && build && test:unit && test:integration && test:e2e`.
