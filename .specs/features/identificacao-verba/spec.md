# Identificação da Verba Specification

**Escopo:** Medium. Uma coluna nova em `TB_Verba` com migração e backfill; o campo entra no `verbaSchema`, em `POST`/`PATCH /api/verbas`, na consulta `listarVerbasDoEscopo`, no formulário e na edição de `/verbas` e no seletor de `/cursos/novo`. Nenhuma tela nova.

**Fonte funcional:** pedido do usuário nesta sessão (2026-10-19), com as respostas dadas durante a especificação.

**Decisões que esta feature herda:** AD-046 (`/verbas`: AM/GT criam e editam; GO/VO só leem; VT e AL não leem verba), AD-015 (o GO de uma verba não se troca), AD-033 (o servidor reavalia permissão e forma a cada request), AD-039 (camada visual em tokens). Supera a linha "Campos novos na verba (nome, processo, vigência, observação)" do Out of Scope de `gestao-de-verbas/spec.md`, mas só para o campo de identificação.

## Problem Statement

Hoje uma verba só é reconhecida pelo número interno: o seletor de `/cursos/novo` mostra "Verba #12 — saldo R$ …", e a lista de `/verbas` mostra só o GO, o valor e a data. Quando um GO tem várias verbas (AD-046), quem cria o curso não sabe qual é qual sem decorar números. AM e GT precisam dar a cada verba um nome livre e curto que apareça onde a verba é escolhida ou listada.

## Goals

- [ ] Toda verba tem uma identificação textual de 1 a 60 caracteres, informada por AM/GT na criação.
- [ ] AM/GT corrigem a identificação pela edição em linha de `/verbas`.
- [ ] A identificação aparece, ao lado do número, na lista de `/verbas` e no seletor de verba de `/cursos/novo`.
- [ ] As verbas já existentes passam a se chamar "Verba #<número>", sem perder nada do que mostram hoje.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Tela nova, ou exibir a verba em telas de curso que hoje não a mostram (listas e detalhes de pré-curso, pós-curso, avaliação) | Decisão do usuário: nenhuma tela nova. |
| Unicidade da identificação (por GO ou global) | Decisão do usuário: pode repetir. O `cdVerba` segue sendo o identificador interno. |
| Busca ou filtro por identificação | Não foi pedido. |
| Mudança de quem cria, edita ou lê verba | Segue AD-046 como está. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Obrigatoriedade | Obrigatória na criação e na edição | Decisão do usuário | **y** (usuário, 2026-10-19) |
| Repetição | Permitida, inclusive no mesmo GO | Decisão do usuário | **y** (usuário, 2026-10-19) |
| Valor das verbas existentes | A migração grava "Verba #<cdVerba>" (ex.: "Verba #12") | Decisão do usuário. É o rótulo que o seletor já mostra hoje, então ninguém perde a referência | **y** (usuário, 2026-10-19) |
| Rótulo do campo na tela | "Identificação" | Palavra usada no pedido | **y** (usuário aprovou a spec, 2026-10-19) |
| Espaços nas pontas | Removidos antes de validar e de gravar; só espaços conta como vazio | Evita "  " passar como identificação e duas verbas diferirem só por espaço | n (decisão do agente) |
| Como contar os 60 caracteres | Pelo `length` da string em JS, depois do trim. Um emoji pode contar 2 | O limite fica igual ou mais rígido que o `VARCHAR(60)` do MySQL, nunca mais frouxo, então nada chega ao banco e vira 500 | n (decisão do agente) |
| Formato no seletor de `/cursos/novo` | Para AM: "<nome do GO> — #<cdVerba> · <identificação> — saldo R$ X". Para GO: "#<cdVerba> · <identificação> — saldo R$ X" | O número continua visível (pedido do usuário) e desambigua duas verbas com o mesmo nome. Mantém o nome do GO que o AM já vê (AD-040) | **y** (usuário, 2026-10-19) |
| Posição no formulário de criação | Entre o GO e o Valor | Ordem de leitura: de quem é, como se chama, quanto vale | n (decisão do agente) |
| Ordem das mensagens de erro | Com o formulário vazio, a primeira mensagem segue sendo "Ofertante é obrigatório" (GV-03); a de identificação vem antes da de valor | A tela mostra a primeira issue do Zod, que segue a ordem das chaves | n (consequência de GV-03) |
| Contrato do `PATCH /api/verbas/[id]` | `dsVerba` passa a ser obrigatório no corpo, igual a `vlVerba` | A edição reusa `camposVerbaSchema`. A única chamadora é a edição em linha de `/verbas`, que sempre envia o valor atual | n (decisão do agente) |
| Coluna no banco | `NOT NULL`, `VARCHAR(60)`, sem default depois da migração | Um default faria uma verba nascer com nome genérico por um caminho que não passa pela API. Os `prisma.verba.create` de testes, seed e fixture passam a informar o campo | n (decisão do agente) |

**Open questions:** none. As escolhas do agente foram apresentadas e a spec aprovada pelo usuário (2026-10-19).

---

## Implicit-Requirement Sweep

Escopo Medium: só as dimensões presentes.

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | IDV-02, IDV-03, IDV-04, IDV-07 |
| Data lifecycle | IDV-10 (backfill das verbas existentes) |
| Auth boundaries | Sem mudança: o campo segue as guardas de AD-046 (IDV-11) |
| Demais dimensões | N/A para este escopo: uma coluna escalar a mais em operações que já existem |

---

## User Stories

### P1: AM/GT identificam a verba na criação ⭐ MVP

**User Story**: Como AM ou GT, quero dar um nome à verba quando a crio, para reconhecê-la depois sem depender do número.

**Why P1**: É o pedido.

**Acceptance Criteria**:

1. WHEN um AM ou GT abre `/verbas` THEN o formulário de criação SHALL exibir o campo "Identificação" entre o GO e o Valor, com `maxlength` de 60. — **IDV-01**
2. WHEN um AM ou GT envia GO, identificação de 1 a 60 caracteres e valor válido THEN o sistema SHALL criar a Verba com `dsVerba` igual ao texto informado sem os espaços das pontas. — **IDV-02**
3. IF a identificação está vazia ou só tem espaços THEN o sistema SHALL exibir "Identificação é obrigatória" e SHALL NOT criar a verba. — **IDV-03**
4. IF `POST /api/verbas` recebe `dsVerba` com mais de 60 caracteres depois do trim THEN o sistema SHALL responder 400 com "Identificação deve ter no máximo 60 caracteres" e SHALL NOT criar a verba. — **IDV-04**
5. WHEN um AM ou GT cria uma verba com a mesma identificação de outra já existente, do mesmo GO ou de outro THEN o sistema SHALL criar a verba nova e manter as duas. — **IDV-05**

**Independent Test**: Como AM, criar em `/verbas` a verba "Capacitação 2026" e vê-la na lista com esse nome.

---

### P1: AM/GT editam a identificação ⭐ MVP

**User Story**: Como AM ou GT, quero corrigir o nome de uma verba, para ajustar um erro de digitação ou renomear uma verba migrada.

**Why P1**: Decisão do usuário. É também o único jeito de trocar o "Verba #N" das verbas migradas.

**Acceptance Criteria**:

1. WHEN um AM ou GT abre a edição em linha de uma verba THEN o sistema SHALL exibir o campo "Identificação" preenchido com o valor atual, junto de valor e data. — **IDV-06**
2. WHEN um AM ou GT salva a edição com identificação de 1 a 60 caracteres THEN o sistema SHALL gravar o novo `dsVerba`, sem os espaços das pontas, e SHALL exibi-lo na lista sem recarregamento manual. — **IDV-07**
3. IF a edição é salva com identificação vazia, só com espaços ou com mais de 60 caracteres THEN o sistema SHALL exibir a mesma mensagem de IDV-03 ou IDV-04 e SHALL NOT alterar a verba. — **IDV-08**

**Independent Test**: Como AM, editar uma verba "Verba #3" para "Repasse Março" e ver o novo nome na lista.

---

### P1: Identificação visível onde a verba é listada ou escolhida ⭐ MVP

**User Story**: Como usuário que lista ou escolhe verbas, quero ver o nome de cada uma, para saber qual estou usando.

**Why P1**: Sem exibição, o nome não serve para nada.

**Acceptance Criteria**:

1. WHEN qualquer perfil com leitura de verba (AM, GT, GO, VO) abre `/verbas` THEN cada linha da lista SHALL exibir o número da verba no formato "#<cdVerba>" e a identificação, além do que já exibe hoje (GV-11). — **IDV-09**
2. WHEN a migração roda THEN toda verba existente SHALL ficar com `dsVerba` igual a "Verba #" seguido do seu `cdVerba` (ex.: "Verba #12"), e nenhum outro campo da verba SHALL mudar. — **IDV-10**
3. O campo `dsVerba` SHALL seguir as mesmas guardas de leitura e escrita da verba (AD-046): `GET /api/verbas` e `GET /api/verbas/[id]` o devolvem para quem já lê a verba, e só AM/GT o gravam. — **IDV-11**
4. WHEN um AM abre `/cursos/novo` THEN cada opção do seletor de verba SHALL exibir "<nome do GO> — #<cdVerba> · <identificação> — saldo R$ <saldo com 2 casas>". — **IDV-12**
5. WHEN um GO abre `/cursos/novo` THEN cada opção do seletor de verba SHALL exibir "#<cdVerba> · <identificação> — saldo R$ <saldo com 2 casas>". — **IDV-13**
6. O `cdVerba` de toda verba existente SHALL permanecer o mesmo depois da migração, e os cursos vinculados SHALL continuar apontando para a mesma verba. — **IDV-14**

**Independent Test**: Como GO com uma verba "Capacitação 2026", abrir `/cursos/novo` e ver "#<número> · Capacitação 2026 — saldo R$ …" no seletor.

---

## Edge Cases

- IF a identificação tem exatamente 60 caracteres THEN o sistema SHALL aceitar (fronteira de IDV-02/IDV-04).
- IF a identificação tem 60 caracteres e espaços nas pontas THEN o sistema SHALL aceitar e gravar os 60 sem os espaços.
- IF um cliente chama `POST /api/verbas` sem `dsVerba` THEN o sistema SHALL responder 400 com "Identificação é obrigatória" (IDV-03 vale na API, não só na tela).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IDV-01 | P1: Identificar na criação | Execute | Verified |
| IDV-02 | P1: Identificar na criação | Execute | Verified |
| IDV-03 | P1: Identificar na criação | Execute | Verified |
| IDV-04 | P1: Identificar na criação | Execute | Verified |
| IDV-05 | P1: Identificar na criação | Execute | Verified |
| IDV-06 | P1: Editar a identificação | Execute | Verified |
| IDV-07 | P1: Editar a identificação | Execute | Verified |
| IDV-08 | P1: Editar a identificação | Execute | Verified |
| IDV-09 | P1: Identificação visível | Execute | Verified |
| IDV-10 | P1: Identificação visível | Execute | Verified |
| IDV-11 | P1: Identificação visível | Execute | Verified |
| IDV-12 | P1: Identificação visível | Execute | Verified |
| IDV-13 | P1: Identificação visível | Execute | Verified |
| IDV-14 | P1: Identificação visível | Execute | Verified |

**Coverage:** 14 total, 14 mapped to the inline Execute plan (3 commits), 0 unmapped

---

## Success Criteria

- [ ] Nenhuma verba existe sem identificação depois da migração.
- [ ] Um AM cria, edita e escolhe uma verba pelo nome, com o número sempre ao lado.
- [ ] Os testes existentes de `gestao-de-verbas` seguem passando.
