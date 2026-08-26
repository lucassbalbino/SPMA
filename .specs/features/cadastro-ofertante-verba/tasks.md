# cadastro-ofertante-verba Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/cadastro-ofertante-verba/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Herdada de `auth-e-usuarios`/`seguranca-transversal` (mesma stack já aprovada e em uso): Vitest (unit/integration) + Playwright (e2e).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/pure logic (`verba.schema.ts`, `guards.ts` novas funções) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Service/data-access com banco real (`verba/saldo.ts`) | integration | Key paths + error handling, contra `spma_test` real via Prisma | `src/**/*.integration.test.ts` | `npm run test:integration` |
| API routes (Ofertante/Verba CRUD escopado) | e2e | Todas as rotas tocadas: happy path + cada edge case listado + paths de erro, via browser/API context contra `spma_test` real | `e2e/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

> Herdada de `auth-e-usuarios`/`seguranca-transversal` - mesma ordem de build.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with integration/e2e tests | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | After phase completion or config/scaffold-only tasks | `npm run lint && npm run build && npm run typecheck` |

---

## Execution Plan

Phases são ordenadas e rodam sequencialmente. **8 tarefas no total** → cabe num único lote (≤ ~8 tarefas), execução inline sem sub-agentes, conforme a regra de delegação do skill.

## Task Breakdown

---

### Phase 1: Fundações (schema de Verba, cálculo de saldo, guardas de escrita)

```
(T1, T2, T3 são independentes entre si)
```

#### T1: `src/lib/validation/schemas/verba.schema.ts`

**What**: `verbaSchema` (criação: `cdOfertante` inteiro positivo, `vlVerba` decimal positivo, `dtVerba` opcional) e `edicaoVerbaSchema` (edição: só `vlVerba`/`dtVerba`, sem `cdOfertante` - uma verba não muda de ofertante).
**Where**: `src/lib/validation/schemas/verba.schema.ts`
**Depends on**: None
**Reuses**: mesmo estilo de `ofertante.schema.ts`/`usuario.schema.ts`
**Requirement**: REQ-OV-08, REQ-OV-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `verbaSchema` rejeita `vlVerba` zero ou negativo
- [x] `verbaSchema` rejeita `cdOfertante` ausente ou não-positivo
- [x] `edicaoVerbaSchema` aceita payload sem `cdOfertante` e rejeita `vlVerba` não-positivo

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ofertante-verba): add verba validation schema`

---

#### T2: `src/lib/verba/saldo.ts`

**What**: `calcularSaldoVerba(cdVerba): Promise<{ valorTotal, totalAlocado, saldoDisponivel }>` (agrega `PreCurso.vlCursoAlocado` via `prisma.preCurso.aggregate`) e `validarNovoValorTotal(cdVerba, novoValorTotal): Promise<boolean>` (`novoValorTotal >= totalAlocado`).
**Where**: `src/lib/verba/saldo.ts`
**Depends on**: None
**Reuses**: model `PreCurso`/`Verba` já existentes em `schema.prisma`
**Requirement**: REQ-OV-11, REQ-OV-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Verba sem nenhum curso vinculado: `saldoDisponivel === valorTotal` (CA-OV-10)
- [x] Verba com um curso de valor alocado X: `saldoDisponivel === valorTotal - X` (CA-OV-11)
- [x] `validarNovoValorTotal` retorna `true` quando o novo valor iguala o já alocado (permite igualdade, AD-016) e `false` quando é menor

**Tests**: integration
**Gate**: full

**Commit**: `feat(ofertante-verba): add verba balance calculation service`

---

#### T3: `src/lib/auth/guards.ts` - `podeEditarOfertante` e `podeGerenciarVerba`

**What**: `podeEditarOfertante(usuario, cdOfertanteAlvo): boolean` (AM/GT sempre `true`; GO só se `cdOfertante === cdOfertanteAlvo`; VT/VO/AL sempre `false` - não reusa `podeAcessarOfertante`, que devolve `true` para VT de leitura). `podeGerenciarVerba(tipo): boolean` (`true` só para AM/GT).
**Where**: `src/lib/auth/guards.ts` (modificar)
**Depends on**: None
**Reuses**: mesmo estilo de `podeAcessarOfertante`/`cascata.ts`
**Requirement**: REQ-OV-02, REQ-OV-03, REQ-OV-08, REQ-OV-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `podeEditarOfertante`: AM/GT `true` para qualquer alvo; GO vinculado ao alvo `true`; GO de outro ofertante `false`; VT `false` (diferença chave frente a `podeAcessarOfertante`); VO/AL `false`
- [x] `podeGerenciarVerba`: AM/GT `true`; GO/VO/VT/AL `false`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ofertante-verba): add write-authorization guards for ofertante and verba`

---

### Phase 2: Rotas de Ofertante

```
T3 → T5
```

#### T4: `src/app/api/ofertantes/route.ts` - listagem escopada + pré-cadastro por AM/GT

**What**: (a) `GET` - AM/GT/VT recebem todos os Ofertantes; GO/VO recebem só o próprio (`where: { cdOfertante: sessao.usuario.cdOfertante }`, nunca um filtro vindo do cliente); (b) estender `POST` - AM/GT podem criar um Ofertante autônomo (sem se vincular, eles não têm `cdOfertante`), preservando sem alteração o auto-cadastro do GO já implementado (GO sem vínculo se cadastra e se vincula; GO já vinculado recebe 409; VT/VO/AL continuam recebendo 403).
**Where**: `src/app/api/ofertantes/route.ts` (modificar)
**Depends on**: None
**Reuses**: `ofertanteSchema`, `verificarCSRF`, `comTratamentoDeErro`, `obterSessao` (todos já usados neste arquivo)
**Requirement**: REQ-OV-01, REQ-OV-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-OV-01: AM e GT autenticados criam Ofertante com nome+UF válidos, sem qualquer `cdOfertante` próprio alterado
- [x] e2e CA-OV-02: cadastro sem nome ou sem UF é rejeitado com 400
- [x] e2e CA-OV-07: GT lista todos os Ofertantes; GO vinculado ao Ofertante A lista só o Ofertante A
- [x] e2e: comportamento existente de auto-cadastro do GO (201/409/403) continua idêntico - nenhum teste de `auth-e-usuarios` para esta rota regride

**Tests**: e2e
**Gate**: full

**Commit**: `feat(ofertante-verba): add scoped ofertante listing and admin pre-registration`

---

#### T5: `src/app/api/ofertantes/[id]/route.ts` - consulta e edição de um Ofertante

**What**: `GET` (checa `podeAcessarOfertante`, 403 se fora de escopo, 404 se não existe) e `PATCH` (checa `podeEditarOfertante`, valida com `ofertanteSchema`, persiste).
**Where**: `src/app/api/ofertantes/[id]/route.ts` (novo)
**Depends on**: T3
**Reuses**: `podeAcessarOfertante` (já existe), `podeEditarOfertante` (T3), `ofertanteSchema`
**Requirement**: REQ-OV-02, REQ-OV-03, REQ-OV-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-OV-03: GO vinculado ao Ofertante A edita o Ofertante A, alteração persiste
- [x] e2e CA-OV-04: GO vinculado ao Ofertante A tenta editar o Ofertante B, recebe 403, Ofertante B inalterado
- [x] e2e CA-OV-06: GO consulta o próprio Ofertante (200) e o de outro (403)
- [x] e2e CA-OV-15: GT forjando edição/consulta de um Ofertante qualquer nunca é bloqueado por escopo (AM/GT têm escopo nacional) - variante GO forjando outro Ofertante é o CA-OV-04/06 acima

**Tests**: e2e
**Gate**: full

**Commit**: `feat(ofertante-verba): add scoped ofertante read and edit endpoint`

---

### Phase 3: Rotas de Verba

```
T1 → T6
T2 → T6
T3 → T6
T1 → T7
T2 → T7
T3 → T7
```

#### T6: `src/app/api/verbas/route.ts` - criação e listagem de Verba

**What**: `POST` (checa `podeGerenciarVerba`, valida `verbaSchema`, checa existência do `cdOfertante` antes de criar - 400 se não existir, CA-OV-09); `GET` (mesmo escopo de `GET /api/ofertantes` - AM/GT/VT veem todas ou filtram por `?cdOfertante=`, GO/VO só o próprio, ignorando qualquer filtro do cliente) - cada item inclui `saldoDisponivel` via `calcularSaldoVerba`.
**Where**: `src/app/api/verbas/route.ts` (novo)
**Depends on**: T1, T2, T3
**Reuses**: `verbaSchema` (T1), `calcularSaldoVerba` (T2), `podeGerenciarVerba` (T3), `podeAcessarOfertante` (já existe), `verificarCSRF`/`comTratamentoDeErro` (já existem)
**Requirement**: REQ-OV-08, REQ-OV-10, REQ-OV-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e CA-OV-08: GT cria Verba com valor positivo para Ofertante existente, Verba criada e vinculada
- [x] e2e CA-OV-09: criação de Verba com `cdOfertante` inexistente é rejeitada com 400 claro
- [x] e2e: GO sem perfil AM/GT tentando criar Verba recebe 403
- [x] e2e: listagem escopada - GT vê todas, GO vinculado ao Ofertante A vê só as do Ofertante A

**Tests**: e2e
**Gate**: full

**Commit**: `feat(ofertante-verba): add verba creation and scoped listing endpoint`

---

#### T7: `src/app/api/verbas/[id]/route.ts` - consulta e edição de Verba

**What**: `GET` (checa `podeAcessarOfertante` contra o `cdOfertante` da Verba; resposta inclui `saldoDisponivel`); `PATCH` (checa `podeGerenciarVerba`, valida `edicaoVerbaSchema`, chama `validarNovoValorTotal` antes de gravar - 409 se o novo valor for menor que o já alocado).
**Where**: `src/app/api/verbas/[id]/route.ts` (novo)
**Depends on**: T1, T2, T3
**Reuses**: `edicaoVerbaSchema` (T1), `calcularSaldoVerba`/`validarNovoValorTotal` (T2), `podeGerenciarVerba` (T3), `podeAcessarOfertante` (já existe)
**Requirement**: REQ-OV-09, REQ-OV-10, REQ-OV-11, REQ-OV-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e CA-OV-10/11: `GET` de uma Verba recém-criada devolve `saldoDisponivel` igual ao valor total; após um curso alocado (criado via Prisma direto no fixture do teste, já que a rota de curso ainda não existe), devolve o saldo reduzido
- [ ] e2e CA-OV-12: edição definindo o novo valor total exatamente igual ao já alocado é aceita, saldo resultante zero
- [ ] e2e CA-OV-14: edição tentando reduzir o valor total abaixo do já alocado é rejeitada com 409, valor original preservado
- [ ] e2e: leitura/edição fora do escopo do Ofertante (GO de outro ofertante) recebe 403

**Tests**: e2e
**Gate**: full

**Commit**: `feat(ofertante-verba): add scoped verba read and edit endpoint with balance guard`

---

### Phase 4: Fechamento do vínculo usuário-Ofertante

```
(T8 independente das fases anteriores)
```

#### T8: `src/app/api/usuarios/route.ts` - validar existência do Ofertante

**What**: Antes do `prisma.usuario.create`, se o `cdOfertante` resolvido não for `null`, checar `prisma.ofertante.findUnique`; se não existir, `400 { erro: "Ofertante informado não existe" }` em vez de deixar a constraint de FK do MySQL virar um 500 genérico via `comTratamentoDeErro`.
**Where**: `src/app/api/usuarios/route.ts` (modificar)
**Depends on**: None
**Reuses**: nenhum componente novo - só uma consulta a mais no fluxo existente
**Requirement**: REQ-OV-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e CA-OV-05: AM criando um GO com `cdOfertante` inexistente recebe 400 com mensagem clara, não um 500 genérico
- [ ] e2e: criação de GO/VO com `cdOfertante` existente continua funcionando (nenhum teste de `auth-e-usuarios` para esta rota regride)
- [ ] SPEC_DEVIATION documentado no código: REQ-OV-04 também cita "atualiza", mas não existe rota de edição de `Usuario` na base hoje - a checagem cobre só o caminho de criação, que é o único existente

**Tests**: e2e
**Gate**: full

**Commit**: `fix(ofertante-verba): validate ofertante exists before linking a user`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: verba.schema.ts | 1 arquivo, 1 concern | ✅ Granular |
| T2: saldo.ts | 1 arquivo, 2 funções de um mesmo serviço coeso | ✅ Granular (coeso) |
| T3: guards.ts novas funções | 1 arquivo, 2 funções da mesma família (autorização de escrita) | ✅ Granular (coeso) |
| T4: ofertantes/route.ts | 1 endpoint (2 métodos do mesmo recurso) | ✅ Granular (coeso, mesmo padrão de T12 em `seguranca-transversal`) |
| T5: ofertantes/[id]/route.ts | 1 endpoint | ✅ Granular |
| T6: verbas/route.ts | 1 endpoint | ✅ Granular |
| T7: verbas/[id]/route.ts | 1 endpoint | ✅ Granular |
| T8: usuarios/route.ts | 1 arquivo, 1 concern | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1, T2, T3 | None | (sem seta de entrada) | ✅ Match |
| T4 | None | (sem seta de entrada - Phase 2 diagrama só mostra T3→T5) | ✅ Match |
| T5 | T3 | T3 → T5 | ✅ Match |
| T6 | T1, T2, T3 | T1→T6, T2→T6, T3→T6 | ✅ Match |
| T7 | T1, T2, T3 | T1→T7, T2→T7, T3→T7 | ✅ Match |
| T8 | None | (sem seta de entrada) | ✅ Match |

Nenhuma dependência aponta para uma fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: verba.schema.ts | Domain/pure logic | unit | unit | ✅ OK |
| T2: saldo.ts | Service/data-access (banco real) | integration | integration | ✅ OK |
| T3: guards.ts | Domain/pure logic | unit | unit | ✅ OK |
| T4: ofertantes/route.ts | API route | e2e | e2e | ✅ OK |
| T5: ofertantes/[id]/route.ts | API route | e2e | e2e | ✅ OK |
| T6: verbas/route.ts | API route | e2e | e2e | ✅ OK |
| T7: verbas/[id]/route.ts | API route | e2e | e2e | ✅ OK |
| T8: usuarios/route.ts | API route | e2e | e2e | ✅ OK |

---

## Requirement Traceability

| Requirement | Acceptance Criteria | Covered by |
| --- | --- | --- |
| REQ-OV-01 | CA-OV-01, CA-OV-02 | T4 |
| REQ-OV-02 | CA-OV-03 | T5 |
| REQ-OV-03 | CA-OV-04 | T5 |
| REQ-OV-04 | CA-OV-05 | T8 |
| REQ-OV-05 | CA-OV-06 | T5 |
| REQ-OV-06 | CA-OV-07 | T4 |
| REQ-OV-07 | CA-OV-15 | T4, T5, T6, T7 (toda rota usa `podeAcessarOfertante`/`podeEditarOfertante`/`podeGerenciarVerba`) |
| REQ-OV-08 | CA-OV-08, CA-OV-09 | T6 |
| REQ-OV-09 | CA-OV-14 | T7 |
| REQ-OV-10 | CA-OV-06, CA-OV-07 (aplicado a Verba) | T6, T7 |
| REQ-OV-11 | CA-OV-10, CA-OV-11 | T2, T6, T7 |
| REQ-OV-12 | CA-OV-12, CA-OV-13 | T2 (função pronta; consumo end-to-end fica para `formulario-pre-curso`, ver design.md Riscos) |
