# Dados Pessoais Separados Tasks

> Este arquivo substitui integralmente a versão anterior (marcada ⛔
> DESATUALIZADA no histórico do git), refeita a partir do `design.md` atual e
> dos 27 requisitos de `spec.md`.

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/dados-pessoais-separados/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Herdada de `design.md` — nada mudou em `AGENTS.md`, Vitest ou Playwright.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica de domínio (`src/lib/**`, exceto acesso a dados) | unit | Todos os ramos; 1:1 com as ACs da spec; todo edge case listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Acesso a dados (`src/lib/respostas/repositorio.ts`) | integration | Caminhos de query principais + caminhos de erro, contra banco real | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Migration com dados | integration | Descarte por chave + avaliação sem dado pessoal + contas/avaliações intactas | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Rotas API e telas (`src/app/**`) | e2e | Toda rota tocada: happy path + edge cases + caminhos de erro | `e2e/*.spec.ts` | `npm run test:e2e` |
| Schema Prisma / migration estrutural | none | - (só gate de build) | - | build gate only |

## Gate Check Commands

> A ordem `lint && build && typecheck` é a registrada em `.specs/STATE.md` (Next 16 gera `LayoutProps` no build).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Depois de tarefas só com teste unitário | `npm run test:unit` |
| Full | Depois de tarefas com teste de integração ou e2e | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | Fim de fase, ou tarefa de schema/migration/documentação | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

**Política de gate desta feature:** herdada de `respostas-normalizadas` — a
suíte e2e roda em ~6 minutos, paralelizada por arquivo. Toda tarefa que toca
código de produção usa gate Full ou Build; só a tarefa puramente documental
(T11) roda gate Build para fechar a feature.

**Conferir sempre `test-results/.last-run.json`** (`status` + `failedTests`),
nunca a linha `N passed` nem o exit code de um pipe ou encadeamento. Checar
`netstat -ano | grep LISTENING | grep :3000` antes de qualquer gate com e2e —
um `next dev` órfão faz o Playwright falhar com exit 0.

**CPFs de teste:** todo CPF novo usado em fixture/e2e desta feature precisa
ser inédito na suíte e passar no módulo 11 (`validarCPF`) — gerar pelo dígito
verificador, nunca digitar à mão.

---

## Execution Plan

Fases são ordenadas e rodam em sequência - cada fase termina antes da próxima
começar, e as tarefas dentro de uma fase executam em ordem.

**Invariante que governa a ordem:** a Fase 1 cria a casa nova (schema Zod,
tabela, repositório) antes de qualquer coisa depender dela. A Fase 2 só tira
as 7 perguntas do questionário do curso depois que a Fase 1 garante que elas
já têm para onde ir. A Fase 3 liga o gate de navegação e a coleta obrigatória
depois que a Fase 1 garante que há o que gravar. A Fase 4 constrói a edição
por perfil reusando o componente que a Fase 3 já criou. A Fase 5 fecha a
feature em documentação, depois que tudo o resto está verde.

### Phase 1: Fundação — a casa nova do dado pessoal

```
T1 → T2 → T3
```

### Phase 2: O questionário do curso encolhe

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T3 → T4 → T5 → T6
```

### Phase 3: Coleta obrigatória no primeiro acesso

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T6 → T7 → T8 → T9
```

### Phase 4: Edição posterior pelo perfil

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T9 → T10
```

### Phase 5: Prova e fechamento

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T10 → T11
```

---

## Task Breakdown

### T1: Declarar a fronteira e a completude dos dados pessoais ✅

**What**: `respostasDadosPessoaisSchema` + `CHAVES_DADOS_PESSOAIS` (com `satisfies`) num arquivo novo, mais `validarCompletudeDadosPessoais`.
**Where**: `src/lib/validation/schemas/dados-pessoais.schema.ts` (novo), `src/lib/dados-pessoais/completude.ts` (novo)
**Depends on**: -
**Reuses**: padrão `as const satisfies readonly (keyof T)[]` de `CHAVES_PARTE_1`; padrão `issuesParaPendentes`/`ResultadoCompletude` de `src/lib/avaliacao/completude.ts` (redeclarado localmente, não importado — ver design.md item 2)
**Requirement**: PESSOAL-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `respostasDadosPessoaisSchema` tem os 7 campos `avalPessoal*` (mesmos nomes de hoje), cada um `.optional()`, com as 5 constantes de opção migradas de `avaliacao.schema.ts` (`OPCOES_GENERO`, `OPCOES_FAIXA_ETARIA`, `OPCOES_ESCOLARIDADE`, `OPCOES_RACA_ETNIA`, `OPCOES_CONDICAO_PCD`) e `OPCOES_UF` importada de `pre-curso.schema.ts`
- [x] `CHAVES_DADOS_PESSOAIS` lista as 7 chaves, com `satisfies` que quebra a compilação se alguma sumir do schema
- [x] `validarCompletudeDadosPessoais(respostas)` devolve `{ completo: false, pendentes: [...] }` quando falta 1+ campo, e `{ completo: true, pendentes: [] }` com os 7 presentes e válidos
- [x] Teste afirma cada um dos 7 campos individualmente como pendência quando ausente (não por amostra)
- [x] Teste afirma que `avalPessoalCondicaoPcd` valida contra `OPCOES_CONDICAO_PCD` (tipo da deficiência, não Sim/Não — mesma regra que `avaliacao.schema.test.ts`/`completude.test.ts` já provam hoje, preservada no lugar novo)
- [x] Gate check passes (Quick): `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(dados-pessoais): declarar as chaves e a completude do dado pessoal do aluno`

---

### T2: Tabela de dado pessoal e flag de completude no Usuario ✅

**What**: model `DadoPessoalAluno`, campo `Usuario.dadosPessoaisCompletos`, migration que cria os dois.
**Where**: `prisma/schema.prisma`, `prisma/migrations/`
**Depends on**: T1
**Reuses**: forma de `RespostaAvaliacao` (AD-041); padrão `primeiraVez` para a flag booleana
**Requirement**: PESSOAL-06, PESSOAL-07, PESSOAL-08, PESSOAL-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `DadoPessoalAluno` com `@@unique([cpf, chave, ordem])` e `@@index([chave])` (PESSOAL-08)
- [x] FK `cpf -> Usuario.cpf` com `onDelete: Cascade` (PESSOAL-09)
- [x] `Usuario.dadosPessoaisCompletos Boolean @default(false)`
- [x] Migration gerada via `prisma migrate dev`; confirmado que `ADD COLUMN ... DEFAULT false` aplica a todo `Usuario` já existente, sem `UPDATE` manual (PESSOAL-06)
- [x] Gate check passes (Build): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: none
**Gate**: build

**Commit**: `feat(dados-pessoais): criar a tabela de dado pessoal e a flag de completude do usuario`

---

### T3: Repositório ganha o formulário `dadosPessoais`

**What**: `AlvoRespostas` ganha a variante `{ formulario: "dadosPessoais"; cpf: string }`; as 4 funções privadas de `repositorio.ts` ganham o branch correspondente.
**Where**: `src/lib/respostas/repositorio.ts`
**Depends on**: T2
**Reuses**: `montarRespostas`, `gravarRespostas`, `ISOLAMENTO_RESPOSTAS` — API pública inalterada
**Requirement**: PESSOAL-07, PESSOAL-25, PESSOAL-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `gravarRespostas(tx, { formulario: "dadosPessoais", cpf }, patch)` grava só em `TB_Dado_Pessoal_Aluno`, filtrado por `cpf` (sem `cdCurso`)
- [ ] `lerRespostas` devolve `{}` quando não há nenhuma linha, e o objeto completo quando há
- [ ] Regravação de uma chave com valor novo substitui a antiga, sem duplicar linha (mesmo teste de idempotência que as outras 3 variantes já têm)
- [ ] Teste de rollback: erro dentro da transação não deixa nenhuma linha gravada em `TB_Dado_Pessoal_Aluno` (PESSOAL-26)
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: integration
**Gate**: full

**Commit**: `feat(dados-pessoais): repositorio grava e le o formulario dadosPessoais`

---

### T4: Avaliação perde as 7 chaves pessoais do schema e da completude

**What**: remove os 7 campos `avalPessoal*` e as 5 constantes de opção migradas de `avaliacao.schema.ts`; `CHAVES_PARTE_1` cai para as 12 restantes; `parte1SchemaBase` em `completude.ts` perde os 7 picks.
**Where**: `src/lib/validation/schemas/avaliacao.schema.ts`, `src/lib/avaliacao/completude.ts`
**Depends on**: T3 — fronteira de fase; a casa nova (Fase 1 inteira) já existe antes de elas saírem daqui
**Reuses**: -
**Requirement**: PESSOAL-11, PESSOAL-12, PESSOAL-14, PESSOAL-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `respostasAvaliacaoSchema` não tem mais nenhum campo `avalPessoal*`
- [ ] `CHAVES_PARTE_1` lista exatamente as 12 chaves restantes (Situação Profissional, Experiência, Motivação, Expectativas)
- [ ] `OPCOES_UF` deixa de ser importada/reexportada por `avaliacao.schema.ts` (não é mais usada ali)
- [ ] `parte1SchemaBase.pick({...})` sem os 7 campos pessoais; as 2 condicionais (`avalProfissAtividadeEspecifica`, `avalExperienciaTipoCursoAnterior`) continuam fora do pick, tratadas por `condicionais.ts` como hoje
- [ ] `validarCompletudeParte1` com as 12 chaves preenchidas e válidas devolve `completo: true`, sem exigir nenhuma das 7 antigas (PESSOAL-12)
- [ ] Testes existentes de `avaliacao.schema.test.ts` e `completude.test.ts` que referenciavam as 7 chaves são ajustados para as 12 restantes — marcado explicitamente no commit como ajuste a comportamento que mudou de propósito, não afrouxamento (ver design.md, "O que muda e por quê os testes existentes mudam")
- [ ] Gate check passes (Quick): `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(avaliacao): remover as 7 perguntas pessoais da parte 1`

---

### T5: Formulário e rota da avaliação param de aceitar dado pessoal

**What**: `AvaliacaoForm.tsx` perde o bloco "Dados Pessoais" e os imports órfãos; a rota `PATCH` rejeita com 400 qualquer chave de `CHAVES_DADOS_PESSOAIS` no corpo.
**Where**: `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/AvaliacaoForm.tsx`, `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts`, `e2e/avaliacoes-formulario.spec.ts`, `e2e/avaliacoes-id.spec.ts`, `e2e/avaliacoes-encerrar.spec.ts`
**Depends on**: T4
**Reuses**: estilo da checagem `temChaveDeParte2` já existente na rota
**Requirement**: PESSOAL-11, PESSOAL-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `BLOCOS_PARTE_1` não tem mais o bloco "Dados Pessoais"; os 6 imports de opção que só ele usava saem do arquivo
- [ ] Tela de avaliação não renderiza nenhuma das 7 perguntas (PESSOAL-11)
- [ ] `PATCH` com uma chave de `CHAVES_DADOS_PESSOAIS` no corpo devolve 400 e não persiste nenhuma linha (PESSOAL-13) — testado tanto isolado quanto misturado com chaves válidas no mesmo corpo (nenhuma delas é persistida)
- [ ] `e2e/avaliacoes-formulario.spec.ts`, `e2e/avaliacoes-id.spec.ts`, `e2e/avaliacoes-encerrar.spec.ts` param de preencher/afirmar as 7 chaves como parte do fluxo de avaliação; os `data-testid` de bloco reindexados (`bloco-parte1-2` vira `bloco-parte1-1`, etc.) são corrigidos nos specs que os usam — cada ajuste comentado no diff como consequência da mudança de escopo, não afrouxamento
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

**Commit**: `refactor(avaliacao): remover as perguntas pessoais da tela e bloquear no patch`

---

### T6: Migration descarta as respostas pessoais já gravadas

**What**: `DELETE FROM TB_Resposta_Avaliacao WHERE Chave IN (as 7 chaves)`.
**Where**: `prisma/migrations/`, `src/lib/respostas/dados-pessoais-migracao.integration.test.ts` (novo)
**Depends on**: T5
**Reuses**: padrão de migration SQL pura da AD-041 (não script TS)
**Requirement**: PESSOAL-21, PESSOAL-22, PESSOAL-23, PESSOAL-24

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Migration remove só as linhas das 7 chaves listadas literalmente (PESSOAL-21)
- [ ] Linhas de chave não-pessoal ficam intactas (PESSOAL-22)
- [ ] Contas de Aluno, `AvaliacaoAluno` e as colunas `status`/`parte1Completa`/`dataEncerramento` inalteradas (PESSOAL-23)
- [ ] Rodar a migration sobre avaliação sem nenhuma resposta pessoal não gera erro (PESSOAL-24)
- [ ] O teste lê o SQL real do disco e restaura o estado que encontrou, como `src/lib/respostas/backfill.integration.test.ts`
- [ ] Gate check passes (Build): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: integration
**Gate**: build

**Commit**: `feat(dados-pessoais): descartar as respostas pessoais ja gravadas na avaliacao`

---

### T7: Guard de navegação `requireDadosPessoaisCompletos`

**What**: guard síncrono no padrão de `requirePrimeiroAcessoConcluido`, encadeado no layout protegido.
**Where**: `src/lib/auth/guards.ts`, `src/app/(protegido)/layout.tsx`
**Depends on**: T6 — fronteira de fase; precisa só da flag no Usuario, criada na Fase 1, mas a fase anterior inteira já fechou
**Reuses**: padrão exato de `requirePrimeiroAcessoConcluido`/`requireOfertanteVinculado`
**Requirement**: PESSOAL-02, PESSOAL-04, PESSOAL-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `requireDadosPessoaisCompletos({ tipo: "AL", dadosPessoaisCompletos: false })` chama `redirect("/dados-pessoais")`
- [ ] `requireDadosPessoaisCompletos({ tipo: "AL", dadosPessoaisCompletos: true })` não redireciona
- [ ] `requireDadosPessoaisCompletos({ tipo: <qualquer não-AL>, dadosPessoaisCompletos: false })` não redireciona (PESSOAL-04)
- [ ] Encadeado em `(protegido)/layout.tsx` depois de `requireOfertanteVinculado`
- [ ] SPEC_DEVIATION documentado no design.md (item 7) referenciado num comentário no próprio guard, mesmo padrão do comentário já existente em `requirePrimeiroAcessoConcluido`
- [ ] Gate check passes (Quick): `npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): bloquear navegacao do aluno ate completar dados pessoais`

---

### T8: Rota `PATCH /api/usuarios/me/dados-pessoais`

**What**: rota que grava tudo-ou-nada, seta `dadosPessoaisCompletos`, opera só sobre o CPF da própria sessão.
**Where**: `src/app/api/usuarios/me/dados-pessoais/route.ts` (novo)
**Depends on**: T7 — predecessor direto na ordem de execução; a casa nova (schema e repositório) já foi fechada na Fase 1
**Reuses**: ordem RH→CSRF→Sessão→Guard→Zod→Transação de toda rota mutante do projeto; `gravarRespostas`, `lerRespostas`, `lerRespostasParaApi`, `ISOLAMENTO_RESPOSTAS`
**Requirement**: PESSOAL-01, PESSOAL-03, PESSOAL-05, PESSOAL-17, PESSOAL-18, PESSOAL-19, PESSOAL-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem sessão: 401. Sem CSRF válido: 403. Sessão de não-Aluno: 403 (PESSOAL-20)
- [ ] Corpo com os 7 campos válidos, estado anterior vazio: persiste os 7, seta `dadosPessoaisCompletos: true` (PESSOAL-01, PESSOAL-03)
- [ ] Corpo com 1 campo válido, estado anterior já completo: mescla, mantém os outros 6, `dadosPessoaisCompletos` continua `true` (PESSOAL-17)
- [ ] Corpo com 1 campo faltando (primeira gravação) ou inválido (edição): 400, nenhuma linha persistida, `dadosPessoaisCompletos` inalterado (PESSOAL-05, PESSOAL-18)
- [ ] Rota nunca recebe nem aceita CPF fora do da própria sessão — nenhum parâmetro de URL ou corpo permite apontar outro CPF (PESSOAL-19, por construção)
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: integration
**Gate**: full

**Commit**: `feat(dados-pessoais): rota de gravacao tudo-ou-nada do proprio aluno`

---

### T9: Tela obrigatória `/dados-pessoais` e liberação da navegação

**What**: `DadosPessoaisForm` (componente compartilhado) + página `/dados-pessoais` em `(onboarding)`.
**Where**: `src/components/dados-pessoais/DadosPessoaisForm.tsx` (novo), `src/app/(onboarding)/dados-pessoais/page.tsx` (novo), `e2e/dados-pessoais.spec.ts` (novo)
**Depends on**: T8 — predecessor direto na ordem de execução
**Reuses**: padrão de `(onboarding)/primeiro-acesso/page.tsx` e `(onboarding)/cadastro-ofertante/page.tsx` (Client Component de formulário + `router.push` no sucesso)
**Requirement**: PESSOAL-01, PESSOAL-02, PESSOAL-03, PESSOAL-04, PESSOAL-05, PESSOAL-06, PESSOAL-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Aluno recém-criado (senha definida, sem dados pessoais) tentando abrir qualquer tela protegida é redirecionado para `/dados-pessoais` (PESSOAL-02, PESSOAL-06)
- [ ] `/dados-pessoais` exibe as 7 perguntas (PESSOAL-01)
- [ ] Envio incompleto mostra erro, permanece em `/dados-pessoais` (PESSOAL-05)
- [ ] Envio completo libera a navegação; acessar `/painel` depois não volta a mostrar o questionário (PESSOAL-03, PESSOAL-27)
- [ ] Um não-Aluno com sessão válida nunca é redirecionado para `/dados-pessoais` (PESSOAL-04)
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(dados-pessoais): tela obrigatoria de coleta no primeiro acesso`

---

### T10: Edição posterior pelo perfil

**What**: página `/meus-dados` (protegida), item de navegação "Meus dados" para `AL`.
**Where**: `src/app/(protegido)/meus-dados/page.tsx` (novo), `src/lib/ui/navegacao.ts`, `e2e/meus-dados.spec.ts` (novo)
**Depends on**: T9 — predecessor direto na ordem de execução
**Reuses**: `DadosPessoaisForm` (T9); padrão `notFound()` de `avaliacoes/[cpf]/[cdCurso]/page.tsx` para acesso indevido
**Requirement**: PESSOAL-16, PESSOAL-17, PESSOAL-18, PESSOAL-19, PESSOAL-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Aluno com cadastro completo abre `/meus-dados` e vê as 7 respostas atuais, editáveis (PESSOAL-16)
- [ ] Alterar 1 campo persiste só ele, mantém os outros 6 (PESSOAL-17)
- [ ] Enviar valor inválido devolve erro, cadastro permanece completo (PESSOAL-18)
- [ ] Não-Aluno acessando `/meus-dados` diretamente recebe 404 (PESSOAL-20)
- [ ] Item "Meus dados" aparece na navegação só para `AL` (`navegacaoDoPerfil`/`modulosDoPerfil`)
- [ ] Gate check passes (Full): `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

**Commit**: `feat(dados-pessoais): edicao dos dados pessoais pelo perfil do aluno`

---

### T11: Registrar a AD e retificar as specs

**What**: AD-042 declarando a separação, o modelo de coleta obrigatória e o custo aceito; retificação de `avaliacao-aluno/spec.md` (Parte 1 agora tem 12 perguntas, não 19); Handoff atualizado.
**Where**: `.specs/STATE.md`, `.specs/features/avaliacao-aluno/spec.md`
**Depends on**: T10
**Reuses**: precedente de formato da AD-041
**Requirement**: PESSOAL-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] AD-042 cita `TB_Dado_Pessoal_Aluno`, a decisão de cardinalidade por CPF (revertendo a decisão original D2 do `context.md`, forçada pelo pedido P2), o descarte em vez de movimento, e o SPEC_DEVIATION de `/dados-pessoais` não ser literalmente `/painel`
- [ ] `avaliacao-aluno/spec.md` deixa de descrever a Parte 1 como 19 perguntas / citar as 7 chaves pessoais como parte do formulário do curso
- [ ] Handoff de `.specs/STATE.md` atualizado com o resultado desta feature
- [ ] `python3 <skill-dir>/scripts/validate_state.py dados-pessoais-separados` ainda não roda aqui (depende do Verifier) — só o gate de build
- [ ] Gate check passes (Build): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: none
**Gate**: build

**Commit**: `docs(dados-pessoais): registrar a AD-042 e retificar avaliacao-aluno`

---

## Phase Execution Map

```
Phase 1:  T1 → T2 → T3
                     |
Phase 2:             └→ T4 → T5 → T6
                                   |
Phase 3:                          └→ T7 → T8 → T9
                                              |
Phase 4:                                     └→ T10
                                                 |
Phase 5:                                        └→ T11
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Schema + completude do dado pessoal | 2 arquivos novos, funções puras | ✅ Granular |
| T2: Tabela + flag | 1 schema + 1 migration | ✅ Granular |
| T3: Repositório | 1 módulo, 1 branch novo em 4 funções | ✅ Granular |
| T4: Avaliação perde as 7 do schema/completude | 2 arquivos | ✅ Granular |
| T5: Formulário + rota da avaliação | 2 arquivos de produção + 3 specs e2e | ✅ Granular |
| T6: Migration de descarte | 1 migration + 1 teste | ✅ Granular |
| T7: Guard de navegação | 2 arquivos | ✅ Granular |
| T8: Rota de gravação | 1 arquivo novo | ✅ Granular |
| T9: Tela obrigatória | 2 arquivos novos + 1 spec e2e | ✅ Granular |
| T10: Edição pelo perfil | 2 arquivos (1 novo, 1 editado) + 1 spec e2e | ✅ Granular |
| T11: AD e retificações | 2 arquivos de memória/spec | ⚠️ Coeso: uma decisão só, propagada |

## Diagram-Definition Cross-Check

| Task | Depends on | Diagrama | Match |
| --- | --- | --- | --- |
| T1 | - | início da Fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 (fronteira de fase) | T3 → T4 (entrada de fase) | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 (fronteira de fase) | T6 → T7 (entrada de fase) | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 (fronteira de fase) | T9 → T10 (entrada de fase) | ✅ Match |
| T11 | T10 (fronteira de fase) | T10 → T11 (entrada de fase) | ✅ Match |

## Test Co-location Validation

| Task | Camada | Matriz exige | Tarefa declara | OK |
| --- | --- | --- | --- | --- |
| T1 | Domínio (funções puras) | unit | unit | ✅ OK |
| T2 | Schema Prisma | none | none | ✅ OK |
| T3 | Acesso a dados | integration | integration | ✅ OK |
| T4 | Domínio (schema + completude) | unit | unit | ✅ OK |
| T5 | Rotas API e telas | e2e | e2e | ✅ OK |
| T6 | Migration com dados | integration | integration | ✅ OK |
| T7 | Domínio (guard puro) | unit | unit | ✅ OK |
| T8 | Rota API (acesso a dados via repositório) | integration | integration | ✅ OK |
| T9 | Rotas API e telas | e2e | e2e | ✅ OK |
| T10 | Rotas API e telas | e2e | e2e | ✅ OK |
| T11 | Documentação | none | none | ✅ OK |
