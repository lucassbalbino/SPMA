# Alterações no Questionário do Gestor (Pré-Curso) Validation

## Validation: alteracoes-pre-curso-gestor - PASS ✅

**Date**: 2026-10-21
**Spec**: `.specs/features/alteracoes-pre-curso-gestor/spec.md`
**Diff range**: `afac295..626fb25` na `feat/alteracoes-pre-curso-gestor` (5 commits: 9458a28, 3c48e3e, e10aab4, 09934dc, 626fb25)
**Verifier**: independent sub-agent (author ≠ verifier)

Veredito curto: o código atende as 20 ACs, e cada uma tem teste cujo valor bate com o resultado da spec. Os 16 mutantes injetados nas regras novas morreram. A rota PATCH não mudou; a APC-14 fica provada pela cadeia rota → `ordemDatasValida` (ver abaixo), sem e2e novo, e eu considero isso suficiente.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | 3c48e3e |
| T2 | ✅ Done | e10aab4 |
| T3 | ✅ Done | 09934dc |
| T4 | ✅ Done | 626fb25 |

Todos os "Done when" de `tasks.md` estão marcados, e conferi cada um contra o código e os testes.

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| APC-01 rótulos 7a-7d antes de Q8 | os 4 textos exatos, nessa ordem, seguidos de "8. …" | `e2e/pre-cursos-formulario.spec.ts:173` - `expect(enunciadosSecao2.slice(0, 5)).toEqual(["7a. Endereço onde …", "7b. Município", "7c. UF", "7d. Outros municípios foram contemplados …?", "8. Nome da Ação …"])` | ✅ PASS |
| APC-02 forma aceita | município não vazio; UF entre as 27; 7d "Sim"/"Não" | `src/lib/validation/schemas/pre-curso.schema.test.ts:136` (fixture com "Valinhos"/"SP"/"Sim" `toBe(true)`), `:215` (`qualifUf: "TO"` `toBe(true)`), `:237` (`qualifOutrosMunicipios: "Não"` `toBe(true)`). Schema: `pre-curso.schema.ts:235-237` | ✅ PASS |
| APC-03 forma rejeita | gravação recusada na validação de forma | `pre-curso.schema.test.ts:221` (`"XX"` `toBe(false)`), `:227` (`qualifMunicipio: ""` `toBe(false)`), `:246` (`"Talvez"` `toBe(false)`). A rota valida o corpo com o mesmo schema (`src/app/api/pre-cursos/[id]/route.ts:58`, `.partial()`) | ✅ PASS |
| APC-04 7d = "Sim" exige "Qual?" | campo visível; chave em `pendentes` quando vazia | `src/lib/pre-curso/completude.test.ts:176` - `toEqual({ completo: false, pendentes: ["qualifOutrosMunicipiosQuais"] })`; `src/lib/pre-curso/condicionais.test.ts:127`; tela: `e2e/pre-cursos-formulario.spec.ts:190` - `getByText("7d. Qual?", { exact: true })` `toBeVisible()` | ✅ PASS |
| APC-05 7d ≠ "Sim" oculta e não exige | oculto; fora de `pendentes` | `completude.test.ts:184` - `toEqual({ completo: true, pendentes: [] })` com "Não" e sem "Qual?"; `condicionais.test.ts:134` - `toEqual([])`; tela: `e2e/pre-cursos-formulario.spec.ts:188` - `campo-qualifOutrosMunicipiosQuais` `toHaveCount(0)` antes de responder 7d. A visibilidade sai da mesma regra (`PreCursoForm.tsx:460`) | ✅ PASS |
| APC-06 órfã descartada no encerramento | `qualifOutrosMunicipiosQuais` some | `e2e/pre-cursos-encerrar.spec.ts:249` (gravada antes, `toBeDefined()`) e `:260` - `expect(respostas).not.toHaveProperty("qualifOutrosMunicipiosQuais")`; unidade: `condicionais.test.ts:70` - `toEqual({...})` sem a chave | ✅ PASS |
| APC-07 7b/7c/7d ausentes | chave em `pendentes`, encerramento recusado | `completude.test.ts:188-195` - `it.each([3 chaves])` com `completo` `toBe(false)` e `pendentes` `toContain(chave)` | ✅ PASS |
| APC-08 12 opções de Q10 na ordem | lista exata, "Idiomas" antes de "Outro" | `pre-curso.schema.test.ts:353` - `expect(OPCOES_CARACTERISTICAS).toEqual([... 12 textos ...])` (com "Idiomas" em `:365`); o schema usa a constante (`pre-curso.schema.ts:52`) | ✅ PASS |
| APC-09 "Idiomas" sem "Outro" | `qualifCaracteristicasOutra` não exigida | `completude.test.ts:247` - `toEqual({ completo: true, pendentes: [] })` com `qualifCaracteristicas: ["Idiomas"]` | ✅ PASS |
| APC-10 "Idiomas" é a 11ª opção na tela | índice 10 = "Idiomas", 11 = "Outro" | `e2e/pre-cursos-formulario.spec.ts:197` - `opcoesQ10.nth(10)` `toHaveText("Idiomas")`; `:198` - `nth(11)` `toHaveText("Outro")` | ✅ PASS |
| APC-11 rótulos 17a-17d entre Q16 e Q18 | os 4 textos exatos, nessa ordem | `e2e/pre-cursos-formulario.spec.ts:212` - `expect(enunciadosSecao3.slice(3, 9)).toEqual(["16. …", "17a. Número previsto de alunos", "17b. …", "17c. …", "17d. Número de vagas", "18. …"])` | ✅ PASS |
| APC-12 forma aceita | datas `YYYY-MM-DD`; vagas inteiro > 0 | `pre-curso.schema.test.ts:136` (fixture `"2026-01-15"`/`"2026-02-15"`/`45`), `:264` (`planejNumVagas: 1` `toBe(true)`). Schema: `pre-curso.schema.ts:254-256` | ✅ PASS |
| APC-13 forma rejeita | 0, negativo, não inteiro e data fora do formato recusados | `pre-curso.schema.test.ts:267-273` - `it.each([0, -5, 2.5])` `toBe(false)`; `:276-284` - `it.each([2 chaves])` com `"15/01/2026"` `toBe(false)` | ✅ PASS |
| APC-14 17c < 17b no estado mesclado | 400, nada persistido | Cadeia: `route.ts:69-70` - `if (!ordemDatasValida(mescladas)) throw erroHttp(400, …)` (rota fora do diff); `e2e/pre-cursos-id.spec.ts:192-194` e `:219-221` - `res.status()` `toBe(400)` + `respostas` `toEqual(antes)` para o par do curso (mesmo e PATCHs separados); `pre-curso.schema.test.ts:538` - `ordemDatasValida({ inscrição 02-15 → 02-14 })` `toBe(false)`; `:572` - par de inscrição invertido com o curso em ordem `toBe(false)` | ✅ PASS (ver nota) |
| APC-15 só uma data ou iguais | ordem aceita | `pre-curso.schema.test.ts:547` (iguais `toBe(true)`), `:551-552` (só 17b, só 17c `toBe(true)`) | ✅ PASS |
| APC-16 17b/17c/17d ausentes | chave em `pendentes`, encerramento recusado | `completude.test.ts:200-207` - `it.each([3 chaves])` com `completo` `toBe(false)` e `pendentes` `toContain(chave)` | ✅ PASS |
| APC-17 63 chaves, 10 regras | contagens exatas | `pre-curso.schema.test.ts:130` - `toHaveLength(63)`; `condicionais.test.ts:35` - as 10 chaves das regras `toEqual([...])`; `src/lib/respostas/forma.test.ts:171-177` (116 chaves, 40 numéricas, 63 texto) | ✅ PASS |
| APC-18 56 chaves antigas | `pendentes` = exatamente as 6 novas sempre obrigatórias | `completude.test.ts:225` - `Object.keys(anterior)` `toHaveLength(56)`; `:227` - `[...pendentes].sort()` `toEqual([6 chaves].sort())` | ✅ PASS |
| APC-19 preencher pela tela e encerrar | status "Encerrado" | `e2e/pre-cursos-formulario.spec.ts:371` - `respostaEncerrar.ok()` `toBe(true)`; `:373` - `status-pre-curso` `toHaveText("Encerrado")`. O fluxo preenche os 7 campos novos (`:180-191`, `:225-227`). API: `e2e/pre-cursos-encerrar.spec.ts:172`/`:176` com a fixture de 63 chaves | ✅ PASS |
| APC-20 questionário-fonte | 7a-7d, "a) Sim. Qual?"/"b) Não", "k) Idiomas", "l) Outro. Qual?", 17a-17d | grep: `docs/Questionario_do_Gestor_Pre_Curso.md:21`, `:23`, `:25`, `:27`, `:29`-`:30`, `:51`, `:52`, `:77`, `:79`, `:81`, `:83`. Textos iguais aos de APC-01/08/11 | ✅ PASS |

**Status**: ✅ All ACs covered. 20/20 batem com a spec.

### Nota sobre APC-14 (decisão do autor, avaliada)

Não há e2e que mande as datas de inscrição pela rota. Aceito a cadeia de evidência pelos motivos abaixo:

1. A rota não está no diff. Ela passa o objeto mesclado inteiro para `ordemDatasValida` (`route.ts:69`), sem selecionar campos. Logo, qualquer chave aceita pelo schema chega à função.
2. O e2e já prova o comportamento da rota com esse mesmo ponto de chamada: 400 + nada persistido, no mesmo PATCH e em PATCHs separados (`e2e/pre-cursos-id.spec.ts:180-224`).
3. Na unidade, o par de inscrição é discriminado: M6 (ignorar o par) e M16 (inverter os argumentos) morreram.

Risco que sobra: se alguém refatorar a rota para mandar a `ordemDatasValida` só as datas do curso, nenhum teste quebra. É baixo, porque a rota não foi tocada, e um e2e para cobri-lo iria contra a preferência registrada do usuário (camada mais barata). Não abro lacuna.

### Spec-precision gaps

- Nenhum. APC-03 e APC-13 dizem "rejeitar na validação de forma", sem código HTTP, e os testes conferem `success === false` no schema que a rota usa. APC-14 define 400 + nada persistido, e a rota e o e2e afirmam exatamente isso.

---

## Edge Cases

- [x] 7d volta de "Sim" para "Não": "Qual?" some da tela e sai do PATCH. A visibilidade e o `naoAplicaveis` saem da mesma regra (`PreCursoForm.tsx:460`, `:482`), e o valor gravado só é descartado no encerramento (`e2e/pre-cursos-encerrar.spec.ts:249`, `:260`).
- [x] Datas de inscrição em PATCHs separados: o objeto mesclado vai para `ordemDatasValida` (`route.ts:69`). O mecanismo está provado no e2e do par do curso (`e2e/pre-cursos-id.spec.ts:198-224`).
- [x] 17c igual a 17b: aceito (`pre-curso.schema.test.ts:547`).

---

## Discrimination Sensor

Scratch: um `git worktree` em 626fb25 dentro do scratchpad, com `node_modules` ligado por junction. Rodei os 4 arquivos de teste unitário do escopo (`pre-curso.schema.test.ts`, `src/lib/pre-curso/*.test.ts`, `forma.test.ts`; 255 testes, todos verdes antes das mutações). Cada mutante foi aplicado, testado e revertido. No fim tirei a junction e rodei `git worktree remove --force` + `git worktree prune`. Nunca usei `git stash`. O `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/validation/schemas/pre-curso.schema.ts:52` | Remove "Idiomas" | ✅ Killed (2: lista de Q10, completude só com "Idiomas") |
| M2 | `src/lib/validation/schemas/pre-curso.schema.ts:52` | "Idiomas" depois de "Outro" | ✅ Killed (1: lista de Q10) |
| M3 | `src/lib/pre-curso/condicionais.ts:71` | Regra de 7d.Qual disparada por "Não" | ✅ Killed (6) |
| M4 | `src/lib/pre-curso/condicionais.ts:68-72` | Remove a regra nova | ✅ Killed (4) |
| M5 | `src/lib/validation/schemas/pre-curso.schema.ts:361` | `termino >= inicio` → `>` | ✅ Killed (2: iguais, nos dois pares) |
| M6 | `src/lib/validation/schemas/pre-curso.schema.ts:351-352` | `ordemDatasValida` ignora o par de inscrição | ✅ Killed (2) |
| M7 | `src/lib/validation/schemas/pre-curso.schema.ts:256` | `planejNumVagas` `.positive()` → `.nonnegative()` | ✅ Killed (1: rejeita 0) |
| M8 | `src/lib/validation/schemas/pre-curso.schema.ts:236` | `qualifUf` texto livre | ✅ Killed (1: rejeita "XX") |
| M9 | `src/lib/validation/schemas/pre-curso.schema.ts:235` | `qualifMunicipio` opcional | ✅ Killed (2: pendente, APC-18) |
| M10 | `src/lib/validation/schemas/pre-curso.schema.ts:237` | `qualifOutrosMunicipios` texto livre | ✅ Killed (1: rejeita "Talvez") |
| M11 | `src/lib/validation/schemas/pre-curso.schema.ts:254` | 17b sem formato de data | ✅ Killed (1) |
| M12 | `src/lib/validation/schemas/pre-curso.schema.ts:256` | `planejNumVagas` sem `.int()` | ✅ Killed (1: rejeita 2.5) |
| M13 | `src/lib/validation/schemas/pre-curso.schema.ts:238` | 7d.Qual sempre obrigatória | ✅ Killed (3) |
| M14 | `src/lib/validation/schemas/pre-curso.schema.ts:357` | `!inicio \|\| !termino` → `&&` (compara com uma data só) | ✅ Killed (2) |
| M15 | `src/lib/validation/schemas/pre-curso.schema.ts:255` | 17c opcional | ✅ Killed (2: pendente, APC-18) |
| M16 | `src/lib/validation/schemas/pre-curso.schema.ts:352` | Par de inscrição com argumentos trocados | ✅ Killed (2) |

Mutações só de tela (`PreCursoForm.tsx`), avaliadas lendo as asserções, sem rodar e2e no scratch:

- Trocar a ordem de 7a-7d, mudar um rótulo ou mover um campo para depois de Q8 quebra o `toEqual` exato de `e2e/pre-cursos-formulario.spec.ts:173`. O mesmo vale para 17a-17d em `:212`.
- Mudar "7d. Qual?" quebra o `getByText(..., { exact: true })` de `:190`. Tirar `outroChave` faz o `fill` de `:191` estourar o tempo.
- A ordem das opções de Q10 na tela vem de `OPCOES_CARACTERISTICAS`: M1 e M2 já cobrem a lista, e `:197`-`:198` cobrem o índice.
- Trocar `opcoes: OPCOES_UF` de 7c quebra `campo-qualifUf-opcao-12` + `toContainText("MG")` (`:184`-`:186`).

**Sensor depth**: expandido (≥5 mutações; as regras de completude bloqueiam o encerramento)
**Result**: 16/16 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `parEmOrdem` é o único helper novo e é usado pelos dois pares |
| Surgical changes | ✅ rota, `prisma/` e repositório intocados (`git diff --stat afac295..626fb25 -- prisma/` vazio) |
| No scope creep | ✅ nenhum item de "Out of Scope" foi implementado: sem regra entre Q1/Q2 e 7b/7c, nem entre 17c e Q13, nem entre 17d e 17a |
| Matches patterns | ✅ "Qual?" de 7d usa `outroChave` + regra em `condicionais.ts`, como Q9 |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ domínio 1:1 com as ACs; e2e só nos specs que já exercitavam a tela |
| Every test maps to a spec requirement | ✅ cada teste novo cita a APC no comentário; os 8 `it`/`test` "removidos" do diff são renomeações (56→63, 9→10, 11→12) |
| Documented guidelines followed: `AGENTS.md` (nenhuma cor literal nova; navegação intocada), preferência do usuário por camada mais barata | ✅ |

Observação cosmética (não bloqueia): em `src/lib/pre-curso/completude.ts:9-11` a quebra de linha do comentário ficou estranha ("as outras 53 chaves / sempre-obrigatórias já são / checadas …").

---

## Gate Check

Rodei de novo na árvore real, em 626fb25:

- `npm run test:unit`: exit 0, 37 arquivos, **882 passed**, 0 failed
- `npm run test:integration`: exit 0, 16 arquivos, **139 passed**, 0 failed
- `npm run typecheck`: exit 0
- `npm run test:e2e -- e2e/pre-cursos-formulario.spec.ts e2e/pre-cursos-encerrar.spec.ts e2e/pre-cursos-id.spec.ts`: **22 passed** (1.4m); `test-results/.last-run.json` = `{"status":"passed","failedTests":[]}`
- Gate Build completo (autor, mesmo commit): lint 0 erros, build ok, e2e completo 293/293. Não repeti lint, build nem a suíte e2e inteira; as partes que reexecutei bateram com o que o autor informou.
- **Test count before feature**: 853 unit, pela conta (882 menos os 29 casos unitários novos do diff); integration 139
- **Test count after**: unit 882, integration 139 (+29, +0)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Requirement Traceability Update

Não editei `spec.md` (este Verifier só escreve `validation.md`). Status a aplicar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| APC-01 a APC-20 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/20 ACs batem com a spec; 0 spec-precision gaps.
**Sensor**: 16/16 mutações killed.
**Gate**: unit 882, integration 139, e2e do pré-curso 22/22, typecheck ok.

**What works**: as 7 chaves novas (forma, completude, tela), "Idiomas" em Q10, a regra condicional de 7d com descarte de órfã e a ordem do par de inscrição.

**Issues found**: nenhuma lacuna. Risco residual baixo: a APC-14 não tem e2e próprio (ver nota).

**Next steps**: mudar as APC-01 a APC-20 para Verified no `spec.md` e fechar `tasks.md`. Push e merge na `main` dependem de go-ahead explícito (AD-047).
