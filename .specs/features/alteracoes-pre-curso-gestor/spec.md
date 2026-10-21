# Alterações no Questionário do Gestor (Pré-Curso) Specification

**Escopo:** Large. Atravessa uma feature DONE (`formulario-pre-curso`) em schema Zod, condicionais, completude, tela e testes. Sem migration: as respostas são linhas `(Chave, Ordem, Valor)` e a forma de cada chave sai do schema (AD-041, `src/lib/respostas/forma.ts`), então chave nova não muda banco.

**Fonte funcional:** `docs/Alteracoes_Questionario_Gestor_Pre_Curso.md` (pedido do cliente, 2026-10-21, três alterações A1-A3). Elas são os 6 itens que o MTur deixou "Pendentes" em `docs/Alteracoes_MTur_1.md` (1.3, 1.4, 1.9, 1.11, 1.12, 1.13), agora liberados.

## Problem Statement

O questionário do pré-curso não pergunta onde fica o município da ação, se outros municípios foram atendidos, nem as datas de inscrição e o número de vagas. Também falta "Idiomas" entre as características do curso. O cliente pediu esses campos.

## Goals

- [ ] As 7 chaves novas existem no schema, na tela e na completude: o questionário passa de 56 para 63 chaves, de 9 para 10 condicionais e de 47 para 53 sempre obrigatórias.
- [ ] "Idiomas" é aceita em Q10 sem abrir campo condicional.
- [ ] Término de inscrição anterior ao início é rejeitado na gravação, como já acontece com as datas do curso.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Validação de igualdade entre Q1/Q2 (UF/município da entidade) e 7b/7c (local da ação) | Ponto de atenção 1 do pedido: podem divergir legitimamente. |
| Migration de dados ou de schema | Chave nova não exige coluna nem tabela (AD-041). |
| Revalidar pré-cursos já ENCERRADOS | Ponto de atenção 2: ficam com as 56 chaves gravadas. Agregação futura trata as 7 chaves como ausentes. |
| Exigir 17c anterior a Q13 (início do curso) | Ponto de atenção 3: o papel não diz isso; inscrição durante o curso é prática real. |
| Regra entre 17d (vagas) e 17a (alunos previstos) | Ponto de atenção 4: sem pedido explícito. |
| Pós-Curso (`docs/Questionario_do_Gestor_Pos_Curso.md`) | Ponto de atenção 5: não é alterado por este pedido. |
| Push, merge na `main`, deploy | Push na `main` = deploy (AD-047). Requer go-ahead explícito. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Texto de 7a | "7a. Endereço onde a ação de qualificação é realizada" (texto atual, só o número muda) | O pedido transcreve "Endereço da Sede onde…", que é o texto anterior ao item 1.2 do MTur (já aplicado, MTUR-01). O próprio pedido diz "chave inalterada, só o número do rótulo muda". Voltar a "da Sede" desfaria uma alteração aprovada. | n (decisão do agente) |
| Textos das opções de Q10 | Ficam os revisados pelo MTur (MTUR-03); "Idiomas" entra entre "Eventos (cerimonialista / organizador(a) de eventos)" e "Outro" | O pedido lista i) e j) com os textos antigos, mas só pede a inclusão de "Idiomas". A posição "antes de Outro" é explícita. | n (decisão do agente) |
| Enunciado de 7d | "foram contemplados" | O pedido registra a correção de "fora contemplados". | y |
| Rótulo do campo condicional de 7d | "7d. Qual?" | Mesmo padrão do campo condicional de Q9 ("9. Qual?"). | n (decisão do agente, baixo risco) |
| Mensagem do 400 para o par de inscrição | A mesma do par do curso: "Data de término não pode ser anterior à data de início" | O pedido manda estender `ordemDatasValida` e não tocar a rota. O Gestor acabou de editar a data, então a mensagem basta. | n (decisão do agente) |
| Pré-cursos EM_ANDAMENTO criados antes | Passam a ter as 6 chaves novas sempre obrigatórias em `pendentes` e não encerram até preenchê-las | Ponto de atenção 2 do pedido, consequência aceita. | y |
| Specs DONE (`formulario-pre-curso/*`) | Não são reescritos. Esta feature os supera nos itens tocados (AD-049) e `formulario-pre-curso/spec.md` ganha uma nota apontando para cá | Mesma solução da AD-048 para não reabrir spec DONE. O pedido sugere editar o dicionário; a nota preserva a rastreabilidade sem duplicar a fonte. | n (decisão do agente) |
| Pedido do cliente em `docs/` | Salvo como `docs/Alteracoes_Questionario_Gestor_Pre_Curso.md`, com uma seção "Como foi aplicado"; `docs/Alteracoes_MTur_1.md` registra que os 6 pendentes foram aplicados | Mesmo padrão de `docs/Alteracoes_MTur_1.md`. | n (decisão do agente) |

**Open questions:** none - todas resolvidas pelo pedido ou registradas acima.

---

## User Stories

### P1: Local da ação na Seção 2 (A1) ⭐ MVP

**User Story**: Como GO, quero informar município, UF e outros municípios atendidos pela ação, para que o programa saiba onde a qualificação acontece.

**Why P1**: Pedido do cliente.

**Acceptance Criteria**:

1. The system SHALL exibir na Seção 2, nesta ordem e antes de Q8, os rótulos "7a. Endereço onde a ação de qualificação é realizada", "7b. Município", "7c. UF" e "7d. Outros municípios foram contemplados com a Ação de Qualificação?". (APC-01)
2. The system SHALL aceitar em `qualifMunicipio` texto não vazio, em `qualifUf` exatamente uma das 27 siglas de `OPCOES_UF` e em `qualifOutrosMunicipios` exatamente "Sim" ou "Não". (APC-02)
3. IF uma gravação envia `qualifUf` fora das 27 siglas, `qualifMunicipio` vazio ou `qualifOutrosMunicipios` diferente de "Sim"/"Não" THEN the system SHALL rejeitar a gravação na validação de forma. (APC-03)
4. WHILE `qualifOutrosMunicipios` = "Sim" the system SHALL exibir o campo "7d. Qual?" (`qualifOutrosMunicipiosQuais`) e listá-lo em `pendentes` do encerramento quando vazio. (APC-04)
5. WHILE `qualifOutrosMunicipios` ≠ "Sim" the system SHALL ocultar `qualifOutrosMunicipiosQuais` e não exigi-lo. (APC-05)
6. WHEN o pré-curso é encerrado com `qualifOutrosMunicipios` = "Não" e `qualifOutrosMunicipiosQuais` gravado THEN the system SHALL descartar `qualifOutrosMunicipiosQuais` (limpeza de órfã). (APC-06)
7. IF `qualifMunicipio`, `qualifUf` ou `qualifOutrosMunicipios` está ausente THEN the system SHALL listar essa chave em `pendentes` e recusar o encerramento. (APC-07)

**Independent Test**: abrir a Seção 2, ler os quatro rótulos, marcar 7d = Sim e ver o campo "Qual?".

---

### P1: "Idiomas" em Q10 (A2) ⭐ MVP

**User Story**: Como GO, quero marcar "Idiomas" como característica do curso.

**Why P1**: Pedido do cliente.

**Acceptance Criteria**:

1. The system SHALL aceitar em `qualifCaracteristicas` exatamente as 12 opções, nesta ordem: "Hospedagem (recepcionista / camareiro(a) / copeiro(a))", "Agenciamento e Operação", "Serviços de Alimentação (bartender / auxiliar de cozinha)", "Transporte (Terrestre, Aquaviário ou Aéreo)", "Aluguel de Transportes", "Guiamento de Turismo / Condução de Turismo", "Ecoturismo / Turismo de Natureza", "Turismo de Base Comunitária", "Cultura e Lazer (produtor(a) / recreacionista / artesã(o))", "Eventos (cerimonialista / organizador(a) de eventos)", "Idiomas", "Outro". (APC-08)
2. WHEN `qualifCaracteristicas` contém "Idiomas" e não contém "Outro" THEN the system SHALL não exigir `qualifCaracteristicasOutra`. (APC-09)
3. The system SHALL exibir "Idiomas" como 11ª opção de Q10 na tela, antes de "Outro". (APC-10)

**Independent Test**: abrir a Seção 2 e ver "Idiomas" antes de "Outro"; encerrar com só "Idiomas" marcada.

---

### P1: Inscrição e vagas na Seção 3 (A3) ⭐ MVP

**User Story**: Como GO, quero informar o período de inscrição e o número de vagas.

**Why P1**: Pedido do cliente.

**Acceptance Criteria**:

1. The system SHALL exibir na Seção 3, nesta ordem e entre Q16 e Q18, os rótulos "17a. Número previsto de alunos", "17b. Data prevista de início de inscrição", "17c. Data prevista de término de inscrição" e "17d. Número de vagas". (APC-11)
2. The system SHALL aceitar `planejDataInicioInscricao` e `planejDataTerminoInscricao` só no formato `YYYY-MM-DD`, e `planejNumVagas` só como inteiro maior que zero. (APC-12)
3. IF uma gravação envia `planejNumVagas` igual a 0, negativo ou não inteiro, ou uma data de inscrição fora do formato `YYYY-MM-DD` THEN the system SHALL rejeitar a gravação na validação de forma. (APC-13)
4. IF, no estado mesclado (existente + patch) de `PATCH /api/pre-cursos/[id]`, `planejDataTerminoInscricao` é anterior a `planejDataInicioInscricao` THEN the system SHALL responder 400 e não persistir nada. (APC-14)
5. WHEN só uma das duas datas de inscrição está presente, ou as duas são iguais THEN the system SHALL aceitar a ordem. (APC-15)
6. IF `planejDataInicioInscricao`, `planejDataTerminoInscricao` ou `planejNumVagas` está ausente THEN the system SHALL listar essa chave em `pendentes` e recusar o encerramento. (APC-16)

**Independent Test**: gravar 17c antes de 17b e receber 400; preencher a Seção 3 inteira e encerrar.

---

### P1: Contagem do questionário ⭐ MVP

**User Story**: Como mantenedor, quero que o questionário inteiro feche com as chaves novas.

**Acceptance Criteria**:

1. The system SHALL ter exatamente 63 chaves em `respostasPreCursoSchema` e 10 regras em `REGRAS_CONDICIONAIS_PRE_CURSO`. (APC-17)
2. IF um pré-curso tem as 56 chaves anteriores completas e nenhuma das 7 novas THEN the system SHALL recusar o encerramento com `pendentes` igual exatamente às 6 chaves novas sempre obrigatórias (`qualifMunicipio`, `qualifUf`, `qualifOutrosMunicipios`, `planejDataInicioInscricao`, `planejDataTerminoInscricao`, `planejNumVagas`). (APC-18)
3. WHEN o GO preenche pela tela as 53 sempre obrigatórias e as condicionais disparadas THEN the system SHALL encerrar o pré-curso (status "Encerrado"). (APC-19)

**Independent Test**: preencher o formulário inteiro pela tela e encerrar.

---

### P2: Fontes em `docs/`

**User Story**: Como mantenedor, quero o questionário-fonte igual ao sistema.

**Acceptance Criteria**:

1. The system SHALL ter `docs/Questionario_do_Gestor_Pre_Curso.md` com 7a-7d (7d com "a) Sim. Qual?" / "b) Não"), "k) Idiomas" e "l) Outro. Qual?" em Q10 e 17a-17d, nos textos de APC-01, APC-08 e APC-11. (APC-20)

**Independent Test**: grep no arquivo.

---

## Edge Cases

- WHEN `qualifOutrosMunicipios` volta de "Sim" para "Não" durante o preenchimento THEN the system SHALL ocultar "7d. Qual?" e não enviá-lo no PATCH (`naoAplicaveis`), mantendo o valor gravado até o encerramento, que o descarta. (coberto por APC-05/APC-06, mesmo mecanismo das 9 condicionais existentes)
- WHEN as datas de inscrição chegam em PATCHs separados THEN the system SHALL validar a ordem contra o estado mesclado. (APC-14; a rota já chama `ordemDatasValida` com o estado mesclado)
- WHEN 7c é igual a 7b THEN the system SHALL aceitar. (APC-15)

Dimensões implícitas: validação de entrada coberta por APC-03/APC-13/APC-14; estado (pré-curso EM_ANDAMENTO antigo) coberto por APC-18. Auth, concorrência, idempotência, dependências externas, observabilidade, ciclo de vida do dado: N/A, nenhuma rota, guarda ou chamada externa muda.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| APC-01 | P1: Local da ação | T2 | Verified |
| APC-02 | P1: Local da ação | T2 | Verified |
| APC-03 | P1: Local da ação | T2 | Verified |
| APC-04 | P1: Local da ação | T2 | Verified |
| APC-05 | P1: Local da ação | T2 | Verified |
| APC-06 | P1: Local da ação | T2 | Verified |
| APC-07 | P1: Local da ação | T2 | Verified |
| APC-08 | P1: Idiomas | T1 | Verified |
| APC-09 | P1: Idiomas | T1 | Verified |
| APC-10 | P1: Idiomas | T1 | Verified |
| APC-11 | P1: Inscrição e vagas | T3 | Verified |
| APC-12 | P1: Inscrição e vagas | T3 | Verified |
| APC-13 | P1: Inscrição e vagas | T3 | Verified |
| APC-14 | P1: Inscrição e vagas | T3 | Verified |
| APC-15 | P1: Inscrição e vagas | T3 | Verified |
| APC-16 | P1: Inscrição e vagas | T3 | Verified |
| APC-17 | P1: Contagem | T3 | Verified |
| APC-18 | P1: Contagem | T3 | Verified |
| APC-19 | P1: Contagem | T3 | Verified |
| APC-20 | P2: docs/ | T4 | Verified |

**Coverage:** 20 total, 20 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] Gate completo verde (`lint && build && typecheck && test:unit && test:integration && test:e2e`).
- [x] `grep -c "Idiomas"` em `pre-curso.schema.ts` e em `docs/Questionario_do_Gestor_Pre_Curso.md` ≥ 1, e "Endereço da Sede" ausente de `src/`.
- [x] Nenhum arquivo em `prisma/` alterado.
