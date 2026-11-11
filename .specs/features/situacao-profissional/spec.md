# Situação Profissional de volta ao formulário do aluno — Specification

**Fonte funcional:** pedido do usuário em 2026-11-11: "retorne com essas perguntas, afinal elas não deveriam ser retiradas, mas retorne apenas com a pergunta 10 a 13". O cliente reclamou que as perguntas 10 a 13 não aparecem no formulário do aluno nem no banco. Decisões tomadas com o usuário na mesma data (ver Assumptions).

## Problem Statement

A AD-048 (revisão do MTur, item 3.3) tirou do formulário do aluno o bloco "Situação Profissional" (P10–P13) e apagou as respostas já gravadas. O cliente diz que esse bloco não deveria ter saído. Hoje a tela vai dos dados pessoais direto para a P14, e a TB_Avaliacao_Aluno não tem coluna P10 a P13. Por isso o Power BI não recebe esses dados.

## Goals

- [ ] O aluno volta a responder P10–P13 na Parte 1 da avaliação, com o texto, as opções e a numeração do questionário original.
- [ ] As respostas ficam nas colunas `P10`–`P13` de `TB_Avaliacao_Aluno` e aparecem na VIEW `bi.TB_Avaliacao_Aluno`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| P28 (Continuidade nos Estudos) e P30–P34 (Oportunidades, Efetivação e Renda) | O usuário pediu "apenas a pergunta 10 a 13". Seguem fora, como na AD-048 (itens 3.4 a 3.6). |
| Recuperar as respostas de P10–P13 apagadas em 2026-10-20 | Só existem num backup de produção anterior ao deploy da AD-048. Isso é operação de banco, fora do código. |
| Numerar na tela as perguntas 1 a 9 dos dados pessoais | Não foi pedido. É outra tela (`DadosPessoaisForm`). |
| Rever as opções de P12 com os nomes que o MTur deu às áreas do pré-curso | Os renomes 1.5 a 1.10 da AD-048 valem para o Formulário 1 (pré-curso), não para o do aluno. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Obrigatoriedade | P10, P11 e P13 são sempre exigidas para a Parte 1 ficar completa. P12 só é exigida quando P11 = "Sim" | Igual ao questionário original. Decisão do usuário: "Obrigatórias" | y |
| Avaliações em andamento | Toda avaliação `EM_ANDAMENTO` volta a ter `Parte1_Completa = false` na migration. O aluno responde P10–P13 antes de gravar a Parte 2 ou encerrar. As respostas da Parte 2 já gravadas ficam como estão | Decisão do usuário: "Volta a responder". Nenhuma avaliação tem P10–P13 hoje, então nenhuma tem a Parte 1 completa pelas regras novas | y |
| Avaliações encerradas | Ficam como estão: status, `Parte1_Completa`, datas e respostas não mudam. P10–P13 ficam `NULL` | Encerramento é irreversível (AD-023). O aluno não tem como responder de novo | y |
| Texto e opções | Os do questionário antes da AD-048 (`git show 33ab9a6^:docs/Questionario_do_Aluno_1.md`), sem alteração. Isso inclui "Estagiário(a)." com ponto e "Alojamento (meios de hospedagem)" | O pedido é devolver o que saiu. Mudar texto agora seria outra decisão do cliente | y |
| Armazenamento | Cada pergunta é uma coluna `CHAR(1)` com a letra da opção, como toda escolha única da AD-051 | Formato aprovado na AD-051, não reabrir | y |
| Numeração | Os rótulos voltam com "10." a "13.", e as demais perguntas mantêm o número que já têm | Mantém a política da AD-048 (MTUR-12) e o nome das colunas | y |
| Título da Parte 1 | Volta a ser "Parte 1 — Situação Profissional e Motivação" | Título anterior à AD-048 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Aluno responde Situação Profissional ⭐ MVP

**User Story**: Como aluno, quero responder as perguntas 10 a 13 na Parte 1 da avaliação, para que o cliente tenha minha situação profissional no início do curso.

**Why P1**: É o pedido do cliente.

**Acceptance Criteria**:

1. The system SHALL exibir, como primeiro bloco da Parte 1 da avaliação, o bloco "Situação Profissional" com os rótulos "10. Qual sua condição atual de trabalho?", "11. Atualmente você trabalha na área de Turismo?", "12. Se sim, em qual atividade?" e "13. Qual a sua faixa de renda mensal", antes do bloco "Experiência". (SPR-01)
2. The system SHALL aceitar em P10 exatamente as 9 opções, em P11 "Sim"/"Não", em P12 exatamente as 10 opções e em P13 exatamente as 7 opções do questionário original, na ordem do papel. (SPR-02)
3. IF o PATCH da avaliação traz em P10–P13 um valor fora dessas opções THEN the system SHALL responder 400 e não gravar nada. (SPR-03)
4. WHILE P11 não é "Sim" the system SHALL esconder a P12 na tela. (SPR-04)
5. WHEN P10, P11 ou P13 está em branco THEN the system SHALL considerar a Parte 1 incompleta e listar a chave em branco nas pendências. (SPR-05)
6. WHEN P11 = "Sim" e P12 está em branco THEN the system SHALL considerar a Parte 1 incompleta e listar `avalProfissAtividadeEspecifica` nas pendências. (SPR-06)
7. WHEN P11 = "Não" e P12 está em branco THEN the system SHALL não cobrar a P12. (SPR-07)
8. IF a Parte 1 está incompleta por falta de P10–P13 e o PATCH traz uma chave da Parte 2 THEN the system SHALL responder 400 "Complete a Parte 1 antes de responder a avaliação do curso" e não gravar nada. (SPR-08)
9. WHEN o aluno encerra uma avaliação com P11 = "Não" e P12 preenchida THEN the system SHALL descartar a P12 (condicional órfã), como faz com a P16. (SPR-09)
10. The system SHALL exibir o título "Parte 1 — Situação Profissional e Motivação". (SPR-10)

**Independent Test**: abrir a avaliação de um aluno, ver o bloco "Situação Profissional" com as perguntas 10 a 13, responder e conferir que a Parte 2 só destrava depois.

---

### P1: Respostas no banco e no Power BI ⭐ MVP

**User Story**: Como cliente, quero ver P10–P13 na tabela da avaliação e no Power BI, para filtrar os alunos por situação profissional.

**Why P1**: A segunda metade da reclamação é que a pergunta "não aparece na base".

**Acceptance Criteria**:

1. The system SHALL guardar P10, P11, P12 e P13 nas colunas `P10`, `P11`, `P12` e `P13` (`CHAR(1)`, aceitando `NULL`) de `TB_Avaliacao_Aluno`, com a letra da opção (`a` = primeira). (SPR-11)
2. WHEN a avaliação é lida THEN the system SHALL devolver P10–P13 com o texto da opção gravada. (SPR-12)
3. The system SHALL incluir `P10`, `P11`, `P12` e `P13` na VIEW `bi.TB_Avaliacao_Aluno` de `scripts/views-bi.sql`, depois de `Data_Encerramento` e antes de `P14`. (SPR-13)

**Independent Test**: gravar P10–P13 por PATCH e ler as colunas e a VIEW.

---

### P1: Avaliações já existentes ⭐ MVP

**User Story**: Como cliente, quero que os alunos com avaliação em aberto também respondam P10–P13, para que nenhuma avaliação nova seja encerrada sem elas.

**Why P1**: Decisão do usuário ("Volta a responder").

**Acceptance Criteria**:

1. WHEN a migration roda THEN the system SHALL pôr `Parte1_Completa = false` em toda avaliação `EM_ANDAMENTO`. (SPR-14)
2. WHEN a migration roda THEN the system SHALL manter `Status`, `Parte1_Completa`, `Data_Encerramento` e as respostas de toda avaliação `ENCERRADO`. (SPR-15)
3. WHEN a migration roda THEN the system SHALL manter todas as respostas já gravadas (P14 a P38) de toda avaliação. (SPR-16)

**Independent Test**: semear uma avaliação aberta com a Parte 1 completa e uma encerrada, rodar o UPDATE da migration e conferir as duas.

---

## Edge Cases

- WHEN um aluno com a Parte 2 já respondida abre a avaliação depois da migration THEN the system SHALL mostrar a Parte 2 bloqueada até ele completar P10–P13, sem apagar o que ele já respondeu (coberto por SPR-08, SPR-14 e SPR-16).
- WHEN o aluno muda P11 de "Sim" para "Não" numa gravação THEN the system SHALL preservar a P12 gravada até o encerramento, como as demais condicionais do PATCH (coberto por SPR-09).

Outras dimensões implícitas: N/A neste escopo. Autorização, concorrência e idempotência do PATCH e do encerramento não mudam.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SPR-01 | P1: Aluno responde | Execute | Verified |
| SPR-02 | P1: Aluno responde | Execute | Verified |
| SPR-03 | P1: Aluno responde | Execute | Verified |
| SPR-04 | P1: Aluno responde | Execute | Verified |
| SPR-05 | P1: Aluno responde | Execute | Verified |
| SPR-06 | P1: Aluno responde | Execute | Verified |
| SPR-07 | P1: Aluno responde | Execute | Verified |
| SPR-08 | P1: Aluno responde | Execute | Verified |
| SPR-09 | P1: Aluno responde | Execute | Verified |
| SPR-10 | P1: Aluno responde | Execute | Verified |
| SPR-11 | P1: Banco e Power BI | Execute | Verified |
| SPR-12 | P1: Banco e Power BI | Execute | Verified |
| SPR-13 | P1: Banco e Power BI | Execute | Verified |
| SPR-14 | P1: Avaliações existentes | Execute | Verified |
| SPR-15 | P1: Avaliações existentes | Execute | Verified |
| SPR-16 | P1: Avaliações existentes | Execute | Verified |

**Coverage:** 16 total, 16 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Um aluno novo não consegue encerrar a avaliação sem responder P10, P11 e P13 (e P12 quando P11 = "Sim").
- [ ] A VIEW `bi.TB_Avaliacao_Aluno` mostra as colunas `P10`–`P13` depois do deploy e de `views-bi.sql`.
