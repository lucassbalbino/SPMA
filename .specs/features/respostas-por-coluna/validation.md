# Respostas por Coluna Validation

## Validation: respostas-por-coluna - PASS ✅ (iteração 3/3)

**Date**: 2026-10-27
**Spec**: `.specs/features/respostas-por-coluna/spec.md`
**Diff range**: `main...feat/respostas-por-coluna` (commits 7fbe724..8eb4cb1, 13 commits; correções: 92863fd, 65c1dfc, a89afcf e 3a438ce na iteração 1, 771d690 e 8eb4cb1 na iteração 2)
**Verifier**: independent sub-agent (author ≠ verifier)

Veredito curto: as 32 ACs têm evidência que bate com a spec, e o gate está verde. Os oito mutantes que sobreviveram ao longo das três iterações agora morrem no meu worktree isolado, e as duas mutações novas desta rodada também. O código de produção (`migration.sql`, `colunas.ts`, `repositorio.ts`, `prisma.ts` e as rotas) não mudou desde a iteração 1: as correções foram todas em testes, fixtures, `vitest.config.ts`, `reversao.sql` e docs. Fica uma observação aberta (O1), que o orquestrador leva ao usuário.

---

## Histórico

| Iteração | Commit | Veredito | Lacunas |
| -------- | ------ | -------- | ------- |
| 1 | f6ccbfe | reprovado | Fix 1 (M6, M7, M9: amostragem na migration), Fix 2 (M11, M12: listagens), Fix 3 (M3: fuso) |
| 2 | 3a438ce | reprovado | Fix 4 (M13: `0` da múltipla), Fix 5 (M14: fiação das rotas de listagem) |
| 3 | 8eb4cb1 | aprovado | nenhuma |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | d51ed79 |
| T2 | ✅ Done | 16f4f55 |
| T3 | ✅ Done | 128e686 |
| T4 | ✅ Done | 6a2748a |
| T5 | ✅ Done | c7fc27c (SPEC_DEVIATION do RESP-20, hoje previsto no COL-16) |
| T6 | ✅ Done | f6ccbfe |
| T7 | ✅ Done | 92863fd (Fix 1) |
| T8 | ✅ Done | 65c1dfc (Fix 2) |
| T9 | ✅ Done | a89afcf (Fix 3) |
| T10 | ✅ Done | 3a438ce (O2, O3, O4, texto do COL-11/16) |
| T11 | ✅ Done | 771d690 (Fix 4) |
| T12 | ✅ Done | 8eb4cb1 (Fix 5) |

---

## Spec-Anchored Acceptance Criteria

Linhas do HEAD 8eb4cb1.

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| COL-01 | Colunas da própria tabela do formulário, uma linha por formulário | `src/lib/respostas/repositorio.integration.test.ts:125` - `toEqual({P1:"AM",P2:"Manaus",P11:"b",P10Qual:"Gastronomia regional"})`; `:305` (Pós); `:332` (Avaliação) | ✅ PASS |
| COL-02 | Uma linha por CPF, P3–P9 | `repositorio.integration.test.ts:354-356` - `toEqual([{P3:"AM",P4:"Parintins",P5:"a",P6:null}])`; `respostas-por-coluna-migracao.integration.test.ts:416-418` | ✅ PASS |
| COL-03 | Regra de nomes; toda pergunta vigente tem coluna | `src/lib/respostas/colunas.test.ts:38-41` (chaves = `schema.shape`; 63/122, 26/45, 27/46, 7/7); `:57` (regex) | ✅ PASS (papel conferido por amostra: Pré P20, P30, P32; Pós 1–26; Aluno P16) |
| COL-04 | Letra do papel; sigla na UF | `colunas.test.ts:86-94`; `repositorio.integration.test.ts:125-130` | ✅ PASS |
| COL-05 | `1` marcada, `0` não marcada | `colunas.test.ts:100-103`; `repositorio.integration.test.ts:181` - `[1,1,1,0,0]` | ✅ PASS |
| COL-06 | Texto na coluna | `colunas.test.ts:121-126`; `repositorio.integration.test.ts:125-130` | ✅ PASS |
| COL-07 | INT, DECIMAL, DATE, TINYINT | `repositorio.integration.test.ts:159-164` (`information_schema`); `schema-colunas.test.ts:270`; `colunas.test.ts:141` com `TZ=America/Sao_Paulo` (`vitest.config.ts:21`) | ✅ PASS |
| COL-08 | `NULL` em todas as colunas da não respondida | `repositorio.integration.test.ts:113`; `colunas.test.ts:173`; `respostas-por-coluna-migracao.integration.test.ts:457` | ✅ PASS |
| COL-09 | Sem `TB_Resposta_*`, sem `Chave`/`Ordem`/`Valor` | `schema-colunas.test.ts:276-277`; `respostas-por-coluna-migracao.integration.test.ts:427-432` | ✅ PASS |
| COL-10 | Mapa único chave ↔ coluna ↔ modelo | `schema-colunas.test.ts:268-271` | ✅ PASS |
| COL-11 | Mesmo `{chave: valor}` (exceções da ordem e das 2 casas escritas no AC) | `colunas.test.ts:166-169`, `:208`; `repositorio.integration.test.ts:132-137`, `:421-452` (client padrão sem `/^p\d/`; `separarRespostas`); rotas por id: `e2e/pre-cursos-id.spec.ts:104`, `e2e/pos-cursos-id.spec.ts:120`; listagens: `e2e/pre-cursos.spec.ts:251-252`, `e2e/pos-cursos.spec.ts:130-131`, `e2e/avaliacoes.spec.ts:134-135` (`item.respostas` `toEqual` o semeado; chaves `/^p\d/` `toEqual([])`) | ✅ PASS |
| COL-12 | Só as colunas da chave mudam | `repositorio.integration.test.ts:194` | ✅ PASS |
| COL-13 | Opções que saem passam a `0` | `repositorio.integration.test.ts:204` - `[0,0,1]` | ✅ PASS |
| COL-14 | `null` limpa todas as colunas | `colunas.test.ts:151-154`; `repositorio.integration.test.ts:214-219` | ✅ PASS |
| COL-15 | Condicionais `NULL` no encerramento, na mesma transação | `repositorio.integration.test.ts:253-258`; `e2e/pre-cursos-encerrar.spec.ts:257-263`; transação em `src/lib/respostas/encerramento.ts:76-82` | ✅ PASS |
| COL-16 | Sem alteração de asserção, salvo a ordem da múltipla | O diff e2e muda asserções só em `e2e/pre-cursos-id.spec.ts:175` (prevista no AC); as demais mudanças e2e acrescentam asserções (T12). Subconjuntos e2e: ver Gate | ✅ PASS |
| COL-17 | Cada resposta na coluna certa, com a letra que a API gravaria | `respostas-por-coluna-migracao.integration.test.ts:315-322` - 12 rodadas, `lerRespostas(...)` `toEqual(rodada(formulario, k))` nos quatro formulários | ✅ PASS |
| COL-18 | Múltipla: `1` nas presentes, `0` nas demais | `respostas-por-coluna-migracao.integration.test.ts:327-358` - em cada rodada e cada múltipla dos quatro formulários, colunas físicas `toEqual(esperado)` com exatamente um `1` e `0` no resto (`:355`); `:387-395` | ✅ PASS |
| COL-19 | Órfãs descartadas sem abortar | `respostas-por-coluna-migracao.integration.test.ts:305-309`, `:400-413` | ✅ PASS |
| COL-20 | Texto sem opção aborta, com o formulário no erro | `respostas-por-coluna-migracao.integration.test.ts:480` (`/respostas_pre_curso_divergentes/`), `:503` (`/respostas_pos_curso_divergentes/`); `schema-colunas.test.ts:81-84` (`not.toMatch(/\bELSE\b/i)`) | ✅ PASS |
| COL-21 | Contagem divergente aborta | `respostas-por-coluna-migracao.integration.test.ts:517` (`/respostas_dados_pessoais_divergentes/`) | ✅ PASS |
| COL-22 | Aborto deixa as tabelas antigas intactas | `respostas-por-coluna-migracao.integration.test.ts:482-491`, `:519-524` | ✅ PASS |
| COL-23 | Status, datas e demais colunas preservados | `respostas-por-coluna-migracao.integration.test.ts:436-448` | ✅ PASS |
| COL-24 | Sem respostas: tudo `NULL`, sem erro | `respostas-por-coluna-migracao.integration.test.ts:451-458` | ✅ PASS |
| COL-25 | Filtro mais agrupamento numa tabela | `src/lib/respostas/cruzamento.integration.test.ts:52`, `:55` (`EXPLAIN`) | ✅ PASS |
| COL-26 | `SUM` conta quem marcou | `cruzamento.integration.test.ts:65` - `[2,2,0]` | ✅ PASS |
| COL-27 | AD-051 rescinde a AD-041, com as regras | `.specs/STATE.md` (AD-041 riscada; AD-051 itens 2 e 5; AD-042 anotada) | ✅ PASS |
| COL-28 | Backup e procedimento de aborto | `docs/DEPLOY_PRODUCAO.md` (backup, horário sem uso, reversão, contract interrompido); trava do `reversao.sql` conferida no `spma_test` migrado na iteração 2 (`ERROR 1146 ... at line 14`, colunas `P%` intactas); o arquivo não mudou desde então | ✅ PASS |
| COL-29 | Regravação idempotente | `repositorio.integration.test.ts:229-230` | ✅ PASS |
| COL-30 | `PATCH` numa transação | `repositorio.integration.test.ts:274-279`, `:294`, `:397` | ✅ PASS |
| COL-31 | Cascata do Aluno | `repositorio.integration.test.ts:410-414`; `respostas-por-coluna-migracao.integration.test.ts:469` | ✅ PASS |
| COL-32 | Opção exclusiva é coluna 1/0 | `colunas.test.ts:109-110` | ✅ PASS |

**Status**: ✅ All ACs covered (32/32), 0 spec-precision gaps

---

## Discrimination Sensor

Rodado num `git worktree` descartável no HEAD 8eb4cb1, com junction para o `node_modules`. Para o e2e, o servidor do worktree subiu com `next dev --webpack` na porta 3000, com `E2E_REUSE_SERVER=1`: o Turbopack recusa o `node_modules` em junction fora da raiz do projeto. Linha de base no worktree, sem mutação: os 7 testes de listagem selecionados passaram. A árvore real não tinha servidor rodando.

Baseline do `git status --porcelain` real: `?? .specs/features/respostas-por-coluna/validation.md`. Depois da limpeza (servidor parado, porta 3000 livre, junction removida, diretório apagado pelo caminho longo porque o `git worktree remove` falhou com "Filename too long" no `.next`, `git worktree prune`), o status é o mesmo, e o `node_modules` real está intacto (552 entradas).

Tier P0 expandido, somando as três iterações:

| Mutation | File:line | Description | Iteração em que morreu | Killed? |
| -------- | --------- | ----------- | ---------------------- | ------- |
| M1, M2, M4, M5 | `src/lib/respostas/colunas.ts` | múltipla `NULL`, `null` parcial, todas-`NULL` visível, letra com off-by-one | 1 | ✅ |
| M8, M10 | `migration.sql` | `CHECK` afrouxado; `ELSE` numa chave semeada | 1 | ✅ |
| M3 | `colunas.ts:254` | data em hora local | 2 (TZ fixo) | ✅ |
| M6, M7 | `migration.sql:289`, `:353` | letra trocada no backfill | 2 (`:315`) | ✅ |
| M9 | `migration.sql:353` | `ELSE` numa chave não semeada | 2 (`schema-colunas.test.ts:81`) | ✅ |
| M11, M12 | `repositorio.ts:68-70`, `prisma.ts:40` | `P*` vazando; sem `omit` global | 2 (`repositorio.integration.test.ts:421`) | ✅ |
| M15 | `migration.sql:837` | coluna fora da soma da conferência | 2 | ✅ |
| **M13** (reaplicado) | `migration.sql:343` | P26a do Pré: `NULLIF(MAX(...), 0)` | 3 | ✅ Killed (`respostas-por-coluna-migracao.integration.test.ts:327`, "grava 1 na opção marcada e 0 em todas as outras...") |
| **M16** (novo) | `migration.sql:656` | P29f da Avaliação: `NULLIF(MAX(...), 0)`; prova que o teste de `0` cobre também outro formulário | 3 | ✅ Killed (`:327`) |
| **M14** (reaplicado, e2e) | `src/app/api/{pre-cursos:38,pos-cursos:45,avaliacoes:45}/route.ts` | as três listagens sem `omit: incluirRespostas(...)` | 3 | ✅ Killed: 3 falhas, uma por spec, todas com `Received: null` em `e2e/pre-cursos.spec.ts:251`, `e2e/pos-cursos.spec.ts:130` e `e2e/avaliacoes.spec.ts:134`; os outros 4 testes selecionados passaram |
| **M17** (novo, e2e) | `src/app/api/pos-cursos/route.ts:53` | `...posCurso` → `...registro`: a listagem espalha o registro cru, com as `P*` | 3 | ✅ Killed (`e2e/pos-cursos.spec.ts:131`, chaves `/^p\d/` diferentes de `[]`) |

**Sensor depth**: P0 (18 mutações no total; nesta iteração, 2 reaplicadas e 2 novas)
**Result**: 4/4 killed nesta iteração; todos os sobreviventes anteriores fechados - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical | ✅ as correções só mexem em testes, fixtures (`scripts/e2e-fixture.ts`, `e2e/helpers/db.ts`), `vitest.config.ts`, `reversao.sql` e docs |
| No scope creep | ✅ `criarPreCurso`/`criarPosCurso` ganharam `respostas` opcional no mesmo padrão de `criarAvaliacao`, gravando pelo repositório na mesma transação |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ mapa 1:1 no unit; repositório e migration na integração, com semeadura exaustiva; rotas de listagem e por id no e2e |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md`, memória `feedback_test_scope` | ✅ nenhum spec e2e novo, só asserções em testes de listagem existentes |

---

## Gate Check (HEAD 8eb4cb1, rodado pelo Verifier)

- **lint**: exit 0 (0 erros, 45 warnings anteriores)
- **typecheck**: exit 0
- **build**: exit 0
- **test:unit**: 845 passed / 0 failed
- **db:test:reset + test:integration**: 117 passed / 0 failed (+1: "grava 1 na opção marcada e 0 em todas as outras de cada múltipla")
- **e2e, listagens** (`e2e/pre-cursos.spec.ts`, `e2e/pos-cursos.spec.ts`, `e2e/avaliacoes.spec.ts` completos): 15 passed / 0 failed
- **e2e da iteração 1** (por id, encerramento e dados pessoais): 62/63, com a única falha sendo o GU-08, que é anterior à feature (`862728e` na `main`; `NovoUsuarioForm.tsx:78`). O código de produção que esses testes exercitam não mudou desde então.
- **Contagem**: unit 845 (+1 desde o fim do Execute), integração 117 (+3); nenhum teste removido nas iterações de correção
- **Drift**: `schema.prisma` e `migration.sql` inalterados desde a iteração 1, quando o diff deu migration vazia

### Instabilidade de `e2e/pre-cursos-formulario.spec.ts:323` (julgamento pedido)

Rodei `--workers=1 --repeat-each=3`: 2 passaram e 1 falhou. A falha é `expect(locator).toBeChecked()` com `Received: unchecked` em `marcarOpcao` (`e2e/pre-cursos-formulario.spec.ts:121`), chamado de `preencherTodosOsCampos` (`:285`). Ela acontece no preenchimento pela tela, antes do primeiro "Salvar rascunho" (`:341`), ou seja, antes de qualquer gravação que passe pelo código desta feature.

**Aceito como instabilidade alheia à feature**, por três motivos:

1. O diff `main...HEAD` não toca em `src/components` nem nas telas de formulário. A única tela alterada é `src/app/(protegido)/usuarios/page.tsx`.
2. O estado do rádio é local até o salvamento, e um curso recém-criado lê `respostas: null`, igual a antes da feature.
3. A mesma classe de falha (`toBeChecked` recebendo `unchecked` no clique) já estava registrada como intermitência anterior em `.specs/features/formulario-pre-curso/validation.md:132-139` e em `.specs/features/respostas-normalizadas/tasks.md:634`.

Correção: diferente do que o autor relatou, ela não passou 3 de 3 em sequência na minha máquina. Ela também falha com um worker só. A causa parece ser a tela sob o servidor de dev, não a concorrência. Vale um item de manutenção separado para estabilizar o `marcarOpcao` (por exemplo, repetir o clique até `toBeChecked`, ou esperar a hidratação). Isso não é desta feature.

---

## Observações

- **O1 (aberta; o orquestrador leva ao usuário).** `valorMonetario = z.number().min(0)` (`src/lib/validation/schemas/pos-curso.schema.ts:103`) e os inteiros (`z.number().int()`) não têm teto, e as colunas são `DECIMAL(12,2)` e `INT`. Um valor acima do limite, aceito antes como texto, deve virar 500 em vez de 400. Não medido; a correção é de validação e fica fora do escopo desta feature.
- **O2, O3 e O4**: fechadas na iteração 2 (trava do `reversao.sql`, horário sem uso no deploy, anotação da AD-042).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| COL-01..COL-32 | Implementing / Needs Fix | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 32/32 ACs com evidência que bate com a spec; 0 spec-precision gaps
**Sensor**: 4/4 mortas nesta iteração (M13, M14, M16, M17); 18 no total, nenhuma sobrevivente em aberto
**Gate**: lint, typecheck e build ok; 845 unit, 117 integração e 15 e2e de listagem, 0 falhas

**What works**: mapa e conversões; repositório por coluna; omissão global e listagens com `respostas` certo e sem `P*`; migração conferida opção a opção, com `0` físico em toda múltipla e sem `ELSE`; aborto nomeando o formulário com as tabelas antigas intactas; cruzamento numa tabela; trava de reversão; AD-051 e o procedimento de deploy.

**Issues found**: nenhum bloqueante. O1 segue aberta para decisão do usuário. A instabilidade do `pre-cursos-formulario.spec.ts:323` é anterior e alheia à feature.

**Next steps**: a feature pode ser fechada. O merge na `main` dispara o `migrate deploy` em produção: seguir `docs/DEPLOY_PRODUCAO.md` (backup na hora, horário sem uso).
