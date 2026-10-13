# Gestão de Verbas Specification

**Escopo:** Large (tela nova `/verbas` com criação, listagem e edição; mudança de contrato em `POST /api/usuarios` e no formulário de criação do GO; navegação de 5 perfis; endurecimento de validação em `POST`/`PATCH /api/verbas`). Sem migração: o schema já modela 1 GO : N verbas.

**Fonte funcional:** pedido do usuário nesta sessão (2026-10-13) e as decisões registradas em `context.md`.

**Decisões que esta feature herda:** AD-043 (o GO É o Ofertante; `Verba.cdOfertante` aponta para o CNPJ do GO), AD-044 (AM/GT criam o GO só com CNPJ + nome, e esta feature tira a verba dessa lista), AD-015 (a verba pertence a um único Ofertante e não se transfere), AD-016 (teto de alocação `<=`), AD-012 (alcance nacional de AM/GT/VT; GO/VO presos ao próprio escopo), AD-033 (autorização reavaliada no servidor a cada request), AD-039 (navegação de fonte única; esconder item não é autorização), REQ-OV-08..12 (`cadastro-ofertante-verba`). Supera a parte de REQ-OV-08 que cria a verba junto do GO e restringe REQ-OV-10, que deixa de valer para o VT. Vai gerar o AD-046.

## Problem Statement

Hoje a única forma de criar uma verba pela interface é criar um GO: o formulário de `/usuarios` exige valor e data da verba quando AM/GT criam um GO, e não existe tela de verba. O banco e a API (`POST /api/verbas`) já aceitam várias verbas por GO, mas na prática cada Ofertante fica preso à verba com que nasceu. O AM/GT precisa criar verbas a qualquer momento, para qualquer GO, quantas forem necessárias, e o GO precisa poder existir sem verba.

## Goals

- [ ] AM e GT criam uma verba para qualquer GO a partir de `/verbas`, sem tocar na criação de usuário.
- [ ] Um mesmo GO pode receber duas ou mais verbas, cada uma com saldo próprio.
- [ ] Todo GO criado a partir desta feature nasce sem verba.
- [ ] AM e GT corrigem valor e data de uma verba pela tela, sem nunca ficar abaixo do já alocado.
- [ ] GO e VO veem as próprias verbas e o saldo disponível de cada uma, sem poder alterá-las.
- [ ] VT e AL não leem verba nenhuma, nem pela tela nem pela API.
- [ ] Nenhuma verba ou curso existente muda.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Verba compartilhada entre vários GOs (N:N) | Decisão do usuário: 1 GO : N verbas. |
| Exclusão de verba | Decisão do usuário. Uma verba errada é corrigida pela edição. |
| Trocar o GO de uma verba existente | AD-015: a verba não se transfere. `edicaoVerbaSchema` já não aceita `cdOfertante`. |
| Campos novos na verba (nome, processo, vigência, observação) | Decisão do usuário: manter Valor, Data de liberação e GO. |
| Filtro por GO e paginação na listagem | Não foram pedidos. A API já aceita `?cdOfertante=`. Registrado em Deferred Ideas. |
| Limpar a data de liberação na edição | `PATCH /api/verbas/[id]` trata `dtVerba` ausente como "não alterar". Distinguir "limpar" de "não alterar" exige mudar o contrato. Ver Assumptions. |
| Criação ou edição de verba pelo GO | REQ-OV-08: o GO consome verba, não a cria. Mantido. |
| Tela do módulo "Ofertantes" | Não foi pedida. O módulo continua sem link. |
| Migração ou backfill de dados | O schema já é 1:N e as verbas existentes ficam como estão. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| VT (Visualizador Turismo) e verbas | Sem acesso: sem item de menu, `/verbas` mostra a mensagem de perfil sem acesso, e `GET /api/verbas` e `GET /api/verbas/[id]` respondem 403 | Decisão do usuário ("o VT não poderá ver as verbas"). Pela AD-039, esconder o menu não é autorização, então o bloqueio vale também na API. Hoje as duas rotas GET atendem o VT (`podeAcessarOfertante` devolve `true`), o que muda REQ-OV-10 só para esse perfil. A leitura nacional do VT sobre cursos e relatórios (AD-012) não muda | **y** (decisão do usuário, 2026-10-13) |
| Quais GOs aparecem no seletor de criação | Todos os GOs cadastrados, inclusive os que ainda não concluíram o onboarding organizacional | Um GO recém-criado ainda não tem os dados organizacionais (AD-044), mas é exatamente para ele que a primeira verba é criada. `POST /api/verbas` só exige que o documento seja de um GO | y (consequência do pedido) |
| Rótulo do item no seletor de GO | Nome do GO seguido do CNPJ; só o CNPJ quando o nome está vazio | Dois GOs podem ter nomes parecidos, e o CNPJ desambigua. A lista de VO em `/usuarios` já cai para o CNPJ quando falta nome | y (decisão do agente) |
| Payload de `POST /api/usuarios` que ainda envie o campo `verba` | Responde 400 e não cria nem o usuário nem a verba | Precedente do projeto (`CAMPOS_SO_GO`, AD-044): campo que não deveria vir é erro de quem chama. Ignorar em silêncio esconderia um cliente desatualizado que acha que criou a verba | y (consistência com AD-044) |
| Teto do valor da verba | Rejeitar com 400 valores acima de 99.999.999,99 na criação e na edição | `VL_Verba` é `DECIMAL(10,2)`. Hoje um valor maior chega ao MySQL e vira 500. A tela nova expõe esse campo, então o limite precisa ser validado na entrada | y (decisão do agente, dentro do campo já existente) |
| Casas decimais do valor | Aceitar só valores com no máximo 2 casas decimais; 3 ou mais é 400 | Com `DECIMAL(10,2)`, o MySQL arredondaria em silêncio e o valor gravado seria diferente do digitado | y (decisão do agente) |
| Duplicidade (mesmo GO, mesmo valor, mesma data) | Permitida: cada envio cria uma verba nova | Duas verbas iguais para o mesmo GO são um caso de negócio legítimo (dois repasses), e a verba não tem chave natural. O duplo clique é evitado na UI (GV-09) | y (decisão do agente) |
| Rótulo do item de menu | "Verbas" para todos os perfis que acessam a tela | O módulo do painel já se chama "Verbas" para AM/GT. Um rótulo único evita uma segunda variante sem ganho | y (decisão do agente) |
| Ordem da listagem | Pelo código da verba, crescente (`cdVerba asc`) | Mesma ordem de `GET /api/verbas` e do seletor de `/cursos/novo`, então a tela e a API não divergem | y (decisão do agente) |
| Corrida entre editar o valor e alocar um curso ao mesmo tempo | Comportamento atual mantido: cada operação valida o saldo isoladamente, sem lock | Já existia antes desta feature (REQ-OV-09/12) e a tela nova não altera o risco. Uma transação com lock é outra mudança | y (fora do escopo, registrado) |
| GO sem nenhuma verba em `/cursos/novo` | Mantém o estado vazio atual, "Nenhuma verba disponível para criar um curso." | Esse caso passa a ser comum (todo GO novo começa nele), e a mensagem já existe e já serve | y (consequência, não escolha) |
| Data de liberação vazia na edição | Mantém a data atual (não a apaga) | Contrato atual do `PATCH`. Ver Out of Scope | y (decisão do agente) |

**Open questions:** none. Todas foram resolvidas com o usuário (ver `context.md`) ou registradas acima.

---

## Implicit-Requirement Sweep

Escopo Large: cada dimensão vira requisito ou recebe `N/A` explícito.

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | GV-03, GV-04, GV-05, GV-06, GV-21 |
| Failure / partial-failure states | GV-03 a GV-06 (nada é criado quando falha), GV-19, GV-26 (criação de GO com `verba` não cria nada). A criação de verba é um único `INSERT`, sem estado parcial possível |
| Idempotency / retry / duplicate handling | GV-09 (botão desabilitado durante o envio). Duplicatas são intencionais (ver Assumptions) |
| Auth boundaries & rate limits | GV-08, GV-14, GV-17, GV-29, GV-30, GV-34. Rate limit: N/A, porque as rotas são de usuário autenticado sem rate limit próprio no projeto (só o login tem) |
| Concurrency / ordering | N/A: a corrida entre edição e alocação é anterior a esta feature e está registrada em Assumptions |
| Data lifecycle / expiry | N/A: sem exclusão (Out of Scope); as verbas existentes ficam intactas (Goals) |
| Observability | N/A: o projeto não tem camada de log ou métrica de domínio; erros seguem por `comTratamentoDeErro` |
| External-dependency failure | N/A: nenhuma integração externa |
| State-transition integrity | N/A: a Verba não tem status. A única transição é o valor, já guardada pelo teto de AD-016 (GV-20, GV-21) |

---

## User Stories

### P1: AM/GT criam verba para um GO ⭐ MVP

**User Story**: Como AM ou GT, quero criar uma verba e vinculá-la a um GO a qualquer momento, para que um Ofertante possa receber mais de uma verba ao longo do tempo.

**Why P1**: É o pedido central. Sem isso, um GO criado sem verba (P1 abaixo) não consegue criar curso nunca.

**Acceptance Criteria**:

1. WHEN um AM ou GT abre `/verbas` THEN o sistema SHALL exibir um formulário de criação com três campos: GO (seleção entre todos os usuários de tipo GO), Valor e Data de liberação. — **GV-01**
2. WHEN um AM ou GT envia o formulário com GO, valor positivo de até 2 casas decimais e (opcionalmente) data THEN o sistema SHALL criar uma Verba com `cdOfertante` igual ao CNPJ do GO escolhido, `vlVerba` igual ao valor informado e `dtVerba` igual à data informada (ou nula), e SHALL exibi-la na listagem da mesma página sem recarregamento manual. — **GV-02**
3. IF o formulário é enviado sem GO THEN o sistema SHALL exibir "Ofertante é obrigatório" e SHALL NOT criar verba. — **GV-03**
4. IF o formulário é enviado sem valor THEN o sistema SHALL exibir "Valor da verba é obrigatório" e SHALL NOT criar verba. — **GV-04**
5. IF o valor é zero ou negativo THEN o sistema SHALL exibir "Valor da verba deve ser positivo" e SHALL NOT criar verba. — **GV-05**
6. IF `POST /api/verbas` recebe `vlVerba` maior que 99999999.99 ou com mais de 2 casas decimais THEN o sistema SHALL responder 400 e SHALL NOT criar verba. — **GV-06**
7. WHEN um AM ou GT cria uma segunda verba para um GO que já tem uma THEN o sistema SHALL manter as duas, cada uma com `vlVerba` e saldo disponível próprios. — **GV-07**
8. IF um GO, VO, VT ou AL chama `POST /api/verbas` THEN o sistema SHALL responder 403 e SHALL NOT criar verba. — **GV-08**
9. WHILE o envio do formulário está em andamento, o botão de criar SHALL ficar desabilitado. — **GV-09**
10. WHEN não existe nenhum GO cadastrado THEN o formulário SHALL exibir "Nenhum Ofertante cadastrado - cadastre um GO antes de criar uma verba." e o botão de criar SHALL ficar desabilitado. — **GV-10**

**Independent Test**: Como AM, criar duas verbas para o mesmo GO em `/verbas` e ver as duas linhas na listagem, cada uma com o próprio saldo.

---

### P1: GO nasce sem verba ⭐ MVP

**User Story**: Como AM ou GT, quero criar um GO só com CNPJ e nome, para vincular as verbas dele depois, em `/verbas`.

**Why P1**: É a outra metade do pedido ("O GO não será criado vinculado a uma verba"). Sem ela, `/verbas` vira um segundo caminho e a criação do GO continua presa a uma verba.

**Acceptance Criteria**:

1. WHEN um AM ou GT seleciona o tipo GO no formulário de `/usuarios` THEN o formulário SHALL NOT exibir os campos de valor e data da verba. — **GV-23**
2. WHEN um AM ou GT cria um GO informando CNPJ e nome THEN o sistema SHALL criar o usuário GO e SHALL NOT criar nenhuma Verba com `cdOfertante` igual a esse CNPJ. — **GV-24**
3. IF `POST /api/usuarios` recebe o campo `verba` THEN o sistema SHALL responder 400 e SHALL NOT criar nem o usuário nem a verba. — **GV-26**
4. WHEN um GO sem nenhuma verba abre `/cursos/novo` THEN o sistema SHALL exibir "Nenhuma verba disponível para criar um curso." — **GV-25**

**Independent Test**: Como AM, criar um GO em `/usuarios`. O formulário não mostra valor nem data, e consultar as verbas desse CNPJ devolve zero.

---

### P1: Listagem escopada com saldo ⭐ MVP

**User Story**: Como qualquer perfil com escopo de verba, quero ver as verbas que me cabem e o saldo disponível de cada uma, para saber quanto ainda pode ser alocado a cursos.

**Why P1**: Sem a lista, quem cria não confirma o que criou e o GO não sabe quanto pode alocar.

**Acceptance Criteria**:

1. WHEN um AM ou GT abre `/verbas` THEN o sistema SHALL listar todas as verbas, cada linha com o nome do GO (ou o CNPJ, quando sem nome), o CNPJ do GO, o valor total, o saldo disponível e a data de liberação ("—" quando ausente). — **GV-11**
2. WHEN um GO abre `/verbas` THEN o sistema SHALL listar só as verbas cujo `cdOfertante` é o CNPJ do próprio GO. — **GV-12**
3. WHEN um VO abre `/verbas` THEN o sistema SHALL listar só as verbas do GO ao qual o VO está vinculado. — **GV-13**
4. WHILE o usuário logado é GO ou VO, a página `/verbas` SHALL NOT exibir o formulário de criação nem a ação de editar. — **GV-14**
5. WHEN não há nenhuma verba no escopo do usuário THEN a página SHALL exibir "Nenhuma verba cadastrada." — **GV-15**
6. O saldo disponível exibido em cada linha SHALL ser o valor total da verba menos a soma de `vlCursoAlocado` dos cursos vinculados a ela (REQ-OV-11). — **GV-16**
7. IF um VT ou AL abre `/verbas` THEN a página SHALL exibir "Seu perfil não tem acesso a verbas." e SHALL NOT listar nenhuma verba. — **GV-17**
8. IF um VT ou AL chama `GET /api/verbas` ou `GET /api/verbas/[id]` THEN o sistema SHALL responder 403 e SHALL NOT devolver nenhuma verba. — **GV-34**

**Independent Test**: Logar como GO com verbas de dois Ofertantes no banco e ver só as do próprio CNPJ, com o saldo descontando um curso alocado.

---

### P1: Navegação ⭐ MVP

**User Story**: Como usuário com acesso a verbas, quero achar `/verbas` na navbar e no painel.

**Why P1**: O pedido diz explicitamente que a rota fica na navbar. Hoje o módulo "Verbas" existe no painel do AM/GT, mas sem link.

**Acceptance Criteria**:

1. WHEN um AM ou GT está logado THEN o módulo "Verbas" do painel SHALL ter o item "Verbas" apontando para `/verbas`, e o cabeçalho SHALL exibir esse item. — **GV-27**
2. WHEN um GO ou VO está logado THEN o painel SHALL exibir o módulo "Verbas" com o item "Verbas" apontando para `/verbas`, e o cabeçalho SHALL exibir esse item. — **GV-28**
3. WHEN um VT ou AL está logado THEN o cabeçalho e o painel SHALL NOT exibir o item "Verbas". — **GV-29**
4. IF um visitante sem sessão abre `/verbas` THEN o sistema SHALL redirecioná-lo para a tela de login. — **GV-30**

**Independent Test**: Logar com cada perfil e conferir a presença e a ausência do item "Verbas" no cabeçalho.

---

### P2: Edição de valor e data

**User Story**: Como AM ou GT, quero corrigir o valor ou a data de liberação de uma verba pela tela, para ajustar um repasse sem recriar a verba.

**Why P2**: A API de edição já existe. A tela é conveniência, e a falta dela não bloqueia criar verbas nem cursos.

**Acceptance Criteria**:

1. WHEN um AM ou GT edita o valor e/ou a data de liberação de uma verba e salva THEN o sistema SHALL persistir os novos valores, e a linha SHALL exibir o novo valor total, a nova data e o saldo recalculado. — **GV-18**
2. IF o novo valor é menor que a soma já alocada a cursos dessa verba THEN o sistema SHALL exibir "Novo valor não pode ser menor que o já alocado a cursos desta verba" e SHALL manter o valor anterior. — **GV-19**
3. WHEN o novo valor é igual à soma já alocada THEN o sistema SHALL aceitar a edição e a linha SHALL exibir saldo disponível 0 (AD-016). — **GV-20**
4. IF `PATCH /api/verbas/[id]` recebe `vlVerba` menor ou igual a zero, maior que 99999999.99 ou com mais de 2 casas decimais THEN o sistema SHALL responder 400 e SHALL manter a verba inalterada. — **GV-21**
5. A ação de editar SHALL NOT oferecer a troca do GO da verba (AD-015). — **GV-22**

**Independent Test**: Como GT, editar o valor de uma verba com curso alocado: abaixo do alocado, a tela mostra o erro; igual ao alocado, o saldo vai a 0.

---

## Edge Cases

- WHEN o GO escolhido ainda não concluiu o onboarding organizacional THEN a criação da verba SHALL ser aceita normalmente (coberto por GV-02; ver Assumptions).
- IF o `cdOfertante` enviado a `POST /api/verbas` não é o documento de um GO THEN o sistema SHALL responder 400 com "Ofertante informado não existe" (comportamento existente, CA-OV-09, preservado). — **GV-31**
- WHEN um GO tem várias verbas THEN `/cursos/novo` SHALL oferecer todas elas no seletor, cada uma com o próprio saldo (consequência de GV-07 sobre a tela existente). — **GV-32**
- WHEN o valor informado é exatamente 99999999.99 THEN o sistema SHALL aceitar a criação (limite inclusivo de GV-06). — **GV-33**

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| GV-01 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-02 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-03 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-04 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-05 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-06 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-07 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-08 | P1: AM/GT criam verba | Design | Pending |
| GV-09 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-10 | P1: AM/GT criam verba | Tasks | Implementing |
| GV-11 | P1: Listagem escopada | Tasks | Implementing |
| GV-12 | P1: Listagem escopada | Tasks | Implementing |
| GV-13 | P1: Listagem escopada | Tasks | Implementing |
| GV-14 | P1: Listagem escopada | Tasks | Implementing |
| GV-15 | P1: Listagem escopada | Tasks | Implementing |
| GV-16 | P1: Listagem escopada | Tasks | Implementing |
| GV-17 | P1: Listagem escopada | Tasks | Implementing |
| GV-34 | P1: Listagem escopada | Tasks | Implementing |
| GV-18 | P2: Edição | Tasks | Implementing |
| GV-19 | P2: Edição | Tasks | Implementing |
| GV-20 | P2: Edição | Tasks | Implementing |
| GV-21 | P2: Edição | Tasks | Implementing |
| GV-22 | P2: Edição | Tasks | Implementing |
| GV-23 | P1: GO nasce sem verba | Tasks | Implementing |
| GV-24 | P1: GO nasce sem verba | Tasks | Implementing |
| GV-25 | P1: GO nasce sem verba | Design | Pending |
| GV-26 | P1: GO nasce sem verba | Tasks | Implementing |
| GV-27 | P1: Navegação | Tasks | Implementing |
| GV-28 | P1: Navegação | Tasks | Implementing |
| GV-29 | P1: Navegação | Tasks | Implementing |
| GV-30 | P1: Navegação | Tasks | Implementing |
| GV-31 | Edge case | Design | Pending |
| GV-32 | Edge case | Tasks | Implementing |
| GV-33 | Edge case | Tasks | Implementing |

**Coverage:** 34 total, 0 mapped to tasks, 34 unmapped (tasks ainda não criadas).

---

## Success Criteria

- [ ] Um AM cria um GO e, em seguida, duas verbas para ele, sem sair do navegador e sem usar a API diretamente.
- [ ] Depois do deploy, a contagem de linhas em `TB_Verba` e os valores de toda verba pré-existente são idênticos aos de antes.
- [ ] Nenhum perfil vê, em `/verbas`, uma verba fora do próprio escopo (AD-012).
