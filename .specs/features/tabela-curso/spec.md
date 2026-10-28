# Tabela de Curso Specification

## Problem Statement

O curso não tem tabela própria. Ele nasce como uma linha de `TB_Pre_Curso`, que guarda ao mesmo tempo os dados do curso (ofertante, verba, valor alocado, criador, data de criação) e o questionário do pré-curso. `TB_Pos_Curso` e `TB_Avaliacao_Aluno` se ligam ao curso apontando para o pré-curso, e o criador e a data de criação se repetem no pré e no pós. O cliente analisa os dados no Power BI e precisa de uma `TB_Curso` à qual o pré-curso, o pós-curso e a avaliação se liguem. Cada dado do curso deve ficar num lugar só.

## Goals

- [ ] `TB_Curso` é a única fonte do ofertante, da verba, do valor alocado, do criador e da data de criação do curso.
- [ ] `TB_Pre_Curso`, `TB_Pos_Curso` e `TB_Avaliacao_Aluno` se ligam a `TB_Curso` por chave estrangeira em `CD_Curso`.
- [ ] Os cursos já existentes em produção migram sem perda, e a migration aborta se a conferência não bater.
- [ ] Nenhuma tela, rota ou teste existente muda de comportamento.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar ofertante, verba ou valor de um curso depois de criado | Não existe hoje (nenhuma rota altera esses campos). |
| Apagar curso pelo sistema | Não existe hoje; as regras de exclusão só espelham as atuais. |
| VIEW de cruzamento pré + pós numa linha (`bi.VW_Curso`) | Pedido separado, se o cliente precisar. |
| VIEWs de compatibilidade no formato antigo `(Chave, Ordem, Valor)` | Pedido separado. |
| Aplicar as VIEWs do `bi` automaticamente no deploy | O usuário da aplicação não tem permissão no `bi`; segue manual (`docs/DEPLOY_PRODUCAO.md`). |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Campos da `TB_Curso` | `CD_Curso` (gerado), `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Criado_Por`, `Data_Criacao` | Critério do usuário: tudo o que é do curso e não é pergunta. Ofertante, verba e valor hoje só estão no pré, mas valem para o curso inteiro. | y |
| Status e datas de etapa | `Status` e `Data_Encerramento` ficam em cada formulário; `Data_Ultima_Atualizacao` fica no pós | O pré pode estar encerrado com o pós em andamento: são da etapa, não do curso. | y |
| Duplicação | Os campos movidos saem de `TB_Pre_Curso` e de `TB_Pos_Curso` | Escolha do usuário: cada informação num lugar só. | y |
| Avaliação | `TB_Avaliacao_Aluno.CD_Curso` passa a apontar para `TB_Curso` | Escolha do usuário: o aluno avalia o curso. | y |
| Nome do curso | Fica só na P8 de `TB_Pre_Curso`; `TB_Curso` não tem coluna de nome | Decisão do usuário ("NM_Curso deve permanecer no pré-curso"), que revê a cópia escolhida antes. CUR-09 e CUR-10 foram retirados. | y |
| Criador e data do curso na migração | Vêm do pré-curso; o criador e a data de criação próprios do pós são descartados | Decisão do usuário: "os dois questionários devem ser tratados como um só, todas as infos referentes ao curso devem ser únicas e ligadas aos dois". O pré e o pós nascem juntos pelo mesmo Gestor (`POST /api/cursos`); só dados antigos, da rota de pós-curso já removida, podem divergir, e essa divergência fica no backup. | y |
| Contrato HTTP | As rotas continuam devolvendo `cdOfertante`, `cdVerba`, `vlCursoAlocado`, `criadoPor` e `dataCriacao` com os mesmos nomes, lidos de `TB_Curso` | Nenhuma tela nem teste deve mudar (CUR-11). | y |
| VIEWs do `bi` | `bi.TB_Curso` nova; `bi.TB_Pre_Curso` e `bi.TB_Pos_Curso` passam a espelhar só as próprias colunas, como as tabelas | O `bi` espelha o `spma` sem colunas sensíveis. No Power BI, ofertante e verba passam a vir da `TB_Curso`, pelo relacionamento em `CD_Curso`. | Confirmado pelo usuário. | y |
| Exclusão | Apagar um curso apaga o pré e o pós; uma avaliação existente impede a exclusão | Espelha as regras atuais: o pós cai junto com o pré, e a avaliação não tem cascata. | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Curso como tabela própria ⭐ MVP

**User Story**: Como analista do programa no Power BI, quero uma `TB_Curso` à qual o pré-curso, o pós-curso e a avaliação se liguem, para tratar o curso como uma dimensão única.

**Why P1**: É o pedido.

**Acceptance Criteria**:

1. The system SHALL ter a tabela `TB_Curso` com as colunas `CD_Curso` (chave primária gerada pelo banco), `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Criado_Por` e `Data_Criacao`. (CUR-01)
2. The system SHALL ligar `TB_Pre_Curso.CD_Curso`, `TB_Pos_Curso.CD_Curso` e `TB_Avaliacao_Aluno.CD_Curso` a `TB_Curso.CD_Curso` por chave estrangeira. (CUR-02)
3. The system SHALL não ter as colunas `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Criado_Por` e `Data_Criacao` em `TB_Pre_Curso`, nem `Criado_Por` e `Data_Criacao` em `TB_Pos_Curso`. (CUR-03)
4. The system SHALL manter `Status` e `Data_Encerramento` em `TB_Pre_Curso` e em `TB_Pos_Curso`, e `Data_Ultima_Atualizacao` em `TB_Pos_Curso`. (CUR-04)
5. WHEN um curso é criado THEN o sistema SHALL gravar, numa única transação, uma linha em `TB_Curso`, uma em `TB_Pre_Curso` e uma em `TB_Pos_Curso` com o mesmo `CD_Curso`. (CUR-05)
6. IF a criação do curso falha em qualquer passo THEN o sistema SHALL não deixar linha em nenhuma das três tabelas. (CUR-06)
7. WHEN um curso é apagado THEN o sistema SHALL apagar o pré-curso e o pós-curso dele. (CUR-07)
8. IF um curso com avaliação é apagado THEN o sistema SHALL recusar a exclusão e manter o curso, o pré, o pós e as avaliações. (CUR-08)

**Independent Test**: criar um curso pela rota e ler as três linhas com o mesmo `CD_Curso`; consultar `information_schema` para as chaves estrangeiras e as colunas removidas.

---

### P1: Sem regressão ⭐ MVP

**User Story**: Como usuário do sistema, quero que nada mude nas telas e rotas, para seguir trabalhando como antes.

**Why P1**: A mudança é de modelo de dados, não de comportamento.

**Acceptance Criteria**:

1. The system SHALL devolver nas rotas de pré-curso, pós-curso e avaliação os campos `cdOfertante`, `cdVerba`, `vlCursoAlocado`, `criadoPor` e `dataCriacao` que já devolvia, com os mesmos nomes, lidos de `TB_Curso`. (CUR-11)
2. The system SHALL calcular o saldo de uma verba como o valor da verba menos a soma de `VL_Curso_Alocado` dos cursos dela. (CUR-12)
3. The system SHALL manter o comportamento já especificado de criação de curso, saldo, escopo por Ofertante, formulários, encerramento e autorização, sem alteração de asserção; a única mudança admitida é uma asserção sobre ofertante, verba, valor, criador ou data de criação passar a ler o mesmo valor esperado em `TB_Curso`, porque a coluna de origem deixou de existir (CUR-03). (CUR-13)

**Independent Test**: a suíte existente (unit, integration e e2e) passa sem mudar asserções.

---

### P1: Migração dos cursos existentes ⭐ MVP

**User Story**: Como responsável pelo sistema, quero os cursos de produção migrados sem perda, para que o deploy não exija trabalho manual.

**Why P1**: Produção tem dados reais.

**Acceptance Criteria**:

1. WHEN a migration roda THEN o sistema SHALL criar uma linha em `TB_Curso` para cada linha de `TB_Pre_Curso`, com o mesmo `CD_Curso`, `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Criado_Por` e `Data_Criacao` do pré-curso. (CUR-14)
2. WHEN um curso é criado depois da migration THEN o sistema SHALL gerar um `CD_Curso` maior que todos os já existentes. (CUR-15)
3. IF o número de linhas de `TB_Curso` difere do de `TB_Pre_Curso`, ou algum valor migrado difere do pré-curso de origem, THEN o sistema SHALL abortar a migration antes de remover qualquer coluna, com um erro que identifica a conferência. (CUR-16)
4. IF algum pós-curso ou avaliação aponta para um `CD_Curso` sem linha em `TB_Curso` THEN o sistema SHALL abortar a migration antes de remover qualquer coluna. (CUR-17)
5. WHEN a migration termina THEN o sistema SHALL manter inalterados status, datas de encerramento e respostas de todos os formulários. (CUR-18)

**Independent Test**: banco descartável no estado anterior, semeado com cursos, pós e avaliações; aplicar a migration por `prisma migrate deploy` e comparar; provocar cada divergência e ver o aborto.

---

### P2: VIEWs do Power BI

**User Story**: Como analista no Power BI, quero a `TB_Curso` também no banco `bi`, para usá-la como dimensão.

**Why P2**: Sem ela o Power BI não enxerga a tabela; e as VIEWs atuais quebram ao perder colunas.

**Acceptance Criteria**:

1. The system SHALL gerar em `scripts/views-bi.sql` a VIEW `bi.TB_Curso` com todas as colunas de `TB_Curso`. (CUR-19)
2. The system SHALL gerar `bi.TB_Pre_Curso` e `bi.TB_Pos_Curso` sem as colunas que saíram das tabelas. (CUR-20)
3. WHEN `scripts/views-bi.sql` é aplicado depois da migration THEN as VIEWs `bi.TB_Curso`, `bi.TB_Pre_Curso`, `bi.TB_Pos_Curso` e `bi.TB_Avaliacao_Aluno` SHALL passar no `CHECK TABLE`. (CUR-21)

**Independent Test**: aplicar o script num `bi` local e rodar `CHECK TABLE`.

---

### P2: Decisão e deploy registrados

**User Story**: Como mantenedor, quero a decisão e o procedimento registrados, para o deploy e as próximas mudanças.

**Why P2**: O deploy migra dados reais e exige aplicar as VIEWs logo depois.

**Acceptance Criteria**:

1. The system SHALL registrar em `.specs/STATE.md` a AD-052, com a divisão de campos entre curso e etapa e o nome do curso mantido na P8 do pré-curso. (CUR-22)
2. The system SHALL descrever em `docs/DEPLOY_PRODUCAO.md` o backup antes do deploy, a aplicação de `views-bi.sql` logo depois e a reversão de uma migration abortada. (CUR-23)

**Independent Test**: leitura dos dois arquivos.

---

## Edge Cases

- IF a migration aborta THEN o sistema SHALL deixar as colunas antigas de `TB_Pre_Curso` e `TB_Pos_Curso` intactas (coberto por CUR-16 e CUR-17).
- WHEN um curso tem pré-curso mas a P8 nunca foi respondida THEN o curso SHALL existir em `TB_Curso` do mesmo jeito: o nome não participa do curso (coberto por CUR-14).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CUR-01 | P1: Curso como tabela própria | Execute | Verified |
| CUR-02 | P1: Curso como tabela própria | Execute | Verified |
| CUR-03 | P1: Curso como tabela própria | Execute | Verified |
| CUR-04 | P1: Curso como tabela própria | Execute | Verified |
| CUR-05 | P1: Curso como tabela própria | Execute | Verified |
| CUR-06 | P1: Curso como tabela própria | Execute | Verified |
| CUR-07 | P1: Curso como tabela própria | Execute | Verified |
| CUR-08 | P1: Curso como tabela própria | Execute | Verified |
| CUR-11 | P1: Sem regressão | Execute | Verified |
| CUR-12 | P1: Sem regressão | Execute | Verified |
| CUR-13 | P1: Sem regressão | Execute | Verified |
| CUR-14 | P1: Migração dos cursos existentes | Execute | Verified |
| CUR-15 | P1: Migração dos cursos existentes | Execute | Verified |
| CUR-16 | P1: Migração dos cursos existentes | Execute | Verified |
| CUR-17 | P1: Migração dos cursos existentes | Execute | Verified |
| CUR-18 | P1: Migração dos cursos existentes | Execute | Verified |
| CUR-19 | P2: VIEWs do Power BI | Execute | Verified |
| CUR-20 | P2: VIEWs do Power BI | Execute | Verified |
| CUR-21 | P2: VIEWs do Power BI | Execute | Verified |
| CUR-22 | P2: Decisão e deploy registrados | Execute | Verified |
| CUR-23 | P2: Decisão e deploy registrados | Execute | Verified |

**Coverage:** 21 total (CUR-09 e CUR-10 retirados), 0 mapped to tasks, 21 unmapped ⚠️

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | Sem entrada nova: a criação de curso segue validada como hoje (CUR-13). |
| Failure / partial-failure states | Criação numa transação (CUR-06); migration aborta antes de remover colunas (CUR-16, CUR-17). |
| Idempotency / retry / duplicate handling | N/A because não há escrita nova repetível: o curso só é criado por `POST /api/cursos`, que segue igual (CUR-05). |
| Auth boundaries & rate limits | N/A because os guards não mudam; o escopo por Ofertante lê `CD_Ofertante` de `TB_Curso` com o mesmo resultado (CUR-13). |
| Concurrency / ordering | Curso, pré e pós criados na mesma transação (CUR-05). |
| Data lifecycle / expiry | Exclusão espelha as regras atuais (CUR-07, CUR-08). |
| Observability | N/A because não há log nem métrica nova; o aborto da migration nomeia a conferência (CUR-16). |
| External-dependency failure | VIEWs do `bi` quebram até o script ser aplicado: procedimento em CUR-23. |
| State-transition integrity | Status e encerramento ficam em cada etapa, sem mudança (CUR-04, CUR-13). |

---

## Success Criteria

- [ ] `TB_Curso` existe em produção com uma linha por curso, e o Power BI a lê por `bi.TB_Curso`.
- [ ] A suíte existente passa sem mudar asserções.
- [ ] A migration em produção passa na conferência na primeira tentativa.
