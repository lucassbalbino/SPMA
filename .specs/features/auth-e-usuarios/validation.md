# auth-e-usuarios Validation

**Date**: 2026-08-25
**Spec**: `.specs/features/auth-e-usuarios/spec.md`
**Diff range**: `816b5ee..HEAD` (HEAD = `744bfc4`), branch `main`
**Verifier**: independent sub-agent (author ≠ verifier), agente novo sem contexto da iteração 1
**Iteração**: 2 de no máximo 3 do ciclo fix→re-verify

**Verdict**: ❌ FAIL — um mutante sobrevivente, severidade **Minor**. Os dois fixes da iteração 1 estão corretos e foram confirmados empiricamente (o mutante M2 da iteração 1 agora morre). O gate inteiro passa com 137 testes. O único achado novo é uma assimetria de asserção em CA-AU-10: `/api/auth/primeiro-acesso` trava a metade "hash" do critério, mas não a metade "senha" — e é justamente o endpoint que recebe a senha em texto claro no corpo da requisição. Nenhum defeito de produção; o fix é uma linha de teste.

---

## Contexto: o que a iteração 1 achou e o que foi corrigido

A iteração 1 (relatório sobre `3ba5316`/`c33293a`) deu FAIL com dois achados, ambos de força de teste, nenhum de código de produção:

1. **M2 sobreviveu** — `src/lib/validation/cpf.ts:12` (`resto < 2 ? 0 : 11 - resto`) não tinha nenhum caso positivo exercitando o ramo `resto ∈ {0,1}`: os dois CPFs válidos das fixtures tinham ambos os dígitos verificadores nascidos de resto ≥ 2. Uma regressão na fronteira do módulo 11 passaria o gate inteiro sem ser vista.
2. **CA-AU-10 com cobertura parcial** — `/api/auth/primeiro-acesso` era o único endpoint com dados de usuário sem asserção explícita de ausência de senha/hash na resposta.

Tudo o mais da iteração 1 — 30 tasks concluídas, 10/10 ACs com asserção ancorada na spec, 5 SPEC_DEVIATIONs documentados, 2 spec-precision gaps declarados (CA-AU-03 "sem tocar o banco" e T30 "antes de renderizar o layout") — foi re-conferido por amostragem nesta iteração e continua válido (ver seções abaixo).

---

## Verificação dos dois fixes desta iteração

### `7247f58` — fixture do ramo `resto < 2 → dígito 0`

Diff: +8 linhas em `src/lib/validation/cpf.test.ts:17-23`. Duas fixtures novas, nenhuma alteração em código de produção.

Conferido por conta própria, não pela mensagem de commit — aritmética do módulo 11 recalculada à mão para os dois CPFs:

| CPF | Soma (1º DV) | resto (1º DV) | Soma (2º DV) | resto (2º DV) | Ramo exercitado |
| --- | --- | --- | --- | --- | --- |
| `52601815906` | 199 | **1** → dígito `0` ✓ (bate com `digitos[9]=0`) | 236 | 5 → dígito 6 ✓ | 1º dígito verificador |
| `35379907580` | 278 | 3 → dígito 8 ✓ | 342 | **1** → dígito `0` ✓ (bate com `digitos[10]=0`) | 2º dígito verificador |

As duas fixtures são CPFs genuinamente válidos e cobrem o ramo em **cada um dos dois dígitos** separadamente — o mutante mata os dois testes de forma independente, então nenhum deles é redundante. Fix correto e mínimo. Ver M1 no sensor: reinjetada a mutação exata da iteração 1, agora **morre**.

### `744bfc4` — asserção de CA-AU-10 em `/api/auth/primeiro-acesso`

Diff: +3 linhas em `e2e/primeiro-acesso.spec.ts:51-53`, dentro do teste de sucesso que já existia (não é caso de teste novo — daí a contagem 137 e não 138). A asserção fica logo depois do `expect(res.status()).toBe(200)` e antes das checagens de estado no banco; `res.text()` aqui não conflita com nenhum consumo posterior do corpo dessa resposta.

Fix faz o que promete, e isso **não** foi aceito por leitura: a mutação M6 do sensor (rota devolvendo o registro Prisma inteiro) é morta exatamente por essa linha nova — `e2e/primeiro-acesso.spec.ts:53`, com o `senhaHash` argon2 aparecendo no corpo recebido. Antes deste commit essa regressão passaria: o resto do teste só inspeciona o registro no banco, onde o hash legitimamente existe.

**Limite do fix** (achado novo desta iteração, ver M8): a asserção usa `/senhaHash|\$argon2/i`, que trava a metade "hash" de CA-AU-10 e não a metade "senha". O texto da spec é "não contém senha **nem** hash".

---

## Task Completion

`grep -c -- "- [ ]" tasks.md` → `0`. Todas as 30 tasks (T1-T30) com todas as caixas de Done-when marcadas.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T7 (Phase 0: Bootstrap) | ✅ Done | T2 registra a correção `@prisma/adapter-mysql2` → `@prisma/adapter-mariadb`; T6 registra as notas de `migrate dev --name init` + `$transaction` |
| T8-T14 (Phase 1: Domínio puro) | ✅ Done | - |
| T15-T18 (Phase 2: Sessão) | ✅ Done | T17 carrega o SPEC_DEVIATION de `setCookieSessao` async |
| T19-T23 (Phase 3: Rotas de API) | ✅ Done | As cinco rotas usam `obterSessao()` + 401 explícito |
| T24-T30 (Phase 4: Páginas) | ✅ Done | T25/T26/T27 carregam o SPEC_DEVIATION do route group `(onboarding)`; T30 carrega a extração de `session-cookie.ts` |

`tasks.md:12` continua `**Status**: In Progress`. Virar para `Done` é decisão do orquestrador depois de ler este relatório — não do Verifier, e não enquanto o veredito for FAIL.

---

## Spec-Anchored Acceptance Criteria

Todas as citações abaixo foram reconferidas nesta iteração contra os arquivos em `744bfc4` (os números de linha batem).

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| **CA-AU-01** senha correta → autenticado + sessão com cookie httpOnly/secure/sameSite | 200; cookie com os três atributos; sessão persistida | `e2e/login.spec.ts:64` `expect(res.status()).toBe(200)`; `:68-70` `expect(cookies).toMatch(/HttpOnly/i)` / `/Secure/i` / `/SameSite=Lax/i`; `:75` `expect(getSessao(idSessao!)?.cpfUsuario).toBe(CPF_COM_SENHA)`; UI: `e2e/login-page.spec.ts:53-55` | ✅ PASS (M7 confirma discriminação) |
| **CA-AU-02** 1º acesso → definição de senha antes de qualquer módulo; indicador desativado | login sinaliza 1º acesso; `primeiraVez` vira `false`; `senhaHash` preenchido; rotas protegidas desviam | gatilho: `e2e/login.spec.ts:89-90`; conclusão: `e2e/primeiro-acesso.spec.ts:56-58` `expect(usuario?.primeiraVez).toBe(false)`, `expect(usuario?.senhaHash).toContain("$argon2")`; gate: `e2e/protegido-layout.spec.ts:48` `await expect(page).toHaveURL(/\/primeiro-acesso$/)`; guarda unitária: `src/lib/auth/guards.test.ts:61,67` | ✅ PASS (M3 confirma) |
| **CA-AU-03** CPF com DV inválido → rejeitado com indicação de CPF inválido | erro específico de CPF inválido, não o genérico de credencial | `e2e/login.spec.ts:105-106` `expect(res.status()).toBe(400)`, `expect(await res.json()).toEqual({ erro: "CPF inválido" })`; `:108` `expect(res.status()).not.toBe(401)`; UI: `e2e/login-page.spec.ts:66`; algoritmo: `src/lib/validation/cpf.test.ts:6,10,14,18,22,27,32,36,40,44,48,52` (12 casos, agora incluindo o ramo de fronteira) | ✅ PASS (M1 agora morre) |
| CA-AU-03 (parte) "sem tocar o banco" | não observável por HTTP | `src/app/api/auth/login/route.ts:31` `safeParse` → `:35-40` retorno 400 → `:43` primeiro `prisma.usuario.findUnique`. Ordem confirmada por leitura | ⚠️ Spec-precision gap (declarado, evidência honesta) |
| **CA-AU-04** CPF inexistente vs. senha errada → indistinguíveis | mesmo status e mesmo corpo | `e2e/login.spec.ts:127` `expect(senhaErrada.status()).toBe(inexistente.status())`; `:128` `expect(await senhaErrada.text()).toBe(await inexistente.text())`; `:129` `expect(await inexistente.json()).toEqual(ERRO_GENERICO)`; UI: `e2e/login-page.spec.ts:90-91` | ✅ PASS |
| **CA-AU-05** GO cria AL → aceito + autoria registrada | 201; `criadoPor` = CPF do criador; `dataCriacao` gravada | `e2e/usuarios.spec.ts:72` `expect(res.status()).toBe(201)`; `:78` `expect(criado?.criadoPor).toBe(CPF_GO_CRIADOR)`; `:79` `expect(new Date(criado!.dataCriacao).getTime()).toBeGreaterThan(0)`; UI: `e2e/usuarios-novo-page.spec.ts:50,54`; matriz: `src/lib/auth/cascata.test.ts:30` (36 combinações) | ✅ PASS |
| **CA-AU-06** GO forja criação de GT → 403 no servidor | 403; nenhum usuário criado | `e2e/usuarios.spec.ts:95` `expect(res.status()).toBe(403)`; `:96` `expect(getUsuario(CPF_FORJADO_GT)).toBeNull()` | ✅ PASS |
| **CA-AU-07** GO sem Ofertante → obrigado a cadastrar antes | desvio para `/cadastro-ofertante`; liberado após cadastrar | `e2e/protegido-layout.spec.ts:60` `await expect(page).toHaveURL(/\/cadastro-ofertante$/)`; `e2e/cadastro-ofertante-page.spec.ts:50-51`, liberação `:56`; guarda: `src/lib/auth/guards.test.ts:80,86,94` | ✅ PASS (M2 confirma, inclusive o ramo AD-012) |
| **CA-AU-08** 5 senhas erradas → 6ª bloqueada por 15 min; sucesso zera contador | bloqueio de 15 min na 5ª falha; contador zerado em sucesso | bloqueio: `e2e/login.spec.ts:152-153`, `:159`; janela exata: `src/lib/auth/rate-limit.integration.test.ts:68-69,72-77`; limiar: `:91-92` `expect(tentativasFalhas).toBe(4)`, `expect(bloqueadoAte).toBeNull()`; reset: `e2e/login.spec.ts:179` e `rate-limit.integration.test.ts:143-144` | ✅ PASS (M4 confirma a janela) |
| **CA-AU-09** login rotaciona o id de sessão; o anterior deixa de ser aceito | id novo ≠ anterior; anterior removido | `e2e/login.spec.ts:201` `expect(idNovo).not.toBe(idAnterior)`; `:203` `expect(getSessao(idAnterior!)).toBeNull()`; `:204`; integração: `src/lib/auth/session.integration.test.ts:55-61` | ✅ PASS (M5 confirma) |
| **CA-AU-10** nenhum endpoint que retorna dados de usuário expõe **senha nem hash** | resposta sem `senha` e sem `senhaHash` | login (as duas metades): `e2e/login.spec.ts:219-222` `expect(texto).not.toContain("$argon2")`, `not.toMatch(/senhaHash/i)`, `expect(corpo.usuario).not.toHaveProperty("senhaHash")`, **`:222` `not.toHaveProperty("senha")`**; usuários: `e2e/usuarios.spec.ts:81`; primeiro-acesso: `e2e/primeiro-acesso.spec.ts:53` (só a metade "hash") | ⚠️ **GAP parcial** — ver M8 |

**Status**: ✅ 10/10 ACs cobertas com asserção ancorada na spec · ⚠️ 2 spec-precision gaps declarados (CA-AU-03 "sem tocar o banco", T30 "antes de renderizar o layout") · ❌ 1 metade de AC sem discriminação (CA-AU-10 "senha" em `/api/auth/primeiro-acesso`, comprovado por M8)

---

## Discrimination Sensor

**Sensor depth**: P0-full (auth é caminho crítico pela tabela de tiering do `validate.md`; 8 mutações ≥ o mínimo de 5).

**Isolamento**: `git worktree add --detach` num diretório temporário fora do projeto; `src/generated/prisma` (gitignored) e `node_modules` copiados para dentro do scratch — a primeira tentativa com junction foi rejeitada pelo Turbopack (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`), então foi feita cópia real. Baseline do scratch conferido **antes** de qualquer mutação: 87/87 unit verdes (uma primeira execução com 35 testes revelou que faltava o cliente Prisma gerado — corrigido antes de valer como baseline). Worktree removido e diretório apagado ao final. `git status --porcelain` da árvore real: **vazio antes e vazio depois**; `git worktree list` só mostra a árvore real. `git stash` não foi usado em momento algum.

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ----------- | ------- |
| M1 | Fronteira do módulo 11 (**re-injeção do sobrevivente da iteração 1**) | `src/lib/validation/cpf.ts:12` | `resto < 2 ? 0 : 11 - resto` → `resto < 1 ? 0 : 11 - resto` | ✅ **Killed** — 2 falhas / 85 passes de 87; morrem exatamente as duas fixtures novas de `7247f58` |
| M2 | Guarda de Ofertante perde o recorte de perfil | `src/lib/auth/guards.ts:43` | `usuario.tipo === "GO" && usuario.cdOfertante === null` → `usuario.cdOfertante === null` | ✅ Killed — `guards.test.ts:91` ("não redireciona perfil não-GO sem cdOfertante", AD-012) |
| M3 | Gate de 1º acesso invertido | `src/lib/auth/guards.ts:29` | `if (usuario.primeiraVez)` → `if (!usuario.primeiraVez)` | ✅ Killed — 2 falhas em `guards.test.ts` (os dois lados do ramo) |
| M4 | Janela de bloqueio encurtada | `src/lib/auth/rate-limit.ts:9` | `BLOQUEIO_MS = 15 * 60 * 1000` → `5 * 60 * 1000` | ✅ Killed — `rate-limit.integration.test.ts` ("bloqueia por 15 minutos na 5ª falha consecutiva") |
| M5 | Rotação de sessão sem destruir a anterior | `src/lib/auth/session.ts:47` | `await destruirSessao(sessaoAnteriorId);` comentado | ✅ Killed — `session.integration.test.ts:50-62` |
| M6 | Vazamento de hash por devolver o registro inteiro | `src/app/api/auth/primeiro-acesso/route.ts:41-50` | objeto de campos escolhidos à mão → `usuario` (registro Prisma completo) | ✅ Killed — **`e2e/primeiro-acesso.spec.ts:53`**, a linha nova de `744bfc4` (corpo recebido continha `senhaHash` argon2) |
| M7 | Cookie de sessão sem httpOnly | `src/lib/auth/session.ts:83` | `httpOnly: true` → `httpOnly: false` | ✅ Killed — `e2e/login.spec.ts:68` e `e2e/login-page.spec.ts:35` (API e UI) |
| M8 | Eco da senha em texto claro na resposta | `src/app/api/auth/primeiro-acesso/route.ts:47` | acrescenta `senha: entrada.data.senha` ao objeto `usuario` da resposta | ❌ **Survived** — 4/4 testes de `primeiro-acesso.spec.ts` + `primeiro-acesso-page.spec.ts` continuaram verdes |

**Result**: 8 injetadas, **7 killed, 1 survived** — ❌ FAIL

### M8 — mutante sobrevivente, análise

**Não é mutante equivalente** — comprovado, não inferido. Com M8 injetado, o corpo da resposta passa a ser:

```
{"usuario":{"cpf":"20040050092","nome":"Usuário 20040050092","tipo":"AL","primeiraVez":false,"cdOfertante":null,"senha":"NovaSenha123"},"proximaRota":"/painel"}
```

O suite inteiro continua verde. A asserção de `744bfc4` (`not.toMatch(/senhaHash|\$argon2/i)`) não casa com esse corpo: o campo se chama `senha` e o valor é texto claro, sem `$argon2`. Confirmado na mesma execução que uma asserção candidata **mata** o mutante — `expect(await res.text()).not.toContain(NOVA_SENHA)` falhou com o corpo acima.

Por que isso importa mais neste endpoint do que em qualquer outro: `/api/auth/primeiro-acesso` é o **único** endpoint da feature que recebe uma senha em texto claro no corpo da requisição *e* devolve um objeto `usuario`. É o único lugar onde um eco de entrada pode vazar a senha em claro. Nos outros endpoints a senha em claro nem existe no escopo.

O projeto já tem o padrão certo em casa: `e2e/login.spec.ts:221-222` assere **as duas metades** (`not.toHaveProperty("senhaHash")` e `not.toHaveProperty("senha")`). A asserção de primeiro-acesso ficou com uma metade só.

Severidade **Minor**, com escopo honesto:
- Risco em produção hoje: **zero**. `route.ts:41-50` monta a resposta campo a campo e não inclui `senha`. M6 prova que o vazamento de *hash* é detectado.
- Risco real: uma regressão futura que ecoe a senha em claro nesse endpoint passa o gate inteiro sem ser vista — exatamente o buraco que a iteração 1 fechou para o hash e para o CPF.
- Não é um defeito do fix `744bfc4`: o implementador executou ao pé da letra o Fix 2 escrito pela iteração 1, que só pedia a regex. A imprecisão nasceu na redação do fix task, não na execução.

---

## Code Quality

Avaliação focada nos dois diffs desta iteração (`7247f58`, `744bfc4`); as linhas gerais da feature foram reconferidas por amostragem e seguem válidas.

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ +8 e +3 linhas. Nenhum helper, nenhuma fixture factory, nenhum refactor de carona |
| Surgical changes | ✅ Um arquivo por commit, exatamente o arquivo do fix task. Zero alteração em código de produção nas duas correções |
| No scope creep | ✅ Nenhuma das duas mexeu em rota, schema ou config |
| Matches patterns | ✅ Fixtures novas seguem a forma dos casos existentes (`it(...)` + `expect(validarCPF(...)).toBe(true)`); a asserção de e2e reusa a regex já usada em `e2e/usuarios.spec.ts:81` |
| Testes não-rasos | ✅ Comprovado empiricamente, não por leitura: M1 morre pelas fixtures novas e M6 morre pela asserção nova. Cada fix mata o mutante que motivou sua criação |
| Comentários justificam-se | ✅ O comentário em `primeiro-acesso.spec.ts:51-52` cita o CA e o motivo; os nomes dos testes de CPF explicam a regra (`resto < 2 → dígito 0`) em vez de só numerar casos |
| Spec-anchored outcome check | ⚠️ A asserção de `744bfc4` cobre "hash" mas não "senha", enquanto CA-AU-10 diz "senha nem hash" (M8) |
| Per-layer Coverage Expectation met | ✅ Domínio 1:1 com ACs; as cinco rotas com happy + 401 + 400 + erro específico (403/409) |
| Every test maps to a spec requirement | ✅ Os dois testes novos de CPF nomeiam a regra de REQ-AU-03; a asserção nova nomeia CA-AU-10 |
| Documented guidelines followed | ✅ `AGENTS.md` (ler `node_modules/next/dist/docs/` antes de escrever código Next) — nenhum dos dois diffs toca código Next |
| Would senior engineer approve? | ✅ Nos dois diffs, sim. Um revisor atento pediria a metade "senha" junto (M8) |

---

## Desvios documentados (reconferidos, não são achados novos)

| Desvio | Verificação |
| ------ | ----------- |
| `setCookieSessao` async | ✅ `src/lib/auth/session.ts:74-78` — SPEC_DEVIATION citando o doc de `cookies()` do Next 16. Atributos do cookie inalterados e agora comprovados discriminantes por M7 |
| Rotas de API usam `obterSessao()` + 401, não `requireSession()` | ✅ Justificado em `src/lib/auth/guards.ts:7-9`; 401 asserido em `usuarios.spec.ts:149-150`, `primeiro-acesso.spec.ts:87-88`, `ofertantes.spec.ts:129`, `logout.spec.ts:72-73` |
| `(onboarding)` em vez de `(protegido)` para `/primeiro-acesso` e `/cadastro-ofertante` | ✅ SPEC_DEVIATION nos dois layouts; a tabela de rotas do `next build` desta iteração lista `/cadastro-ofertante`, `/primeiro-acesso`, `/painel`, `/usuarios/novo` — nenhum segmento de grupo na URL |
| `session-cookie.ts` isolado para manter Prisma fora do proxy | ✅ `src/proxy.ts` importa só `next/server` e `@/lib/auth/session-cookie`; esse módulo tem zero imports |
| `field.tsx` no lugar do componente shadcn "form" | ✅ SPEC_DEVIATION em `src/components/ui/field.tsx:1` |
| CA-AU-03 "sem tocar o banco" e T30 "antes de renderizar o layout" | ✅ Caracterização honesta nos dois casos; nenhum encobre teste faltante |

---

## Edge Cases

- [x] CPF com todos os dígitos iguais rejeitado — `src/lib/validation/cpf.test.ts:36,40`
- [x] CPF com tamanho errado e string vazia rejeitados — `cpf.test.ts:44,48,52`
- [x] **CPF válido cujo dígito verificador nasce de resto 0/1 aceito** — `cpf.test.ts:18,22` (fechado nesta iteração por `7247f58`)
- [x] Login em conta sem senha abre sessão pendente, não erro — `e2e/login.spec.ts:86-90`
- [x] Senha curta rejeitada sem alterar `primeiraVez` — `e2e/primeiro-acesso.spec.ts:108-112`
- [x] Confirmação divergente rejeitada — `src/lib/validation/schemas/primeiro-acesso.schema.test.ts`
- [x] Logout sem sessão não gera 5xx — `e2e/logout.spec.ts:63-75`
- [x] Cookie de sessão inválido (uuid inexistente) tratado como ausente — `usuarios.spec.ts:150`, `primeiro-acesso.spec.ts:88`, `logout.spec.ts:69`
- [x] GO que já tem Ofertante recebe 409 e nada é criado — `e2e/ofertantes.spec.ts:91-102`
- [x] Perfil não-GO na rota de Ofertante recebe 403 — `e2e/ofertantes.spec.ts:107-118`
- [x] Não-GO sem `cdOfertante` (ex.: AL) não é preso na guarda de Ofertante — `src/lib/auth/guards.test.ts:91-95` (AD-012)
- [x] Payload forjando `cdOfertante` ignorado quando criador é GO — `e2e/usuarios.spec.ts:129-132`
- [x] Sessão expirada tratada como inválida — `src/lib/auth/session.integration.test.ts:82-93`
- [x] Seed do Admin Master idempotente — `prisma/seed.integration.test.ts`
- [ ] **Resposta de `/api/auth/primeiro-acesso` não ecoa a senha em claro — sem asserção** (origem do mutante M8)

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Exit code**: `0`
- **Result**: **137 passed, 0 failed, 0 skipped**
  - `lint` (eslint) — ✅ limpo
  - `typecheck` (`tsc --noEmit`) — ✅ limpo
  - `build` (`next build`, Next.js 16.3.2 + Turbopack) — ✅ compilou, 14 páginas
  - `test:unit` — 8 arquivos, **87 testes** (85 + 2 fixtures de `7247f58`)
  - `test:integration` — 3 arquivos, **14 testes** (contra `spma_test`)
  - `test:e2e` — **36 testes** (chromium, 1 worker), 4.0m
- **Test count antes desta iteração**: 135 · **depois**: 137 · **Delta**: +2
- A contagem bate exatamente com o previsto: `7247f58` acrescenta 2 casos de teste; `744bfc4` acrescenta uma asserção **dentro** de um teste existente, sem mudar a contagem.
- **Test integrity**: nenhuma contagem caiu, nenhum teste removido, nenhuma asserção enfraquecida. Os dois diffs são puramente aditivos (`+11 −0` no total).
- **Skipped**: nenhum · **Failures**: nenhuma

---

## Fix Plans

### Fix 1: assertar também a metade "senha" de CA-AU-10 em `/api/auth/primeiro-acesso`

- **Root cause**: `e2e/primeiro-acesso.spec.ts:53` assere `not.toMatch(/senhaHash|\$argon2/i)` — trava o hash, não a senha em texto claro. CA-AU-10 exige "não contém senha **nem** hash", e este é o único endpoint da feature que recebe a senha em claro na requisição e devolve um objeto `usuario`. O mutante M8 (eco de `senha: entrada.data.senha` na resposta) sobrevive ao suite inteiro.
- **Fix task**: em `e2e/primeiro-acesso.spec.ts`, no teste de sucesso, acrescentar uma linha ao lado da asserção existente: `expect(await res.text()).not.toContain(NOVA_SENHA);`. Alternativa equivalente e mais próxima do padrão de `login.spec.ts:222`: `expect((await res.json()).usuario).not.toHaveProperty("senha")` — mas nesse caso preservar também a checagem sobre o texto cru, que pega vazamento em qualquer nível do JSON.
- **Where**: `e2e/primeiro-acesso.spec.ts` (uma linha; nenhum código de produção muda)
- **Verify**: reinjetar M8 (`senha: entrada.data.senha` no objeto `usuario` de `src/app/api/auth/primeiro-acesso/route.ts:47`) num worktree scratch e confirmar que `npx playwright test e2e/primeiro-acesso.spec.ts` agora **falha**. Já comprovado nesta iteração que a asserção proposta mata o mutante.
- **Done when**: o suite e2e mata M8, e o gate completo segue verde (137 testes) na árvore não mutada.
- **Priority**: **Minor** — nenhum defeito em produção; a resposta é montada campo a campo e não inclui `senha`. É fechamento de rede de proteção sobre a metade não coberta de um AC de segurança.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-AU-01 | Implementing | ✅ Verified |
| REQ-AU-02 | Implementing | ✅ Verified |
| REQ-AU-03 | ⚠️ Verified com teste fraco | ✅ Verified (fixture de fronteira adicionada; M1 morre) |
| REQ-AU-04 | Implementing | ✅ Verified |
| REQ-AU-05 | Implementing | ✅ Verified |
| REQ-AU-06 | Implementing | ✅ Verified |
| REQ-AU-07 | Implementing | ✅ Verified |
| REQ-AU-08 | Implementing | ✅ Verified |
| REQ-AU-09 | Implementing | ✅ Verified |
| REQ-AU-10 | Implementing | ✅ Verified |
| REQ-AU-11 | Implementing | ✅ Verified |
| REQ-AU-12 | Implementing | ⚠️ Verified com uma metade de CA-AU-10 sem discriminação (Fix 1) |

---

## Summary

**Overall**: ⚠️ Issues — um fix de uma linha de teste antes de fechar a feature

**Spec-anchored check**: 10/10 ACs com asserção que bate o valor definido na spec; 2 spec-precision gaps declarados e honestos; 1 metade de AC (CA-AU-10 "senha" em `/api/auth/primeiro-acesso`) sem discriminação comprovada
**Sensor**: 7/8 mutantes mortos (P0-full)
**Gate**: 137 passed, 0 failed, 0 skipped, exit 0

**O que a iteração 2 confirma**: os dois fixes da iteração 1 são corretos, mínimos e empiricamente eficazes — M1 (o sobrevivente da iteração 1) agora morre pelas fixtures novas, e M6 morre pela asserção nova. Nenhuma regressão: contagem subiu de 135 para 137 exatamente como previsto, sem teste removido nem asserção enfraquecida.

**O que ainda falta**: a asserção de CA-AU-10 em `/api/auth/primeiro-acesso` cobre "hash" mas não "senha", no único endpoint da feature que recebe senha em claro. Mutante M8 sobrevive ao suite inteiro. Implementação de produção correta; fix é uma linha de teste, já validada contra o mutante.

**Next steps**: rotear o Fix 1 a um implementador e re-despachar o Verifier. Iteração 2 de no máximo 3 — a próxima é a última antes de escalar ao usuário. Nenhuma mudança de código de produção é necessária.
