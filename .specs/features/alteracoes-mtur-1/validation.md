# Alterações MTur (Documento 1) Validation

## Validation: alteracoes-mtur-1 - PASS ✅ (iteração 3/3)

**Date**: 2026-10-20
**Spec**: `.specs/features/alteracoes-mtur-1/spec.md`
**Diff range**: `main..feat/alteracoes-mtur-1` (commits 14a2ea2..111ca9a, 7 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

Veredito curto: o código atende as 18 ACs, e todas têm teste que bate com a spec. As três lacunas de teste das voltas anteriores (F1, F2, F3) foram fechadas. Tirar o filtro `Chave` de qualquer um dos 6 UPDATEs da migration agora derruba um teste.

---

## Histórico

| Iteração | Commit | Veredito | Lacunas |
| -------- | ------ | -------- | ------- |
| 1 | 33ab9a6 | reprovado | F1 (MTUR-12 sem Q29/Q35-Q38), F2 (M9: filtro `Chave` de PCD) |
| 2 | 92ba201 | reprovado | F3 (M14/M15: filtro `Chave` de "Alojamento" e "Serviços de Alimentação") |
| 3 | 111ca9a | aprovado | nenhuma |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | 14a2ea2 |
| T2 | ✅ Done | 724a88f |
| T3 | ✅ Done | 88b2a49 |
| T4 | ✅ Done | 154021e |
| T5 | ✅ Done | 33ab9a6 |
| Fix F1+F2 | ✅ Done | 92ba201 |
| Fix F3 | ✅ Done | 111ca9a |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| MTUR-01 rótulo Q7 | "7. Endereço onde a ação de qualificação é realizada" | `e2e/pre-cursos-formulario.spec.ts:171` - `expect(page.getByText("7. Endereço onde a ação de qualificação é realizada", { exact: true })).toBeVisible()` | ✅ PASS |
| MTUR-02 rótulo Q30 | "30. Quais estratégias foram adotadas para a divulgação do Curso?" | `e2e/pre-cursos-formulario.spec.ts:244` - `expect(page.getByText("30. Quais estratégias ...", { exact: true })).toBeVisible()` | ✅ PASS |
| MTUR-03 11 opções de `qualifCaracteristicas` | lista exata de 11, na ordem | `src/lib/validation/schemas/pre-curso.schema.test.ts:264` - `expect(OPCOES_CARACTERISTICAS).toEqual([... 11 textos ...])`; o schema usa a constante (`src/lib/validation/schemas/pre-curso.schema.ts:233`) | ✅ PASS |
| MTUR-04 4 textos antigos rejeitados | falha na validação de forma | `src/lib/validation/schemas/pre-curso.schema.test.ts:293` - `it.each([4 antigos])` + `expect(result.success).toBe(false)` | ✅ PASS |
| MTUR-05 raça/cor | Branco, Preto, Pardo, Amarelo, Indígena, nessa ordem | `src/lib/validation/schemas/dados-pessoais.schema.test.ts:51` - `expect(OPCOES_RACA_ETNIA).toEqual([...])` | ✅ PASS |
| MTUR-06 PCD | "Não sou uma Pessoa com Deficiência." e "Sim.", nessa ordem | `src/lib/validation/schemas/dados-pessoais.schema.test.ts:57` - `expect(OPCOES_CONDICAO_PCD).toEqual([...])`; aceite em `:84` | ✅ PASS |
| MTUR-07 "Negro" e os 4 "Sim, tenho deficiência …" rejeitados | falha na validação de forma | `src/lib/validation/schemas/dados-pessoais.schema.test.ts:67` e `:81` - `toBe(false)` | ✅ PASS |
| MTUR-08 4 blocos omitidos | nenhum dos 4 títulos renderizado | `e2e/avaliacoes-formulario.spec.ts:259` - `expect(page.getByText(titulo)).toHaveCount(0)`; `:251` - `bloco-parte2-6` `toHaveCount(0)` | ✅ PASS |
| MTUR-09 chave removida não vira linha | descarte silencioso | `src/lib/validation/schemas/avaliacao.schema.test.ts:105` - `expect(respostasAvaliacaoSchema.parse(corpo)).toEqual({ avalExpectRenda: "Alta" })`; `:93` - nenhuma das 11 no `shape`. A rota grava só `entrada.data` (`src/lib/api/requisicao.ts:35`) | ✅ PASS |
| MTUR-10 Parte 1 completa | 7 chaves + Q16 só quando Q15="Sim" | `src/lib/avaliacao/completude.test.ts:55`, `:68`, `:85`, `:94` | ✅ PASS |
| MTUR-11 encerramento com Q22="Sim" | 15 chaves + Q22 e Q23 | `src/lib/avaliacao/completude.test.ts:220` (`toHaveLength(17)` + completo), `:237` (`toEqual({ completo: false, pendentes: [chave] })`); `src/lib/avaliacao/condicionais.test.ts:13` | ✅ PASS |
| MTUR-12 numeração original | Q14-Q27, Q29, Q35-Q38 | `e2e/avaliacoes-formulario.spec.ts:264` (Q14), `:270` - `getByText("29. Após a conclusão do Curso, você sente que:", { exact: true })`, `:274` - `getByText("35. Qual nota ...", { exact: true })`, mais regex `^38\.` | ✅ PASS |
| MTUR-13 Q10 trocada sem mudar `Ordem` | 4 textos novos nas ordens 0-3 | `src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts:258` - `expect(q10).toEqual([{ ordem: 0, valor: "Hospedagem ..." }, ...])` | ✅ PASS |
| MTUR-14 "Negro"→"Preto", 4 PCD→"Sim." | valores exatos | `src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts:293` - `toBe("Preto")`; `:312` - `toBe("Sim.")` para 4 CPFs | ✅ PASS |
| MTUR-15 DELETE das 11 chaves, só delas | 0 linhas; demais intactas | `src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts:327` - chaves restantes `toEqual`; `:333` - `toBe(0)` | ✅ PASS |
| MTUR-16 `Parte1_Completa` | true só onde MTUR-10 vale | `src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts:352` (`true`), `:357` (`false`), `:366` (encerrada segue `true`) | ✅ PASS |
| MTUR-17 outra linha intacta; idempotência | intacta | `src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts:283`-`:288` (os 4 textos antigos de Q10 em chaves que não são Q10, todos `toBe(<texto antigo>)`), `:302`-`:303` ("Negro" e texto de PCD em `avalPessoalMunicipio`), `:404` (2ª execução `toEqual(antes)`) | ✅ PASS |
| MTUR-18 docs | textos novos nos questionários; pedido salvo | grep: `docs/Questionario_do_Gestor_Pre_Curso.md:21`, `:32`-`:41`, `:209`; `docs/Questionario_do_Aluno_1.md:43`, `:50`-`:51`; zero ocorrências de textos antigos e dos 4 títulos removidos | ✅ PASS |

**Status**: ✅ All ACs covered. 18/18 batem com a spec.

### Spec-precision gaps

- Nenhuma AC tem resultado vago.
- Os critérios de sucesso foram corrigidos em 92ba201 e 111ca9a. Agora citam a frase inteira, a Q26 e os comentários de histórico, e batem com o resultado real do grep.

---

## Edge Cases

- [x] Mesma opção antiga em duas linhas: `Ordem` preservada (`src/lib/respostas/alteracoes-mtur-migracao.integration.test.ts:258`).
- [x] Avaliação ENCERRADA perde as 11 chaves (`:327`-`:333`).
- [x] `Parte1_Completa = true` continua `true` (`:366`).
- [x] Idempotência (`:404`).

---

## Discrimination Sensor

Escopo P0 (migration de dados irreversível). Cada iteração rodou num `git worktree` novo, removido no fim: wt, wt2 e wt3, este último em 111ca9a. Nunca usei `git stash`. O `git status --porcelain` da árvore real ficou igual ao baseline antes e depois de cada rodada.

| Mutation | File:line | Description | Iter. 1 | Iter. 2 | Iter. 3 |
| -------- | --------- | ----------- | ------- | ------- | ------- |
| M1 | `src/lib/avaliacao/completude.ts:70` | Reinsere `avalEfetivEmprego` (schema + concluinte) | ✅ Killed | - | - |
| M2 | `src/lib/avaliacao/completude.ts:34` | Mantém `avalProfissFaixaRenda` (schema + Parte 1) | ✅ Killed | - | - |
| M3 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:30` | Tira filtro `Chave` do UPDATE de "Eventos" | ✅ Killed | ✅ Killed | ✅ Killed |
| M4 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:47` | Tira "deficiência visual" da lista `IN` | ✅ Killed | ✅ Killed | ✅ Killed |
| M5 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:94` | `= 7` → `>= 6` | ✅ Killed | - | ✅ Killed |
| M6 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:101` | Neutraliza `NOT EXISTS` Q15/Q16 | ✅ Killed | - | ✅ Killed |
| M7 | `src/lib/validation/schemas/dados-pessoais.schema.ts:50` | "Preto" → "Negro" | ✅ Killed | - | - |
| M8 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:66` | Tira uma chave do DELETE | ✅ Killed | - | ✅ Killed |
| M9 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:43` | Tira filtro `Chave` do UPDATE de PCD | ❌ Survived | ✅ Killed | ✅ Killed |
| M10 | `src/lib/validation/schemas/dados-pessoais.schema.ts:55` | PCD mantém texto antigo | ✅ Killed | - | - |
| M11 | `src/lib/validation/schemas/pre-curso.schema.ts:50` | "Eventos (…)" → "Eventos" | ✅ Killed | - | - |
| M12a | `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/AvaliacaoForm.tsx:259` | "29." → "28." | ❌ Survived (estático) | ✅ Killed (e2e `:271`) | - |
| M12b | `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/AvaliacaoForm.tsx:270` | "35." → "30." | - | ✅ Killed (e2e `:275`) | - |
| M13 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:25` | Tira filtro `Chave` do UPDATE de "Cultura e Lazer" | - | ✅ Killed | ✅ Killed |
| M14 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:15` | Tira filtro `Chave` do UPDATE de "Alojamento" | - | ❌ Survived | ✅ Killed |
| M15 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:20` | Tira filtro `Chave` do UPDATE de "Serviços de Alimentação" | - | ❌ Survived | ✅ Killed |
| M16 | `prisma/migrations/20261020120000_alteracoes_mtur_1/migration.sql:38` | Tira filtro `Chave` do UPDATE de "Negro" | - | - | ✅ Killed |

Na iteração 3 os 6 UPDATEs perderam o filtro `Chave`, um por vez (M3, M9, M13, M14, M15, M16), e todos derrubaram um teste. Também repeti M4, M5, M6 e M8 como amostra das já mortas.

**Sensor depth**: P0
**Sensor result**: iteração 3 com 10/10 killed; nenhuma mutação viva no estado final (17 mutações distintas no total).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ os fixes tocaram só testes e critérios da spec |
| No scope creep | ✅ os 6 pendentes intocados: nenhuma chave nova em `pre-curso.schema.ts` |
| Matches patterns | ✅ migration em SQL literal com teste que roda o próprio arquivo |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ cada UPDATE/DELETE com uma linha que não pode ser tocada |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md`, preferência do usuário por camada mais barata | ✅ |

---

## Gate Check

- **Iteração 3** (arquivo tocado: só o teste de integração): `eslint` no arquivo exit 0 (1 warning `_omitida`, padrão existente); `npm run typecheck` exit 0; `npm run test:unit` 852 passed, 0 failed; `npm run test:integration` 139 passed, 0 failed (16 arquivos).
- **Iteração 2** (92ba201): `e2e/avaliacoes-formulario.spec.ts` 10/10 (`test-results/.last-run.json`: `passed`, `failedTests: []`).
- **Iteração 1** (33ab9a6): `npm run lint` e `npm run build` exit 0; os 5 arquivos e2e do escopo 46/46. O autor rodou a suíte e2e completa (292/293; a falha `cursos-novo.spec.ts:117` passou isolada, tela não tocada).
- **Test count before feature** (main 377162f): unit 827, integration 124
- **Test count after**: unit 852, integration 139 (+25, +15). Os testes removidos testavam só as chaves removidas.
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| MTUR-01 a MTUR-18 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 ACs batem com a spec; 0 spec-precision gaps.
**Sensor**: iteração 3 10/10 killed; nenhum mutante vivo
**Gate**: unit 852, integration 139, lint/typecheck ok (build e e2e conferidos nas iterações 1 e 2)

**What works**: textos novos do pré-curso e dos dados pessoais, schema/completude/tela do aluno sem as 11 chaves, migration completa e idempotente, docs.

**Next steps**: atualizar a traceability em `spec.md` para Verified. Push, deploy e aplicação da migration em produção continuam exigindo go-ahead explícito do usuário (Out of Scope da spec).

---

## Lessons distilled

- Iteração 1: L-030 (ac_gap, MTUR-12) promovida a `confirmed`; L-049 (surviving_mutant, M9); L-050 (spec_precision_gap, critério de sucesso).
- Iteração 2: M14/M15 repetem L-049 na mesma feature. Sem lição nova.
- Iteração 3: aprovado sem sinal novo. Nada a registrar.
