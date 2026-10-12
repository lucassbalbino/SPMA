# Onboarding Organizacional do GO Specification

**Escopo:** Large (coluna nova + gate de navegação + 2 rotas de API + 2 telas + fixtures/seed; sem migração de dados e sem nova entidade — o formulário e o endpoint já existem, muda o critério de completude e quem preenche o quê).

**Fonte funcional:** pedido do usuário nesta sessão (2026-10-12) e as 7 decisões registradas em `context.md`.

**Decisões que esta feature herda:** AD-043 (o GO É o Ofertante, identificado por CNPJ; os 6 campos organizacionais vivem inline em `Usuario`), AD-042 (precedente da flag de gate persistida + coleta obrigatória logo após a senha), AD-033 (autorização reavaliada no servidor a cada request), AD-039 (esconder item de navegação é conveniência de UI, nunca autorização), AD-004 (Zod como autoridade de forma), REQ-AU-02 (gate de primeiro acesso), UGO-01 (auto-cadastro organizacional do próprio GO).

## Problem Statement

Hoje o AM/GT digita os 6 dados organizacionais do Ofertante (nome, responsável, email, telefone, UF, município) no ato de criar o GO — dados que ele frequentemente não tem — e o GO nunca é obrigado a conferi-los: o gate `requireOfertanteVinculado` mede completude por `nome`/`uf` não-nulos, que a própria criação já preencheu. O resultado é dado organizacional de segunda mão, e a tela `/cadastro-ofertante`, que existe para o GO se auto-cadastrar, é inalcançável na prática. A responsabilidade do dado tem que mudar de mãos: o AM/GT identifica a organização (CNPJ + nome + verba) e o próprio GO declara o resto, obrigatoriamente, no primeiro login.

## Goals

- [ ] Todo GO preenche os 6 campos organizacionais no primeiro login, antes de abrir qualquer outra tela.
- [ ] Os 6 campos são obrigatórios — nenhum fica vazio depois do envio.
- [ ] O AM/GT cria um GO informando apenas CNPJ, nome e verba.
- [ ] O nome criado pelo AM/GT chega pré-preenchido no formulário e pode ser alterado pelo GO.
- [ ] Todo GO que já existe no banco também passa pela tela uma vez.
- [ ] Nenhum outro perfil (AM/GT/VT/VO/AL) muda de comportamento.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Edição dos dados organizacionais pelo próprio GO após concluir | Decisão 5 do usuário: "o GO não precisará editar as suas infos posteriormente". O `409` de `PATCH /api/usuarios/me/organizacao` fica como está. |
| Alterar ou remover `PATCH /api/usuarios/[documento]/organizacao` (AM/GT editam qualquer GO; o próprio GO edita o próprio CNPJ, via `podeEditarOfertante`) | Decisão 6: mantida como está. É a única válvula de correção que sobra, e nenhuma tela a consome hoje. Ver Assumptions sobre o GO editando a si mesmo por ela. |
| Tela para o AM/GT editar um GO | Não existe hoje e não foi pedida. A rota de API continua sendo o caminho. |
| Validar que o `nome` do GO corresponde à razão social do CNPJ | Exigiria consulta externa. Nenhuma integração existe no projeto. |
| Máscara ou validação de formato de telefone | O campo é `String` livre hoje; passa a ser obrigatório, não formatado. Mudar o formato é outra decisão. |
| Lista de municípios por UF | `municipio` é texto livre hoje, igual ao questionário. Fora do pedido. |
| `uf` aceita para tipos != GO na criação | Comportamento existente, fixado em teste no `usuarioSchema`. Esta feature só o restringe PARA GO; não mexe nos outros tipos. |
| Confirmação por email ou verificação do endereço informado | Não existe camada de envio de email no projeto. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| "Primeiro login" do GO | Depois de criar a senha (`primeiraVez = false`), antes de qualquer tela de `(protegido)` | Ordem que os guards já aplicam hoje (`requirePrimeiroAcessoConcluido` → `requireOfertanteVinculado`); mesmo desenho do Aluno em AD-042 | y (consequência da arquitetura existente, apresentada ao usuário) |
| "Placeholder do nome que foi criado" | Valor inicial editável no campo, não `placeholder` HTML | Com o campo obrigatório, um placeholder cinza obrigaria o GO a redigitar o nome para avançar; o efeito visível é o mesmo | **y** (apresentado como consequência 3, não contestado) |
| Critério de completude | Coluna `dadosOrganizacionaisCompletos`, não dedução por campos nulos | Deduzir por `uf === null` quebraria sozinho se a criação voltasse a preencher UF | **y** (decisão 1) |
| Campo `email` na criação de tipos != GO | Continua como hoje, opcional e informado pelo criador | O pedido "deixará de ser preenchido na criação pelo ADM" é sobre o Ofertante; VT/VO/AL não têm formulário organizacional onde declarar email próprio | y (decisão do agente, escopo mínimo) |
| Dados organizacionais rejeitados na criação de um GO | HTTP 400, não aceitos-e-ignorados | Precedente explícito do projeto (`CAMPOS_SO_GO` no `usuarioSchema`): campo que não deveria vir é erro de quem chama, não dado fantasma | y (consistência com a decisão T8 de `unificacao-ofertante-go`) |
| GO com a flag já `true` que abre `/cadastro-ofertante` pela URL | A tela abre e o envio responde 409; nada é alterado | `(onboarding)` é guardado só por `requireSession` por construção (evitar loop de redirect, ver `(protegido)/layout.tsx`), e nenhuma navegação linka para lá depois de concluída (`ROTAS_ONBOARDING`). Blindar a tela exigiria um guard novo por fora do padrão existente | y (decisão do agente, risco baixo: só alcançável digitando a URL) |
| Dados organizacionais de GOs pré-existentes | Preservados no banco pela migration; sobrescritos pelo que o GO digitar no envio | A migration só adiciona a coluna. Apagar dado existente seria perda sem ganho — o envio vai sobrescrever de qualquer forma | y (consequência, não escolha) |
| GO editando os próprios dados por `PATCH /api/usuarios/[documento]/organizacao` | Continua possível por API (sem tela), como hoje; essa rota **nunca** liga a flag, então não serve de atalho para pular o onboarding | Achado no Design: `podeEditarOfertante` (`src/lib/auth/permissoes.ts:95`) autoriza o GO no próprio CNPJ — a pergunta da decisão 6 descreveu a rota só como "AM/GT". "Manter como está" preserva isso; restringir é mudança de REQ-OV-03 e fica para o usuário decidir | n (a confirmar com o usuário ao fim da feature) |
| Fixtures e seed de demonstração | `scripts/dev-seed-demo.ts` cria o GO de demo já com a flag `true` e os 6 campos preenchidos | O seed existe para dar um ambiente navegável; nascer preso no onboarding tornaria o GO de demo inútil para as outras features | y (decisão do agente, só afeta dev) |

**Open questions:** none — todas resolvidas com o usuário (decisões 1-7 em `context.md`) ou registradas acima com o custo.

---

## Implicit-Requirement Sweep

Escopo Large: cada dimensão resolve em requisito ou `N/A` explícito.

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | OGO-04 (os 6 obrigatórios), OGO-10 (campos rejeitados na criação). UF da lista canônica `OPCOES_UF`, email com formato, nome/responsável/telefone/município não-vazios. |
| Failure / partial-failure states | OGO-04: tudo-ou-nada. Os 6 campos e a flag vão no mesmo `UPDATE` — não existe estado "3 de 6 preenchidos". OGO-10: nem usuário nem verba são criados quando a criação é rejeitada. |
| Idempotency / retry / duplicate | OGO-05: segundo envio responde 409 e preserva o gravado. Reenvio do formulário não duplica nada (é `UPDATE` por chave primária). |
| Auth boundaries & rate limits | OGO-07 (não-GO recebe 403), OGO-06 (nenhum outro perfil é redirecionado). O endpoint opera sempre sobre o documento da sessão — não existe parâmetro para apontar outro GO. Rate limit: `N/A because` não é endpoint de autenticação; o rate limit do projeto (AD-028) cobre login, e o acesso aqui já exige sessão válida. |
| Concurrency / ordering | OGO-08: senha antes do formulário, ordem garantida pela cadeia de guards. Dois envios simultâneos do mesmo GO: `N/A because` ambos escrevem o mesmo registro com o mesmo efeito (flag `true`), e o perdedor da corrida cai no 409 ou grava valor idêntico — sem estado inconsistente possível. |
| Data lifecycle / expiry | `N/A because` dado cadastral permanente, sem TTL, sem arquivamento e sem exclusão nesta feature. A flag é de via única (OGO-05: nunca volta a `false`). |
| Observability | `N/A because` o projeto não tem camada de logging ou métricas (nenhum logger em `src/`); nenhuma feature anterior registrou requisito desse tipo. |
| External-dependency failure | `N/A because` nenhuma chamada externa — só MySQL via Prisma, cujo erro já cai no 500 genérico de `comTratamentoDeErro` (REQ-SEC-11). |
| State-transition integrity | OGO-03 (`false` → `true` no envio válido), OGO-05 (`true` é terminal), OGO-11 (todo GO nasce `false`), OGO-14 (todo GO pré-existente fica `false`). |

---

## User Stories

### P1: Coleta obrigatória no primeiro login ⭐ MVP

**User Story**: Como responsável pelo programa, quero que o Gestor Ofertante declare os dados da própria organização assim que criar a senha, para que nenhum Ofertante opere na plataforma com cadastro incompleto ou de segunda mão.

**Why P1**: É o pedido inteiro. Sem o bloqueio por flag, a tela continua inalcançável e o dado continua sendo do AM/GT.

**Acceptance Criteria**:

1. WHILE um GO tiver `dadosOrganizacionaisCompletos = false`, the system SHALL impedir o acesso a qualquer tela de `(protegido)`, redirecionando para `/cadastro-ofertante`. (OGO-01)
2. WHEN um GO com `dadosOrganizacionaisCompletos = false` abre `/cadastro-ofertante` THEN o sistema SHALL exibir os 6 campos organizacionais com o campo nome já preenchido com o `nome` gravado na criação, editável. (OGO-02)
3. WHEN um GO envia os 6 campos válidos THEN o sistema SHALL persistir os 6 valores, SHALL marcar `dadosOrganizacionaisCompletos = true` e SHALL liberar a navegação. (OGO-03)
4. IF qualquer um dos 6 campos vier ausente, vazio ou inválido THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nenhum dos campos nem a flag. (OGO-04)
5. WHILE um GO tiver `dadosOrganizacionaisCompletos = true`, IF ele enviar `PATCH /api/usuarios/me/organizacao` THEN o sistema SHALL responder HTTP 409 e SHALL preservar os valores já gravados. (OGO-05)
6. IF o usuário autenticado não é GO THEN o sistema SHALL não redirecionar a navegação dele para `/cadastro-ofertante`, qualquer que seja o valor da flag. (OGO-06)
7. IF um usuário que não é GO enviar `PATCH /api/usuarios/me/organizacao` THEN o sistema SHALL responder HTTP 403. (OGO-07)
8. WHILE um GO tiver `primeiraVez = true`, the system SHALL exigir a criação da senha antes do formulário organizacional. (OGO-08)

**Independent Test**: criar um GO pela API como AM, logar com ele, criar a senha e confirmar que `/painel` redireciona para `/cadastro-ofertante`, que o nome vem preenchido, e que o envio dos 6 campos libera `/painel`.

---

### P1: Criação enxuta pelo AM/GT ⭐ MVP

**User Story**: Como AM/GT, quero criar um Gestor Ofertante informando apenas CNPJ, nome e verba, para não ter que digitar dados da organização que eu não tenho.

**Why P1**: É a outra metade do pedido ("o Adm tem que preencher apenas nome, cnpj, e verba"). Sem ela, o AM/GT continua preenchendo dado que o GO vai sobrescrever.

**Acceptance Criteria**:

1. WHEN AM/GT cria um usuário de tipo GO informando CNPJ válido, nome e verba THEN o sistema SHALL responder HTTP 201 e SHALL criar o GO e a verba. (OGO-09)
2. IF a criação de um usuário de tipo GO trouxer `email`, `uf`, `responsavel`, `telefone` ou `municipio` THEN o sistema SHALL responder HTTP 400 e SHALL não criar nem o usuário nem a verba. (OGO-10)
3. WHEN um GO é criado THEN o registro SHALL nascer com `dadosOrganizacionaisCompletos = false` e com `email`, `responsavel`, `telefone`, `uf` e `municipio` nulos. (OGO-11)
4. WHILE o tipo GO estiver selecionado na tela de criação de usuário, the system SHALL exibir apenas CNPJ, nome, tipo e os campos da verba. (OGO-12)
5. The system SHALL manter inalterada a criação dos tipos AM, GT, VT, VO e AL, inclusive o `email` informado pelo criador. (OGO-13)

**Independent Test**: `POST /api/usuarios` com `{tipo:"GO", documento, nome, verba}` responde 201 com os 5 campos nulos e a flag `false`; o mesmo corpo com `email` responde 400 e nenhuma linha é criada.

---

### P2: GOs que já existem no banco

**User Story**: Como responsável pelo programa, quero que os Ofertantes já cadastrados também confirmem os próprios dados, para que o cadastro completo não valha só para contas novas.

**Why P2**: Depende de P1 (a coluna e o gate). Separável: P1 é demonstrável com um GO novo.

**Acceptance Criteria**:

1. WHEN a migration desta feature é aplicada THEN todo GO já existente SHALL ficar com `dadosOrganizacionaisCompletos = false`. (OGO-14)
2. WHILE um GO criado antes desta feature não tiver enviado o formulário, the system SHALL aplicar o mesmo bloqueio de OGO-01, mesmo que `nome` e `uf` já estejam preenchidos. (OGO-15)
3. WHEN a migration é aplicada THEN o sistema SHALL preservar os valores organizacionais já gravados desses GOs. (OGO-16)

**Independent Test**: inserir um GO com os 6 campos preenchidos e a flag no default, logar e confirmar o redirect para `/cadastro-ofertante` com os valores antigos intactos no banco.

---

## Edge Cases

- IF um GO com `dadosOrganizacionaisCompletos = true` abrir `/cadastro-ofertante` digitando a URL THEN o sistema SHALL exibir a tela e SHALL responder HTTP 409 no envio, sem alterar dado nenhum. (OGO-17)
- IF não houver sessão válida THEN `/cadastro-ofertante` SHALL redirecionar para `/login`. (OGO-18)
- WHEN o GO envia o formulário com o nome pré-preenchido inalterado THEN o sistema SHALL aceitá-lo como válido. (OGO-19)
- IF o `nome` de um GO estiver nulo no banco THEN `/cadastro-ofertante` SHALL exibir o campo nome vazio e SHALL continuar exigindo o preenchimento. (OGO-20)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| OGO-01 | P1: Coleta no 1º login | Execute | Done (T4) |
| OGO-02 | P1: Coleta no 1º login | Execute | Done (T5) |
| OGO-03 | P1: Coleta no 1º login | Execute | Done (T3) |
| OGO-04 | P1: Coleta no 1º login | Execute | Done (T2, T3) |
| OGO-05 | P1: Coleta no 1º login | Execute | Done (T3) |
| OGO-06 | P1: Coleta no 1º login | Execute | Done (T4) |
| OGO-07 | P1: Coleta no 1º login | Execute | Done (T3) |
| OGO-08 | P1: Coleta no 1º login | Execute | Done (T4, teste existente) |
| OGO-09 | P1: Criação enxuta | Execute | Done (T6) |
| OGO-10 | P1: Criação enxuta | Execute | Done (T6) |
| OGO-11 | P1: Criação enxuta | Design | Pending |
| OGO-12 | P1: Criação enxuta | Execute | Done (T6) |
| OGO-13 | P1: Criação enxuta | Execute | Done (T6) |
| OGO-14 | P2: GOs existentes | Execute | Done (T1) |
| OGO-15 | P2: GOs existentes | Execute | Done (T1, T4) |
| OGO-16 | P2: GOs existentes | Execute | Done (T1) |
| OGO-17 | Edge case | Execute | Done (T3, T5) |
| OGO-18 | Edge case | Execute | Done (T5) |
| OGO-19 | Edge case | Execute | Done (T5) |
| OGO-20 | Edge case | Execute | Done (T5) |

**Coverage:** 20 total, 0 mapeados em tasks (Tasks ainda não rodou), 20 Pending.

---

## Success Criteria

- [ ] Um GO novo não abre nenhuma tela de `(protegido)` sem enviar os 6 campos.
- [ ] Nenhum GO fica com campo organizacional vazio depois do envio.
- [ ] A tela de criação de usuário, com GO selecionado, pede CNPJ, nome, tipo e verba — nada mais.
- [ ] `POST /api/usuarios` rejeita com 400 qualquer dado organizacional na criação de um GO.
- [ ] Nenhum perfil além do GO muda de comportamento.
- [ ] Nenhum dado organizacional existente foi apagado pela migration.
- [ ] Gate completo verde: `lint && build && typecheck && test:unit && test:integration && test:e2e`.
