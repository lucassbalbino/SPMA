# Oportunidades de Trabalho e Renda de volta ao formulário do aluno — Specification

**Fonte funcional:** pedido do usuário em 2026-11-17: "Retorne com as questões 30 até a 34 do formulário do Aluno, volte na totalidade". Segue a AD-053, que devolveu as perguntas 10 a 13 pelo mesmo motivo.

## Problem Statement

A AD-048 (revisão do MTur, itens 3.4 e 3.5) tirou do formulário do aluno as perguntas 30 a 34: "Oportunidades Reais de Trabalho e Emprego" (30, com o "Outra. Quais?", e 31) e "Efetivação no Emprego e Aumento da Renda" (32 a 34). As respostas já gravadas foram apagadas. O cliente quer as cinco perguntas de volta, como eram, na tela, no banco e no Power BI.

## Goals

- [ ] O aluno que concluiu o curso volta a responder 30 a 34 na Parte 2, com o texto, as opções e as regras de antes da AD-048.
- [ ] As respostas ficam nas colunas `P30`, `P30Qual`, `P31`, `P32`, `P33` e `P34` de `TB_Avaliacao_Aluno` e aparecem na VIEW `bi.TB_Avaliacao_Aluno`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| P28 (Continuidade nos Estudos, item 3.6 do MTur) | O pedido é "30 até a 34". A P28 segue fora. |
| Recuperar as respostas de 30 a 34 apagadas em 2026-10-20 | Só existem no backup anterior ao deploy da AD-048. É operação de banco, fora do código. |
| Mudar texto ou opções | "Volte na totalidade": o texto e as opções são os de antes. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Regras | As do formulário antes da AD-048: as 5 perguntas ficam no bloco "Avaliação do curso (apenas para quem concluiu)". 30, 31, 32, 33 e 34 são exigidas para encerrar quando P22 = "Sim". O "Outra. Quais?" só é exigido quando P30 = "Outra" | "Volte na totalidade" | y |
| Quem não concluiu | Com P22 = "Não", as 6 chaves ficam bloqueadas na tela e são descartadas no encerramento, como as demais do bloco de concluinte | Mesma regra de antes e das outras perguntas de concluinte | y |
| Avaliações em andamento | Não mudam no banco. Quem concluiu passa a ter 30 a 34 cobradas no encerramento. `Parte1_Completa` não muda: as perguntas são da Parte 2 | A completude da Parte 2 só é calculada no encerramento | y |
| Avaliações encerradas | Ficam como estão, com as colunas novas vazias | Encerramento é irreversível (AD-023) | y |
| Armazenamento | `P30`, `P31`, `P32`, `P33` e `P34` em `CHAR(1)` com a letra da opção. O "Outra. Quais?" em `P30Qual` (`TEXT`), no padrão de `P9Qual`, `P10Qual` e `P27Qual` | AD-051 | y |
| Posição | As colunas entram depois de `P29f` e antes de `P35`, na tabela e na VIEW | Ordem do questionário | y |
| Telas | Dois blocos, como antes: "Oportunidades Reais de Trabalho e Emprego" (30, "30. Outra. Quais?" e 31) e "Efetivação no Emprego e Aumento da Renda" (32 a 34), entre "Motivações após o Curso" e "Avaliação geral" | Formulário de antes da AD-048 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Aluno responde Oportunidades, Efetivação e Renda ⭐ MVP

**User Story**: Como aluno que concluiu o curso, quero responder as perguntas 30 a 34, para que o cliente saiba o que mudou no meu trabalho e na minha renda.

**Why P1**: É o pedido do cliente.

**Acceptance Criteria**:

1. The system SHALL exibir na Parte 2, entre "Motivações após o Curso" e "Avaliação geral", o bloco "Oportunidades Reais de Trabalho e Emprego" com "30. Após a conclusão do Curso:" e "31. Caso não esteja trabalhando no Turismo, você pretende trabalhar no setor?", seguido do bloco "Efetivação no Emprego e Aumento da Renda" com "32. Caso não esteja efetivado no emprego, após a conclusão do Curso você foi efetivado?", "33. Após a conclusão do Curso sua renda aumentou?" e "34. Após a conclusão do Curso, o seu padrão de vida melhorou?". (OPT-01)
2. The system SHALL aceitar em P30 exatamente as 10 opções do papel, na ordem, sendo a última "Outra"; em P31, P32 e P33 "Sim"/"Não"; e em P34 "Sim, totalmente", "Sim, parcialmente" e "Não". (OPT-02)
3. IF o PATCH traz em P30, P31, P32, P33 ou P34 um valor fora dessas opções, ou um "Outra. Quais?" vazio, THEN the system SHALL responder 400 e não gravar nada. (OPT-03)
4. WHILE P30 não é "Outra" the system SHALL esconder o campo "30. Outra. Quais?". (OPT-04)
5. WHILE P22 não é "Sim" the system SHALL mostrar as 6 chaves de 30 a 34 desabilitadas. (OPT-05)
6. WHEN o aluno com P22 = "Sim" encerra sem P30, P31, P32, P33 ou P34 THEN the system SHALL recusar o encerramento e listar a chave em branco nas pendências. (OPT-06)
7. WHEN o aluno com P22 = "Sim" e P30 = "Outra" encerra sem o "Outra. Quais?" THEN the system SHALL recusar o encerramento e listar `avalOportunSituacaoTrabalhoOutra` nas pendências. (OPT-07)
8. WHEN o aluno encerra com P30 diferente de "Outra" e o "Outra. Quais?" preenchido THEN the system SHALL descartar o "Outra. Quais?". (OPT-08)
9. WHEN o aluno encerra com P22 = "Não" THEN the system SHALL descartar as 6 chaves de 30 a 34 e não as cobrar. (OPT-09)

**Independent Test**: abrir a avaliação, concluir o curso na P22 e ver os dois blocos com 30 a 34; encerrar sem eles e ver as pendências.

---

### P1: Respostas no banco e no Power BI ⭐ MVP

**User Story**: Como cliente, quero ver 30 a 34 na tabela da avaliação e no Power BI.

**Why P1**: A reclamação anterior foi justamente a pergunta "não aparecer na base".

**Acceptance Criteria**:

1. The system SHALL guardar P30, P31, P32, P33 e P34 nas colunas `P30`, `P31`, `P32`, `P33` e `P34` (`CHAR(1)`, aceitando `NULL`) com a letra da opção (`a` = primeira), e o "Outra. Quais?" em `P30Qual` (`TEXT`, aceitando `NULL`). (OPT-10)
2. WHEN a avaliação é lida THEN the system SHALL devolver P30 a P34 com o texto da opção gravada e o "Outra. Quais?" com o texto gravado. (OPT-11)
3. The system SHALL incluir `P30`, `P30Qual`, `P31`, `P32`, `P33` e `P34`, nessa ordem, na VIEW `bi.TB_Avaliacao_Aluno` de `scripts/views-bi.sql`, depois de `P29f` e antes de `P35`. (OPT-12)
4. WHEN a migration roda THEN the system SHALL manter `Status`, `Parte1_Completa`, as datas e as respostas já gravadas de toda avaliação, com as 6 colunas novas em `NULL`. (OPT-13)

**Independent Test**: gravar 30 a 34 por PATCH e ler as colunas e a VIEW.

---

## Edge Cases

- WHEN o aluno muda P22 de "Sim" para "Não" numa gravação THEN the system SHALL preservar 30 a 34 até o encerramento, como as demais chaves de concluinte (coberto por OPT-09).

Outras dimensões implícitas: N/A neste escopo. Autorização, concorrência e idempotência do PATCH e do encerramento não mudam.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| OPT-01 | P1: Aluno responde | Execute | Pending |
| OPT-02 | P1: Aluno responde | Execute | Implementing |
| OPT-03 | P1: Aluno responde | Execute | Implementing |
| OPT-04 | P1: Aluno responde | Execute | Pending |
| OPT-05 | P1: Aluno responde | Execute | Pending |
| OPT-06 | P1: Aluno responde | Execute | Implementing |
| OPT-07 | P1: Aluno responde | Execute | Implementing |
| OPT-08 | P1: Aluno responde | Execute | Implementing |
| OPT-09 | P1: Aluno responde | Execute | Implementing |
| OPT-10 | P1: Banco e Power BI | Execute | Implementing |
| OPT-11 | P1: Banco e Power BI | Execute | Implementing |
| OPT-12 | P1: Banco e Power BI | Execute | Implementing |
| OPT-13 | P1: Banco e Power BI | Execute | Implementing |

**Coverage:** 13 total, 13 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Um aluno que concluiu não consegue encerrar sem responder 30 a 34 (e o "Quais?" quando a 30 é "Outra").
- [ ] A VIEW `bi.TB_Avaliacao_Aluno` mostra `P30` a `P34` e `P30Qual` depois do deploy e de `views-bi.sql`.
