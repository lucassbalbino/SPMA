# Dados Pessoais Separados Specification

**Escopo:** Complex (mudança de produto + schema físico com migração de dados + gate de navegação; o questionário do curso encolhe de 19 para 12 perguntas na Parte 1, e as 7 restantes passam a ser coletadas no primeiro acesso. Atravessa `avaliacao-aluno` e `auth-e-usuarios`, ambas DONE e validadas).

**Fonte funcional:** dois pedidos do usuário nesta sessão, registrados em `context.md`.

**Decisões que esta feature herda:** AD-041 (respostas normalizadas em linha), AD-004 (Zod como autoridade de forma), AD-023 (gate Parte 1 → Parte 2), AD-022 (mesmo aluno em vários cursos), REQ-AU-02 (gate de primeiro acesso).

## Problem Statement

As 7 perguntas de dados pessoais do Aluno — estado, município, gênero, faixa etária, escolaridade, cor/raça/etnia e condição PCD — vivem hoje dentro do questionário de avaliação de um curso, misturadas na mesma tabela e respondidas de novo a cada curso. São atributos da pessoa, não do curso: um Aluno é a mesma pessoa em qualquer curso que faça. O usuário quer duas coisas, e elas são a mesma coisa vista de dois lados: que esses dados fiquem **separados na base**, e que sejam coletados **uma vez, logo após o Aluno criar a senha**, de forma obrigatória antes de usar qualquer parte da plataforma.

## Goals

- [ ] O Aluno responde as 7 perguntas uma vez, no primeiro acesso, e não as vê mais em nenhum curso.
- [ ] Enquanto não responder, nenhuma outra tela da plataforma abre para ele.
- [ ] O dado pessoal vive em tabela própria, com uma linha por Aluno — não por matrícula.
- [ ] O questionário do curso perde essas 7 perguntas e mantém as outras 12 da Parte 1 intactas.
- [ ] O Aluno pode alterar esses dados depois, pelo perfil.
- [ ] As respostas pessoais já gravadas são descartadas e recoletadas, sem apagar conta nem avaliação de curso.
- [ ] Nenhum perfil além do Aluno é afetado.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Q1 (nome) e Q2 (CPF) | Já vivem em `TB_Usuario`, fora do questionário — não há o que separar. |
| Situação profissional (Q10–Q13) e experiência (Q14–Q16) | Decisão do usuário: só as 9 primeiras entram. Ficam no questionário do curso. |
| Foto histórica dos dados pessoais por curso | Consequência aceita: ver Assumptions. Uma avaliação antiga passa a exibir o dado atual do Aluno. |
| Apagar contas de Aluno ou avaliações existentes | O usuário autorizou ("pode excluir e reiniciar a table alunos"), mas o mesmo efeito se obtém descartando só as 7 respostas pessoais: todo Aluno cai no gate e responde de novo, sem perder conta nem avaliação de curso. Apagar Alunos numa migration rodaria em todo ambiente, inclusive produção. Limpeza de dados de demonstração em dev, se desejada, é script à parte. |
| Gate para Gestores e Visualizadores | Decisão do usuário: só o Aluno. |
| Política de acesso, retenção ou anonimização | A fronteira torna isso possível; nenhuma política é implementada. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que conta como "dado pessoal" | As 7 chaves da seção DADOS PESSOAIS do cliente, Q3–Q9 (`avalPessoal*`) | Fronteira desenhada pelo próprio cliente no questionário | **y** ("apenas as 9 primeiras entram") |
| Quem responde | Só o perfil `AL` | O questionário é o "FORMULÁRIO DO ALUNO"; obrigar um Gestor a declarar raça e deficiência para abrir a plataforma não é o pedido | **y** ("Só o Aluno") |
| Onde aparece | Na tela principal (`/painel`), logo após o login | Palavras do usuário: "aparecem após o login, na tela principal" | **y** |
| Destino das 7 na avaliação do curso | Somem; a avaliação não as pergunta nem as exibe | **y** ("segue a primeira opção") |
| Cardinalidade | **Uma linha por Aluno**, chave só o CPF | Forçado pelo pedido: a coleta acontece antes de existir qualquer curso | y (consequência, não escolha) |
| Fidelidade histórica | Aceita a perda: avaliação antiga passa a exibir o dado atual | Faixa etária e escolaridade mudam. A alternativa (foto no encerramento) foi oferecida e não escolhida | **y** (escolha explícita da opção sem foto) |
| Aluno que já tem senha hoje | Também é barrado até responder | Senão o gate só valeria para contas novas e o dado nunca ficaria completo | y (decisão do agente, baixo risco) |
| Dados pessoais já respondidos | **Descartados**; todo Aluno responde de novo no próximo login | O usuário autorizou reiniciar os Alunos. Descartar só as respostas pessoais resolve de uma vez o problema de qual conjunto vence quando o Aluno respondeu em dois cursos, sem apagar conta nem avaliação | **y** ("os alunos já existentes pode excluir e reiniciar") |
| Edição posterior | Pelo perfil, a qualquer momento, só pelo próprio Aluno | **y** ("posteriormente poderão ser alterados através do perfil") |

**Open questions:** none — as decisões em aberto estão acima com o custo de cada uma.

---

## User Stories

### P1: Coleta obrigatória no primeiro acesso ⭐ MVP

**User Story**: Como responsável pelo programa, quero que o Aluno informe seus dados pessoais assim que criar a senha, para que nenhum Aluno use a plataforma sem esse cadastro completo.

**Why P1**: É metade do pedido. Sem o bloqueio, o dado continua opcional na prática.

**Acceptance Criteria**:

1. WHEN um Aluno conclui a criação de senha e chega à tela principal THEN o sistema SHALL exibir as 7 perguntas de dados pessoais. (PESSOAL-01)
2. WHILE um Aluno não tiver as 7 respostas gravadas, the system SHALL impedir o acesso a qualquer outra tela protegida, redirecionando para a tela principal. (PESSOAL-02)
3. WHEN o Aluno grava as 7 respostas THEN o sistema SHALL liberar a navegação e SHALL não exibir o questionário de novo. (PESSOAL-03)
4. IF o usuário autenticado não é Aluno THEN o sistema SHALL não exigir nem exibir o questionário, e SHALL não alterar a navegação dele. (PESSOAL-04)
5. IF o envio das respostas é incompleto ou inválido THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nenhuma linha. (PESSOAL-05)
6. WHILE um Aluno cadastrado antes desta feature não tiver respondido, the system SHALL aplicar o mesmo bloqueio. (PESSOAL-06)

**Independent Test**: logar como Aluno recém-criado, tentar abrir uma tela protegida e conferir o redirecionamento; responder as 7 e conferir que a navegação abre.

---

### P1: Dado pessoal do Aluno, uma vez só ⭐ MVP

**User Story**: Como responsável pelo dado, quero o dado pessoal do Aluno numa tabela própria, com um registro por pessoa, para que ele deixe de ser resposta de questionário de curso.

**Why P1**: É a outra metade do pedido.

**Acceptance Criteria**:

1. The system SHALL persistir o dado pessoal em `TB_Dado_Pessoal_Aluno`, com uma linha por (Aluno, pergunta, posição). (PESSOAL-07)
2. The system SHALL impedir, por constraint física, duas linhas para o mesmo par (Aluno, pergunta, posição). (PESSOAL-08)
3. WHEN um Aluno é removido THEN o sistema SHALL remover os dados pessoais dele, sem deixar órfãos. (PESSOAL-09)
4. The system SHALL declarar num único lugar do código quais chaves são pessoais, e SHALL derivar dele a gravação, a leitura e o gate. (PESSOAL-10)

**Independent Test**: gravar os dados pelo fluxo de primeiro acesso e conferir uma linha por pergunta na tabela nova, nenhuma em `TB_Resposta_Avaliacao`.

---

### P1: O questionário do curso encolhe ⭐ MVP

**User Story**: Como Aluno, quero não responder de novo meus dados pessoais a cada curso, para que a avaliação trate só do curso.

**Why P1**: Sem isso, a separação seria só física e o Aluno continuaria redigitando.

**Acceptance Criteria**:

1. WHEN o formulário de avaliação de um curso é exibido THEN o sistema SHALL não apresentar nenhuma das 7 perguntas de dados pessoais. (PESSOAL-11)
2. WHEN a completude da Parte 1 é avaliada THEN o sistema SHALL considerar apenas as 12 perguntas restantes, e SHALL produzir o mesmo veredito que produziria com elas. (PESSOAL-12)
3. IF um `PATCH` de avaliação envia uma chave de dado pessoal THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nenhuma linha. (PESSOAL-13)
4. The system SHALL manter inalteradas as guardas de autorização da avaliação e o gate Parte 1 → Parte 2 nas 12 perguntas que sobram. (PESSOAL-14)
5. The system SHALL manter inalterado o restante do contrato HTTP da avaliação. (PESSOAL-15)

**Independent Test**: abrir o formulário de avaliação e conferir que as 7 perguntas não existem na tela; enviar uma delas por `PATCH` e receber 400.

---

### P1: Edição posterior pelo perfil ⭐ MVP

**User Story**: Como Aluno, quero poder corrigir meus dados pessoais depois, pelo perfil, para que um erro de digitação ou uma mudança de vida não fique preso para sempre.

**Why P1**: Pedido explícito do usuário. Sem isso, o dado coletado no primeiro acesso seria imutável — e escolaridade e município mudam.

**Acceptance Criteria**:

1. WHEN um Aluno abre o perfil THEN o sistema SHALL exibir as 7 respostas atuais dele, editáveis. (PESSOAL-16)
2. WHEN o Aluno grava uma alteração válida THEN o sistema SHALL substituir as respostas alteradas e SHALL deixar as demais inalteradas. (PESSOAL-17)
3. IF a alteração deixa alguma das 7 vazia ou inválida THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nada, mantendo o Aluno com o cadastro completo. (PESSOAL-18)
4. The system SHALL permitir que cada Aluno edite apenas os próprios dados, recusando com 403 qualquer tentativa sobre outro CPF. (PESSOAL-19)
5. IF o usuário não é Aluno THEN o sistema SHALL não oferecer essa área de perfil. (PESSOAL-20)

**Independent Test**: responder no primeiro acesso, abrir o perfil, alterar uma resposta e conferir a mudança persistida; tentar editar o CPF de outro Aluno e receber 403.

---

### P1: Descarte das respostas pessoais já gravadas ⭐ MVP

**User Story**: Como responsável pelo dado, quero as respostas pessoais antigas descartadas e recoletadas, para que não exista dado pessoal do lado errado da fronteira.

**Why P1**: Sem isso, sobra dado pessoal em `TB_Resposta_Avaliacao` e a separação é só parcial.

**Acceptance Criteria**:

1. WHEN a migração roda THEN o sistema SHALL remover de `TB_Resposta_Avaliacao` todas as linhas cuja chave é pessoal. (PESSOAL-21)
2. WHEN a migração termina THEN o sistema SHALL ter deixado intactas todas as linhas de chave não-pessoal. (PESSOAL-22)
3. WHEN a migração termina THEN o sistema SHALL ter preservado as contas de Aluno, as avaliações e as colunas `status`, `parte1Completa` e `dataEncerramento` inalteradas. (PESSOAL-23)
4. WHEN a migração roda sobre um banco sem nenhuma resposta pessoal THEN o sistema SHALL concluir sem erro. (PESSOAL-24)

**Independent Test**: semear avaliações com respostas dos dois tipos, rodar a migração real lida do disco e conferir que só as não-pessoais restaram, com as avaliações e contas intactas.

---

### Edge cases

- IF uma pergunta pessoal de múltipla escolha é regravada com menos opções THEN o sistema SHALL remover as linhas das opções que saíram. (PESSOAL-25)
- IF a gravação falha no meio THEN o sistema SHALL não deixar nenhuma linha gravada. (PESSOAL-26)
- IF um Aluno já respondeu e acessa a tela principal THEN o sistema SHALL exibir a tela principal normal, sem o questionário. (PESSOAL-27)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PESSOAL-01 | P1: Coleta no 1º acesso | Execute | Done (T8, T9) |
| PESSOAL-02 | P1: Coleta no 1º acesso | Execute | Done (T7) |
| PESSOAL-03 | P1: Coleta no 1º acesso | Execute | Done (T8, T9) |
| PESSOAL-04 | P1: Coleta no 1º acesso | Execute | Done (T7, T9) |
| PESSOAL-05 | P1: Coleta no 1º acesso | Execute | Done (T8, T9) |
| PESSOAL-06 | P1: Coleta no 1º acesso | Execute | Done (T2, T7) |
| PESSOAL-07 | P1: Uma vez só | Execute | Done (T2, T3) |
| PESSOAL-08 | P1: Uma vez só | Execute | Done (T2) |
| PESSOAL-09 | P1: Uma vez só | Execute | Done (T2) |
| PESSOAL-10 | P1: Uma vez só | Execute | Done (T1) |
| PESSOAL-11 | P1: Questionário encolhe | Execute | Done (T4, T5) |
| PESSOAL-12 | P1: Questionário encolhe | Execute | Done (T4) |
| PESSOAL-13 | P1: Questionário encolhe | Execute | Done (T5) |
| PESSOAL-14 | P1: Questionário encolhe | Execute | Done (T4) |
| PESSOAL-15 | P1: Questionário encolhe | Execute | Done (T4) |
| PESSOAL-16 | P1: Edição pelo perfil | Execute | Done (T10) |
| PESSOAL-17 | P1: Edição pelo perfil | Execute | Done (T8, T10) |
| PESSOAL-18 | P1: Edição pelo perfil | Execute | Done (T8, T10) |
| PESSOAL-19 | P1: Edição pelo perfil | Execute | Done (T8, T10) |
| PESSOAL-20 | P1: Edição pelo perfil | Execute | Done (T8, T10) |
| PESSOAL-21 | P1: Descarte do antigo | Execute | Done (T6) |
| PESSOAL-22 | P1: Descarte do antigo | Execute | Done (T6) |
| PESSOAL-23 | P1: Descarte do antigo | Execute | Done (T6) |
| PESSOAL-24 | P1: Descarte do antigo | Execute | Done (T6) |
| PESSOAL-25 | Edge case | Execute | Done (T3, por reuso — ver design.md) |
| PESSOAL-26 | Edge case | Execute | Done (T3) |
| PESSOAL-27 | Edge case | Execute | Done (T9) |

**Coverage:** 27 total, 27 mapeados em tasks (T1-T11), 27 Done após T10, 0 Pending, 0 unmapped.

---

## Success Criteria

- [ ] Um Aluno novo não abre nenhuma tela da plataforma sem responder as 7 perguntas.
- [ ] Nenhum perfil além do Aluno muda de comportamento.
- [ ] O formulário de avaliação não contém nenhuma das 7 perguntas.
- [ ] Nenhuma linha de chave pessoal permanece em `TB_Resposta_Avaliacao`.
- [ ] O Aluno consegue alterar os próprios dados pelo perfil, e só os próprios.
- [ ] Nenhuma conta de Aluno nem avaliação de curso foi apagada pela migração.
- [ ] Gate completo verde: `lint && build && typecheck && test:unit && test:integration && test:e2e`.
