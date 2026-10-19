# Identificação da Verba Validation

**Result**: PASS

**Date**: 2026-10-19
**Spec**: `.specs/features/identificacao-verba/spec.md`
**Diff range**: `af52259..42a5f06` (3 commits: `ee33d7a`, `4b90526`, `42a5f06`)
**Verifier**: passada standalone (fallback de `validate.md`). O sub-agente Verifier independente não foi disparado nesta sessão, então autor e verificador são o mesmo. A discriminação foi provada empiricamente pelo sensor abaixo, não por leitura.

---

## Task Completion

Escopo Medium, plano inline de 3 passos (sem `tasks.md`).

| Passo | Commit | Status |
| --- | --- | --- |
| 1. Banco (coluna + backfill), Zod, `POST`/`PATCH`/`GET` | `ee33d7a` | ✅ Done |
| 2. Tela `/verbas`: formulário, edição em linha, lista | `4b90526` | ✅ Done |
| 3. Seletor de `/cursos/novo` | `42a5f06` | ✅ Done |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| IDV-01 | Campo "Identificação" entre GO e Valor, `maxlength` 60 | `src/app/(protegido)/verbas/NovaVerbaForm.test.ts:52` - `expect(identificacao).toBeGreaterThan(go)` / `expect(valor).toBeGreaterThan(identificacao)`; `NovaVerbaForm.test.ts:58` - `toMatch(/…id="dsVerba"…maxLength="60"/)`; `e2e/verbas-page.spec.ts:189` - `getByLabel("Identificação")).toBeVisible()` | ✅ PASS |
| IDV-02 | Grava `dsVerba` sem espaços das pontas | `src/lib/validation/schemas/verba.schema.test.ts:154` - `.toBe("Capacitação 2026")`; `e2e/verbas.spec.ts:259` - `getVerba(...)?.dsVerba).toBe("Repasse Março")`; `e2e/verbas-page.spec.ts:210` - `nova.dsVerba).toBe("Repasse Maio")` | ✅ PASS |
| IDV-03 | Vazia/só espaços: "Identificação é obrigatória", nada criado | `verba.schema.test.ts:159` - `toEqual(["Identificação é obrigatória"])` para `undefined`, `""`, `"   "`; `e2e/verbas.spec.ts:288` - status 400 + `erro` igual à mensagem, `toHaveLength(quantidadeAntes)`; `e2e/verbas-page.spec.ts:168` - mensagem visível na tela | ✅ PASS |
| IDV-04 | >60: 400 + "Identificação deve ter no máximo 60 caracteres", nada criado | `verba.schema.test.ts:166`; `e2e/verbas.spec.ts:281` + `:288` (400, mensagem, contagem inalterada) | ✅ PASS |
| IDV-05 | Mesma identificação cria a verba nova e mantém as duas | `e2e/verbas.spec.ts:258` - `cdVerbas[0]).not.toBe(cdVerbas[1])`, `:259-260` ambas com `"Repasse Março"` | ✅ PASS |
| IDV-06 | Edição abre com o valor atual | `e2e/verbas-page.spec.ts:299` - `campo).toHaveValue("Verba E original")` | ✅ PASS |
| IDV-07 | Salva sem espaços e exibe sem recarregar | `e2e/verbas-id.spec.ts:217` - `.toBe("Repasse Março")` (entrada `" Repasse Março "`); `e2e/verbas-page.spec.ts:310` - `toContainText(\`#${cdVerbaE} · Repasse Março\`)`, `:312` banco | ✅ PASS |
| IDV-08 | Edição inválida: mesmas mensagens, verba inalterada | `verba.schema.test.ts:177-179`; `e2e/verbas-id.spec.ts:232-234` (400, mensagem, `dsVerba` inalterado); `e2e/verbas-page.spec.ts:304-305` | ✅ PASS |
| IDV-09 | Linha mostra `#<cdVerba>` e identificação para quem lê | `e2e/verbas-page.spec.ts:105` (GO) - `toContainText(\`#${cdVerbaA} · Capacitação A\`)`; `:218` (AM) | ✅ PASS |
| IDV-10 | Backfill "Verba #<cdVerba>", demais campos intactos | `src/lib/verba/identificacao-migracao.integration.test.ts:79-80` - `toBe(\`Verba #${cdSemNomeA}\`)`; `:88-90` - `cdOfertante`, `vlVerba "1500.5"`, `dtVerba 2026-03-15` | ✅ PASS |
| IDV-11 | GET devolve o campo; só AM/GT gravam | `e2e/verbas.spec.ts:267` (lista) e `e2e/verbas-id.spec.ts:222` (por id) - `dsVerba).toBe("Repasse Março")`; 403 de GO na escrita: `e2e/verbas.spec.ts:118`, `e2e/verbas-id.spec.ts:201` (payloads já com `dsVerba`) | ✅ PASS |
| IDV-12 | AM: "<GO> — #<cdVerba> · <identificação> — saldo R$ X" | `e2e/cursos-novo.spec.ts:109-110` - `toHaveText(\`Ofertante Novo Pré-Curso — #${cdVerba} · Capacitação GO — saldo R$ 1000.00\`)` (texto exato) | ✅ PASS |
| IDV-13 | GO: "#<cdVerba> · <identificação> — saldo R$ X" | `e2e/cursos-novo.spec.ts:96-97` - `toHaveText(\`#${cdVerba} · Capacitação GO — saldo R$ 1000.00\`)` | ✅ PASS |
| IDV-14 | `cdVerba` não muda; cursos seguem na mesma verba | `identificacao-migracao.integration.test.ts:76-80` - a verba é achada pelo `cdVerba` de antes do UPDATE e já com o rótulo novo. A ligação do curso é a FK `CD_Verba`, que o UPDATE não toca (`prisma/migrations/20261019120000_identificacao_verba/migration.sql:10`) | ✅ PASS (ligação curso→verba provada pela PK, sem teste dedicado com curso) |

**Status**: ✅ 14/14 ACs com evidência; nenhum spec-precision gap.

---

## Discrimination Sensor

Worktree temporário (`git worktree add --detach`), descartado ao fim. `git status --porcelain` vazio antes e depois.

| # | File:line | Mutação | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/validation/schemas/verba.schema.ts:25` | Limite 60 → 61 | ✅ Killed (2 testes) |
| 2 | `src/lib/validation/schemas/verba.schema.ts:30` | Remove `.trim()` | ✅ Killed (4 testes) |
| 3 | `prisma/migrations/20261019120000_identificacao_verba/migration.sql:10` | `'Verba #'` → `'Verba '` | ✅ Killed |
| 4 | `prisma/migrations/20261019120000_identificacao_verba/migration.sql:10` | Remove `WHERE DS_Verba = ''` (sobrescreve todas) | ✅ Killed |

**Sensor depth**: lightweight. **Result**: 4/4 killed - PASS.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ Fora da feature, só os `create` de teste/seed/fixture ganharam `dsVerba` (exigido pela coluna NOT NULL) |
| No scope creep | ✅ |
| Matches patterns | ✅ Teste de migration lê o SQL do arquivo, como `respostas/backfill` |
| Asserted values match spec | ✅ |
| Every test maps to a requirement | ✅ |
| Guidelines followed | ✅ `feedback_test_scope` (testes enxutos: asserções IDV dobradas nos e2e já existentes; só 2 testes e2e de UI e 3 de API novos) |

Testes existentes alterados sem enfraquecer: os payloads ganharam `dsVerba` (campo novo obrigatório), e `GV-03/04/05` preenche a identificação antes de verificar a mensagem de valor. Nenhuma asserção foi removida.

---

## Edge Cases

- [x] Exatamente 60 caracteres aceito: `verba.schema.test.ts:172`
- [x] 60 caracteres com espaços nas pontas aceito sem os espaços: `verba.schema.test.ts:173`
- [x] `POST` sem `dsVerba` é 400 "Identificação é obrigatória": `e2e/verbas.spec.ts:279`

---

## Gate Check

- **Comandos**: `tsc --noEmit`, `eslint` (arquivos alterados), `npm run test:unit`, `npm run build`, `npm run test:integration`, `npx playwright test`
- **Typecheck/lint/build**: ok (0 erros de lint nos arquivos alterados)
- **Unit**: 827 passed (antes: 819; +8)
- **Integration**: 124 passed (+3, novo arquivo de migration)
- **E2E (suíte inteira)**: 290 passed, 2 failed na primeira rodada:
  - `e2e/login.spec.ts:307` - `read ECONNRESET` do dev server sob carga; não toca verba.
  - `e2e/cursos-novo.spec.ts:117` - timeout de 5s no redirect para `/pre-cursos/[id]` (rota compilada sob demanda pelo dev server).
  - Os dois arquivos re-rodados isolados: 19/19 passed. Classificados como intermitentes.
- **Skipped**: nenhum

---

## Requirement Traceability Update

IDV-01..IDV-14: Implementing → ✅ Verified.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 ACs batem com o resultado definido na spec
**Sensor**: 4/4 mutações mortas
**Gate**: verde, com 2 falhas intermitentes de dev server que passaram ao re-rodar

**Achado fora do escopo (não corrigido)**: depois de escolher uma verba em `/cursos/novo`, o gatilho do Select mostra o valor cru (ex.: "8") em vez do rótulo. O `SelectValue` sem `items` exibe o `value`. Vem de antes desta feature, que só muda o texto das opções da lista.

**Next steps**: rodar o Verifier independente (sub-agente) se quiser a separação autor ≠ verificador.
