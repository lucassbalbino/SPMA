# Gestão de Verbas Validation

**Verdict**: FAIL ❌

**Date**: 2026-10-13
**Spec**: `.specs/features/gestao-de-verbas/spec.md`
**Diff range**: `fb72d98^..a08e79c` (12 commits; fb72d98 só documentação)
**Verifier**: sub-agente independente (autor ≠ verificador). Cobertura re-derivada do spec e do código, sem confiar nos "Done when" de `tasks.md`.

Resumo: o gate passa inteiro (typecheck, 794 unit, 121 integration, 285 e2e) e 16 de 19 mutantes morrem. O FAIL vem de 3 mutantes sobreviventes, que mostram duas lacunas reais: a rota `PATCH /api/verbas/[id]` não tem nenhum teste de valor inválido (GV-21), e duas partes da exibição da linha (GV-11) nunca são afirmadas.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 schema | ✅ Done | teto, casas decimais e mensagens no `verba.schema` |
| T2 `podeLerVerba` | ✅ Done | - |
| T3 `listarVerbasDoEscopo` | ✅ Done | - |
| T4 rotas GET | ✅ Done | - |
| T5 `POST /api/usuarios` sem verba | ✅ Done | - |
| T6 `NovoUsuarioForm` | ✅ Done | - |
| T7 página `/verbas` | ✅ Done | - |
| T8 `NovaVerbaForm` | ✅ Done | - |
| T9 edição na linha | ⚠️ Partial | a tela funciona, mas o contrato de 400 da rota PATCH (GV-21) não tem teste (gap 1) |
| T10 navegação | ✅ Done | - |
| T11 seletor de curso | ✅ Done | - |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ coberto com o valor exato do spec · ⚠️ coberto em parte (alguma parte do critério sem asserção, ou prova só por composição) · ❌ gap (uma parte do critério não tem nenhuma asserção, e um mutante sobreviveu).

### P1: AM/GT criam verba

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-01 | Formulário com GO (todos os GOs), Valor e Data | `e2e/verbas-page.spec.ts:150-152` - `expect(page.getByLabel("GO"/"Valor da verba"/"Data de liberação")).toBeVisible()`; `:154`/`:132` `selectOption(CNPJ_GO_B / CNPJ_GO_C)` (GOs sem dados organizacionais estão no seletor; o mutante l mata) | ⚠️ três campos ✅; "todos os GOs" não é afirmado como conjunto, só por dois GOs presentes |
| GV-02 | Verba com `cdOfertante`, `vlVerba`, `dtVerba` informados (ou nula); aparece na lista sem recarregar | `e2e/verbas-page.spec.ts:162` `expect(resposta.status()).toBe(201)`; `:169-171` `nova.cdOfertante toBe CNPJ_GO_B`, `Number(nova.vlVerba) toBe 1500.75`, `nova.dtVerba toMatch /^2026-05-01/`; `:175-178` linha nova com "Valor R$ 1500.75" e "01/05/2026" | ⚠️ caminho com data ✅; o ramo "ou nula" (criar sem data pela tela) não é exercitado |
| GV-03 | "Ofertante é obrigatório", nada criado | `src/lib/validation/schemas/verba.schema.test.ts:79,83` `toEqual(["Ofertante é obrigatório"])`; `e2e/verbas-page.spec.ts:130` `getByText("Ofertante é obrigatório") toBeVisible`; `:140` `getVerbasPorOfertante(CNPJ_GO_C) toEqual([])` | ✅ |
| GV-04 | "Valor da verba é obrigatório", nada criado | `verba.schema.test.ts:89` `toEqual(["Valor da verba é obrigatório"])`; `e2e/verbas-page.spec.ts:134` texto visível; `:140` banco vazio | ✅ |
| GV-05 | "Valor da verba deve ser positivo" (zero e negativo), nada criado | `verba.schema.test.ts:95,101` `toEqual(["Valor da verba deve ser positivo"])` (0 e -1); `e2e/verbas-page.spec.ts:138` texto visível; `:140` banco vazio | ✅ |
| GV-06 | `POST /api/verbas` com > 99999999.99 ou 3+ casas → 400 e nada criado | `verba.schema.test.ts:107` `toEqual(["Valor da verba excede o máximo permitido"])`, `:120` `toEqual(["Valor da verba aceita no máximo 2 casas decimais"])`; ligação schema→400 na rota só pelo teste antigo `e2e/verbas.spec.ts:146` (`vlVerba: 0` → `toBe(400)`, sem leitura do banco) | ⚠️ a regra está provada no schema (mutantes e1-e4 mortos); falta, na rota, o 400 com esses valores e a leitura do banco que mostre que nada foi criado (L-014) |
| GV-07 | Duas verbas do mesmo GO, cada uma com valor e saldo próprios | `e2e/verbas-page.spec.ts:166-167` `verbasDeB[0].cdVerba toBe cdVerbaB`, `toHaveLength(2)`; `:174,177` valores próprios na tela; saldo próprio por verba do mesmo GO: `src/lib/verba/consulta.integration.test.ts:114,116` (6000 e 2500.5) | ✅ |
| GV-08 | GO/VO/VT/AL → 403 e nada criado | `src/lib/auth/guards.test.ts:344-358` `podeGerenciarVerba(GO/VO/VT/AL) toBe(false)`; `e2e/verbas.spec.ts:117` GO → `toBe(403)` | ⚠️ decisão provada por perfil; na rota só o GO é exercitado, e "nada criado" não é lido do banco (cobertura anterior a esta feature, aceita pelo design) |
| GV-09 | Botão desabilitado durante o envio | `e2e/verbas-page.spec.ts:200` `expect(criar).toBeDisabled()` com o POST segurado; `:203` `toBeEnabled()` depois | ✅ (mutante g morto) |
| GV-10 | Sem GO: aviso exato + botão desabilitado | `src/app/(protegido)/verbas/NovaVerbaForm.test.ts:19-21` `toContain("Nenhum Ofertante cadastrado - cadastre um GO antes de criar uma verba.")`; `:25` `toMatch(/<button[^>]*disabled=""[^>]*>Criar verba<\/button>/)`; contraprova `:36-38` | ✅ (mutante g10 morto) |

### P1: GO nasce sem verba

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-23 | Tipo GO sem campos de valor e data | `e2e/usuarios-page.spec.ts:154-155` laço com `"vlVerba", "dtVerba"` → `expect(page.locator(#campo)).toHaveCount(0)` | ✅ |
| GV-24 | GO criado e nenhuma verba com o CNPJ | `e2e/usuarios.spec.ts:455` `expect(corpo).not.toHaveProperty("verba")`; `:456` `getVerbasPorOfertante(CNPJ_NOVO_GO_VALIDO) toEqual([])`; pela UI `e2e/usuarios-page.spec.ts:175` `toEqual([])` | ✅ |
| GV-26 | Payload com `verba` → 400, nem usuário nem verba | `e2e/usuarios.spec.ts:499-502` `toBe(400)`, `erro toBe("verba não é aceito na criação de usuário")`, `getUsuario(...) toBeNull()`, `getVerbasPorOfertante(...) toEqual([])`; `src/lib/validation/schemas/usuario.schema.test.ts:211-213,225-227` (GO e VO) | ✅ (mutante d morto) |
| GV-25 | GO sem verba em `/cursos/novo` → "Nenhuma verba disponível para criar um curso." | `e2e/cursos-novo.spec.ts:154` `getByText("Nenhuma verba disponível para criar um curso.") toBeVisible()` (teste anterior a esta feature) | ✅ |

### P1: Listagem escopada com saldo

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-11 | AM/GT veem todas; linha com nome do GO (CNPJ se sem nome), CNPJ, valor, saldo, data ("—" se ausente) | `consulta.integration.test.ts:77-81` AM vê `[cdVerba, cdOfertante, nomeOfertante]` dos dois GOs; `e2e/verbas-page.spec.ts:86-91` nome, CNPJ, "Valor R$ 5000.00", "Saldo R$ 3800.00", "10/03/2026" | ❌ "—" para data ausente e o CNPJ no lugar do nome ausente **não são afirmados** (os mutantes k e m sobreviveram) |
| GV-12 | GO vê só as do próprio CNPJ | `consulta.integration.test.ts:87,93,99` `toEqual([...])` exatos (inclusive pedindo o filtro de outro GO); `e2e/verbas-page.spec.ts:93` verba de B `toHaveCount(0)` | ✅ (mutante c1 morto) |
| GV-13 | VO vê só as do GO vinculado | `consulta.integration.test.ts:105` `toEqual([cdVerbaAComCurso, cdVerbaASemCurso])` | ✅ |
| GV-14 | GO/VO sem formulário e sem "Editar" | `e2e/verbas-page.spec.ts:95-96` (GO) `locator("form") toHaveCount(0)`, botão "Editar" `toHaveCount(0)`; `:107` (VO) `form toHaveCount(0)` | ⚠️ GO ✅ (mutante f morto); para o VO a ausência de "Editar" não discrimina, porque o VO do teste não tem nenhuma linha |
| GV-15 | "Nenhuma verba cadastrada." | `e2e/verbas-page.spec.ts:105` `getByText("Nenhuma verba cadastrada.") toBeVisible()`, `:106` nenhuma linha | ✅ |
| GV-16 | saldo = valor − Σ `vlCursoAlocado` | `consulta.integration.test.ts:114` `saldoDisponivel.toNumber() toBe(6000)` (10000 − 4000), `:116` sem curso = valor; tela `e2e/verbas-page.spec.ts:90` "Saldo R$ 3800.00" | ✅ (mutante c2 morto). Só um curso por verba: a soma de vários vem de `saldosDasVerbas`, que já existia |
| GV-17 | VT/AL em `/verbas` → "Seu perfil não tem acesso a verbas.", nenhuma verba | `e2e/verbas-page.spec.ts:116-118` (VT) texto visível, nenhuma linha; AL: `guards.test.ts:331` `podeLerVerba("AL") toBe(false)`, mesma guarda em `page.tsx` | ⚠️ VT ✅; AL só por composição (não há e2e de AL na página) |
| GV-34 | VT/AL em `GET /api/verbas` e `GET /api/verbas/[id]` → 403, sem verba | `e2e/verbas.spec.ts:209-210` `toBe(403)`, `not.toHaveProperty("verbas")`; `e2e/verbas-id.spec.ts:126-127` `toBe(403)`, `not.toHaveProperty("verba")`; AL: `guards.test.ts:331` | ⚠️ VT ✅ (mutantes b1, b2 e a mortos); AL só por composição |

### P1: Navegação

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-27 | AM/GT: módulo "Verbas" com o item `/verbas`; cabeçalho com o item | `src/lib/ui/navegacao.test.ts:135` `rotuloDe(tipo, "/verbas") toBe("Verbas")`; `:78` hrefs exatos; `:161` módulos exatos; cabeçalho real do GT: `e2e/identidade-visual.spec.ts:262,330` `toHaveText([... "Verbas" ...])` | ✅ |
| GV-28 | GO/VO: módulo e item "Verbas" no painel e no cabeçalho | `navegacao.test.ts:135` (GO e VO); `:48-49` `MODULOS_ESPERADOS` com "Verbas"; `:29-36` hrefs | ✅ (unit sobre a fonte única que alimenta o cabeçalho e o painel, AD-039) |
| GV-29 | VT/AL sem o item | `navegacao.test.ts:140-141` `not.toContain("/verbas")`; `:78` listas exatas | ✅ (mutante h morto) |
| GV-30 | Sem sessão → login | `navegacao.test.ts:254` `ROTAS_COM_SESSAO toContain("/verbas")`; o redirect do proxy para rotas dessa lista está em `e2e/proxy.spec.ts:20-23` | ⚠️ prova indireta: nenhum teste abre `/verbas` sem sessão (o layout `(protegido)` também redireciona) |

### P2: Edição

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-18 | Persistir; a linha mostra o novo valor, a nova data e o saldo | `e2e/verbas-page.spec.ts:234-236` "Valor R$ 400.00", "Saldo R$ 0.00", "15/07/2026"; `:240-241` banco `400` e `/^2026-07-15/` | ✅ |
| GV-19 | Mensagem exata; o valor anterior é mantido | `e2e/verbas-page.spec.ts:224-226` `getByText("Novo valor não pode ser menor que o já alocado a cursos desta verba") toBeVisible()`; `:227` `Number(getVerba(cdVerbaD)?.vlVerba) toBe(1000)` | ✅ |
| GV-20 | Igual ao alocado → aceito, saldo 0 | `e2e/verbas-page.spec.ts:235` "Saldo R$ 0.00"; `:240` banco 400; API `e2e/verbas-id.spec.ts:141-142` | ✅ |
| GV-21 | `PATCH` com ≤ 0, > teto ou 3+ casas → 400 e verba inalterada | só no schema: `verba.schema.test.ts:56-58` (0 → `success false`), `:133-141` mensagens de teto e de casas | ❌ nenhum teste chama o `PATCH` com valor inválido. O mutante i (tirar a validação do `PATCH`) **sobreviveu**: a tela valida antes de enviar, então os e2e de UI não alcançam a rota. Valor negativo na edição não é testado nem no schema |
| GV-22 | A edição não oferece trocar o GO | `e2e/verbas-page.spec.ts:218-219` `linha.locator("select") toHaveCount(0)`, `getByLabel("GO", {exact}) toHaveCount(0)` | ✅ |

### Edge cases

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GO sem onboarding organizacional | criação aceita | GOs do `verbas-page.spec.ts` sem dados organizacionais são escolhidos e recebem verba (`:154`, `:162` 201); o mutante l (seletor só com GO que tem UF) foi morto por 3 testes | ✅ |
| GV-31 | `cdOfertante` que não é GO → 400 "Ofertante informado não existe" | `e2e/verbas.spec.ts:131-132` `toBe(400)`, `erro toBe("Ofertante informado não existe")` (anterior à feature) | ✅ |
| GV-32 | Várias verbas do GO no seletor de curso, cada uma com o próprio saldo | `e2e/cursos-novo.spec.ts:168-169` `opcao-verba-{cd}` com "saldo R$ 1000.00" e "saldo R$ 250.00" | ✅ |
| GV-33 | 99999999.99 aceito | `verba.schema.test.ts:115-116` `success toBe(true)`, `vlVerba toBe(99999999.99)` | ⚠️ aceito no schema (mutante e1 morto); a criação de fato (201 + valor gravado no `DECIMAL(10,2)`) não é exercitada |

**Status**: ❌ 2 critérios com gap (GV-11, GV-21) e 9 com cobertura parcial ou só por composição (GV-01, 02, 06, 08, 14, 17, 30, 33, 34). Os outros 23 batem exatamente com o spec.

---

## Discrimination Sensor

Executado num `git worktree` em `a08e79c`, no scratchpad, com junção para `node_modules`. Para o Turbopack aceitar a junção, só o `next.config.ts` do worktree recebeu `turbopack.root`. O dev server dos e2e foi iniciado a partir do worktree, contra `.env.test`, e reaproveitado com `E2E_REUSE_SERVER=1`. Aprovação ou falha foi lida sempre em `test-results/.last-run.json`. A linha de base e2e no worktree (`verbas-page`, `verbas-id`, `verbas`) deu 22/22 aprovados.

| # | Arquivo | Mutação | Testes rodados | Killed? |
| --- | --- | --- | --- | --- |
| a | `src/lib/auth/permissoes.ts` (`podeLerVerba`) | devolve `true` também para VT | `guards.test.ts` | ✅ morto (1 falha) |
| d | `src/lib/validation/schemas/usuario.schema.ts` | `verba` fora de `CAMPOS_NUNCA_NA_CRIACAO` | `usuario.schema.test.ts` | ✅ morto (2) |
| e1 | `verba.schema.ts` | teto 99999999.99 → 99999999.98 | `verba.schema.test.ts` | ✅ morto (1, GV-33) |
| e2 | `verba.schema.ts` | `.max(...)` removido | `verba.schema.test.ts` | ✅ morto (2) |
| e3 | `verba.schema.ts` | casas decimais sem tolerância (`=== 0`) | `verba.schema.test.ts` | ✅ morto (1, 0.29) |
| e4 | `verba.schema.ts` | checagem de casas sempre `true` | `verba.schema.test.ts` | ✅ morto (2) |
| g10 | `NovaVerbaForm.tsx` | sem GO, o botão não desabilita | `NovaVerbaForm.test.ts` | ✅ morto (1) |
| h | `src/lib/ui/navegacao.ts` | VT recebe o item VERBAS | `navegacao.test.ts` | ✅ morto (2) |
| c1 | `src/lib/verba/consulta.ts` | escopo ignorado (`where = {}`) | `consulta.integration.test.ts` | ✅ morto (5) |
| c2 | `consulta.ts` | saldo sem descontar o alocado | `consulta.integration.test.ts` | ✅ morto (1) |
| c3 | `consulta.ts` | `nomeOfertante: null` | `consulta.integration.test.ts` | ✅ morto (1) |
| b1 | `src/app/api/verbas/[id]/route.ts:21` | guarda `podeLerVerba` desligada | `e2e/verbas-id.spec.ts` | ✅ morto (`verbas-id.spec.ts:118`) |
| b2 | `src/app/api/verbas/route.ts:52` | guarda `podeLerVerba` desligada | `e2e/verbas.spec.ts` | ✅ morto (`verbas.spec.ts:201`) |
| f | `ListaVerbas.tsx` | "Editar" aparece sem `podeEditar` | `e2e/verbas-page.spec.ts` | ✅ morto (`:79`) |
| g | `NovaVerbaForm.tsx:120` | botão não desabilita durante o envio | `e2e/verbas-page.spec.ts` | ✅ morto (`:181`) |
| l | `src/app/(protegido)/verbas/page.tsx` | seletor só com GO que tem UF (onboarding) | `e2e/verbas-page.spec.ts` | ✅ morto (`:121`, `:143`, `:181`) |
| i | `src/app/api/verbas/[id]/route.ts:57` | `PATCH` sem validação (`request.json()` cru no lugar de `corpoValidado(edicaoVerbaSchema)`) | `e2e/verbas-id.spec.ts` + `e2e/verbas-page.spec.ts` | ❌ **sobreviveu** (13/13 aprovados) |
| k | `ListaVerbas.tsx` (`dataBr`) | data ausente vira `""` em vez de "—" | `e2e/verbas-page.spec.ts` | ❌ **sobreviveu** (7/7) |
| m | `ListaVerbas.tsx` | sem a troca do nome ausente pelo CNPJ | `e2e/verbas-page.spec.ts` | ❌ **sobreviveu** (7/7) |

**Sensor depth**: expandida (19 mutações; a feature mexe em autorização e escopo).
**Result**: 16/19 mortos. ❌ FAIL (3 sobreviventes → fix tasks abaixo).

**Isolamento**: a porcelain da árvore real antes do sensor estava vazia, e depois da limpeza continua vazia, idêntica (`diff` sem diferença). A junção foi removida antes do worktree (`rmdir` só no link), o `node_modules` real está intacto, o worktree foi removido e podado, e o dev server do worktree (porta 3000) foi encerrado.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (`exigeOfertanteEVerba` removida porque ficou sem uso, justificada em T5) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`ListaVerbas` segue `LinhaUsuario`; `consulta.ts` segue `consultarUsuarios`) |
| AD-039: sem cor literal em `.tsx`; navegação de fonte única | ✅ (só tokens; `/verbas` sai de `navegacao.ts`) |
| Spec-anchored outcome check | ❌ GV-11 e GV-21 com partes sem asserção |
| Per-layer Coverage Expectation | ⚠️ a matriz de `tasks.md` pede que toda afirmação de "nada mudou" leia o banco (L-014); GV-21 e GV-06 não leem na rota |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | `AGENTS.md`, `tasks.md` (matriz), memória "testes enxutos" ✅ |

Observação menor: a linha da lista usa `nomeOfertante ?? cdOfertante`, e o seletor usa `go.nome ? ... : documento`. Com nome `""`, a linha ficaria em branco e o seletor cairia para o CNPJ. Hoje o nome do GO não chega vazio pela criação, então isto é só uma inconsistência, não um defeito observado.

---

## Gate Check

Rodado agora, na árvore real em `a08e79c`:

- `npm run typecheck`: exit 0
- `npm run test:unit`: 36 arquivos, **794 passed**, 0 failed
- `npm run test:integration`: 14 arquivos, **121 passed**, 0 failed
- `npx playwright test` (suíte completa): **285 passed** (7.6 min); `test-results/.last-run.json` = `{"status":"passed","failedTests":[]}`
- `npm run lint` e `npm run build` não foram re-rodados por este verificador (o autor relata lint 0 erros e build ok na T11)
- **Skipped**: nenhum
- **Contagem**: unit 781 → 794 (+11 do schema, +6 de `podeLerVerba`, +3 de navegação, +3 do `NovaVerbaForm`, −9 de `exigeOfertanteEVerba`, removida junto da regra, −4 +3 no `usuario.schema`); integration 114 → 121 (+7); e2e +10 novos (`verbas-page` 7, `verbas` 1, `verbas-id` 1, `cursos-novo` 1). Os testes do `usuarios` foram reescritos, não removidos. Nenhuma asserção ficou mais fraca: as do REQ-OV-08 antigo foram trocadas pela regra oposta do GV-26, com leitura do banco.

---

## Fix Plans

### Fix 1 (Major): GV-21, a rota `PATCH` sem teste de valor inválido

- **Root cause**: a tela valida com `edicaoVerbaSchema` antes de enviar, então os e2e de UI nunca chegam à validação do servidor, e `e2e/verbas-id.spec.ts` só manda valores válidos. Com a validação da rota removida (mutante i), toda a suíte passa.
- **Fix task**: em `e2e/verbas-id.spec.ts`, GT chama `PATCH /api/verbas/{cdVerbaSemCurso}` com `vlVerba` `0`, `-1`, `100000000` e `10.123`. Cada chamada deve responder `400` com a mensagem do schema e `getVerba(cd)?.vlVerba` igual ao valor anterior. Opcional: adicionar o negativo ao `edicaoVerbaSchema` em `verba.schema.test.ts`.
- **Done when**: o mutante i morre.

### Fix 2 (Minor): GV-11, data ausente "—" e nome ausente → CNPJ

- **Root cause**: nenhuma linha afirmada tem data nula nem GO sem nome.
- **Fix task**: em `e2e/verbas-page.spec.ts`, afirmar que a linha de `cdVerbaB` (criada sem data) contém "—". Criar um GO sem `nome` com uma verba (documento novo com prefixo 55) e afirmar que o primeiro campo da linha mostra o CNPJ. Pode entrar num teste já existente do AM, sem teste novo.
- **Done when**: os mutantes k e m morrem.

### Fix 3 (Minor): GV-06 e GV-33 na rota `POST`, com leitura do banco (L-014)

- **Fix task**: em `e2e/verbas.spec.ts`, GT faz `POST` com `100000000` e com `10.123` → `400`, e `getVerbasPorOfertante(CNPJ_GO)` mantém a contagem anterior. Faz também `POST` com `99999999.99` → `201`, e `Number(getVerba(cd).vlVerba)` é `99999999.99`.

### Itens sem fix obrigatório (registrar ou aceitar)

- GV-08: só o GO exercitado na rota, sem leitura do banco (cobertura anterior; a decisão por perfil está no unit).
- GV-17/GV-34 para AL: provado por composição (unit `podeLerVerba("AL") === false` mais a mesma guarda exercitada pelo VT).
- GV-14 para VO: dar uma verba ao GO do VO tornaria a ausência de "Editar" discriminante.
- GV-02 "ou nula", GV-30 (sem e2e direto de `/verbas` sem sessão), GV-01 (conjunto completo de GOs) e GV-16 com vários cursos.

---

## Requirement Traceability Update

Este verificador só pode escrever `validation.md`; a atualização abaixo fica para o orquestrador aplicar em `spec.md`.

| Requirement | New Status |
| --- | --- |
| GV-01..10, GV-12, GV-13, GV-15, GV-16, GV-18..20, GV-22..29, GV-31..33 | ✅ Verified (com as ressalvas ⚠️ acima) |
| GV-14, GV-17, GV-30, GV-34 | ✅ Verified (parte por composição) |
| GV-11 | ❌ Needs Fix (Fix 2) |
| GV-21 | ❌ Needs Fix (Fix 1) |

---

## Lesson candidates (não registrados: `lessons.py` não foi autorizado)

1. Quando a tela valida com o mesmo schema do servidor, os e2e de UI nunca exercitam a validação da rota. Prove os limites da API com uma chamada direta à rota e a leitura do banco. (fonte: mutante i, GV-21)
2. Exibições de fallback ("—" para vazio, nome → identificador) exigem uma fixture que dispare o fallback. Uma linha "completa" não prova o caso vazio. (fonte: mutantes k e m, GV-11)

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 23/34 exatos, 9 parciais ou por composição, 2 com gap (GV-11, GV-21)
**Sensor**: 16/19 mortos (3 sobreviventes: i, k, m)
**Gate**: typecheck ok; 794 unit, 121 integration e 285 e2e aprovados, 0 falhas

**What works**: criação pela tela com várias verbas por GO; GO nasce sem verba (API e UI, com leitura do banco); escopo e saldo da lista; bloqueio do VT na tela e nas duas rotas GET; edição com teto do alocado; navegação.

**Issues found**: rota `PATCH` sem teste de valor inválido (Fix 1); "—" e fallback de nome não afirmados (Fix 2); `POST` com teto e casas sem prova na rota nem leitura do banco (Fix 3).

**Next steps**: aplicar Fix 1 a 3 (só testes; nenhum defeito de código foi encontrado) e redespachar o verificador.
