# formulario-pre-curso Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/formulario-pre-curso/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Herdada de `auth-e-usuarios`/`seguranca-transversal`/`cadastro-ofertante-verba` (mesma stack já aprovada e em uso): Vitest (unit) + Playwright (e2e). Guidelines encontradas: nenhum `AGENTS.md`/config com threshold de cobertura explícito para este projeto além do que os testes existentes já praticam — aplicado o padrão forte (1:1 com ACs da spec + todo edge case listado), igual às 3 features anteriores. Diferente de `cadastro-ofertante-verba`, esta feature não introduz nenhuma função de serviço que toque o Prisma fora de uma rota (não há um `saldo.ts` equivalente aqui) — por isso não há camada "integration" nova; `validarCompletudePreCurso` é lógica pura sobre o JSON já carregado.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/pure logic (`pre-curso.schema.ts`, `completude.ts`, `guards.ts` nova função) | unit | All branches; 1:1 to spec ACs; every listed edge case (inclui o item de infra = 0 tratado como preenchido) | `src/lib/**/*.test.ts` | `npm run test:unit` |
| API routes + páginas (criação, leitura/gravação parcial, encerramento, listagem, formulários) | e2e | Todas as rotas/telas tocadas: happy path + cada edge case listado + paths de erro, contra `spma_test` real | `e2e/*.spec.ts` | `npm run test:e2e` |
| shadcn UI primitives (scaffold puro, sem lógica própria) | none | — (build gate only) | `src/components/ui/*.tsx` | build gate only |

## Gate Check Commands

> Herdada de `auth-e-usuarios`/`seguranca-transversal`/`cadastro-ofertante-verba` - mesma ordem de build.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with e2e tests | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | After phase completion or config/scaffold-only tasks | `npm run lint && npm run build && npm run typecheck` |

---

## Execution Plan

Phases são ordenadas e rodam sequencialmente. **10 tarefas no total** → excede o limite de lote único (~8), oferecido delegação em sub-agentes ao usuário antes do Execute (ver seção final deste documento).

### Phase 1: Fundações (schema, guarda de escrita, completude)

```
T1 → T3
(T2 é independente)
```

### Phase 2: Componentes de UI (shadcn)

```
(T4 é independente - scaffold puro)
```

### Phase 3: Rotas de API

```
T1 → T5
T2 → T5
T1 → T6
T2 → T6
T1 → T7
T2 → T7
T3 → T7
```

### Phase 4: Telas

```
T5 → T8
T5 → T9
T4 → T9
T6 → T10
T7 → T10
T4 → T10
```

---

## Task Breakdown

### Phase 1: Fundações

#### T1: `src/lib/validation/schemas/pre-curso.schema.ts`

**What**: `criarPreCursoSchema` (`cdVerba` inteiro positivo, `vlCursoAlocado` decimal positivo) e `respostasPreCursoSchema` (os 56 campos do Dicionário de Campos de `spec.md`, cada um com o tipo/enum correto; blocos 6/7 usam um `escalaInfraestrutura = z.number().int().min(0).max(5)` compartilhado). Constantes de opções exportadas por campo de seleção (`OPCOES_MODALIDADE`, `OPCOES_INSTITUICAO_EXECUTORA`, etc.) para reuso pela UI (T9/T10).
**Where**: `src/lib/validation/schemas/pre-curso.schema.ts`
**Depends on**: None
**Reuses**: mesmo estilo de `verba.schema.ts`/`primeiro-acesso.schema.ts`
**Requirement**: REQ-PC-01, REQ-PC-05, REQ-PC-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `criarPreCursoSchema` rejeita `cdVerba` ausente/não-positivo e `vlCursoAlocado` não-positivo
- [x] `respostasPreCursoSchema` tem exatamente 56 chaves (teste de contagem — mitigação do risco de transcrição divergir da spec, `design.md` Risks)
- [x] cada uma das 17 chaves de infraestrutura (Blocos 6/7) aceita só inteiro 0–5; rejeita `6`, `-1` e `2.5`
- [x] cada campo de seleção única rejeita um valor fora do seu enum
- [x] campos de seleção múltipla aceitam array de strings dentre as opções válidas e rejeitam item fora do enum
- [x] `respostasPreCursoSchema.partial()` aceita `{}` e aceita um subconjunto de 1 campo válido (forma do PATCH parcial)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pre-curso): add pre-curso response schema and field dictionary constants`

---

#### T2: `src/lib/auth/guards.ts` — `podeGerenciarPreCurso`

**What**: `podeGerenciarPreCurso(usuario: { tipo: TipoUsuario; cdOfertante: number | null }, cdOfertanteAlvo: number): boolean` — `true` somente se `usuario.tipo === "GO" && usuario.cdOfertante === cdOfertanteAlvo`. Todos os demais perfis `false` (diferente de `podeEditarOfertante`, que dá `true` para AM/GT — aqui não dá, pois só o GO preenche o pré-curso, seção 4 do documento fonte).
**Where**: `src/lib/auth/guards.ts` (modificar)
**Depends on**: None
**Reuses**: estilo/assinatura de `podeAcessarOfertante`/`podeEditarOfertante` já existentes no mesmo arquivo
**Requirement**: REQ-PC-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] GO vinculado ao `cdOfertanteAlvo` → `true`
- [x] GO vinculado a outro Ofertante → `false`
- [x] AM/GT/VT/VO/AL → `false` para qualquer alvo

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pre-curso): add write-authorization guard for pre-curso`

---

#### T3: `src/lib/pre-curso/completude.ts`

**What**: `validarCompletudePreCurso(respostas: unknown): { completo: boolean; pendentes: string[] }` — roda `respostasPreCursoSchema` "cheio" (todas as 56 chaves obrigatórias) mais um `.superRefine` com as 3 regras condicionais (instituição executora, equipamentos específicos, os 5 campos "Outro/Outra"); `pendentes` reúne todas as chaves faltantes (não só a primeira).
**Where**: `src/lib/pre-curso/completude.ts`
**Depends on**: T1
**Reuses**: `respostasPreCursoSchema` (T1), técnica `.superRefine` de `primeiro-acesso.schema.ts`
**Requirement**: REQ-PC-07, REQ-PC-08, REQ-PC-09, REQ-PC-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] os 56 campos completos e nenhum condicional disparado → `completo=true`, `pendentes=[]`
- [x] `publicoInstituicaoExecutora="Empresa contratada"` sem `publicoInstituicaoExecutoraNome` → `pendentes` inclui a chave, `completo=false` (CA-04 do documento fonte)
- [x] `infraEspecificaNecessidade="Sim"` sem as 3 perguntas condicionais → as 3 chaves aparecem em `pendentes`
- [x] `infraEspecificaNecessidade="Não"` → as 3 perguntas condicionais NÃO aparecem em `pendentes` mesmo vazias (gate não se aplica)
- [x] cada um dos 5 campos com opção "Outro/Outra" selecionada sem o texto condicional correspondente preenchido → a chave de texto aparece em `pendentes` (5 casos, um por campo)
- [x] um item de infraestrutura com valor `0` é tratado como preenchido, não como pendência (edge case da spec)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pre-curso): add closure-completeness validation with conditional gates`

---

### Phase 2: Componentes de UI

#### T4: Primitivas shadcn/ui para o formulário

**What**: Adicionar via `npx shadcn add radio-group checkbox select textarea accordion` os 5 componentes que os 56 campos exigem e que ainda não existem no projeto (hoje só há `button`, `card`, `field`, `input`, `label`, `separator`).
**Where**: `src/components/ui/` (novos: `radio-group.tsx`, `checkbox.tsx`, `select.tsx`, `textarea.tsx`, `accordion.tsx`)
**Depends on**: None
**Reuses**: `components.json` já configurado (AD-006)
**Requirement**: — (scaffold; base de UI para REQ-PC-04/07/08/09 nas telas de T9/T10)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] os 5 arquivos existem em `src/components/ui/` e exportam os componentes
- [x] `npm run build && npm run typecheck` passam com os novos componentes presentes (mesmo antes de qualquer tela os importar)

**Tests**: none (camada de scaffold — matriz confirma "none")
**Gate**: build

**Commit**: `chore(pre-curso): add shadcn UI primitives for the questionnaire form`

---

### Phase 3: Rotas de API

#### T5: `src/app/api/pre-cursos/route.ts` — criação e listagem

**What**: `POST` (CSRF → sessão → `podeGerenciarPreCurso` → `criarPreCursoSchema` → confirma que a Verba pertence ao Ofertante do GO → `validarAlocacao` → cria com `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF do GO`); `GET` lista escopado (AM/GT/VT recebem todos, com filtro opcional `?cdOfertante=`; GO/VO só o próprio Ofertante, nunca um filtro vindo do cliente; AL 403).
**Where**: `src/app/api/pre-cursos/route.ts`
**Depends on**: T1, T2
**Reuses**: `criarPreCursoSchema` (T1), `podeGerenciarPreCurso` (T2), `validarAlocacao` (`src/lib/verba/saldo.ts`, já existente), `verificarCSRF`, `comTratamentoDeErro`, `obterSessao`, mesma estrutura de `src/app/api/verbas/route.ts`
**Requirement**: REQ-PC-01, REQ-PC-02, REQ-PC-03, REQ-PC-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO cria pré-curso com `vlCursoAlocado` dentro do saldo disponível → 201, `status=EM_ANDAMENTO`, `respostas=null`
- [x] e2e: `vlCursoAlocado` acima do saldo disponível → 400 com `saldoDisponivel` no corpo, nenhum registro criado (REQ-PC-02)
- [x] e2e: `vlCursoAlocado` igual ao saldo disponível → 201 (AD-016, uso de até 100%)
- [x] e2e: `cdVerba` de uma Verba de outro Ofertante → 403, nenhum registro criado (REQ-PC-03)
- [x] e2e: GO vinculado ao Ofertante A lista só os pré-cursos do Ofertante A; GT lista todos
- [x] e2e: AL tentando criar ou listar → 403

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): add pre-curso creation and scoped listing endpoint`

---

#### T6: `src/app/api/pre-cursos/[id]/route.ts` — consulta e gravação parcial

**What**: `GET` consulta escopada (`podeAcessarOfertante`); `PATCH` grava respostas parciais — CSRF → sessão → `podeGerenciarPreCurso` → valida forma com `respostasPreCursoSchema.partial()` → 409 se `status=ENCERRADO` → merge raso em memória (`{ ...atual.respostas, ...corpoValidado }`) → persiste.
**Where**: `src/app/api/pre-cursos/[id]/route.ts`
**Depends on**: T1, T2
**Reuses**: `respostasPreCursoSchema.partial()` (T1), `podeAcessarOfertante` (existente), `podeGerenciarPreCurso` (T2), mesma estrutura de `src/app/api/verbas/[id]/route.ts`
**Requirement**: REQ-PC-04, REQ-PC-05, REQ-PC-06, REQ-PC-12, REQ-PC-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO grava um bloco parcial (ex.: Bloco 1 — Identificação) → 200, os demais campos continuam ausentes/nulos
- [x] e2e: GO grava um segundo bloco em seguida → o primeiro bloco continua presente na resposta seguinte (merge raso comprovado, REQ-PC-04)
- [x] e2e: valor de infraestrutura fora de 0–5 → 400, nada persistido
- [x] e2e: GO tenta gravar num pré-curso já `ENCERRADO` → 409, dado inalterado (REQ-PC-12)
- [x] e2e: GO de outro Ofertante tenta ler ou gravar → 403 em ambos
- [x] e2e: VO (perfil de leitura) consulta → 200; VO tenta gravar → 403

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): add scoped read and partial-save endpoint`

---

#### T7: `src/app/api/pre-cursos/[id]/encerrar/route.ts` — encerramento irreversível

**What**: CSRF → sessão → `podeGerenciarPreCurso` → 409 se já `ENCERRADO` → `validarCompletudePreCurso`; se completo, `status=ENCERRADO` + `dataEncerramento=now()`; se incompleto, 400 com `{ pendentes }`.
**Where**: `src/app/api/pre-cursos/[id]/encerrar/route.ts`
**Depends on**: T1, T2, T3
**Reuses**: `validarCompletudePreCurso` (T3), `podeGerenciarPreCurso` (T2), mesma ordem RH→CSRF→Sessão→Guard já usada nas outras rotas; mesmo padrão de rota de ação de `src/app/api/auth/primeiro-acesso`
**Requirement**: REQ-PC-10, REQ-PC-11, REQ-PC-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: pré-curso com os 56 campos completos e condicionais satisfeitos → 200, `status=ENCERRADO`, `dataEncerramento` preenchida (CA-05 do documento fonte)
- [x] e2e: pré-curso com 1 campo obrigatório faltando → 400, `pendentes` lista a chave, `status` permanece `EM_ANDAMENTO`
- [x] e2e: segunda tentativa de encerrar um pré-curso já `ENCERRADO` → 409
- [x] e2e: após o encerramento, uma tentativa de `PATCH` em `/api/pre-cursos/[id]` (T6) recebe 409 (fecha REQ-PC-12 fim-a-fim)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): add irreversible closure endpoint`

---

### Phase 4: Telas

#### T8: `src/app/(protegido)/pre-cursos/page.tsx` — listagem

**What**: Server Component (`requireSession`) que consulta `PreCurso` via Prisma com o mesmo escopo de `GET /api/pre-cursos` (AM/GT/VT todos, GO/VO só o próprio Ofertante) e renderiza uma lista com status e link para `[id]`.
**Where**: `src/app/(protegido)/pre-cursos/page.tsx`
**Depends on**: T5
**Reuses**: `requireSession`, mesmo padrão de escopo de `T5`/`listarVerbas`, `Card`
**Requirement**: REQ-PC-14 (tela)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO vinculado ao Ofertante A vê só os pré-cursos do Ofertante A na tela
- [x] e2e: GT vê todos os pré-cursos cadastrados
- [x] e2e: cada item lista o status atual e linka para a tela de detalhe (T10)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): add scoped pre-curso listing page`

---

#### T9: `src/app/(protegido)/pre-cursos/novo/page.tsx` + `NovoPreCursoForm.tsx` — criação

**What**: `page.tsx` (Server Component, `requireSession`, carrega as Verbas do Ofertante do GO para popular o seletor); `NovoPreCursoForm.tsx` (Client Component — `cdVerba` via `Select` e `vlCursoAlocado` via `Input`, `fetch` + `headerCSRF` para `POST /api/pre-cursos`, redireciona para `[id]` em sucesso).
**Where**: `src/app/(protegido)/pre-cursos/novo/` (`page.tsx` novo, `NovoPreCursoForm.tsx` novo)
**Depends on**: T5, T4
**Reuses**: padrão exato de `NovoUsuarioForm.tsx`/`cadastro-ofertante/page.tsx` (Client Component separado, `useState` + `fetch`, sem lib de formulário), `Select` (T4), `criarPreCursoSchema` (T1, validação client-side espelhando o servidor)
**Requirement**: REQ-PC-01, REQ-PC-02, REQ-PC-03 (tela)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO cria um pré-curso escolhendo uma Verba do próprio Ofertante com valor dentro do saldo → redireciona para a tela de preenchimento (T10)
- [x] e2e: valor acima do saldo disponível → mensagem de erro exibida com o saldo informado, nenhuma navegação
- [x] e2e: seletor de Verba mostra só as Verbas do Ofertante do GO autenticado

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): add pre-curso creation screen`

---

#### T10: `src/app/(protegido)/pre-cursos/[id]/page.tsx` + `PreCursoForm.tsx` — preenchimento e encerramento

**What**: `page.tsx` (Server Component, `requireSession`, carrega o `PreCurso` via Prisma checando `podeAcessarOfertante`, `notFound()` se inexistente/fora de escopo); `PreCursoForm.tsx` (Client Component — os 12 blocos como seções `Accordion`, um `useState<Record<string, unknown>>` único para `respostas` com `setCampo(chave, valor)` genérico, botão "Salvar rascunho" faz `PATCH` em `/api/pre-cursos/[id]` com o estado atual, botão "Encerrar" faz `POST` em `/api/pre-cursos/[id]/encerrar` e exibe a lista de `pendentes` quando bloqueado; campos desabilitados e mensagem de somente-leitura quando `status=ENCERRADO`).
**Where**: `src/app/(protegido)/pre-cursos/[id]/` (`page.tsx` novo, `PreCursoForm.tsx` novo)
**Depends on**: T6, T7, T4
**Reuses**: `Accordion`/`RadioGroup`/`Checkbox`/`Select`/`Textarea` (T4), `Field*`/`Input`/`Button` já existentes, constantes de opções de `pre-curso.schema.ts` (T1), `headerCSRF`, mesmo padrão sem-lib-externa de `NovoUsuarioForm.tsx`
**Requirement**: REQ-PC-04 a REQ-PC-12 (tela — fecha as 3 stories de preenchimento/condicionais/encerramento de ponta a ponta pela UI)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO abre um pré-curso `EM_ANDAMENTO`, preenche um bloco e salva rascunho → permanece na tela, dado persistido (confirmado num reload)
- [x] e2e: GO preenche `publicoInstituicaoExecutora="Empresa contratada"` sem o nome da instituição, tenta encerrar → bloqueado, a pendência é exibida referenciando o campo (REQ-PC-07/CA-04)
- [x] e2e: GO preenche os 56 campos (incluindo condicionais aplicáveis) e encerra → tela reflete `status=ENCERRADO`, campos desabilitados (somente leitura)
- [x] e2e: GO reabre um pré-curso já `ENCERRADO` → nenhum campo é editável, botão "Salvar rascunho"/"Encerrar" ausentes ou desabilitados
- [x] e2e: VO (perfil de leitura) abre a tela de um pré-curso do próprio Ofertante → vê os dados, sem controles de edição
- [x] e2e: GO de outro Ofertante tentando acessar a URL diretamente → página de não encontrado/negado (fecha REQ-PC-13/15 na camada de UI)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pre-curso): add fill-in and closure screen`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T3
          T2  (sem dependências, mesma fase)
Phase 2:  T4  (sem dependências, scaffold)
Phase 3:  T1 ------→ T5
          T2 ------→ T5
          T1 ------→ T6
          T2 ------→ T6
          T1 ------→ T7
          T2 ------→ T7
          T3 ------→ T7
Phase 4:  T5 ------→ T8
          T5 ------→ T9
          T4 ------→ T9
          T6 ------→ T10
          T7 ------→ T10
          T4 ------→ T10
```

Dentro de cada fase, tarefas sem dependência entre si (ex.: T5/T6/T7 na Fase 3) ainda executam em ordem sequencial (uma por vez, sem paralelismo intra-fase) — a ordem numérica é a ordem de execução; as setas acima marcam só dependência real, não sequência de execução.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: schema Zod de 56 campos + constantes de opções | 1 arquivo | ✅ Granular |
| T2: `podeGerenciarPreCurso` | 1 função | ✅ Granular |
| T3: `validarCompletudePreCurso` | 1 função (1 arquivo) | ✅ Granular |
| T4: 5 primitivas shadcn | 1 comando de scaffold, gerado | ✅ Granular (scaffold mecânico, sem lógica autoral) |
| T5: `POST`/`GET /api/pre-cursos` | 1 endpoint (1 arquivo, 2 verbos do mesmo recurso) | ✅ Granular |
| T6: `GET`/`PATCH /api/pre-cursos/[id]` | 1 endpoint (1 arquivo, 2 verbos do mesmo recurso) | ✅ Granular |
| T7: `POST /api/pre-cursos/[id]/encerrar` | 1 endpoint | ✅ Granular |
| T8: listagem | 1 tela (1 arquivo) | ✅ Granular |
| T9: criação | 1 tela (Server Component + seu Client Component colocado — mesmo padrão de `usuarios/novo`, T29 de `auth-e-usuarios`) | ⚠️ 2 arquivos, cohesivo (mesma tela) |
| T10: preenchimento/encerramento | 1 tela (Server Component + seu Client Component colocado) | ⚠️ 2 arquivos, cohesivo (mesma tela) |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | None | — | ✅ Match |
| T5 | T1, T2 | T1 → T5, T2 → T5 | ✅ Match |
| T6 | T1, T2 | T1 → T6, T2 → T6 | ✅ Match |
| T7 | T1, T2, T3 | T1 → T7, T2 → T7, T3 → T7 | ✅ Match |
| T8 | T5 | T5 → T8 | ✅ Match |
| T9 | T5, T4 | T5 → T9, T4 → T9 | ✅ Match |
| T10 | T6, T7, T4 | T6 → T10, T7 → T10, T4 → T10 | ✅ Match |

Nenhuma dependência aponta para uma fase posterior à do dependente.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: pre-curso.schema.ts | Domain/pure logic | unit | unit | ✅ OK |
| T2: guards.ts (nova função) | Domain/pure logic | unit | unit | ✅ OK |
| T3: completude.ts | Domain/pure logic | unit | unit | ✅ OK |
| T4: shadcn primitives | UI scaffold puro | none | none | ✅ OK |
| T5: POST/GET /api/pre-cursos | API route | e2e | e2e | ✅ OK |
| T6: GET/PATCH /api/pre-cursos/[id] | API route | e2e | e2e | ✅ OK |
| T7: POST /api/pre-cursos/[id]/encerrar | API route | e2e | e2e | ✅ OK |
| T8: listagem | Página (API route consumida) | e2e | e2e | ✅ OK |
| T9: criação | Página + Client Component | e2e | e2e | ✅ OK |
| T10: preenchimento/encerramento | Página + Client Component | e2e | e2e | ✅ OK |

Nenhuma violação — todo `Tests` de tarefa bate com a camada correspondente na Test Coverage Matrix.

---

## Delegação em sub-agentes

10 tarefas > ~8 (limite de lote único do skill) → oferta obrigatória ao usuário antes do Execute. Empacotamento por fase inteira, ~7 tarefas por lote:

- **Lote 1** (Fases 1–3, 7 tarefas: T1–T7) — fundações + rotas de API.
- **Lote 2** (Fase 4, 3 tarefas: T8–T10) — telas.

Alternativa: executar tudo inline, sem sub-agentes, dado que 10 tarefas ainda é um volume administrável numa única sessão contínua. Pergunta ao usuário antes do Execute (ver próxima interação).
