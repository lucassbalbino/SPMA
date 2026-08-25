# auth-e-usuarios Validation

**Date**: 2026-08-25
**Spec**: `.specs/features/auth-e-usuarios/spec.md`
**Diff range**: `816b5ee..HEAD` (HEAD = `3ba5316`), branch `main`
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: ❌ FAIL — one surviving mutant. Every acceptance criterion is covered by a spec-anchored assertion and the full gate passes (135/135), but the CPF mod-11 test suite cannot detect a regression in the `resto < 2 → dígito 0` branch. One test-strength fix task, no production-code defect.

---

## Task Completion

All 30 tasks (T1-T30) carry `[x]` on every Done-when box. `grep -c -- "- [ ]" tasks.md` returns `0`.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T7 (Phase 0: Bootstrap) | ✅ Done | T2 records the `@prisma/adapter-mysql2` → `@prisma/adapter-mariadb` naming correction; T6 records the `migrate dev --name init` + `$transaction` FK-check notes |
| T8-T14 (Phase 1: Domínio puro) | ✅ Done | - |
| T15-T18 (Phase 2: Sessão) | ✅ Done | T17 carries the `setCookieSessao` async SPEC_DEVIATION |
| T19-T23 (Phase 3: Rotas de API) | ✅ Done | All five routes use `obterSessao()` + explicit 401, not `requireSession()` |
| T24-T30 (Phase 4: Páginas) | ✅ Done | T25/T26/T27 carry the `(onboarding)` route-group SPEC_DEVIATION; T30 carries the `session-cookie.ts` extraction |

`tasks.md` line 12 still reads `**Status**: In Progress`. Flipping it to `Done` is the orchestrator's call after reading this report, not the Verifier's.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| **CA-AU-01** senha correta → autenticado + sessão com cookie httpOnly/secure/sameSite | 200; cookie de sessão com os três atributos; sessão persistida | `e2e/login.spec.ts:64` `expect(res.status()).toBe(200)`; `:68-70` `expect(cookies).toMatch(/HttpOnly/i)` / `/Secure/i` / `/SameSite=Lax/i`; `:75` `expect(getSessao(idSessao!)?.cpfUsuario).toBe(CPF_COM_SENHA)`; UI: `e2e/login-page.spec.ts:53-55` `expect(cookieSessao?.httpOnly).toBe(true)` / `.secure` / `.sameSite === "Lax"` | ✅ PASS |
| **CA-AU-02** 1º acesso → definição de senha antes de qualquer módulo; indicador desativado | login sinaliza 1º acesso; `primeiraVez` vira `false`; `senhaHash` preenchido; outras rotas protegidas desviam para `/primeiro-acesso` | gatilho: `e2e/login.spec.ts:89-90` `expect(corpo.primeiroAcesso).toBe(true)`, `expect(corpo.proximaRota).toBe("/primeiro-acesso")`; conclusão: `e2e/primeiro-acesso.spec.ts:53-55` `expect(usuario?.primeiraVez).toBe(false)`, `expect(usuario?.senhaHash).toContain("$argon2")`; gate: `e2e/protegido-layout.spec.ts:48` `await expect(page).toHaveURL(/\/primeiro-acesso$/)`; UI: `e2e/primeiro-acesso-page.spec.ts:42-48` | ✅ PASS |
| **CA-AU-03** CPF com DV inválido → rejeitado com indicação de CPF inválido | erro específico de CPF inválido (não o erro genérico de credencial) | `e2e/login.spec.ts:105-106` `expect(res.status()).toBe(400)`, `expect(await res.json()).toEqual({ erro: "CPF inválido" })`; `:108` `expect(res.status()).not.toBe(401)`; UI: `e2e/login-page.spec.ts:66` `await expect(erroDoFormulario(page)).toHaveText("CPF inválido")`; algoritmo: `src/lib/validation/cpf.test.ts:19,24,28,36` | ✅ PASS (mas ver mutante sobrevivente M2 e a lacuna abaixo) |
| CA-AU-03 (parte) "sem tocar o banco" | não definido de forma observável por HTTP | evidência de código: `src/app/api/auth/login/route.ts:31` `safeParse` → `:35-40` retorno 400 → `:43` primeiro `prisma.usuario.findUnique`. Ordem confirmada por leitura; nenhuma asserção HTTP possível | ⚠️ Spec-precision gap (declarado em tasks.md, evidência honesta) |
| **CA-AU-04** CPF inexistente vs. senha errada → respostas indistinguíveis | mesmo status e mesmo corpo nos dois casos | `e2e/login.spec.ts:127` `expect(senhaErrada.status()).toBe(inexistente.status())`; `:128` `expect(await senhaErrada.text()).toBe(await inexistente.text())`; `:129` `expect(await inexistente.json()).toEqual({ erro: "CPF ou senha inválidos" })`; UI: `e2e/login-page.spec.ts:90-91` | ✅ PASS |
| **CA-AU-05** GO cria AL → aceito + autoria registrada | 201; `criadoPor` = CPF do criador; `dataCriacao` gravada | `e2e/usuarios.spec.ts:72` `expect(res.status()).toBe(201)`; `:78` `expect(criado?.criadoPor).toBe(CPF_GO_CRIADOR)`; `:79` `expect(new Date(criado!.dataCriacao).getTime()).toBeGreaterThan(0)`; UI: `e2e/usuarios-novo-page.spec.ts:50-54`; matriz: `src/lib/auth/cascata.test.ts:30` (36 combinações) | ✅ PASS |
| **CA-AU-06** GO forja criação de GT → 403 no servidor | 403; nenhum usuário criado | `e2e/usuarios.spec.ts:95` `expect(res.status()).toBe(403)`; `:96` `expect(getUsuario(CPF_FORJADO_GT)).toBeNull()` | ✅ PASS |
| **CA-AU-07** GO sem Ofertante → obrigado a cadastrar antes de acessar cursos | desvio para `/cadastro-ofertante`; após cadastrar, liberado | `e2e/protegido-layout.spec.ts:60` `await expect(page).toHaveURL(/\/cadastro-ofertante$/)`; `e2e/cadastro-ofertante-page.spec.ts:50-51` `expect(usuario?.cdOfertante).not.toBeNull()`, `expect(getOfertante(...)?.nome).toBe(NOME_OFERTANTE)`; liberação: `:56` `await expect(page).toHaveURL(/\/painel$/)`; guarda: `src/lib/auth/guards.test.ts:79` | ✅ PASS |
| **CA-AU-08** 5 senhas erradas → 6ª bloqueada por 15 min; login correto zera contador | bloqueio de 15 min a partir da 5ª falha; 6ª tentativa recusada mesmo com senha certa; contador zerado em sucesso | bloqueio: `e2e/login.spec.ts:152-153` `expect(comSenhaCorreta.status()).toBe(401)`, `expect(await comSenhaCorreta.json()).toEqual(ERRO_GENERICO)`; `:159` `bloqueadoAte > Date.now()`; janela exata: `src/lib/auth/rate-limit.integration.test.ts:72-77` `expect(bloqueadoAte).toBeGreaterThanOrEqual(antes + 15min)` / `toBeLessThanOrEqual(depois + 15min)`; limiar: `:91-92` `expect(tentativasFalhas).toBe(4)`, `expect(bloqueadoAte).toBeNull()`; reset: `e2e/login.spec.ts:179` `expect(getUsuario(...)?.tentativasFalhas).toBe(0)` e `rate-limit.integration.test.ts:143-144` | ✅ PASS |
| **CA-AU-09** login rotaciona o id de sessão; o anterior deixa de ser aceito | id novo ≠ id anterior; anterior removido | `e2e/login.spec.ts:201` `expect(idNovo).not.toBe(idAnterior)`; `:203` `expect(getSessao(idAnterior!)).toBeNull()`; `:204` `expect(getSessao(idNovo!)?.cpfUsuario).toBe(CPF_ROTACAO)`; integração: `src/lib/auth/session.integration.test.ts:55-61` | ✅ PASS |
| **CA-AU-10** nenhum endpoint que retorna dados de usuário expõe senha nem hash | resposta sem `senha` e sem `senhaHash` | `e2e/login.spec.ts:219-222` `expect(texto).not.toContain("$argon2")`, `expect(texto).not.toMatch(/senhaHash/i)`, `expect(corpo.usuario).not.toHaveProperty("senhaHash")`; `e2e/usuarios.spec.ts:81` `expect(await res.text()).not.toMatch(/senhaHash|\$argon2/i)` | ✅ PASS (cobertura parcial, ver nota) |

**Nota CA-AU-10.** Dois dos três endpoints que devolvem dados de usuário têm asserção explícita (`/api/auth/login`, `/api/usuarios`). `/api/auth/primeiro-acesso` devolve um objeto `usuario` (`src/app/api/auth/primeiro-acesso/route.ts:41-50`) e **não** tem asserção de ausência de hash; a garantia ali é por construção (lista de campos escolhida à mão, sem `senhaHash`). `/api/auth/logout` devolve `{ ok: true }` e `/api/ofertantes` devolve um `Ofertante`, que não tem campo de senha no schema. Lacuna pequena de cobertura, não defeito.

**Status**: ✅ 10/10 ACs cobertas com asserção ancorada na spec · ⚠️ 2 spec-precision gaps declarados (CA-AU-03 "sem tocar o banco", T30 "antes de renderizar o layout") · ⚠️ 1 cobertura parcial (CA-AU-10 em `/api/auth/primeiro-acesso`)

---

## Discrimination Sensor

**Sensor depth**: P0-full (auth = caminho crítico pela tabela de tiering do `validate.md`). Scratch isolado: `git worktree add --detach` em diretório temporário, removido ao final; `git status --porcelain` da árvore real vazio antes e depois. `git stash` não foi usado.

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ----------- | ------- |
| M1 | Matriz de cascata invertida | `src/lib/auth/cascata.ts:24` | `return TIPOS_PERMITIDOS[criador].includes(alvo)` → `return !TIPOS_PERMITIDOS[...]` | ✅ Killed (36 testes unit falharam) |
| M2 | Fronteira do módulo 11 | `src/lib/validation/cpf.ts:12` | `resto < 2 ? 0 : 11 - resto` → `resto < 1 ? 0 : 11 - resto` | ❌ **Survived** (85/85 unit continuaram passando) |
| M3 | Escopo do Ofertante forjável | `src/lib/auth/cascata.ts:47-48` | GO passa a honrar `cdOfertanteInformado` em vez de ignorá-lo | ✅ Killed (2 testes unit falharam) |
| M4 | Limiar de bloqueio off-by-one | `src/lib/auth/rate-limit.ts:40` | `tentativas >= MAX_TENTATIVAS` → `tentativas > MAX_TENTATIVAS` | ✅ Killed (1 teste de integração falhou) |
| M5 | Expiração de sessão ignorada | `src/lib/auth/session.ts:60` | `if (!registro \|\| registro.expiraEm.getTime() <= Date.now())` → `if (!registro)` | ✅ Killed (1 teste de integração falhou) |
| M6 | Erro de login enumerável | `src/app/api/auth/login/route.ts:45-47` | CPF inexistente passa a responder 404 `"CPF nao cadastrado"` em vez do erro genérico | ✅ Killed (`login.spec.ts:115` e `login-page.spec.ts:73`) |
| M7 | Autoria descartada | `src/app/api/usuarios/route.ts:53` | `criadoPor: criador.cpf` → `criadoPor: null` (coluna é nullable, falha silenciosa) | ✅ Killed (`usuarios.spec.ts:63` e `usuarios-novo-page.spec.ts:28`) |

**Result**: 7 injetadas, **6 killed, 1 survived** — ❌ FAIL

### M2 — mutante sobrevivente, análise

Não é mutante equivalente. A regra do módulo 11 é: resto `0` ou `1` → dígito verificador `0`. A mutação só muda o comportamento quando `resto == 1`, caso em que o código correto devolve `0` e o mutante devolve `11 - 1 = 10` (nunca igual a um dígito), rejeitando um CPF legítimo.

CPFs reais que separam as duas implementações (gerados e conferidos durante o sensor):

| CPF | resto (1º DV) | resto (2º DV) | Implementação real | Mutante |
| --- | --- | --- | --- | --- |
| `52601815906` | 1 | 5 | `true` | `false` |
| `75749118606` | 1 | 5 | `true` | `false` |
| `47104974601` | 1 | 10 | `true` | `false` |
| `76842684650` | 6 | 1 | `true` | `false` |
| `35379907580` | 3 | 1 | `true` | `false` |

A implementação em `src/lib/validation/cpf.ts` está **correta** — confirmado rodando `validarCPF` contra os cinco CPFs acima no scratch (5/5 `true`). O que falta é a fixture: `src/lib/validation/cpf.test.ts` só usa `111.444.777-35` e `529.982.247-25` como CPFs válidos, e em nenhum dos dois algum dígito verificador nasce de resto `0` ou `1`. Ou seja, o ramo `resto < 2 → 0` nunca é exercido por um caso positivo, e uma regressão nele passaria pelo gate sem ser vista.

Impacto se regredir: todo CPF cujo dígito verificador seja `0` (fração relevante da população real) seria recusado no login e no cadastro — REQ-AU-03 / CA-AU-03 quebrados de forma silenciosa.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Rotas e helpers curtos; sem camadas de serviço especulativas |
| Surgical changes | ✅ `prisma/schema.prisma` alterado só no bloco `datasource`/`generator`; nenhum model de domínio tocado |
| No scope creep | ✅ Rate-limit por IP, CSRF e headers deixados explicitamente para `seguranca-transversal` |
| Matches patterns | ✅ Mesmo formato nas cinco rotas (`obterSessao` → 401 → `safeParse` → 400 → regra → resposta) |
| Spec-anchored outcome check (valores asseridos batem com a spec) | ✅ |
| Per-layer Coverage Expectation met (domínio 1:1 com ACs; rotas happy+edge+error) | ✅ As cinco rotas têm happy path, 401 sem sessão, 400 de validação e o erro específico (403/409) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ Cada spec e2e nomeia o CA/REQ que cobre no cabeçalho |
| Documented guidelines followed | ✅ `AGENTS.md` (ler `node_modules/next/dist/docs/` antes de escrever código Next) — respeitado e citado nos SPEC_DEVIATIONs |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ `session-cookie.ts` tem motivo técnico documentado, não é abstração especulativa |
| Would senior engineer approve? | ✅ |

Pontos positivos dignos de nota:

- `src/lib/auth/cascata.test.ts:7-14` escreve a matriz esperada a partir da spec, sem importar `TIPOS_PERMITIDOS` do módulo sob teste. É o motivo de M1 e M3 morrerem tão rápido.
- Os specs e2e conferem **estado persistido** (`getUsuario`, `getSessao`, `getOfertante`), não só o corpo HTTP. É o motivo de M7 (falha silenciosa em coluna nullable) morrer.
- `e2e/helpers/http.ts:12-14` usa um `APIRequestContext` novo por chamada, evitando cookie residual mascarar cenário.
- `e2e/global-setup.ts:14-24` documenta e corrige a ordem de `dotenv` que faria o `TRUNCATE` cair no banco de DEV.

---

## Desvios documentados (verificados, não são achados novos)

| Desvio | Verificação |
| ------ | ----------- |
| `setCookieSessao` async | ✅ `src/lib/auth/session.ts:74-78` — SPEC_DEVIATION citando o doc de `cookies()` do Next 16. Atributos do cookie inalterados, confirmados por `e2e/login.spec.ts:68-70` |
| Rotas de API usam `obterSessao()` + 401, não `requireSession()` | ✅ Justificado em `src/lib/auth/guards.ts:7-9`; as cinco rotas seguem o padrão; 401 asserido em `usuarios.spec.ts:149-150`, `primeiro-acesso.spec.ts:84-85`, `ofertantes.spec.ts:129`, `logout.spec.ts:72-73` |
| `(onboarding)` em vez de `(protegido)` para `/primeiro-acesso` e `/cadastro-ofertante` | ✅ SPEC_DEVIATION nos dois layouts. **Reivindicação de URL confirmada por conta própria**: a tabela de rotas do `next build` lista `/cadastro-ofertante`, `/primeiro-acesso`, `/painel`, `/usuarios/novo` — nenhum segmento de grupo aparece na URL. Reforçado por `e2e/primeiro-acesso-page.spec.ts:30` e `cadastro-ofertante-page.spec.ts:37` navegando às URLs sem prefixo |
| `session-cookie.ts` isolado para manter Prisma fora do proxy | ✅ Confirmado: `src/proxy.ts:12-14` importa apenas `next/server` e `@/lib/auth/session-cookie`; `src/lib/auth/session-cookie.ts` tem **zero** imports. Nenhum Prisma no grafo de módulos do proxy |
| CA-AU-03 "sem tocar o banco" e T30 "antes de renderizar o layout" como spec-precision gaps | ✅ Caracterização honesta nos dois casos. A ordem em `login/route.ts:31→35→43` é como declarado. A ordem de execução do Next foi conferida na fonte citada: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:206-212` põe o Proxy no passo 3 e as rotas de filesystem (`app/`) no passo 5. Nenhum dos dois encobre teste faltante |
| `@prisma/adapter-mysql2` → `@prisma/adapter-mariadb` | ✅ Correção de nome; `package.json:21` usa `@prisma/adapter-mariadb@7.9.1`. Sem mudança de comportamento |

---

## Edge Cases

- [x] CPF com todos os dígitos iguais rejeitado — `src/lib/validation/cpf.test.ts:28,32`
- [x] CPF com tamanho errado e string vazia rejeitados — `cpf.test.ts:36,40,44`
- [ ] **CPF válido cujo dígito verificador nasce de resto 0/1 aceito — sem fixture** (origem do mutante M2)
- [x] Login em conta sem senha abre sessão pendente, não erro — `e2e/login.spec.ts:86-90`
- [x] Senha curta rejeitada sem alterar `primeiraVez` — `e2e/primeiro-acesso.spec.ts:105-109`
- [x] Confirmação divergente rejeitada — `src/lib/validation/schemas/primeiro-acesso.schema.test.ts`
- [x] Logout sem sessão não gera 5xx — `e2e/logout.spec.ts:72-75`
- [x] Cookie de sessão inválido (uuid inexistente) tratado como ausente — `usuarios.spec.ts:146`, `primeiro-acesso.spec.ts:81`, `logout.spec.ts:69`
- [x] GO que já tem Ofertante recebe 409 e nada é criado — `e2e/ofertantes.spec.ts:100-102`
- [x] Perfil não-GO na rota de Ofertante recebe 403 — `e2e/ofertantes.spec.ts:116-118`
- [x] Não-GO sem `cdOfertante` (ex.: AL) não é preso na guarda de Ofertante — `src/lib/auth/guards.test.ts:91-95` (AD-012)
- [x] Payload forjando `cdOfertante` ignorado quando criador é GO — `e2e/usuarios.spec.ts:129-132`
- [x] Sessão expirada tratada como inválida — `src/lib/auth/session.integration.test.ts:82-93`
- [x] Seed do Admin Master idempotente — `prisma/seed.integration.test.ts`

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Exit code**: `0`
- **Result**: **135 passed, 0 failed, 0 skipped**
  - `lint` (eslint) — ✅ limpo
  - `typecheck` (`tsc --noEmit`) — ✅ limpo
  - `build` (`next build`, Next.js 16.3.2 + Turbopack) — ✅ compilou em 9.4s, 14 páginas geradas
  - `test:unit` — 8 arquivos, **85 testes**, todos verdes
  - `test:integration` — 3 arquivos, **14 testes**, todos verdes (contra `spma_test`)
  - `test:e2e` — **36 testes** (chromium, 1 worker), todos verdes em 3.6m
- **Test count before feature**: 0 (o projeto não existia antes de T1; `package.json` nasce nesta feature)
- **Test count after feature**: 135
- **Delta**: +135
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Test integrity**: nenhuma contagem caiu, nenhuma asserção enfraquecida. Todos os arquivos de teste no range são novos.

---

## Fix Plans

### Fix 1: fixture de CPF que exercita o ramo `resto < 2 → dígito 0`

- **Root cause**: `src/lib/validation/cpf.test.ts` só tem dois CPFs válidos (`111.444.777-35`, `529.982.247-25`) e em nenhum deles um dígito verificador nasce de resto `0` ou `1`. O ramo `resto < 2 ? 0 : 11 - resto` de `src/lib/validation/cpf.ts:12` nunca é exercido por um caso positivo, então uma regressão nele não é detectada (mutante M2 sobreviveu ao suite inteiro).
- **Fix task**: adicionar a `src/lib/validation/cpf.test.ts` pelo menos um caso positivo com dígito verificador `0` — por exemplo `expect(validarCPF("52601815906")).toBe(true)` (1º DV nasce de resto 1) e `expect(validarCPF("35379907580")).toBe(true)` (2º DV nasce de resto 1). Ideal cobrir os dois dígitos.
- **Where**: `src/lib/validation/cpf.test.ts`
- **Verify**: reinjetar M2 (`resto < 2` → `resto < 1`) num worktree scratch e confirmar que `npm run test:unit` agora **falha**.
- **Done when**: o suite unit mata M2, e `npm run test:unit` segue verde na árvore não mutada.
- **Priority**: Major — nenhum defeito em produção hoje (a implementação está correta), mas a rede de proteção de REQ-AU-03 tem um buraco em cima de um ramo que atinge uma fração relevante dos CPFs reais.

### Fix 2 (opcional, Minor): asserção de CA-AU-10 em `/api/auth/primeiro-acesso`

- **Root cause**: a rota devolve um objeto `usuario` e é o único endpoint com dados de usuário sem asserção explícita de ausência de `senhaHash`/`senha`.
- **Fix task**: em `e2e/primeiro-acesso.spec.ts`, no teste de sucesso, acrescentar `expect(await res.text()).not.toMatch(/senhaHash|\$argon2/i)`.
- **Priority**: Minor — hoje a garantia é por construção (lista de campos à mão em `route.ts:41-50`); a asserção só trava a regressão.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-AU-01 | Implementing | ✅ Verified |
| REQ-AU-02 | Implementing | ✅ Verified |
| REQ-AU-03 | Implementing | ⚠️ Verified com teste fraco (Fix 1) |
| REQ-AU-04 | Implementing | ✅ Verified |
| REQ-AU-05 | Implementing | ✅ Verified |
| REQ-AU-06 | Implementing | ✅ Verified |
| REQ-AU-07 | Implementing | ✅ Verified |
| REQ-AU-08 | Implementing | ✅ Verified |
| REQ-AU-09 | Implementing | ✅ Verified |
| REQ-AU-10 | Implementing | ✅ Verified |
| REQ-AU-11 | Implementing | ✅ Verified |
| REQ-AU-12 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues — um fix task de teste antes de fechar a feature

**Spec-anchored check**: 10/10 ACs com asserção que bate o valor definido na spec; 2 spec-precision gaps declarados e honestos; 1 cobertura parcial (CA-AU-10)
**Sensor**: 6/7 mutantes mortos (P0-full)
**Gate**: 135 passed, 0 failed, 0 skipped, exit 0

**What works**: Login por CPF+senha com cookie httpOnly/secure/sameSite e rotação de id no login; fluxo completo de primeiro acesso pela API e pela UI; matriz de cascata reavaliada no servidor com 403 para tipo não autorizado; escopo de Ofertante resolvido no servidor ignorando payload forjado; auto-cadastro do Ofertante pelo GO em transação; bloqueio de conta em 15 minutos na 5ª falha com reset em sucesso; erro de login não-enumerável em API e UI; senha e hash fora de toda resposta verificada; proxy leve sem nenhuma dependência de banco no grafo de módulos.

**Issues found**: (1) o suite de CPF não discrimina o ramo `resto < 2 → dígito 0` do módulo 11 — mutante M2 sobreviveu; implementação correta, teste fraco (Fix 1). (2) `/api/auth/primeiro-acesso` é o único endpoint com dados de usuário sem asserção de CA-AU-10 (Fix 2, menor).

**Next steps**: rotear o Fix 1 (e, se quiser, o Fix 2) a um implementador, depois re-despachar o Verifier. A implementação de produção não precisa de mudança — os dois fixes são de teste. Iteração 1 de no máximo 3 do ciclo fix→re-verify.
