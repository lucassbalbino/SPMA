# Tabela de Curso Validation

**Date**: 2026-10-28
**Spec**: `.specs/features/tabela-curso/spec.md`
**Diff range**: `main...feat/tabela-curso` (aeb5dbf..cf0eb3e, 8 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: FAIL ❌

O código está correto em tudo o que conferi. O veredito é FAIL porque dois mutantes sobreviveram na autoconferência da migration (CUR-16 e CUR-17): os testes provocam só um dos ramos de cada `CHECK`. Os dois consertos são só de teste, num caminho crítico (migração de dado de produção).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `comCurso`/`incluirCurso` com teste unitário; nenhum acesso aos campos antigos fora de `Curso` (typecheck e build verdes). |
| T2 | ✅ Done | `prisma migrate diff` do `spma_test` migrado contra o schema = "This is an empty migration." (reproduzido pelo Verifier). |
| T3 | ✅ Done | `src/lib/cursos/curso.integration.test.ts`, 5 testes. |
| T4 | ✅ Done | `CHECK TABLE` OK nas 4 VIEWs no `bi` local (reproduzido pelo Verifier). |
| T5 | ✅ Done (pelo autor) | `git diff main...HEAD -- e2e` vazio. Suíte completa não rodada pelo Verifier, por instrução. `e2e/pre-cursos.spec.ts` rodado no worktree: 9 de 9. |
| T6 | ✅ Done | AD-052 e seção de deploy presentes. |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CUR-01 | `TB_Curso` com `CD_Curso` (PK gerada), `CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Criado_Por`, `Data_Criacao` | `src/lib/cursos/tabela-curso-migracao.integration.test.ts:289` - `expect(await colunas("TB_Curso")).toEqual(["CD_Curso","CD_Ofertante","CD_Verba","VL_Curso_Alocado","Data_Criacao","Criado_Por"])`; PK gerada: `:272` - `expect(Number(cd)).toBeGreaterThan(Math.max(...cursos))` após INSERT sem `CD_Curso` | ✅ PASS |
| CUR-02 | FK de pré, pós e avaliação para `TB_Curso.CD_Curso` | `tabela-curso-migracao.integration.test.ts:314-324` - `information_schema.REFERENTIAL_CONSTRAINTS` `toEqual` nas 3 linhas com `referencia: "TB_Curso"` | ✅ PASS |
| CUR-03 | Colunas removidas do pré (5) e do pós (2) | `tabela-curso-migracao.integration.test.ts:297-302` - `expect(await colunas("TB_Pre_Curso")).not.toContain(coluna)` / `TB_Pos_Curso` | ✅ PASS |
| CUR-04 | `Status`/`Data_Encerramento` nas duas etapas; `Data_Ultima_Atualizacao` no pós | `tabela-curso-migracao.integration.test.ts:304-307` - `toEqual(expect.arrayContaining([...]))` | ✅ PASS |
| CUR-05 | Uma transação grava curso, pré e pós com o mesmo `CD_Curso` | `src/lib/cursos/curso.integration.test.ts:85-99` - `toEqual({cdOfertante, cdVerba, vlCursoAlocado: 1250.75, criadoPor, preCurso: cdCurso, posCurso: cdCurso})` via `POST /api/cursos` real | ✅ PASS |
| CUR-06 | Falha em qualquer passo: nenhuma linha nas três tabelas | `curso.integration.test.ts:137-138` - `expect(res.status).toBe(500)`; `expect(await contar()).toEqual({ cursos: 0, preCursos: 0, posCursos: 0 })`. Falha injetada no último passo dentro da transação. | ✅ PASS |
| CUR-07 | Apagar o curso apaga o pré e o pós | `curso.integration.test.ts:147-148` - `count(...)).toBe(0)` para pré e pós; FK `CASCADE` em `tabela-curso-migracao...:322-323` | ✅ PASS |
| CUR-08 | Curso com avaliação: exclusão recusada, nada some | `curso.integration.test.ts:157-162` - `rejects.toThrow()` + 4 × `toBe(1)`; FK `RESTRICT` em `tabela-curso-migracao...:321` | ✅ PASS (o `toThrow()` é genérico, ver gap 6) |
| CUR-11 | Rotas devolvem `cdOfertante`, `cdVerba`, `vlCursoAlocado`, `criadoPor`, `dataCriacao` com os mesmos nomes, lidos de `TB_Curso` | `src/lib/cursos/curso.test.ts:17-25` e `:29-35` - `comCurso(...)` `toEqual` com os 5 campos (pré) e os 3 (pós); `curso.integration.test.ts:106-128` - corpo de `POST /api/cursos` `objectContaining` com os campos e sem a chave `curso`; `e2e/pre-cursos.spec.ts:247` - `every(p => p.cdOfertante === CNPJ_GO)` na listagem | ✅ PASS |
| CUR-12 | Saldo = valor da verba − soma de `VL_Curso_Alocado` dos cursos | `src/lib/verba/saldo.integration.test.ts:70-71` - `totalAlocado 4000`, `saldoDisponivel 6000` com o curso gravado em `TB_Curso`; `:63-64` - verba sem curso = 10000 | ✅ PASS |
| CUR-13 | Comportamento de criação, saldo, escopo, formulários, encerramento e autorização mantido, "sem alteração de asserção" | Unit 853/853, integração 131/131 (Verifier); `git diff main...HEAD -- e2e` vazio; e2e 296/296 (autor). Asserções mudadas: `src/lib/usuarios/gestao.integration.test.ts:156-166` (GU-33) e `src/lib/respostas/respostas-por-coluna-migracao.integration.test.ts:296-297` | ⚠️ Spec-precision gap (ver abaixo) |
| CUR-14 | Um curso por pré, com os mesmos 6 valores | `tabela-curso-migracao.integration.test.ts:241-245` - `toEqual` das 3 linhas com código, ofertante, valor, criador e data exatos; `:256-260` - verba de origem | ✅ PASS |
| CUR-15 | `CD_Curso` novo maior que todos os migrados | `tabela-curso-migracao.integration.test.ts:272` - `toBeGreaterThan(Math.max(...cursos))` | ✅ PASS |
| CUR-16 | Contagem diferente **ou** algum valor diferente: aborta antes do contract, com erro que nomeia a conferência | `tabela-curso-migracao.integration.test.ts:340-349` - `rejects.toThrow(/cursos_divergentes/)` + pré intacto | ❌ GAP parcial: só o valor `VL_Curso_Alocado` é provocado. O mutante M2b (tirar `Data_Criacao` da comparação) sobreviveu, e o ramo da contagem nunca é provocado. |
| CUR-17 | Pós **ou** avaliação órfã: aborta antes do contract | `tabela-curso-migracao.integration.test.ts:366-368` - `rejects.toThrow(/cursos_orfaos/)` + colunas antigas presentes | ❌ GAP parcial: só o pós órfão é provocado. O mutante M9 (tirar a avaliação da contagem) sobreviveu. |
| CUR-18 | Status, datas de encerramento e respostas inalterados | `tabela-curso-migracao.integration.test.ts:278-284` - `toEqual(etapasAntes.*)` no pré, no pós e na avaliação | ✅ PASS |
| CUR-19 | `bi.TB_Curso` com todas as colunas de `TB_Curso` | `src/lib/respostas/views-bi.test.ts:34-41` - `viewDe("TB_Curso")).toEqual([...6 colunas])` | ✅ PASS |
| CUR-20 | `bi.TB_Pre_Curso`/`bi.TB_Pos_Curso` sem as colunas movidas | `views-bi.test.ts:45-57` - `not.toContain(coluna)` + prefixo exato das colunas fixas | ✅ PASS |
| CUR-21 | As 4 VIEWs passam no `CHECK TABLE` após a migration | `scripts/views-bi.sql:5-12` (VIEW nova). O Verifier rodou `CHECK TABLE bi.TB_Curso, bi.TB_Pre_Curso, bi.TB_Pos_Curso, bi.TB_Avaliacao_Aluno` no `bi` local, com o `spma` em `20261028120000_tabela_curso`: 4 × `status OK`. Colunas de `bi.TB_Curso` lidas do `information_schema` iguais às do arquivo. | ✅ PASS (verificação local, como a spec define) |
| CUR-22 | AD-052 com a divisão curso/etapa e a decisão do nome | `.specs/STATE.md:389`, `:393` (divisão), `:394` (nome fica na P8) | ✅ PASS (texto da spec desatualizado, ver gap 5) |
| CUR-23 | Deploy: backup antes, `views-bi.sql` logo depois, reversão de migration abortada | `docs/DEPLOY_PRODUCAO.md:357-393` (`:366` backup, `:369` VIEWs, `:384` reversão + `migrate resolve`); reversão provada em `tabela-curso-migracao...:329` (`rejects.toThrow(/contract_ja_comecou/)`) e `:370-373` (desfaz a tentativa abortada) | ✅ PASS |

**Status**: ❌ 2 gaps parciais (CUR-16, CUR-17) · ⚠️ 1 spec-precision gap (CUR-13). 18 de 21 ACs sem ressalva.

### Os três pontos pedidos

**(a) Testes que passaram a ler em `curso` (GU-33, `gestao.integration.test.ts:156-166`).** Antes eram 3 asserções sobre `preCurso` e `posCurso`: `preCurso.cdOfertante`, `preCurso.criadoPor` e `posCurso.criadoPor`. Agora são 2 sobre `curso`. A que lia `posCurso.criadoPor` saiu, porque a coluna deixou de existir por força do CUR-03. A propriedade testada continua inteira: o documento novo propaga, e nenhuma linha guarda o antigo, em nenhuma tabela que ainda tenha a coluna. Nenhum valor esperado foi afrouxado. A mudança é coerente com a *intenção* do CUR-13, mas viola a letra do "sem alteração de asserção", que entra em conflito direto com o CUR-03. Fica registrado como spec-precision gap, não como regressão. Os demais testes de integração (consulta, saldo, cruzamento, repositório) mudaram só na preparação e na limpeza dos dados, sem tocar nas asserções.

**(b) `respostas_por_coluna` deixou de exigir ser a última.** A asserção antiga (`pastas.at(-1)).toBe(nova)`) era temporal: toda migration nova a quebraria. A troca de `anteriores` por `pastas.slice(0, indexOf(nova))` é *necessária*. Com o filtro antigo, o "estado antigo" aplicaria a `tabela_curso` sem a `respostas_por_coluna` e montaria um banco impossível. A nova asserção (`:297`, uma única pasta `*_respostas_por_coluna`) mantém a parte que tem valor. É coerente, e nenhuma cobertura de comportamento se perdeu.

**(c) `cdOfertante` a mais no PATCH e no encerrar do pós** (`src/app/api/pos-cursos/[cdCurso]/route.ts:92`, `.../encerrar/route.ts:62`). Antes, essas duas respostas traziam `criadoPor` e `dataCriacao`, mas não `cdOfertante`. A mudança só acrescenta um campo: o CUR-11 ("os campos que já devolvia") continua satisfeito, e nenhum consumidor quebra (o e2e passou). Mesmo assim, é uma mudança de contrato não declarada, e o `design.md` ("os campos que já expunha") vale para o GET e a listagem, não para estas duas rotas. É Minor: sugiro registrar no `design.md` ou na AD-052, não reverter.

---

## Discrimination Sensor

Scratch: `git worktree` destacado em `cf0eb3e`, com junction para o `node_modules`, `prisma generate` e `.env.test` copiado. E2E com `next dev --webpack` e `E2E_REUSE_SERVER=1`.

| # | File:line | Mutação | Testes rodados | Killed? |
| --- | --- | --- | --- | --- |
| U1 | `src/lib/cursos/curso.ts:38-40` | `comCurso` deixa de achatar `vlCursoAlocado` | `curso.test.ts` | ✅ Killed (1 falha) |
| U2 | `src/lib/respostas/views-bi.ts:21` + `scripts/views-bi.sql` regenerado | `bi.TB_Pre_Curso` volta a expor `CD_Ofertante` | `views-bi.test.ts` | ✅ Killed (CUR-20) |
| M1 | `migration.sql:32-34` + `:46` | Backfill copia `Data_Criacao` do **pós** (COALESCE com o pré) **e** `cursos_divergentes` desligado (`CHECK (1 = 1)`), para provar o CUR-14 sozinho | `tabela-curso-migracao` | ✅ Killed (CUR-14) |
| M2 | `migration.sql:46` | CHECK afrouxado: `cursos_diferentes = 0` → `>= 0` | `tabela-curso-migracao` | ✅ Killed (CUR-16) |
| M2b | `migration.sql:57` | Comparação da conferência sem `Data_Criacao` | `tabela-curso-migracao` | ❌ **Survived** (9/9) |
| M3 | `migration.sql:121` | Pós: `ON DELETE CASCADE` → `RESTRICT` | `tabela-curso-migracao` | ✅ Killed (CUR-02) |
| M3b | `migration.sql:124` | Avaliação: `RESTRICT` → `CASCADE` | `tabela-curso-migracao` | ✅ Killed (CUR-02) |
| M4 | `src/app/api/cursos/route.ts:63` | `tx.curso.create` → `prisma.curso.create` (curso fora da transação) | `curso.integration.test.ts` | ✅ Killed (CUR-06) |
| M6 | `src/app/api/pre-cursos/route.ts:35` | Escopo por ofertante da listagem: `({ curso: { cdOfertante } })` → `({})` | `e2e/pre-cursos.spec.ts` | ✅ Killed (`:235` REQ-PC-14); sem a mutação, 9/9 |
| M7 | `src/lib/verba/saldo.ts:18` | Saldo soma os cursos das **outras** verbas (`cdVerba: { not: cdVerba }`) | `saldo` + `verba/consulta` | ✅ Killed (6 falhas) |
| M8 | `reversao.sql:14` | Trava sempre passa: `= 6` → `>= 0` | `tabela-curso-migracao` | ✅ Killed (CUR-23) |
| M9 | `migration.sql:60` | `cursos_orfaos` deixa de contar a avaliação órfã | `tabela-curso-migracao` | ❌ **Survived** (9/9) |

**Sensor depth**: P0 expandido (12 mutações de comportamento).
**Result**: 10/12 killed. FAIL ❌

Não injetado, mas observado na leitura:
- O ramo de contagem `cursos_esperados = cursos_gravados` (`migration.sql:46`) nunca é provocado. Uma linha a menos já cai em `cursos_diferentes` pelo `LEFT JOIN`, mas uma linha *a mais* em `TB_Curso` só a contagem pega.
- Em `reversao.sql:14`, trocar `= 6` por `>= 2` também sobreviveria. Os cenários testados só têm 0 ou 6 FKs antigas, e um contract parcial (de 1 a 5 FKs) não é exercitado. O risco é baixo: as colunas só caem depois de todas as FKs.

**Isolamento**: baseline `git status --porcelain` vazio. Depois da limpeza, o único arquivo novo é este relatório. Houve um só worktree registrado, e a junction foi removida antes da pasta, com o `node_modules` real intacto. Nenhum banco descartável sobrou (`spma_migracao_curso` ausente) e a porta 3000 está livre.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ `curso.ts` concentra a tradução em 42 linhas |
| Surgical changes | ✅ só o necessário. Nas páginas, `include` explícito em vez de `incluirCurso`, o que é aceitável porque elas não devolvem JSON. |
| No scope creep | ⚠️ `cdOfertante` a mais no PATCH e no encerrar do pós (ponto c) |
| Matches patterns | ✅ migration no padrão da AD-051 (expand → backfill → CHECK nomeado → contract); harness copiado |
| Spec-anchored outcome check | ⚠️ CUR-16 e CUR-17 só provocam um dos ramos que a spec enumera |
| Per-layer Coverage Expectation | ✅ unit para `comCurso`; integração para persistência e migration; e2e existente para as rotas |
| Every test maps to a spec requirement | ✅ todo teste novo cita o CUR correspondente |
| Documented guidelines followed | ✅ `AGENTS.md` (nenhum `.tsx` com cor literal; navegação intocada) e memória `feedback_test_scope` (nenhum e2e novo) |

---

## Edge Cases

- [x] Migration abortada deixa as colunas antigas intactas: `tabela-curso-migracao...:349` (valores do pré iguais) e `:367-368` (colunas presentes).
- [x] Curso sem P8 respondida existe em `TB_Curso`: o backfill não lê P8, e o curso 3 do cenário tem P8 preenchida, mas a regra não depende dela (`migration.sql:32-34`). Não há teste explícito com P8 nula. Basta a leitura, porque o nome não entra no `SELECT`.
- [ ] `posCursoLiberado(null)` (`src/lib/pos-curso/liberacao.ts:14`, ramo novo): sem teste. Só acontece com dado inconsistente, e nenhum AC cobre esse caso (Minor).

---

## Gate Check

- **Gate command** (Build, `tasks.md`): `lint && typecheck && build && test:unit && test:integration && test:e2e`
- **lint**: exit 0 (0 erros, 45 warnings pré-existentes de `_omitido`)
- **typecheck**: exit 0
- **build**: exit 0
- **test:unit**: 853 passed, 0 failed (40 arquivos)
- **db:test:reset + test:integration**: 131 passed, 0 failed (16 arquivos)
- **test:e2e**: não rodado por inteiro pelo Verifier (instrução). Valem o 296/296 do autor, o `e2e/` sem diff e `e2e/pre-cursos.spec.ts` 9/9 no worktree.
- **Test count before feature** (derivado do diff, sem testes removidos): unit 848, integração 117
- **Test count after feature**: unit 853 (+5: `curso.test.ts` 3, `views-bi.test.ts` 2) e integração 131 (+14: `curso.integration` 5, `tabela-curso-migracao` 9)
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Extra**: `prisma migrate diff` do `spma_test` contra `prisma/schema.prisma` = "This is an empty migration."

---

## Fix Plans

### Fix 1: provocar a avaliação órfã no CUR-17 (Major)

- **Root cause**: `tabela-curso-migracao.integration.test.ts:354-374` só semeia um **pós** órfão. A parcela da avaliação em `migration.sql:60` pode sumir sem nenhum teste falhar (M9).
- **Fix task**: acrescentar um cenário (ou `it.each` sobre `["TB_Pos_Curso", "TB_Avaliacao_Aluno"]`) que insere, com `FOREIGN_KEY_CHECKS = 0`, uma `TB_Avaliacao_Aluno` com `CD_Curso` inexistente e espera `rejects.toThrow(/cursos_orfaos/)` com as colunas antigas presentes.
- **Done when**: M9 morto.
- **Priority**: Major

### Fix 2: provocar cada campo e a contagem no CUR-16 (Major)

- **Root cause**: o teste `:336-350` só altera `VL_Curso_Alocado` no backfill. Tirar qualquer outro campo da comparação (`migration.sql:54-58`) ou o ramo da contagem (`:46`) não é detectado (M2b).
- **Fix task**: parametrizar o cenário de divergência por coluna (`CD_Ofertante`, `CD_Verba`, `VL_Curso_Alocado`, `Data_Criacao`, `Criado_Por`), cada um com um `alterar` que corrompe só aquele campo, mais um cenário de contagem, por exemplo um `alterar` que acrescenta ao backfill uma linha extra de `TB_Curso` com código fora do pré. Todos esperam `/cursos_divergentes/`.
- **Done when**: M2b morto, e também o mutante "sem `cursos_esperados = cursos_gravados`".
- **Priority**: Major

### Fix 3: precisão do CUR-13 e do CUR-22 na spec (Minor)

- **Root cause**: o "sem alteração de asserção" do CUR-13 não prevê asserções sobre colunas que o CUR-03 remove. O CUR-22 ainda fala em "cópia do nome", decisão que foi revista (o nome fica só na P8).
- **Fix task**: reescrever o CUR-13 como "…sem alteração de asserção, exceto as que leem colunas removidas pelo CUR-03, que passam a ler o mesmo valor em `TB_Curso`"; trocar "a cópia do nome" por "a decisão sobre o nome do curso" no CUR-22.
- **Priority**: Minor

### Fix 4: declarar o `cdOfertante` a mais no PATCH e no encerrar do pós (Minor)

- **Fix task**: uma linha no `design.md` ou na AD-052 dizendo que essas respostas passam a trazer `cdOfertante`, como o GET já trazia.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CUR-01 a CUR-08 | Implementing | ✅ Verified |
| CUR-11, CUR-12 | Implementing | ✅ Verified |
| CUR-13 | Implementing | ⚠️ Verified com spec-precision gap |
| CUR-14, CUR-15 | Implementing | ✅ Verified |
| CUR-16 | Implementing | ❌ Needs Fix (teste) |
| CUR-17 | Implementing | ❌ Needs Fix (teste) |
| CUR-18 a CUR-23 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready. Faltam dois reforços de teste num caminho P0; o código não precisa de mudança.

**Spec-anchored check**: 18/21 ACs sem ressalva; 2 gaps parciais (CUR-16, CUR-17); 1 spec-precision gap (CUR-13)
**Sensor**: 10/12 mutações mortas (M2b e M9 sobreviveram)
**Gate**: lint, typecheck e build verdes; unit 853/853; integração 131/131; e2e 296/296 (autor) e pre-cursos 9/9 (Verifier)

**What works**: criação transacional, cascata e restrict, saldo, escopo, contrato HTTP, backfill exato, `AUTO_INCREMENT`, trava da reversão, VIEWs do `bi` e schema sem drift.

**Issues found**: autoconferência da migration testada em um só ramo de cada `CHECK` (Fix 1 e Fix 2); texto do CUR-13 e do CUR-22 (Fix 3); campo a mais não declarado no pós (Fix 4).

**Next steps**: o implementer aplica o Fix 1 e o Fix 2, e depois o Verifier roda de novo, com M2b e M9 como critério.
