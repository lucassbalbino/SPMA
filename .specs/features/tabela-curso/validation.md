# Tabela de Curso Validation

**Date**: 2026-10-28
**Spec**: `.specs/features/tabela-curso/spec.md`
**Diff range**: `main...feat/tabela-curso` (aeb5dbf..14e3373, 11 commits). A iteração 2 é `cf0eb3e..14e3373`: T7 `3260f77`, T8 `7406239`, T9 `14e3373`.
**Verifier**: independent sub-agent (author ≠ verifier)
**Iteração**: 2 de 3

**Verdict**: PASS ✅

A iteração 1 terminou em FAIL por dois mutantes sobreviventes na autoconferência da migration: M2b no CUR-16 e M9 no CUR-17. A iteração 2 não tocou em código de produção: `git diff cf0eb3e..HEAD` só mexe em testes e em docs, e a `migration.sql` e o `reversao.sql` estão idênticos. Os testes agora provocam cada ramo dos dois `CHECK`. Re-rodei M2b e M9 num worktree isolado, mais seis mutações novas, e todas morreram.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T6 | ✅ Done | Conferidas na iteração 1. Nenhum código de produção mudou desde então. |
| T7 | ✅ Done | Bloco `conferência` em `tabela-curso-migracao.integration.test.ts:337-416`: 5 casos de coluna, 1 de contagem, 2 de órfão e 1 de limpeza. |
| T8 | ✅ Done | CUR-08 com `P2003` (`curso.integration.test.ts:158`); `src/lib/pos-curso/liberacao.test.ts` novo, com o caso `null`. |
| T9 | ✅ Done | CUR-13 e CUR-22 reescritos (`spec.md:77`, `:125`); `cdOfertante` a mais registrado em `design.md:46` e em `.specs/STATE.md:396`. |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CUR-01 | `TB_Curso` com as 6 colunas e PK gerada | `src/lib/cursos/tabela-curso-migracao.integration.test.ts:289` - `colunas("TB_Curso")).toEqual([6 colunas])`; `:272` - `toBeGreaterThan(Math.max(...cursos))` | ✅ PASS |
| CUR-02 | FK de pré, pós e avaliação para `TB_Curso` | `tabela-curso-migracao...:314-324` - `REFERENTIAL_CONSTRAINTS` `toEqual` nas 3 FKs | ✅ PASS |
| CUR-03 | 5 colunas fora do pré, 2 fora do pós | `tabela-curso-migracao...:297-302` - `not.toContain(coluna)` | ✅ PASS |
| CUR-04 | Status e datas da etapa ficam na etapa | `tabela-curso-migracao...:304-307` - `arrayContaining` | ✅ PASS |
| CUR-05 | Curso, pré e pós numa transação, com o mesmo `CD_Curso` | `src/lib/cursos/curso.integration.test.ts:85-99` - `toEqual({... preCurso: cdCurso, posCurso: cdCurso})` via `POST /api/cursos` | ✅ PASS |
| CUR-06 | Falha em qualquer passo: nenhuma linha nas três tabelas | `curso.integration.test.ts:137-138` - `status 500`; `contar()).toEqual({ cursos: 0, preCursos: 0, posCursos: 0 })` | ✅ PASS |
| CUR-07 | Apagar o curso apaga o pré e o pós | `curso.integration.test.ts:147-148` - `count(...)).toBe(0)` | ✅ PASS |
| CUR-08 | Exclusão recusada, nada some | `curso.integration.test.ts:158` - `rejects.toMatchObject({ code: "P2003" })`; `:160-163` - 4 × `toBe(1)` | ✅ PASS |
| CUR-11 | Mesmos campos e nomes, lidos de `TB_Curso` | `src/lib/cursos/curso.test.ts:17-35` - `comCurso` `toEqual`; `curso.integration.test.ts:106-128` - corpo do `POST` com os campos e sem a chave `curso`; `e2e/pre-cursos.spec.ts:247` - `every(p => p.cdOfertante === CNPJ_GO)` | ✅ PASS |
| CUR-12 | Saldo = valor − soma de `VL_Curso_Alocado` dos cursos | `src/lib/verba/saldo.integration.test.ts:70-71` - `4000` e `6000`; `:63-64` - verba sem curso dá `10000` | ✅ PASS |
| CUR-13 | Comportamento mantido; a única mudança admitida é ler o mesmo valor esperado em `TB_Curso` | Unit 855/855 e integração 138/138 (Verifier); `git diff main...HEAD -- e2e` vazio; e2e 296/296 (autor). O GU-33 (`src/lib/usuarios/gestao.integration.test.ts:156-166`) espera o mesmo `novo`, agora em `curso.cdOfertante` e `curso.criadoPor`: é o caso admitido pelo novo texto (`spec.md:77`). | ✅ PASS |
| CUR-14 | Um curso por pré, com os 6 valores do pré | `tabela-curso-migracao...:241-245` - `toEqual` com código, ofertante, valor, criador e data; `:256-260` - verba | ✅ PASS |
| CUR-15 | `CD_Curso` novo maior que os migrados | `tabela-curso-migracao...:272` | ✅ PASS |
| CUR-16 | Contagem diferente **ou** qualquer valor diferente: aborta antes do contract, nomeando a conferência | `tabela-curso-migracao...:363-376` - `it.each` com 5 colunas, cada uma `rejects.toThrow(/cursos_divergentes/)` + colunas do pré e do pós iguais às de antes; `:379-389` - um curso a mais, só o ramo da contagem, `rejects.toThrow(/cursos_divergentes/)` | ✅ PASS |
| CUR-17 | Pós **ou** avaliação órfã: aborta antes do contract | `tabela-curso-migracao...:392-409` - `it.each` com pós e avaliação, cada um `rejects.toThrow(/cursos_orfaos/)` + colunas intactas | ✅ PASS |
| CUR-18 | Status, encerramentos e respostas inalterados | `tabela-curso-migracao...:278-284` - `toEqual(etapasAntes.*)` | ✅ PASS |
| CUR-19 | `bi.TB_Curso` com todas as colunas | `src/lib/respostas/views-bi.test.ts:34-41` | ✅ PASS |
| CUR-20 | Pré e pós no `bi` sem as colunas movidas | `views-bi.test.ts:45-57` | ✅ PASS |
| CUR-21 | 4 VIEWs passam no `CHECK TABLE` | `scripts/views-bi.sql:5-12`. Na iteração 1, o Verifier rodou `CHECK TABLE` no `bi` local: 4 × `status OK`. Nem as VIEWs nem a migration mudaram desde então. | ✅ PASS (verificação local, como a spec define) |
| CUR-22 | AD-052 com a divisão curso/etapa e o nome na P8 | `.specs/STATE.md:389`, `:393`, `:394` | ✅ PASS |
| CUR-23 | Backup, VIEWs logo depois, reversão de tentativa abortada | `docs/DEPLOY_PRODUCAO.md:357-393`; reversão provada em `tabela-curso-migracao...:329` (`/contract_ja_comecou/`) e pelas 8 reversões do bloco `conferência`, conferidas em `:412-416` | ✅ PASS |

**Status**: ✅ 21/21 ACs batem com o resultado que a spec define. Nenhum spec-precision gap aberto: o CUR-13 e o CUR-22 foram reescritos no T9.

### Pontos da iteração 1, revistos

- **(a) GU-33.** Coberto pelo novo texto do CUR-13. O valor esperado (`novo`) não mudou; só a tabela lida.
- **(b) `respostas_por_coluna` não precisa mais ser a última migration.** Continua coerente. É um teste de migration, fora da lista de comportamentos do CUR-13. A troca de `anteriores` é necessária para o estado antigo ser real.
- **(c) `cdOfertante` a mais no `PATCH` e no `encerrar` do pós.** Agora está registrado no `design.md:46` e na AD-052 (`.specs/STATE.md:396`). Só acrescenta um campo, e o CUR-11 continua satisfeito.

---

## Discrimination Sensor

Scratch: `git worktree` destacado em `14e3373`, com junction para o `node_modules`, `prisma generate` e `.env.test` copiado. Não reaproveitei os resultados do autor: rodei cada mutante de novo.

### Iteração 2

| # | File:line | Mutação | Resultado (`tabela-curso-migracao`, 16 testes) | Killed? |
| --- | --- | --- | --- | --- |
| M2b | `prisma/migrations/20261028120000_tabela_curso/migration.sql:57` | Comparação sem `Data_Criacao` | 6 falhas. A primeira é `× aborta com cursos_divergentes quando a data de criação…`; as seguintes caem em cascata, porque a migration chega ao contract. | ✅ Killed (era sobrevivente) |
| M9 | `migration.sql:60` | `cursos_orfaos` sem a parcela da avaliação | 2 falhas, no caso "uma avaliação" | ✅ Killed (era sobrevivente) |
| M10 | `migration.sql:46` | CHECK sem o ramo `cursos_esperados = cursos_gravados` | 4 falhas | ✅ Killed |
| M11 | `migration.sql:55` | Comparação sem `CD_Verba` | 7 falhas | ✅ Killed |
| M12 | `migration.sql:54` | Comparação sem `CD_Ofertante` | 8 falhas | ✅ Killed |
| M13 | `migration.sql:59` | `cursos_orfaos` sem a parcela do pós | 3 falhas | ✅ Killed |
| M14 | `reversao.sql:32` | Reversão deixa de apagar `TB_Curso` | 8 falhas | ✅ Killed |
| U3 | `src/lib/pos-curso/liberacao.ts:14` | `posCursoLiberado(null)` passa a liberar | 1 falha (`liberacao.test.ts`, caso `null`) | ✅ Killed |

### Iteração 1 (código de produção inalterado desde então)

| # | Mutação | Killed? |
| --- | --- | --- |
| U1 | `comCurso` sem `vlCursoAlocado` | ✅ |
| U2 | `bi.TB_Pre_Curso` volta a expor `CD_Ofertante` | ✅ |
| M1 | Backfill copia a data do pós, com a conferência desligada | ✅ |
| M2 | `cursos_diferentes = 0` → `>= 0` | ✅ |
| M3 / M3b | Cascata do pós trocada por restrict / restrict da avaliação trocado por cascata | ✅ / ✅ |
| M4 | Curso criado fora da transação | ✅ |
| M6 | Escopo por ofertante removido da listagem de pré-cursos (morto pelo e2e REQ-PC-14) | ✅ |
| M7 | Saldo soma as outras verbas | ✅ |
| M8 | Trava do `reversao.sql` sempre passa | ✅ |

Os testes da migration da iteração 1 que essas mutações exercitavam continuam no arquivo (`:236-331`).

**Sensor depth**: P0 expandido.
**Result**: iteração 2, 8/8 mortos; em conjunto, 18 mutações e 0 sobreviventes. PASS ✅

Resíduo aceito, de baixo risco: em `reversao.sql:14`, `= 6` → `>= 2` continuaria sobrevivendo, porque não há cenário de contract parcial com 1 a 5 FKs antigas. As colunas só caem depois de todas as FKs, então a reversão nesse estado não perde dado.

**Isolamento**: baseline `git status --porcelain` vazio. Depois da limpeza, o único arquivo alterado é este relatório. Há um só worktree registrado, a junction foi removida antes da pasta, o `node_modules` real está intacto e não sobrou nenhum `spma_migracao%`.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ A iteração 2 só mexe em testes e docs. |
| No scope creep | ✅ O `cdOfertante` a mais no pós está declarado. |
| Matches patterns | ✅ Padrão da AD-051 na migration; harness compartilhado. |
| Spec-anchored outcome check | ✅ Cada ramo enumerado no CUR-16 e no CUR-17 tem cenário próprio. |
| Per-layer Coverage Expectation | ✅ |
| Every test maps to a spec requirement | ✅ Os testes novos citam CUR-16, CUR-17, CUR-23 e CUR-08; `liberacao.test.ts` cita a AD-050 (edge case listado na iteração 1). |
| Documented guidelines followed | ✅ `AGENTS.md`; memória `feedback_test_scope` (nenhum e2e novo) |

Observação, sem gap: o helper `trocar` (`tabela-curso-migracao...:343-346`) lança erro se o trecho não existir na migration. Isso evita que um caso de corrupção passe sem ter corrompido nada.

---

## Edge Cases

- [x] Migration abortada deixa as colunas antigas intactas: cada caso do bloco `conferência` compara as colunas do pré e do pós com as de antes (`:372-373`, `:387`, `:405-406`).
- [x] Curso sem P8: o backfill não lê a P8 (`migration.sql:32-34`).
- [x] `posCursoLiberado(null)` continua fechado: `src/lib/pos-curso/liberacao.test.ts`, caso `null` (U3 morto).

---

## Gate Check

- **Gate command** (Build, `tasks.md`): `lint && typecheck && build && test:unit && test:integration && test:e2e`
- **lint**: exit 0 (0 erros, 45 warnings pré-existentes)
- **typecheck**: exit 0
- **build**: exit 0
- **test:unit**: 855 passed, 0 failed (41 arquivos)
- **db:test:reset + test:integration**: 138 passed, 0 failed (16 arquivos; 16 testes na migration)
- **test:e2e**: não rodado por inteiro pelo Verifier (instrução). Nenhum código de produção mudou desde o 296/296 do autor, nem desde o `e2e/pre-cursos.spec.ts` 9/9 da iteração 1.
- **Test count before feature** (derivado do diff): unit 848, integração 117
- **Test count after feature**: unit 855 (+7), integração 138 (+21)
- **Skipped / Failures**: nenhum

---

## Fix Plans

Nenhum pendente. Os Fix 1 a 4 da iteração 1 foram aplicados em T7, T8 e T9 e conferidos acima.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CUR-01 a CUR-08 | Implementing | ✅ Verified |
| CUR-11 a CUR-15 | Implementing | ✅ Verified |
| CUR-16, CUR-17 | ❌ Needs Fix (iteração 1) | ✅ Verified |
| CUR-18 a CUR-23 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/21 ACs batem com a spec; 0 spec-precision gaps
**Sensor**: iteração 2, 8/8 mortos; total da feature, 18/18
**Gate**: lint, typecheck e build verdes; unit 855/855; integração 138/138; e2e 296/296 (autor)

**What works**: criação transacional, cascata e restrict, saldo, escopo, contrato HTTP, backfill exato, `AUTO_INCREMENT`, cada ramo da autoconferência, reversão com trava, VIEWs do `bi` e schema sem drift.

**Issues found**: nenhum bloqueante. Resíduo aceito: a trava `>= 2` do `reversao.sql`, ver Sensor.

**Next steps**: interactive UAT não se aplica (mudança de modelo sem tela nova). Falta o deploy seguindo `docs/DEPLOY_PRODUCAO.md:357-393`: backup antes e `views-bi.sql` logo depois.
