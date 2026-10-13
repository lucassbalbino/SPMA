# Gestão de Verbas Validation

**Verdict**: PASS ✅

**Date**: 2026-10-13
**Iteração**: 2 de 3. A iteração 1 deu FAIL, em `b729eb2`. As lacunas foram fechadas em `34b0966` (T12, só testes).
**Spec**: `.specs/features/gestao-de-verbas/spec.md`
**Diff range**: `fb72d98^..34b0966`. O código de produção não muda depois de `a08e79c`: `b729eb2` é documentação e `34b0966` só mexe em `e2e/` e em `tasks.md`.
**Verifier**: sub-agente independente (autor ≠ verificador). A cobertura foi re-derivada do spec e do código, sem confiar nos "Done when" de `tasks.md`.

Resumo: os 3 mutantes que sobreviveram na iteração 1 (i, k e m) agora morrem, cada um no teste novo que o mira. Os mutantes de controle continuam morrendo. O gate passa inteiro na árvore real em `34b0966`: typecheck, 794 unit, 121 integration e 288 e2e. Não resta gap Major. Os residuais Minor e aceitos estão listados no fim.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T11 | ✅ Done | ver a iteração 1 (`b729eb2`) |
| T9 edição na linha | ✅ Done | o contrato de 400 do `PATCH` (GV-21) agora tem teste de rota (T12) |
| T12 fechar lacunas da validação 1 | ✅ Done | `e2e/verbas-id.spec.ts:171`, `e2e/verbas.spec.ts:218`, `e2e/verbas-page.spec.ts:126` |

---

## Spec-Anchored Acceptance Criteria

Legenda:
- ✅ coberto com o valor exato do spec.
- ⚠️ residual Minor ou aceito: o comportamento está coberto, mas uma parte do critério é provada só por composição, ou o teste não discrimina aquele caso. Nenhum destes tem mutante sobrevivente.

As linhas citadas são as de `34b0966`.

### P1: AM/GT criam verba

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-01 | Formulário com GO (todos os GOs), Valor e Data | `e2e/verbas-page.spec.ts:170-172` `getByLabel("GO"/"Valor da verba"/"Data de liberação") toBeVisible()`; GOs sem dados organizacionais escolhidos em `:152`/`:174` (o mutante l morre) | ⚠️ os três campos ✅; "todos os GOs" não é afirmado como conjunto (residual Minor) |
| GV-02 | Verba com `cdOfertante`, `vlVerba`, `dtVerba` informados (ou nula); aparece na lista sem recarregar | `e2e/verbas-page.spec.ts:182` `toBe(201)`; `:189-191` `cdOfertante toBe CNPJ_GO_B`, `Number(vlVerba) toBe 1500.75`, `dtVerba toMatch /^2026-05-01/`; `:196-198` a linha nova aparece sem reload | ⚠️ o ramo "ou nula" (criar sem data pela tela) não é exercitado (residual Minor) |
| GV-03 | "Ofertante é obrigatório", nada criado | `src/lib/validation/schemas/verba.schema.test.ts:79,83` `toEqual(["Ofertante é obrigatório"])`; `e2e/verbas-page.spec.ts:150` texto visível; `:160` `getVerbasPorOfertante(CNPJ_GO_C) toEqual([])` | ✅ |
| GV-04 | "Valor da verba é obrigatório", nada criado | `verba.schema.test.ts:89`; `e2e/verbas-page.spec.ts:154`; `:160` | ✅ |
| GV-05 | "Valor da verba deve ser positivo", nada criado | `verba.schema.test.ts:95,101` (0 e -1); `e2e/verbas-page.spec.ts:158`; `:160` | ✅ |
| GV-06 | `POST` com > 99999999.99 ou 3+ casas → 400 e nada criado | `e2e/verbas.spec.ts:228` `expect(res.status()).toBe(400)` para `100000000` e `10.123`; `:230` `getVerbasPorOfertante(CNPJ_GO) toHaveLength(quantidadeAntes)`; mensagens no schema `verba.schema.test.ts:107,120` | ✅ (o mutante n, POST sem validação, morre em `:218`) |
| GV-07 | Duas verbas do mesmo GO, cada uma com valor e saldo próprios | `e2e/verbas-page.spec.ts:186-187` a anterior continua e há 2; `:194,197` valores próprios; saldo próprio por verba: `src/lib/verba/consulta.integration.test.ts:114,116` | ✅ |
| GV-08 | GO/VO/VT/AL → 403, nada criado | `src/lib/auth/guards.test.ts:344-358` `podeGerenciarVerba(...) toBe(false)` para os 4; `e2e/verbas.spec.ts:118` GO → `toBe(403)` | ⚠️ na rota, só o GO é exercitado e nada é lido do banco. Cobertura anterior à feature, aceita |
| GV-09 | Botão desabilitado durante o envio | `e2e/verbas-page.spec.ts:220` `toBeDisabled()` com o POST segurado; `:223` `toBeEnabled()` | ✅ (o mutante g morre, também no controle da iteração 2) |
| GV-10 | Sem GO: aviso exato e botão desabilitado | `src/app/(protegido)/verbas/NovaVerbaForm.test.ts:19-21` `toContain("Nenhum Ofertante cadastrado - cadastre um GO antes de criar uma verba.")`; `:25` botão `disabled`; contraprova `:36-38` | ✅ |

### P1: GO nasce sem verba

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-23 | Tipo GO sem campos de valor e data | `e2e/usuarios-page.spec.ts:154-155` `#vlVerba`/`#dtVerba` `toHaveCount(0)` | ✅ |
| GV-24 | GO criado e nenhuma verba com o CNPJ | `e2e/usuarios.spec.ts:455` `not.toHaveProperty("verba")`; `:456` `getVerbasPorOfertante(...) toEqual([])`; pela UI `e2e/usuarios-page.spec.ts:175` | ✅ |
| GV-26 | Payload com `verba` → 400, nem usuário nem verba | `e2e/usuarios.spec.ts:499-502` `toBe(400)`, `erro toBe("verba não é aceito na criação de usuário")`, `getUsuario toBeNull()`, `getVerbasPorOfertante toEqual([])`; `usuario.schema.test.ts:211-213,225-227` | ✅ |
| GV-25 | GO sem verba em `/cursos/novo` → "Nenhuma verba disponível para criar um curso." | `e2e/cursos-novo.spec.ts:154` `toBeVisible()` (teste anterior à feature) | ✅ |

### P1: Listagem escopada com saldo

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-11 | AM/GT veem todas; linha com nome do GO (CNPJ se sem nome), CNPJ, valor, saldo, data ("—" se ausente) | `consulta.integration.test.ts:77-81` AM vê as verbas dos dois GOs com o nome; `e2e/verbas-page.spec.ts:91-96` nome, CNPJ, "Valor R$ 5000.00", "Saldo R$ 3800.00", "10/03/2026"; `:133` `getByTestId(verba-${cdVerbaB}) toContainText("—")`; `:137` `linhaSemNome.locator("span").first() toHaveText(CNPJ_GO_E)` | ✅ (os mutantes k e m morrem em `:126`) |
| GV-12 | GO vê só as do próprio CNPJ | `consulta.integration.test.ts:87,93,99` `toEqual([...])` exatos; `e2e/verbas-page.spec.ts:98` a verba de B `toHaveCount(0)` | ✅ |
| GV-13 | VO vê só as do GO vinculado | `consulta.integration.test.ts:105` | ✅ |
| GV-14 | GO/VO sem formulário e sem "Editar" | `e2e/verbas-page.spec.ts:100-101` (GO) form e "Editar" `toHaveCount(0)`; `:112` (VO) form `toHaveCount(0)` | ⚠️ GO ✅ (o mutante f morre); para o VO, a ausência de "Editar" não discrimina, porque o VO do teste não tem linhas (residual Minor) |
| GV-15 | "Nenhuma verba cadastrada." | `e2e/verbas-page.spec.ts:110-111` | ✅ |
| GV-16 | saldo = valor − Σ `vlCursoAlocado` | `consulta.integration.test.ts:114` `toBe(6000)`, `:116`; tela `e2e/verbas-page.spec.ts:95` "Saldo R$ 3800.00" | ✅ |
| GV-17 | VT/AL em `/verbas` → "Seu perfil não tem acesso a verbas.", nenhuma verba | `e2e/verbas-page.spec.ts:121-123` (VT); AL: `guards.test.ts:331` `podeLerVerba("AL") toBe(false)`, mesma guarda em `page.tsx` | ⚠️ AL só por composição (aceito) |
| GV-34 | VT/AL nas duas rotas GET → 403 sem verba | `e2e/verbas.spec.ts:210-211` `toBe(403)`, `not.toHaveProperty("verbas")`; `e2e/verbas-id.spec.ts:126-127` `toBe(403)`, `not.toHaveProperty("verba")`; AL: `guards.test.ts:331` | ⚠️ AL só por composição (aceito). O mutante b1 morre, também no controle da iteração 2 |

### P1: Navegação

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-27 | AM/GT: item `/verbas` no módulo e no cabeçalho | `src/lib/ui/navegacao.test.ts:135` `rotuloDe(tipo, "/verbas") toBe("Verbas")`; `:78`, `:161`; cabeçalho real do GT `e2e/identidade-visual.spec.ts:262,330` | ✅ |
| GV-28 | GO/VO: módulo e item no painel e no cabeçalho | `navegacao.test.ts:135`; `:48-49`; `:29-36` | ✅ |
| GV-29 | VT/AL sem o item | `navegacao.test.ts:140-141`; `:78` | ✅ |
| GV-30 | Sem sessão → login | `navegacao.test.ts:254` `ROTAS_COM_SESSAO toContain("/verbas")`; o redirect do proxy para rotas da lista está em `e2e/proxy.spec.ts:20-23` | ⚠️ prova indireta, sem e2e direto de `/verbas` (aceito) |

### P2: Edição

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GV-18 | Persistir; a linha mostra o novo valor, a nova data e o saldo | `e2e/verbas-page.spec.ts:254-256`; `:260-261` banco 400 e `/^2026-07-15/` | ✅ |
| GV-19 | Mensagem exata; o valor anterior é mantido | `e2e/verbas-page.spec.ts:244-246` texto exato visível; `:247` `Number(getVerba(cdVerbaD)?.vlVerba) toBe(1000)` | ✅ |
| GV-20 | Igual ao alocado → aceito, saldo 0 | `e2e/verbas-page.spec.ts:255`; `:260`; API `e2e/verbas-id.spec.ts:141-142` | ✅ |
| GV-21 | `PATCH` com ≤ 0, > teto ou 3+ casas → 400 e verba inalterada | `e2e/verbas-id.spec.ts:183` `expect(res.status()).toBe(400)` e `:184` `getVerba(cdVerbaSemCurso)?.vlVerba toBe(valorOriginal)`, para `0`, `-1`, `100000000` e `10.123`; `:176` confirma o valor original 8000 | ✅ (o mutante i morre em `:171`) |
| GV-22 | A edição não oferece trocar o GO | `e2e/verbas-page.spec.ts:238-239` | ✅ |

### Edge cases

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GO sem onboarding organizacional | criação aceita | GOs sem dados organizacionais escolhidos e com verba criada (`e2e/verbas-page.spec.ts:174,182`); o mutante l morre | ✅ |
| GV-31 | `cdOfertante` que não é GO → 400 "Ofertante informado não existe" | `e2e/verbas.spec.ts:132-133` (anterior à feature) | ✅ |
| GV-32 | Várias verbas do GO no seletor de curso, cada uma com o próprio saldo | `e2e/cursos-novo.spec.ts:168-169` | ✅ |
| GV-33 | 99999999.99 aceito | `e2e/verbas.spec.ts:236` `toBe(201)`; `:237` `getVerba(...)?.vlVerba toBe("99999999.99")`; schema `verba.schema.test.ts:115-116` | ✅ |

**Status**: ✅ 27/34 exatos, 7 com residual Minor ou aceito (GV-01, 02, 08, 14, 17, 30, 34), 0 gaps.

---

## Discrimination Sensor

### Iteração 2 (worktree isolado em `34b0966`)

Montagem igual à da iteração 1:
- `git worktree` no scratchpad, com junção para `node_modules`.
- `turbopack.root` só no `next.config.ts` do worktree.
- dev server subido a partir do worktree contra `.env.test` e confirmado por uma requisição-sonda no log dele.
- `E2E_REUSE_SERVER=1`, com aprovação ou falha lida sempre em `test-results/.last-run.json`.

A linha de base e2e no worktree (`verbas-page`, `verbas-id`, `verbas`) deu 25/25 aprovados.

| # | Arquivo | Mutação | Testes rodados | Killed? |
| --- | --- | --- | --- | --- |
| i | `src/app/api/verbas/[id]/route.ts:57` | `PATCH` sem validação (`request.json()` cru) | `verbas-id` + `verbas-page` | ✅ morto em `e2e/verbas-id.spec.ts:171` (GV-21) |
| k | `src/app/(protegido)/verbas/ListaVerbas.tsx` (`dataBr`) | data ausente vira `""` em vez de "—" | `verbas-page` | ✅ morto em `e2e/verbas-page.spec.ts:126`: esperava "—", recebeu a linha sem ele |
| m | `ListaVerbas.tsx` | sem a troca do nome ausente pelo CNPJ | `verbas-page` | ✅ morto em `e2e/verbas-page.spec.ts:126`: esperava o CNPJ, recebeu `""` |
| b1 (controle) | `src/app/api/verbas/[id]/route.ts:21` | guarda `podeLerVerba` desligada | `verbas-id` | ✅ morto em `:118` |
| g (controle) | `NovaVerbaForm.tsx:120` | botão não desabilita durante o envio | `verbas-page` | ✅ morto em `:201` |
| n (novo) | `src/app/api/verbas/route.ts` | `POST` sem validação (`request.json()` cru) | `verbas` | ✅ morto em `:138` e `:218` (GV-06/GV-33) |

### Iteração 1 (em `a08e79c`; o código de produção não mudou desde então)

Morreram 16 de 19:
- unit: a, d, e1-e4, g10, h
- integration: c1-c3
- e2e: b1, b2, f, g, l

Sobreviveram i, k e m, que agora morrem (tabela acima). O detalhe de cada mutação está em `b729eb2:.specs/features/gestao-de-verbas/validation.md`.

**Sensor depth**: expandida (autorização, escopo, limites de valor).
**Result**: PASS ✅. São 22 mutantes distintos ao todo, 22 mortos no estado atual (20 da iteração 1, contando i, k e m, mais o n, novo nesta iteração). A iteração 2 rodou 6 injeções: os 3 antigos sobreviventes, 2 controles (b1 e g) e o n. Os 6 morreram.

**Isolamento**: a porcelain da árvore real antes do sensor estava vazia, em `34b0966`. A junção foi removida antes do diretório (só o link; o `node_modules` real está intacto). O worktree foi removido e podado. O dev server do worktree foi encerrado e a porta 3000 está livre. A porcelain final só tem este `validation.md` modificado.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical / sem scope creep | ✅ |
| Matches patterns | ✅ |
| AD-039: tokens no lugar de cor literal; navegação de fonte única | ✅ |
| Spec-anchored outcome check | ✅ (residuais ⚠️ listados) |
| Per-layer Coverage Expectation (L-014: "nada mudou/criado" lido do banco) | ✅ para GV-03..06, 19, 21, 24, 26; GV-08 é residual anterior à feature |
| Every test maps to a spec requirement | ✅ (os 3 testes novos citam GV-06/21/33/11) |
| Documented guidelines followed | `AGENTS.md`, matriz de `tasks.md`, memória "testes enxutos" ✅ (T12 estendeu specs existentes, 3 testes novos) |

Observação menor: a linha usa `nomeOfertante ?? cdOfertante`, e o seletor usa uma checagem de verdade (`go.nome ? ...`). Com nome `""`, a linha ficaria em branco. A criação de usuário não produz nome vazio hoje, então isto é uma inconsistência, não um defeito observado.

---

## Gate Check

Rodado agora, na árvore real em `34b0966`:

- `npm run typecheck`: exit 0
- `npm run test:unit`: 36 arquivos, **794 passed**, 0 failed
- `npm run test:integration`: 14 arquivos, **121 passed**, 0 failed
- `npx playwright test` (suíte completa): **288 passed** (8.6 min); `test-results/.last-run.json` = `{"status":"passed","failedTests":[]}`
- `npm run lint` e `npm run build` não foram re-rodados por este verificador. O autor relata lint com 0 erros em `34b0966`, e o código de produção não muda desde `a08e79c`.
- **Skipped**: nenhum
- **Contagem**: e2e 285 → 288 (+3 da T12); unit e integration sem mudança. Os deltas da feature inteira estão na iteração 1: unit 781 → 794, integration 114 → 121. Nenhuma asserção ficou mais fraca.

---

## Residuais (Minor ou aceitos; sem fix obrigatório)

1. **GV-08**: só o GO é exercitado no `POST`, sem ler o banco. A decisão para VO, VT e AL está no unit `podeGerenciarVerba`. Cobertura anterior à feature.
2. **GV-17 e GV-34 para AL**: provados por composição, pelo unit `podeLerVerba("AL") === false` mais a mesma guarda exercitada pelo VT na página e nas duas rotas.
3. **GV-14 para VO**: a ausência de "Editar" não discrimina, porque o VO do teste não tem linhas. Dar uma verba ao GO do VO resolveria.
4. **GV-02 "ou nula"**: criar sem data pela tela não é exercitado. O caminho no servidor é o mesmo de `dtVerba` opcional.
5. **GV-30**: a prova é indireta (lista derivada mais o e2e do proxy em outras rotas).
6. **GV-01**: o seletor não é afirmado como "todos os GOs". O mutante l mostra que o filtro está protegido.
7. **GV-16**: só um curso por verba nos testes. A soma de vários vem de `saldosDasVerbas`, que já existia.

---

## Requirement Traceability Update

Este verificador só escreve `validation.md`; o orquestrador aplica em `spec.md`.

| Requirement | New Status |
| --- | --- |
| GV-01..GV-34 | ✅ Verified (GV-01, 02, 08, 14, 17, 30, 34 com residuais Minor ou aceitos, listados acima) |

---

## Lesson candidates (não registrados: `lessons.py` não foi autorizado)

1. Quando a tela valida com o mesmo schema do servidor, os e2e de UI nunca exercitam a validação da rota. Prove os limites da API com uma chamada direta e a leitura do banco. (fonte: mutante i da iteração 1, GV-21; fechado em `34b0966`)
2. Exibições de fallback ("—" para vazio, nome → identificador) exigem uma fixture que dispare o fallback. (fonte: mutantes k e m da iteração 1, GV-11; fechado em `34b0966`)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 27/34 exatos, 7 residuais Minor ou aceitos, 0 gaps
**Sensor**: na iteração 2, 6/6 mortos (i, k e m re-injetados, 2 controles e 1 novo); no estado atual, 22/22 mutantes distintos morrem
**Gate**: typecheck ok; 794 unit, 121 integration e 288 e2e aprovados, 0 falhas

**What works**:
- criação de várias verbas por GO pela tela;
- GO nasce sem verba (API e UI, com leitura do banco);
- limites de valor provados nas duas rotas (`POST` e `PATCH`), com leitura do banco;
- escopo e saldo da lista, incluindo "—" e o fallback do nome;
- bloqueio do VT na tela e nas duas rotas GET;
- edição com teto do alocado;
- navegação.

**Next steps**: atualizar a rastreabilidade em `spec.md`. Os residuais são opcionais.
