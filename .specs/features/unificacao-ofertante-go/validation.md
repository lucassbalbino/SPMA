# unificacao-ofertante-go Validation

## Validation: unificacao-ofertante-go - PASS ✅

**Date**: 2026-09-13
**Spec**: `.specs/features/unificacao-ofertante-go/spec.md`
**Diff range**: `a038f14..HEAD` (HEAD = `5efcfec`), branch `main` — 33 commits, 108 arquivos, +5401/−2077
**Fix commit desta iteração**: `5efcfec` (T25) — 12 arquivos, +391/−32
**Verifier**: independent sub-agent (author ≠ verifier), worktree isolado, sem contexto da iteração 1
**Iteração**: 2 de no máximo 3 do ciclo fix→re-verify

**Veredito**: ✅ **PASS**. Os 18 requisitos `UGO-01..18` têm evidência `file:line` com asserção que bate com o desfecho definido na spec. Os 3 gaps Major da iteração 1 estão fechados e cada fix foi confirmado empiricamente por mutação (o teste que o fix trouxe é o teste que mata o mutante). Gate completo verde: lint 0 erros, build ok, `tsc --noEmit` limpo, 659 unit, 71 integration, 262 e2e (suíte inteira, não escopada), `test-results/.last-run.json` = `{"status":"passed","failedTests":[]}`. Sensor 3/3 mutantes mortos.

Restam 4 achados **Minor/Cosmetic** de higiene de artefato, nenhum funcional e nenhum bloqueante — listados em "Achados residuais". Não justificam gastar a 3ª iteração do orçamento do Verifier; viram trabalho de fechamento/tarefa futura.

---

## Contexto: iteração 1 e o que T25 alegou corrigir

O Verifier da iteração 1 retornou FAIL com 7 gaps ranqueados. T25 (`5efcfec`) alega fechar #1-#6 e adiar #7. Cada um foi re-derivado aqui contra o código, não aceito pela nota em `tasks.md`.

| Gap it. 1 | Severidade | Alegação de T25 | Verificado | Evidência |
| --- | --- | --- | --- | --- |
| #1 UGO-16: GO forjando `cdOfertante` de outro GO ao criar VO não recebia 403 | Major | Corrigido | ✅ **Fechado** | `src/app/api/usuarios/route.ts:78-87`; teste `e2e/usuarios.spec.ts:303-321` — `expect(resVo.status()).toBe(403)` + `expect(getUsuario(CPF_NOVO_VO_FORJADO)).toBeNull()`. Mutante M2 confirma que o teste discrimina. |
| #2 UGO-10: documento duplicado virava 500 genérico | Major | Corrigido | ✅ **Fechado** | `src/app/api/usuarios/route.ts:97-111` (`findUnique` antes do `create` → 409); teste `e2e/usuarios.spec.ts:399-401` — `expect(segundo.status()).toBe(409)` + `expect(corpo.erro).toBe("Documento já cadastrado")`. `design.md:205` corrigido: a linha antiga descrevia o 500 como padrão intencional, o que não era verdade. Mutante M3 confirma. |
| #3 `PATCH /api/usuarios/me/organizacao` sem cobertura de guard | Major | Corrigido | ✅ **Fechado** | `e2e/cadastro-ofertante-page.spec.ts:160` (401 sem sessão + dados inalterados), `:176` (403 tipo não-GO), `:196` (403 sem CSRF + dados inalterados). Os 3 passam na suíte completa. |
| #4a Login rejeitava tamanho ≠ 11/14 com "Documento inválido" em vez da mensagem genérica | Minor | Corrigido | ✅ **Fechado** | `src/lib/validation/schemas/login.schema.ts:26-32` (refine deixa passar); prova no nível da rota em `src/app/api/auth/login/route.integration.test.ts:112-125` — `expect(res.status()).toBe(401)` + `expect(corpo.erro).toBe("CPF ou senha inválidos")`. CA-AU-03 (11/14 com DV errado → 400) preservado, `login.schema.test.ts:98-107`. |
| #4b GO por CNPJ não exercitava 1º acesso | Minor | Corrigido | ✅ **Fechado** | `e2e/primeiro-acesso.spec.ts:148-175` — define senha, `primeiraVez` vira `false`, `senhaHash` não-nulo, e o login seguinte com o CNPJ retorna 200 com `primeiroAcesso: false`. |
| #4c CNPJ saía parcialmente mascarado de log/erro | Minor | Corrigido | ✅ **Fechado** | `src/lib/errors/api-error.ts:20` — `PADRAO_CPF` ganhou `(?<!\d)`/`(?!\d)`, então um run de 14 dígitos não casa em nenhuma posição. Teste comportamental no call site real: `src/lib/errors/api-error.test.ts:56-73` (`expect(mensagemLogada).toContain(cnpj)`), com o mascaramento de CPF preservado em `:49`. Mutante M1 confirma. |
| #5 `Normalizacao-Respostas.docx` no repositório | Minor | Corrigido | ✅ **Fechado** | `git show 5efcfec --stat`: `delete mode 100644 Normalizacao-Respostas.docx`; arquivo ausente da árvore. |
| #6 `tasks.md` citando `UGO-19`/`UGO-20`, ids inexistentes | Minor | Corrigido | ⚠️ **Parcial** | `tasks.md:218` e `:390` corrigidos com nota. **Mas o mesmo id inexistente continua em código de produção**: `src/app/api/usuarios/me/organizacao/route.ts:2` ainda cita `UGO-20`. Ver achado R1. |
| #7 Rótulo "CPF" em telas que também aceitam CNPJ | Cosmetic | Adiado de propósito | ⚠️ **Adiamento documentado, justificativa incorreta** | Ver achado R2. |

**Nenhum gap Major remanescente.** Os 3 fixes Major foram verificados lendo o diff (`git show 5efcfec`), não pela mensagem de commit, e cada um tem teste próprio que morre sob mutação.

---

## Spec-Anchored Acceptance Criteria

### P1: GO passa a ser o próprio Ofertante (UGO-01..06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — AM/GT cadastra GO ⇒ nome+UF obrigatórios e responsavel/email/telefone/municipio opcionais no MESMO registro, sem tabela Ofertante | 201; dados no próprio `Usuario`; nenhum registro autônomo | `e2e/usuarios.spec.ts:428-441` — `expect(res.status()).toBe(201)`, `expect(criado?.cdOfertante).toBeNull()`, `expect(verba?.cdOfertante).toBe(CNPJ_NOVO_GO_VALIDO)`; persistência de `uf` em `e2e/usuarios-novo-page.spec.ts:171` — `expect(criado?.uf).toBe("MG")`; obrigatoriedade em `src/lib/validation/schemas/usuario.schema.test.ts:121` | ✅ PASS |
| AC2 — auto-cadastro do 1º acesso grava sobre o próprio GO autenticado | mesmos campos, no próprio registro | `e2e/cadastro-ofertante-page.spec.ts:122-124` — `expect(usuario?.nome).toBe(NOME_ORGANIZACAO)`, `expect(usuario?.uf).toBe("SP")`; rota opera só sobre `sessao.usuario.documento` em `src/app/api/usuarios/me/organizacao/route.ts:63` | ✅ PASS |
| AC3 — todo GO tem exatamente um conjunto de dados organizacionais | nunca zero após conclusão, nunca >1 | Garantido por construção: colunas inline com PK única em `prisma/schema.prisma:47-62` (não existe forma física de haver 2); gate de completude em `src/lib/auth/guards.ts:47` + `guards.test.ts:87,94,101` | ✅ PASS (estrutural) |
| AC4 — GO já completo tentando se auto-cadastrar de novo ⇒ 409, dados preservados | HTTP 409 + dados inalterados | `e2e/cadastro-ofertante-page.spec.ts:148-151` — `expect(res.status()).toBe(409)`, `expect(depois?.nome).toBe(NOME_ORGANIZACAO)`, `expect(depois?.uf).toBe("SP")`; rota `me/organizacao/route.ts:44-49` | ✅ PASS |
| AC5 — AM/GT/próprio GO edita ⇒ valida os mesmos campos e persiste no registro do GO | alteração persistida | `e2e/organizacao-id.spec.ts:140` (GO edita o próprio, persiste); validação em `e2e/organizacao.spec.ts:135,151` (400 nome vazio / sem UF); rota `src/app/api/usuarios/[documento]/organizacao/route.ts:100-111` | ✅ PASS |
| AC6 — GO editando dados de OUTRO GO ⇒ 403, dados do outro inalterados | HTTP 403 + inalterado | `e2e/organizacao-id.spec.ts:155` — 403 e nada muda; unidade em `src/lib/auth/guards.test.ts:260` (`podeEditarOfertante` GO 1 → ofertante 2 = false) | ✅ PASS |

### P2: GO se identifica por CNPJ (UGO-07..13)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — GO identificado por CNPJ de 14 dígitos, DV módulo 11, cliente e servidor | validação nos dois lados | `src/lib/validation/cnpj.ts` + `cnpj.test.ts:5-58` (válido, DV1 alterado, DV2 alterado, tamanhos, vazio); servidor via `superRefine` em `usuario.schema.ts`, provado em `usuario.schema.test.ts:65,90` | ✅ PASS |
| AC2 — AM/GT/VT/VO/AL continuam por CPF, inalterado | sem regressão | `usuario.schema.test.ts:15` (CPF inválido rejeitado), `:39` (it.each sobre todos os tipos ≠ GO), `:51` (normalização); `documento.test.ts:5` | ✅ PASS |
| AC3 — CNPJ com formato/DV inválido, incluindo dígitos repetidos ⇒ 400 | HTTP 400 | `cnpj.test.ts:27` (`11.111.111/1111-11`), `:31` (`00.000.000/0000-00`); `usuario.schema.test.ts:90` (issue no campo `documento`), `:106` (CPF no lugar de CNPJ rejeitado); mapeamento para 400 em `src/app/api/usuarios/route.ts:53-58` | ✅ PASS |
| AC4 — CNPJ já pertencente a outro GO ⇒ erro claro de duplicidade | erro claro (não 500 genérico) | `src/app/api/usuarios/route.ts:97-111`; `e2e/usuarios.spec.ts:399-401` — `expect(segundo.status()).toBe(409)` + `expect(corpo.erro).toBe("Documento já cadastrado")` | ✅ PASS (ver nota R3 sobre o ramo de mensagem do GO) |
| AC5 — login aceita CPF(11) ou CNPJ(14), valida cada um com seu algoritmo antes da senha, e rejeita tamanho ≠ 11/14 com a MESMA mensagem genérica | 401 "CPF ou senha inválidos" | `src/app/api/auth/login/route.integration.test.ts:119-124` — `expect(res.status()).toBe(401)` + `expect(corpo.erro).toBe("CPF ou senha inválidos")`; CNPJ válido loga em `e2e/login.spec.ts:161-175`; schema em `login.schema.ts:26-32` + `login.schema.test.ts:79-95` | ✅ PASS |
| AC6 — mesma cascata (AD-009) e mesma regra de senha de 1º acesso (AD-010), agora chaveadas por CNPJ | cascata e 1º acesso funcionam por CNPJ | `src/lib/auth/cascata.ts:23` + `cascata.test.ts:11`; 1º acesso por CNPJ em `e2e/primeiro-acesso.spec.ts:148-175` — `expect(usuario?.primeiraVez).toBe(false)`, `expect(login.status()).toBe(200)` | ✅ PASS |
| AC7 — CPF continua mascarado (AD-029); CNPJ NÃO é mascarado | CPF mascarado, CNPJ íntegro | `src/lib/errors/api-error.ts:20`; `api-error.test.ts:49` — `expect(mensagemLogada).not.toContain("52998224725")`; `:72` — `expect(mensagemLogada).toContain(cnpj)` | ✅ PASS |

### P3: VO se vincula diretamente ao GO específico (UGO-14..18)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — VO vinculado ao CNPJ do GO informado, ou herdado quando o criador é o próprio GO | `cdOfertante` = documento do GO | `e2e/usuarios.spec.ts:293` — `expect(getUsuario(CPF_NOVO_VO)?.cdOfertante).toBe(CNPJ_GO_CRIADOR)`; AM escolhendo GO da lista em `e2e/usuarios-novo-page.spec.ts:198`; resolução em `src/app/api/usuarios/route.ts:124-131` | ✅ PASS |
| AC2 — toda consulta de curso/verba/avaliação por VO escopada aos recursos do GO vinculado | escopo = GO do VO | `src/lib/auth/guards.ts:86-100` (`resolverEscopoOfertante`) + `guards.test.ts:123` (VO → `cdOfertante`), `:219` (VO do GO 1 pedindo ofertante 2 = false), `:225` (pedindo o próprio = true); mesmo caminho consumido pelas rotas de verba/pré/pós/avaliação, provado em `e2e/verbas.spec.ts:181` | ✅ PASS |
| AC3 — GO vinculando VO a CNPJ de GO diferente ⇒ 403 | HTTP 403 | `src/app/api/usuarios/route.ts:78-87`; `e2e/usuarios.spec.ts:318-320` — `expect(resVo.status()).toBe(403)` + `expect(getUsuario(CPF_NOVO_VO_FORJADO)).toBeNull()` | ✅ PASS (fix de T25) |
| AC4 — AM/GT informando CNPJ que não corresponde a nenhum GO ⇒ erro claro, não erro genérico de FK | erro claro identificando o GO inexistente | `src/app/api/usuarios/route.ts:138-146`; `e2e/usuarios.spec.ts:469` (400 "Ofertante informado não existe"), `:491` (documento existe mas é AL ⇒ 400) | ✅ PASS |
| AC5 — `GO` removido de `TIPOS_PERMITIDOS.GO` | GO cria VO e AL, não GO | `src/lib/auth/cascata.ts:23` — `GO: [TipoUsuario.VO, TipoUsuario.AL]`; `cascata.test.ts:11` (`MATRIZ_ESPERADA.GO`); `e2e/usuarios.spec.ts:258` — 403 e nada criado | ✅ PASS |

**Status**: ✅ 18/18 ACs cobertos, todos com asserção que bate com o desfecho definido na spec. 0 spec-precision gaps.

---

## Edge Cases

- [x] **AM/GT cadastra GO sem CNPJ ou sem UF ⇒ 400 indicando o campo** — `usuario.schema.test.ts:121` (issue de campo obrigatório em `uf`); `e2e/organizacao.spec.ts:151` (PATCH sem UF ⇒ 400); `e2e/usuarios-novo-page.spec.ts:180` (barrado antes do envio na UI).
- [x] **CNPJ de 14 dígitos todos iguais ⇒ inválido** — `cnpj.test.ts:27` e `:31`.
- [x] **GO edita município/UF sem informar CNPJ novo** — `e2e/organizacao-id.spec.ts:140`; `organizacaoSchema` não tem campo de documento (`organizacao.schema.ts`), então o CNPJ é estruturalmente imutável por esta via.
- [x] **Leitura/escrita por GO ou VO sobre recurso de outro GO ⇒ 403** — `e2e/verbas-id.spec.ts:118` (Verba), `e2e/pre-cursos.spec.ts:180` (PreCurso via Verba), `e2e/organizacao-id.spec.ts:100` (leitura) e `:155` (escrita), `e2e/usuarios.spec.ts:551` (matrícula em curso de outro Ofertante).
- [x] **Migração termina sem Ofertante autônomo e sem FK órfã** — `prisma/migrations/20260912170000_unificar_ofertante_go/migration.sql`; `model Ofertante` ausente de `prisma/schema.prisma` (só citado em comentário histórico, `:137`); `npx prisma migrate status` contra `spma_test` = "Database schema is up to date!"; `e2e/organizacao.spec.ts:166` confirma que nenhuma rota `/api/ofertantes*` responde mais.

---

## Discrimination Sensor

Scratch isolado: `git worktree add --detach <scratchpad>/sensor HEAD` (nunca `git stash`). Baseline `git status --porcelain` da worktree real capturado antes (vazio) e reconferido depois (vazio, idêntico). Worktree removida e `git worktree prune` executado.

| # | Mutação | File:line | Descrição | Teste alvo | Killed? |
| --- | --- | --- | --- | --- | --- |
| M1 | Limite de dígito removido de `PADRAO_CPF` | `src/lib/errors/api-error.ts:20` | `/(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g` → `/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g` (reverte o fix do gap #4c) | `npx vitest run src/lib/errors/api-error.test.ts` | ✅ **Killed** — 1 failed \| 3 passed; falha em `api-error.test.ts:72` (`expect(mensagemLogada).toContain(cnpj)`) |
| M2 | Comparação de escopo invertida na checagem de forja | `src/app/api/usuarios/route.ts:81` | `dados.cdOfertante !== resolverEscopoOfertante(criador)` → `===` (403 passa a barrar o caso legítimo e liberar a forja) | `npx playwright test usuarios.spec.ts` | ✅ **Killed** — 1 failed \| 16 passed; falha em `e2e/usuarios.spec.ts:303` (UGO-16) |
| M3 | Efeito colateral da duplicidade removido | `src/app/api/usuarios/route.ts:101` | `if (documentoExistente)` → `if (false && documentoExistente)` (o 409 deixa de existir) | `npx playwright test usuarios.spec.ts` | ✅ **Killed** — 1 failed \| 16 passed; falha em `e2e/usuarios.spec.ts:382` (UGO-10) |

**Sensor depth**: lightweight (3 mutações comportamentais sobre o código de maior risco introduzido por T25).
**Result**: **3/3 killed** — PASS ✅. Os três fixes da iteração 2 são empiricamente detectáveis: o teste que cada fix trouxe é exatamente o teste que mata o mutante correspondente.

---

## Gate Check

- **Gate command**: `Full-feature` de `tasks.md` — `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Ambiente**: worktree isolado, `npm ci` do zero, `.env`/`.env.test` copiados do checkout principal, `spma_test` com `prisma migrate status` = up to date, porta 3000 conferida livre (`netstat`) antes da rodada e2e — nenhum dev server órfão.

| Etapa | Resultado |
| --- | --- |
| `npm run lint` | ✅ 0 erros (35 warnings `no-unused-vars` pré-existentes em arquivos de teste, fora do escopo desta feature) |
| `npm run build` | ✅ ok (`prisma generate` + `next build`) |
| `npx tsc --noEmit` | ✅ limpo, zero saída |
| `npm run test:unit` | ✅ **659 passed** (30 arquivos), 0 failed, 0 skipped |
| `npm run test:integration` | ✅ **71 passed** (10 arquivos), 0 failed, 0 skipped |
| `npx playwright test` (FULL, não escopada) | ✅ **262 passed** (38 specs, 7.2min), 0 failed, 0 skipped |
| `test-results/.last-run.json` | ✅ `{"status": "passed", "failedTests": []}` — conferido, não inferido do "N passed" nem do exit code |

**Test Integrity Check**: contagem sobe em todas as camadas em relação ao fechamento de T22 (unit 657→659, integration 70→71, e2e 257→262). Nenhum teste deletado, nenhum skip. Dois testes de `e2e/usuarios.spec.ts` foram **reescritos**, não enfraquecidos, e ambos com justificativa correta:

- `REQ-AU-08` (linha ~278) codificava o comportamento antigo (201 com `cdOfertante` forjado silenciosamente ignorado). Foi dividido em dois: o caso sem `cdOfertante` informado continua herdando o escopo (`:293`), e o caso de forja virou o novo teste de 403 (`:303`). Asserção mais forte que antes, não mais fraca.
- `REQ-SEC-11` (linha ~382) exigia 500 genérico para documento duplicado — desfecho que a spec nunca pediu (AC4 sempre exigiu "erro claro"). Reescrito para 409. A garantia de REQ-SEC-11 em si (nunca vazar erro cru do Prisma) continua provada em `src/lib/errors/api-error.test.ts:28`, no nível do wrapper. Ver nota R4.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — T25 acrescenta 2 checagens (~14 linhas de lógica) e 1 ajuste de regex; o resto do `+56` em `usuarios/route.ts` é comentário explicativo, no mesmo registro denso já usado em todo o repositório |
| Surgical changes | ✅ — os 12 arquivos de `5efcfec` são exatamente os 7 gaps; nenhum arquivo adjacente "melhorado" |
| No scope creep | ✅ — nada além dos gaps; gap #7 explicitamente não tocado |
| Matches patterns | ✅ — 409 no mesmo formato de `me/organizacao/route.ts:44-49`; ordem RH→CSRF→Sessão→Guard preservada em todas as rotas |
| Spec-anchored outcome check | ✅ — 18/18, ver tabela acima |
| Per-layer Coverage Expectation met | ✅ — domínio 1:1 com os UGO (`cnpj.test.ts`, `documento.test.ts`, `guards.test.ts`, `cascata.test.ts`, `usuario.schema.test.ts`, `login.schema.test.ts`, `organizacao.schema.test.ts`); rotas com happy + edge + erro em e2e, conforme a convenção da Test Coverage Matrix |
| Every test maps to a spec requirement | ✅ — nenhum teste sem dono; os testes novos de T25 citam o gap e o AC no próprio nome/comentário |
| Documented guidelines followed | ✅ — `AGENTS.md`: nenhuma cor literal introduzida (T25 não toca `.tsx` de estilo); navegação continua saindo de `src/lib/ui/navegacao.ts`; `design.md` §9 "escopo de testes enxuto" respeitado (T25 acrescenta 5 e2e, todos fechando gap apontado, nenhum de conveniência) |
| Test integrity (nada enfraquecido/deletado/skipado) | ✅ — ver Test Integrity Check acima |

---

## Achados residuais (Minor/Cosmetic — não bloqueiam o PASS)

### R1 — `UGO-20` (id inexistente) permanece em código de produção · Minor

O gap #6 da iteração 1 era "`tasks.md` cita `UGO-19`/`UGO-20`, ids que não existem em `spec.md` (só UGO-01..18)". T25 corrigiu as duas ocorrências em `tasks.md` (`:218`, `:390`) mas deixou a **mesma classe de defeito** no cabeçalho de uma rota:

```
src/app/api/usuarios/me/organizacao/route.ts:1-2
// PATCH /api/usuarios/me/organizacao (UGO-01, UGO-02, UGO-03, UGO-04,
// UGO-20).
```

Varredura confirma que é a única ocorrência fora de `.specs/`: `grep -rn "UGO-19\|UGO-20" src e2e scripts prisma docs`. Correção é apagar `, UGO-20` — os 4 ids restantes já cobrem a rota.

### R2 — Adiamento do gap #7 é legítimo, mas a justificativa registrada está factualmente errada · Cosmetic

`tasks.md:697` justifica o adiamento com: *"mudar o rótulo quebraria `page.getByLabel("CPF")` em ~30 arquivos e2e"*. Medido: **3 arquivos, 11 call sites** — `e2e/login-page.spec.ts` (4), `e2e/usuarios-novo-page.spec.ts` (6), `e2e/security-headers.spec.ts` (1). O ripple real é uma ordem de grandeza menor que o alegado.

Além disso, `usuarios/novo` **não** é uma tela fora de escopo: `spec.md:32` lista explicitamente `usuarios/novo` entre as superfícies desta feature, e `spec.md:47` assume "atualizar apenas o texto estritamente necessário para não confundir". Um campo rotulado `CPF` em `src/app/(protegido)/usuarios/novo/NovoUsuarioForm.tsx:151` — que só aceita CNPJ quando `tipo === "GO"` (`:66`, `pedeOrganizacional`) — é exatamente o caso que essa assunção descreve.

**Veredito sobre o adiamento**: aceitável na severidade (Cosmetic, zero impacto funcional, nenhum AC depende do rótulo) e claramente registrado em `tasks.md`. Mas a razão anotada não deve ser reaproveitada como estimativa: quem pegar a tarefa futura deve saber que custa ~11 substituições em 3 arquivos, não ~30 arquivos.

### R3 — Ramo de mensagem de duplicidade para GO/CNPJ sem asserção própria · Minor

`src/app/api/usuarios/route.ts:104-107` tem um ternário: GO ⇒ `"CNPJ já cadastrado para outro Gestor Ofertante"`, demais ⇒ `"Documento já cadastrado"`. O único teste de duplicidade (`e2e/usuarios.spec.ts:382`) usa `tipo: "AL"` com CPF, então só o segundo ramo é exercitado — `grep -rn "CNPJ já cadastrado" src e2e` só acha a própria rota.

Não reprova o AC: P2 AC4 pede "um erro claro de duplicidade", e o 409 com mensagem clara está provado no caminho compartilhado (a checagem é a mesma linha de código para os dois tipos; só a string difere). O "Independent Test" de P2 em `spec.md:91`, porém, descreve literalmente o cenário "segundo GO com o mesmo CNPJ" — uma asserção sobre esse ramo fecharia a última milha.

### R4 — REQ-SEC-11 perdeu a prova no nível de rota · Minor, fora do escopo desta feature

Antes de T25, `e2e/usuarios.spec.ts` provava em nível de rota que uma exceção real do Prisma vira 500 genérico + `idCorrelacao`, sem vazar o erro cru. Como a rota deixou de lançar nesse caminho, a prova migrou para `src/lib/errors/api-error.test.ts:28` (nível do wrapper). A troca é correta e documentada, mas REQ-SEC-11 (`seguranca-transversal`) ficou sem nenhum e2e de rota que o exercite ponta a ponta. Registro para a feature dona, não para esta.

### R5 — `.specs/STATE.md:69` desatualizado · Cosmetic

Diz *"sem `validation.md` ainda (Verifier não rodou, feature não terminou)"*. O Verifier rodou na iteração 1 e roda agora na 2. Entra na atualização de fechamento, junto com os itens do passo 6 do handoff (`STATE.md:83`).

---

## Requirement Traceability Update

`spec.md` ainda marca os 18 requisitos como `Pending` / fase `Design`|`Tasks`. Isso é **deliberado e correto** no momento em que este relatório é escrito: `tasks.md:696` registra que `spec.md`/`STATE.md` só são promovidos depois do PASS do Verifier, que é este documento. Com o PASS, a promoção abaixo passa a ser o passo de fechamento (executado pelo orquestrador, não pelo Verifier — não altero `spec.md`).

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| UGO-01 .. UGO-18 (todos os 18) | Pending | ✅ Verified |

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T24 | ✅ Done | Todos os checkboxes marcados; gate `Full-feature` fechado em T22 e reconfirmado aqui de forma independente |
| T25 (fix, iteração 1) | ✅ Done | Gaps #1–#6 fechados com evidência; #7 adiado com registro (ver R2) |

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: 18/18 ACs com desfecho batendo com a spec; 0 spec-precision gaps
**Sensor**: 3/3 mutantes mortos
**Gate**: lint 0 erros · build ok · tsc limpo · 659 unit · 71 integration · 262 e2e · `.last-run.json` passed, 0 failed, 0 skipped

**O que funciona**: `model Ofertante` eliminado sem FK órfã; GO identificado por CNPJ com DV módulo 11 em cliente e servidor; login aceitando os dois documentos com mensagem genérica única para tamanho inválido; escopo por GO resolvido num único ponto (`resolverEscopoOfertante`) e consumido pelas 6 guardas; VO ligado direto ao CNPJ do GO, com 403 tanto para forja quanto para leitura/escrita fora de escopo; CNPJ íntegro em log, CPF ainda mascarado; cascata sem GO-cria-GO; AD-043 registrada com AD-012/014/015 anotadas como superadas.

**Issues found**: 5 achados residuais Minor/Cosmetic (R1–R5), nenhum funcional, nenhum bloqueante. R1 e R3 são de 1 linha cada; R2 é correção de uma justificativa escrita; R4 pertence a `seguranca-transversal`; R5 é fechamento de `STATE.md`.

**Next steps**: fechar a feature — promover os 18 `UGO-*` para `Verified` em `spec.md`, marcar `tasks.md` Status=Done, e atualizar a entrada de handoff em `.specs/STATE.md` (passo 6, `STATE.md:83`). R1 e R3 cabem nesse mesmo commit de fechamento se o orquestrador quiser; R2 vira nota na tarefa futura do rótulo CPF/CNPJ.
