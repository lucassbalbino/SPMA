# formulario-pos-curso Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/formulario-pos-curso/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Herdada de `auth-e-usuarios`/`seguranca-transversal`/`cadastro-ofertante-verba`/`formulario-pre-curso` (mesma stack já aprovada e em uso): Vitest (unit) + Playwright (e2e). Nenhum `AGENTS.md`/config com threshold de cobertura explícito além do que os testes existentes já praticam — aplicado o padrão forte (1:1 com ACs da spec + todo edge case listado), igual às 4 features anteriores.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/pure logic (`pos-curso.schema.ts`, `completude.ts`, `guards.ts` alias) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/**/*.test.ts` | `npm run test:unit` |
| API routes + páginas (criação, leitura/gravação parcial, encerramento, listagem, formulários) | e2e | Todas as rotas/telas tocadas: happy path + cada edge case listado + paths de erro, contra `spma_test` real | `e2e/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

> Herdada das features anteriores - mesma ordem de build.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with e2e tests | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | After phase completion or config/scaffold-only tasks | `npm run lint && npm run build && npm run typecheck` |

---

## Execution Plan

Phases são ordenadas e rodam sequencialmente. **9 tarefas no total** → excede o limite de lote único (~8), oferecido delegação em sub-agentes ao usuário antes do Execute (ver seção final deste documento). Nenhum componente shadcn novo é necessário (os 5 tipos de controle já existem desde `formulario-pre-curso` T4) — por isso esta feature tem uma fase a menos que a anterior.

### Phase 1: Fundações (schema, guarda de escrita, completude)

```
T1 → T3
(T2 é independente)
```

### Phase 2: Rotas de API

```
T1 → T4
T2 → T4
T1 → T5
T2 → T5
T1 → T6
T2 → T6
T3 → T6
```

### Phase 3: Telas

```
T4 → T7
T1 → T8
T4 → T8
T5 → T9
T6 → T9
```

---

## Task Breakdown

### Phase 1: Fundações

#### T1: `src/lib/validation/schemas/pos-curso.schema.ts`

**What**: `criarPosCursoSchema` (`cdCurso` inteiro positivo) e `respostasPosCursoSchema` (os 26 campos do Dicionário de Campos de `spec.md`, cada um com o tipo/enum correto). `datasReaisEmOrdem(dados: { posExecDataInicioReal?: string; posExecDataTerminoReal?: string }): boolean` (edge case REQ-PO-06 — comparação lexicográfica, só valida quando as duas datas estão presentes). Constantes de opções exportadas por campo de seleção (`OPCOES_PROBLEMAS_ESTUDO`, `OPCOES_MOTIVOS_ABANDONO`, etc.) para reuso pela UI (T8/T9).
**Where**: `src/lib/validation/schemas/pos-curso.schema.ts`
**Depends on**: None
**Reuses**: mesmo estilo de `pre-curso.schema.ts` (não compartilha código com ele — ver design.md Tech Decisions sobre `datasReaisEmOrdem` ser uma função própria)
**Requirement**: REQ-PO-01, REQ-PO-05, REQ-PO-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `criarPosCursoSchema` rejeita `cdCurso` ausente/não-positivo
- [x] `respostasPosCursoSchema` tem exatamente 26 chaves (teste de contagem — mitigação do risco de transcrição divergir da spec)
- [x] cada campo de seleção única rejeita um valor fora do seu enum
- [x] campos de seleção múltipla aceitam array de strings dentre as opções válidas, rejeitam item fora do enum, e rejeitam lista vazia `[]` como não-preenchido
- [x] os 5 campos de valor monetário (`posFinValorTotalExecutado`, `posFinValorDespesaDocentes`, `posFinValorDespesaMaterialDidatico`, `posFinValorDespesaInfraestrutura`, `posFinValorDevolvido`) rejeitam valor negativo e aceitam `0`
- [x] `respostasPosCursoSchema.partial()` aceita `{}` e aceita um subconjunto de 1 campo válido (forma do PATCH parcial)
- [x] `datasReaisEmOrdem`: término anterior ao início → `false`; término igual ao início → `true`; término posterior → `true`; só uma das datas presente → `true`; nenhuma presente → `true`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pos-curso): add pos-curso response schema and field dictionary constants`

---

#### T2: `src/lib/auth/guards.ts` — `podeGerenciarPosCurso`

**What**: `export const podeGerenciarPosCurso = podeGerenciarPreCurso;` — alias de leitura, mesma regra de autorização de escrita (só o GO vinculado ao `cdOfertante`-alvo, aqui o `cdOfertante` do `PreCurso` pai). Nenhuma lógica nova (ver design.md Tech Decisions).
**Where**: `src/lib/auth/guards.ts` (modificar)
**Depends on**: None
**Reuses**: `podeGerenciarPreCurso` (já existente e já testado)
**Requirement**: REQ-PO-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `podeGerenciarPosCurso` exportado de `guards.ts`
- [x] teste unitário confirma que `podeGerenciarPosCurso` se comporta identicamente a `podeGerenciarPreCurso` nos mesmos casos (GO vinculado ao Ofertante-alvo → `true`; GO de outro Ofertante → `false`; AM/GT/VT/VO/AL → `false` para qualquer alvo)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pos-curso): add write-authorization alias for pos-curso`

---

#### T3: `src/lib/pos-curso/completude.ts`

**What**: `validarCompletudePosCurso(respostas: unknown): { completo: boolean; pendentes: string[] }` — roda `respostasPosCursoSchema.safeParse` para as 25 chaves sempre-obrigatórias e uma função pura separada para a 1 chave condicional (REQ-PO-07), unindo os dois conjuntos de pendências. Implementado **desde o início** sem `.superRefine` encadeado no schema base — essa é a técnica que `formulario-pre-curso` só adotou depois do Verifier apontar que o Zod pula o callback de `superRefine` quando o schema base já tem qualquer issue (`.specs/LESSONS.md`).
**Where**: `src/lib/pos-curso/completude.ts`
**Depends on**: T1
**Reuses**: `respostasPosCursoSchema` (T1); a técnica (não o código) de `src/lib/pre-curso/completude.ts`
**Requirement**: REQ-PO-07, REQ-PO-09, REQ-PO-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] os 26 campos completos e `posExecHouveAlteracaoPlanejamento="Não"` → `completo=true`, `pendentes=[]`
- [x] `posExecHouveAlteracaoPlanejamento="Sim"` sem `posExecAlteracaoDetalhe` → `pendentes` inclui a chave, `completo=false`
- [x] `posExecHouveAlteracaoPlanejamento="Não"` → `posExecAlteracaoDetalhe` NÃO aparece em `pendentes` mesmo vazio (gate não se aplica)
- [x] `posFinValorDevolvido=0` é tratado como preenchido, não como pendência (edge case da spec)
- [x] pendência condicional aparece mesmo com a maioria dos outros 25 campos também ausentes (prova direta de que a técnica evita a lição registrada — testado aqui desde o início, não como correção posterior)
- [x] campo sempre-obrigatório ausente (não condicional) também aparece em `pendentes`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(pos-curso): add closure-completeness validation`

---

### Phase 2: Rotas de API

#### T4: `src/app/api/pos-cursos/route.ts` — criação e listagem

**What**: `POST` (CSRF → sessão → busca `PreCurso` pelo `cdCurso` informado, 404 se não existir → `podeGerenciarPosCurso` contra o `cdOfertante` do `PreCurso` → confere se já existe `PosCurso` para esse `cdCurso` via `findUnique`, 409 se sim → cria com `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF do GO`); `GET` lista escopado (AM/GT/VT recebem todos, com filtro opcional `?cdOfertante=`; GO/VO só o próprio Ofertante via `preCurso: { cdOfertante }`, nunca um filtro vindo do cliente; AL 403).
**Where**: `src/app/api/pos-cursos/route.ts`
**Depends on**: T1, T2
**Reuses**: `criarPosCursoSchema` (T1), `podeGerenciarPosCurso` (T2), `verificarCSRF`, `comTratamentoDeErro`, `obterSessao`, mesma estrutura de `src/app/api/pre-cursos/route.ts`
**Requirement**: REQ-PO-01, REQ-PO-02, REQ-PO-03, REQ-PO-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO cria Pós-Curso informando o `cdCurso` de um Pré-Curso do próprio Ofertante (em qualquer status) → 201, `status=EM_ANDAMENTO`, `respostas=null`
- [x] e2e: `cdCurso` que já tem Pós-Curso → 409, nenhum novo registro criado
- [x] e2e: `cdCurso` inexistente → 404
- [x] e2e: `cdCurso` de um Pré-Curso de outro Ofertante → 403, nenhum registro criado
- [x] e2e: GO vinculado ao Ofertante A lista só os Pós-Cursos do Ofertante A; GT lista todos
- [x] e2e: AL tentando criar ou listar → 403

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pos-curso): add pos-curso creation and scoped listing endpoint`

---

#### T5: `src/app/api/pos-cursos/[cdCurso]/route.ts` — consulta e gravação parcial

**What**: `GET` consulta escopada (`podeAcessarOfertante` contra o `cdOfertante` do `PreCurso` pai, via `include: { preCurso: true }`); `PATCH` grava respostas parciais — CSRF → sessão → `podeGerenciarPosCurso` → valida forma com `respostasPosCursoSchema.partial()` → 409 se `status=ENCERRADO` → merge raso em memória → valida `datasReaisEmOrdem` contra o estado MESCLADO (existente + patch), 400 se inválido → persiste.
**Where**: `src/app/api/pos-cursos/[cdCurso]/route.ts`
**Depends on**: T1, T2
**Reuses**: `respostasPosCursoSchema.partial()` e `datasReaisEmOrdem` (T1), `podeAcessarOfertante` (existente), `podeGerenciarPosCurso` (T2), mesma estrutura de `src/app/api/pre-cursos/[id]/route.ts`
**Requirement**: REQ-PO-04, REQ-PO-05, REQ-PO-06, REQ-PO-08, REQ-PO-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO grava um bloco parcial (ex.: Bloco 1 — Acompanhamento Pedagógico) → 200, os demais campos continuam ausentes/nulos
- [x] e2e: GO grava um segundo bloco em seguida → o primeiro bloco continua presente na resposta seguinte (merge raso comprovado)
- [x] e2e: `posExecDataTerminoReal` anterior a `posExecDataInicioReal` no mesmo PATCH → 400, nada persistido
- [x] e2e: a ordem também é validada contra o estado mesclado quando as datas chegam em PATCHs separados → 400
- [x] e2e: valor monetário negativo → 400, nada persistido
- [x] e2e: GO tenta gravar num Pós-Curso já `ENCERRADO` → 409, dado inalterado
- [x] e2e: GO de outro Ofertante tenta ler ou gravar → 403 em ambos
- [x] e2e: VO (perfil de leitura) consulta → 200; VO tenta gravar → 403

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pos-curso): add scoped read and partial-save endpoint`

---

#### T6: `src/app/api/pos-cursos/[cdCurso]/encerrar/route.ts` — encerramento irreversível

**What**: CSRF → sessão → `podeGerenciarPosCurso` → 409 se já `ENCERRADO` → `validarCompletudePosCurso`; se completo, `status=ENCERRADO` + `dataEncerramento=now()`; se incompleto, 400 com `{ pendentes }`.
**Where**: `src/app/api/pos-cursos/[cdCurso]/encerrar/route.ts`
**Depends on**: T1, T2, T3
**Reuses**: `validarCompletudePosCurso` (T3), `podeGerenciarPosCurso` (T2), mesma ordem RH→CSRF→Sessão→Guard e mesmo padrão de `src/app/api/pre-cursos/[id]/encerrar/route.ts`
**Requirement**: REQ-PO-08, REQ-PO-09, REQ-PO-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: Pós-Curso com os 26 campos completos e condicional satisfeito → 200, `status=ENCERRADO`, `dataEncerramento` preenchida
- [x] e2e: Pós-Curso com 1 campo obrigatório faltando → 400, `pendentes` lista a chave, `status` permanece `EM_ANDAMENTO`
- [x] e2e: segunda tentativa de encerrar um Pós-Curso já `ENCERRADO` → 409
- [x] e2e: após o encerramento, uma tentativa de `PATCH` em `/api/pos-cursos/[cdCurso]` (T5) recebe 409 (fecha REQ-PO-08 fim-a-fim)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pos-curso): add irreversible closure endpoint`

---

### Phase 3: Telas

#### T7: `src/app/(protegido)/pos-cursos/page.tsx` — listagem

**What**: Server Component (`requireSession`) que consulta `PosCurso` via Prisma com o mesmo escopo de `GET /api/pos-cursos` (AM/GT/VT todos, GO/VO só o próprio Ofertante via `preCurso: { cdOfertante }`) e renderiza uma lista com status e link para `[cdCurso]`.
**Where**: `src/app/(protegido)/pos-cursos/page.tsx`
**Depends on**: T4
**Reuses**: `requireSession`, mesmo padrão de escopo de T4, `Card` (herdado de `formulario-pre-curso`)
**Requirement**: REQ-PO-12 (tela)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO vinculado ao Ofertante A vê só os Pós-Cursos do Ofertante A na tela
- [x] e2e: GT vê todos os Pós-Cursos cadastrados
- [x] e2e: cada item lista o status atual e linka para a tela de detalhe (T9)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pos-curso): add scoped pos-curso listing page`

---

#### T8: `src/app/(protegido)/pos-cursos/novo/page.tsx` + `NovoPosCursoForm.tsx` — criação

**What**: `page.tsx` (Server Component, `requireSession`, carrega via `prisma.preCurso.findMany({ where: { cdOfertante, posCurso: null } })` os Pré-Cursos do GO ainda sem Pós-Curso, usando o back-relation já existente no schema); `NovoPosCursoForm.tsx` (Client Component — `cdCurso` via `Select`, `fetch` + `headerCSRF` para `POST /api/pos-cursos`, redireciona para `[cdCurso]` em sucesso; mensagem dedicada quando não há nenhum Pré-Curso elegível).
**Where**: `src/app/(protegido)/pos-cursos/novo/` (`page.tsx` novo, `NovoPosCursoForm.tsx` novo)
**Depends on**: T1, T4
**Reuses**: padrão exato de `pre-cursos/novo/NovoPreCursoForm.tsx` (Client Component separado, `useState` + `fetch`, sem lib de formulário), `Select` (já existente), `criarPosCursoSchema` (T1, validação client-side espelhando o servidor)
**Requirement**: REQ-PO-01, REQ-PO-02, REQ-PO-03 (tela)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e: GO cria um Pós-Curso escolhendo um Pré-Curso elegível do próprio Ofertante → redireciona para a tela de preenchimento (T9)
- [ ] e2e: seletor de Pré-Curso mostra só os do próprio Ofertante do GO autenticado que ainda não têm Pós-Curso (um Pré-Curso já com Pós-Curso não aparece na lista)
- [ ] e2e: quando não há nenhum Pré-Curso elegível, a tela mostra uma mensagem informativa em vez de um formulário vazio

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pos-curso): add pos-curso creation screen`

---

#### T9: `src/app/(protegido)/pos-cursos/[cdCurso]/page.tsx` + `PosCursoForm.tsx` — preenchimento e encerramento

**What**: `page.tsx` (Server Component, `requireSession`, carrega o `PosCurso` via Prisma com `include: { preCurso: true }` checando `podeAcessarOfertante` contra o `cdOfertante` do Pré-Curso pai, `notFound()` se inexistente/fora de escopo); `PosCursoForm.tsx` (Client Component — os 5 blocos como seções `Accordion`, mesmo padrão orientado a metadados (`BLOCOS`/`renderCampo`) de `PreCursoForm.tsx`, um `useState<Record<string, unknown>>` único para `respostas` com `setCampo` genérico, botão "Salvar rascunho" faz `PATCH` em `/api/pos-cursos/[cdCurso]`, botão "Encerrar" faz `POST` em `/api/pos-cursos/[cdCurso]/encerrar` e exibe a lista de `pendentes` quando bloqueado; campos desabilitados e mensagem de somente-leitura quando `status=ENCERRADO`).
**Where**: `src/app/(protegido)/pos-cursos/[cdCurso]/` (`page.tsx` novo, `PosCursoForm.tsx` novo)
**Depends on**: T5, T6
**Reuses**: `Accordion`/`RadioGroup`/`Checkbox`/`Select`/`Textarea` (já existentes), `Field*`/`Input`/`Textarea`/`Button` já existentes, constantes de opções de `pos-curso.schema.ts` (T1), `headerCSRF`, mesmo padrão de `PreCursoForm.tsx` (metadados de blocos, sem lib externa de formulário)
**Requirement**: REQ-PO-04 a REQ-PO-11 (tela — fecha as stories de preenchimento/condicional/encerramento de ponta a ponta pela UI)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e: GO abre um Pós-Curso `EM_ANDAMENTO`, preenche um bloco e salva rascunho → permanece na tela, dado persistido (confirmado num reload)
- [ ] e2e: GO preenche `posExecHouveAlteracaoPlanejamento="Sim"` sem `posExecAlteracaoDetalhe`, tenta encerrar → bloqueado, a pendência é exibida referenciando o campo
- [ ] e2e: GO preenche os 26 campos (incluindo o condicional aplicável) e encerra → tela reflete `status=ENCERRADO`, campos desabilitados (somente leitura)
- [ ] e2e: GO reabre um Pós-Curso já `ENCERRADO` → nenhum campo é editável, botão "Salvar rascunho"/"Encerrar" ausentes ou desabilitados
- [ ] e2e: VO (perfil de leitura) abre a tela de um Pós-Curso do próprio Ofertante → vê os dados, sem controles de edição
- [ ] e2e: GO de outro Ofertante tentando acessar a URL diretamente → página de não encontrado/negado

**Tests**: e2e
**Gate**: full

**Commit**: `feat(pos-curso): add fill-in and closure screen`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T3
          T2  (sem dependências, mesma fase)
Phase 2:  T1 ------→ T4
          T2 ------→ T4
          T1 ------→ T5
          T2 ------→ T5
          T1 ------→ T6
          T2 ------→ T6
          T3 ------→ T6
Phase 3:  T4 ------→ T7
          T1 ------→ T8
          T4 ------→ T8
          T5 ------→ T9
          T6 ------→ T9
```

Dentro de cada fase, tarefas sem dependência entre si ainda executam em ordem sequencial (uma por vez, sem paralelismo intra-fase) — a ordem numérica é a ordem de execução; as setas acima marcam só dependência real, não sequência de execução.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: schema Zod de 26 campos + `datasReaisEmOrdem` + constantes de opções | 1 arquivo | ✅ Granular |
| T2: `podeGerenciarPosCurso` (alias) | 1 export, 1 arquivo | ✅ Granular |
| T3: `validarCompletudePosCurso` | 1 função (1 arquivo) | ✅ Granular |
| T4: `POST`/`GET /api/pos-cursos` | 1 endpoint (1 arquivo, 2 verbos do mesmo recurso) | ✅ Granular |
| T5: `GET`/`PATCH /api/pos-cursos/[cdCurso]` | 1 endpoint (1 arquivo, 2 verbos do mesmo recurso) | ✅ Granular |
| T6: `POST /api/pos-cursos/[cdCurso]/encerrar` | 1 endpoint | ✅ Granular |
| T7: listagem | 1 tela (1 arquivo) | ✅ Granular |
| T8: criação | 1 tela (Server Component + seu Client Component colocado) | ⚠️ 2 arquivos, cohesivo (mesma tela) |
| T9: preenchimento/encerramento | 1 tela (Server Component + seu Client Component colocado) | ⚠️ 2 arquivos, cohesivo (mesma tela) |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1, T2 | T1 → T4, T2 → T4 | ✅ Match |
| T5 | T1, T2 | T1 → T5, T2 → T5 | ✅ Match |
| T6 | T1, T2, T3 | T1 → T6, T2 → T6, T3 → T6 | ✅ Match |
| T7 | T4 | T4 → T7 | ✅ Match |
| T8 | T1, T4 | T1 → T8, T4 → T8 | ✅ Match |
| T9 | T5, T6 | T5 → T9, T6 → T9 | ✅ Match |

Nenhuma dependência aponta para uma fase posterior à do dependente.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: pos-curso.schema.ts | Domain/pure logic | unit | unit | ✅ OK |
| T2: guards.ts (alias) | Domain/pure logic | unit | unit | ✅ OK |
| T3: completude.ts | Domain/pure logic | unit | unit | ✅ OK |
| T4: POST/GET /api/pos-cursos | API route | e2e | e2e | ✅ OK |
| T5: GET/PATCH /api/pos-cursos/[cdCurso] | API route | e2e | e2e | ✅ OK |
| T6: POST /api/pos-cursos/[cdCurso]/encerrar | API route | e2e | e2e | ✅ OK |
| T7: listagem | Página (API route consumida) | e2e | e2e | ✅ OK |
| T8: criação | Página + Client Component | e2e | e2e | ✅ OK |
| T9: preenchimento/encerramento | Página + Client Component | e2e | e2e | ✅ OK |

Nenhuma violação — todo `Tests` de tarefa bate com a camada correspondente na Test Coverage Matrix.

---

## Delegação em sub-agentes

9 tarefas > ~8 (limite de lote único do skill) → oferta obrigatória ao usuário antes do Execute. Empacotamento por fase inteira, ~7 tarefas por lote:

- **Lote 1** (Fases 1–2, 6 tarefas: T1–T6) — fundações + rotas de API.
- **Lote 2** (Fase 3, 3 tarefas: T7–T9) — telas.

Alternativa: executar tudo inline, sem sub-agentes, dado que 9 tarefas é um volume administrável numa única sessão contínua (a feature anterior, com 10 tarefas e maior novidade de domínio, foi executada assim). Pergunta ao usuário antes do Execute.
