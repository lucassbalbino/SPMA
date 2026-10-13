# Gestão de Usuários Validation

**Date**: 2026-10-13
**Spec**: `.specs/features/gestao-de-usuarios/spec.md` (revisado em `b40f258`: GU-26, GU-33, GU-34 e o edge case "esvaziar a última linha")
**Diff range**: `3c46d53..b40f258` (código `280284a`..`b40f258`, 19 commits)
**Verifier**: independent sub-agent (author ≠ verifier)
**Iteração**: 2 de 3 (a iteração 1, FAIL, está no histórico abaixo)

**Result**: PASS ✅. Todos os 49 ACs e os 6 edge cases têm evidência, nenhum spec-precision gap ficou aberto, o sensor matou 13/13 e os gates estão verdes.

---

## Iteração 2 (HEAD `b40f258`)

### O que mudou desde a iteração 1

`git diff 6af41ff..b40f258`: só testes e spec. **Nenhum arquivo de produção mudou** (`git diff --stat 6af41ff..HEAD -- src e2e` sem `*.test.ts`/`e2e/*.spec.ts` sai vazio). No e2e só houve acréscimos (`git diff … e2e/usuarios-page.spec.ts` sem linha removida). O teste de 256 caracteres de `S` foi trocado por uma versão mais forte, que agora também afirma a mensagem.

| Commit | Conteúdo |
| ------ | -------- |
| `6e91200` | `GI`: GU-35 com um GO com os 6 dados organizacionais preenchidos; GU-25 lendo o `email` gravado; `S`: mensagem do nome > 255 |
| `c6e8eb7` | `EU`: GU-48 observando as requisições da tela; edge cases "lista do GO vazia" (+ GU-03 "acima") e "esvaziar a última linha" |
| `b40f258` | `spec.md`: GU-26 com as 3 mensagens exatas; GU-33 sem "sessões"; GU-34 "nenhuma sessão nem no antigo nem no novo", atômico; edge case "Anterior habilitado só quando a página atual > 1" |

Os números de linha da iteração 2 são de `b40f258`. A inclusão de um `import` deslocou em +1 as linhas de `GI` posteriores à 11, e o e2e novo deslocou as linhas de `EU` posteriores à ~300: as citações da iteração 1 valem para `6af41ff`.

### Re-cheque das 6 lacunas ranqueadas da iteração 1

| # | Lacuna (iter. 1) | Evidência nova (`file:line` + asserção) | Spec-defined outcome | Result |
| - | ---------------- | --------------------------------------- | -------------------- | ------ |
| 1 | GU-35, dados organizacionais | `GI:224-261`: GO com `responsavel`, `email`, `telefone`, `uf`, `municipio`, `dadosOrganizacionaisCompletos: true`; depois da troca, `GI:255` `expect(depois.responsavel).toBe("GU-T Responsavel")`, idem `telefone`/`uf`/`municipio`/flag, e `GI:261` `toEqual({ ...antes, documento: novo })`. Junto de `GI:176-221` (AL: `senhaHash`, `primeiraVez`, `tipo`, `criadoPor`, `dataCriacao`, flag de dados pessoais) | Preservar `senhaHash`, `primeiraVez`, `tipo`, `criadoPor`, `dataCriacao`, dados organizacionais/pessoais | ✅ PASS (M10 morto) |
| 2 | GU-25, `null` gravado | `GI:264-280`: corpo `{ email: "" }` passa por `edicaoUsuarioSchema.parse` (mesmo caminho da rota) → `atualizarCadastro`; `GI:278` `expect(gravado.email).toBeNull()` sobre um usuário que tinha `x@exemplo.com` | Gravar `email` como `null` | ✅ PASS (M9 morto) |
| 3 | GU-48, metade "telas" | `EU:542-602`: `page.on("request")` desde antes do `goto`; busca por CPF pontuado, paginação, troca de documento pela linha e reset; `EU:589` `arrayContaining(["/api/usuarios/consulta", "/api/usuarios", "/api/usuarios/resetar-senha"])` (as 3 rotas foram de fato chamadas); `EU:596` `expect(new URL(url).search).toBe("")` para toda chamada `/api/usuarios*`; `EU:599-601` nenhuma URL contém o CPF buscado (cru ou pontuado) nem o documento novo | Documento-alvo, documento novo e busca só no corpo, em todas as rotas **e telas** | ✅ PASS (M13 morto) |
| 4 | Edge case "esvaziar a última linha" | `EU:605-638`: na página 2 de 2, renomear a única linha para fora da busca → `EU:625` "Nenhum usuário encontrado." + `EU:626` `anterior toBeEnabled()`; na página 1 de 1, o mesmo → `EU:636-637` "Nenhum usuário encontrado." e "Página 1 de 1" + `EU:638` `anterior toBeDisabled()` | Recarregar a página atual; se ela passou de `totalPaginas`, "Nenhum usuário encontrado.", com "Anterior" habilitado só quando a página > 1 | ✅ PASS |
| 5 | Edge case "lista do GO vazia" | `EU:523-532`: GO sem VO nem AL → `EU:529` "Nenhum usuário encontrado.", `EU:530` `getByText("Página 1 de 1", { exact: true })`, "Anterior" e "Próxima" `toBeDisabled()` | "Nenhum usuário encontrado." e "Página 1 de 1" | ✅ PASS |
| 6 | GU-03, "acima da lista" | `EU:534-539` `expect(formulario!.y).toBeLessThan(lista!.y)` (botão "Criar usuário" acima da busca da lista) | Formulário de criação acima da lista | ✅ PASS |

### Re-cheque dos 2 spec-precision gaps e dos ACs tocados

| AC | Spec-defined outcome (revisado) | `file:line` + asserção | Result |
| -- | ------------------------------- | ---------------------- | ------ |
| GU-26 | 400 `{"erro":"Nome é obrigatório"}` (vazio / só espaços), `{"erro":"Nome deve ter no máximo 255 caracteres"}` (> 255), `{"erro":"Email inválido"}`; usuário inalterado | Mensagens: `S:67-71` `"Nome é obrigatório"` (`""`, `"   "`); `S:73-77` `toBe("Nome deve ter no máximo 255 caracteres")`; `S:79-83` `"Email inválido"`. Mensagem → corpo da rota: `src/lib/api/requisicao.ts:32` `erroHttp(400, issues[0].message)`, provado em `src/lib/api/requisicao.test.ts:52-55` `corpo: { erro: "Nome é obrigatório" }`. A rota PATCH valida antes de buscar o alvo (`src/app/api/usuarios/route.ts`, `corpoValidado(request, edicaoUsuarioSchema)`), e a ligação 400 + banco inalterado está em `EA:279-291` | ✅ PASS (gap de precisão fechado) |
| GU-33 | Toda referência → novo, atômico; **sem** sessões (que seguem GU-34) | Inalterado: `GI:151-160` (VO `criadoPor`/`cdOfertante`, verba, pré-curso ofertante+autor, pós-curso → novo); `GI:163-169` zero no antigo em cada tabela; `GI:209-214` avaliação, resposta e dado pessoal (1 no novo, 0 no antigo); rollback `GI:378-384` | ✅ PASS (gap de precisão fechado) |
| GU-34 | Encerrar todas as sessões, atômico; nenhuma no antigo nem no novo | `GI:170` `sessao.count(antigo) toBe(0)`, `GI:173` `sessao.count(novo) toBe(0)`; atomicidade: na transação que falha, `GI:384` `sessao.count(antigo) toBe(1)` (nada apagado). M4 (iter. 1) morto em `GI:172` (hoje `:173`) | ✅ PASS |
| GU-35, GU-25, GU-48, GU-03 | ver tabela acima | — | ✅ PASS |
| GU-49 | URL de `/usuarios` sem query string | `EU:482` e `EU:822` `expect(page.url()).toMatch(/\/usuarios$/)` (as mesmas asserções da iter. 1, deslocadas); o teste de GU-48 confirma que nenhuma requisição leva query string (`EU:596`) | ✅ PASS |

**Status**: ✅ 49/49 ACs com evidência; 6/6 edge cases; 0 spec-precision gaps abertos.

### Discrimination Sensor (iteração 2)

Scratch: novo `git worktree` de `b40f258` em `<scratchpad>/wt` (fora do repo), com `src/generated` copiado e `node_modules` por junction (removida, só o link, antes do `worktree remove`). Baseline do worktree: `gestao.integration` 11/11 e o teste de GU-48 1/1 passando sem mutação.

| # | File:line | Description | Teste que mata | Killed? |
| - | --------- | ----------- | -------------- | ------- |
| M9 | `src/lib/usuarios/gestao.ts:72` | `email: email ?? undefined` na edição sem troca | `GI:278` `expected 'x@exemplo.com' to be null` | ✅ Killed |
| M10 | `src/lib/usuarios/gestao.ts:103` | A troca de documento zera `uf`, `responsavel`, `telefone`, `municipio` | `GI:255` `expected null to be 'GU-T Responsavel'` | ✅ Killed |
| M13 | `src/app/(protegido)/usuarios/GestaoUsuarios.tsx:58` | O cliente põe a busca na query string (`/api/usuarios/consulta?busca=…`), com o corpo intacto, então a tela continua funcionando | `EU:596` `Expected: ""`, `Received: "?busca=Listagem%20Paginada"` | ✅ Killed |

**Como o e2e rodou no scratch**: o Turbopack rejeita `node_modules` por junction, mas `next dev --webpack` (Next 16.3.2) subiu no worktree com `.env.test` (`Ready in 640ms`, `/login` 200). O Playwright do worktree rodou contra ele com `E2E_REUSE_SERVER=1` e `-g "GU-48: buscar por CPF"`: baseline passou (2,1 min), mutante falhou. A porta 3000 estava livre antes. Depois, o processo do servidor do scratch (pai `next dev --webpack` no worktree, conferido pela linha de comando) foi encerrado, e a porta voltou a ficar livre.

M1–M8, M11 e M12 (iteração 1) seguem válidos sem nova execução: nenhum arquivo de produção mudou desde `6af41ff`, e os testes que os mataram não perderam asserções.

**Sensor depth**: P0-expanded
**Resultado do sensor (iteração 2)**: 13/13 killed no total da feature (10 da iteração 1 + M9, M10 e M13 agora) — PASS ✅

**Isolamento**: `git status --porcelain` da árvore real idêntico antes e depois (só os 3 arquivos de `.specs/` da iteração 1: `LESSONS.md`, `lessons.json`, `validation.md`); `git worktree list` só com a árvore principal.

### Gate Check (iteração 2)

- **Gate command** (árvore real, só leitura): `npm run typecheck && npm run test:unit && npm run test:integration`
- **Resultado**: typecheck exit 0; unit **780 passed** (35 arquivos), 0 failed; integration **111 passed** (13 arquivos; +2 sobre a iter. 1), 0 failed
- **e2e (2 specs)**: porta 3000 livre antes; `npx playwright test e2e/usuarios-gestao.spec.ts e2e/usuarios-page.spec.ts` → **33 passed** (3,9 min; +3 sobre a iter. 1), exit 0. `test-results/.last-run.json` depois: `{"status":"passed","failedTests":[]}`
- **Skipped**: nenhum. **Failures**: nenhuma. **Testes removidos/enfraquecidos**: nenhum

### Code Quality (iteração 2)

| Principle | Status |
| --------- | ------ |
| Só testes e spec mudaram; código de produção intocado | ✅ |
| Spec-anchored outcome check | ✅ GU-25/GU-35 com o estado gravado; GU-48 com as requisições reais da tela |
| Per-layer Coverage Expectation | ✅ Serviço com estado lido tabela a tabela e campo a campo; tela com os edge cases de lista |
| Every test maps to a spec requirement | ✅ Os 3 e2e novos estão nomeados por GU/edge case |
| L-014 (todo conjunto do critério) | ✅ GU-25 agora afirma o estado gravado |

### Requirement Traceability Update (iteração 2)

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| GU-01 a GU-49 | Implemented (iter. 1: GU-03 ⚠️, GU-25/GU-35/GU-48 ❌ Needs Fix) | ✅ Verified |

(Status registrado aqui; `spec.md` não foi editado pelo Verifier.)

### Summary (iteração 2)

**Overall**: ✅ Ready

**Spec-anchored check**: 49/49 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 13/13 mutations killed
**Gate**: typecheck ok; unit 780, integration 111, e2e (2 specs) 33 passed, 0 failed

**Lessons**: nenhuma nova (PASS limpo). As lições L-042…L-048 e a penalidade de L-014 vêm da iteração 1.

---

## Histórico: iteração 1 (HEAD `6af41ff`), FAIL ❌

Conteúdo da iteração 1 preservado abaixo, com as citações relativas a `6af41ff`. Foram feitas duas mudanças de forma: os títulos desceram um nível, e o rótulo "Result" do sensor virou "Resultado do sensor (iteração 1)". Assim `validate_state.py`, que lê toda linha `**Result**:`, não mistura o veredito antigo com o atual.

**Date**: 2026-10-13
**Spec**: `.specs/features/gestao-de-usuarios/spec.md`
**Diff range**: `3c46d53..HEAD` (código `280284a`..`6af41ff`, 16 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: FAIL ❌. Dois mutantes sobreviveram (M9 → GU-25, M10 → GU-35), a metade "telas" de GU-48 não tem evidência e um edge case não tem teste. Gates verdes.

---

### Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T13 | ✅ Done | `tasks.md` com todos os "Done when" marcados; 16 commits na faixa (inclui 3 `fix`/`test` pós-T13: `00724f3`, `4aae17a`, `6af41ff`) |

---

### Spec-Anchored Acceptance Criteria

Arquivos: `G` = `src/lib/auth/guards.test.ts`, `P` = `src/lib/usuarios/paginacao.test.ts`, `S` = `src/lib/validation/schemas/gestao-usuario.schema.test.ts`, `N` = `src/lib/ui/navegacao.test.ts`, `CI` = `src/lib/usuarios/consulta.integration.test.ts`, `GI` = `src/lib/usuarios/gestao.integration.test.ts`, `EA` = `e2e/usuarios-gestao.spec.ts`, `EU` = `e2e/usuarios-page.spec.ts`, `IV` = `e2e/identidade-visual.spec.ts`.

#### P1: Página "Gestão de usuários"

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| GU-01 | Item "Gestão de usuários" → `/usuarios` para AM/GT/GO e nenhum outro | `N:83-87` `expect(rotuloDe(tipo, "/usuarios")).toBe("Gestão de usuários")` (AM, GT, GO); `N:89-93` `expect(hrefsDe(VT/VO/AL)).not.toContain("/usuarios")`; `IV:260`, `IV:325` `toHaveText([... "Gestão de usuários" ...])`; `IV:357` VT `toHaveCount(0)` | ✅ PASS |
| GU-02 | `/usuarios/novo` → `/usuarios` | `EU:263-267` `page.goto("/usuarios/novo")` → `expect(page).toHaveURL(/\/usuarios$/)` + formulário visível | ✅ PASS |
| GU-03 | Formulário de criação (mesmos campos/regras) **acima** da lista | Mesmos campos/regras: os 6 testes pré-existentes, agora em `/usuarios` (`EU:89-253`, ex.: `EU:102` `expect(opcoes).toEqual(["Selecione", "Visualizador Ofertante", "Aluno"])`). "Acima da lista": nenhuma asserção de ordem | ❌ GAP (parte "acima", cosmética) |
| GU-04 | AM/GT: escopo = todos os usuários | `CI:129-134` GT `expect(documentosDe(pagina).sort()).toEqual([...DOCUMENTOS].sort())` + `total` 10 (todos os 6 tipos nos fixtures); AM: `CI:218-225` `exigirAlvoEditavel(editorAm, GT)` resolve (mesmo `where`) | ✅ PASS |
| GU-05 | GO: exatamente VOs com `cdOfertante` = CNPJ + ALs com matrícula em curso do GO | `CI:122-127` `expect(...).toEqual([VO_A, AL_A].sort())` e `total` 2 (exclui VO_B, AL_B, AL_SEM, o próprio GO); `EU:404` `toHaveCount(2)` | ✅ PASS |
| GU-06 | VT/VO/AL: sem lista | `CI:142-144` `whereUsuariosVisiveis(...)` `toBeNull()` p/ VT, VO, AL; `EU:489-499` VT: `lista-usuarios`, chips, "Página X de Y" `toHaveCount(0)` | ✅ PASS |
| GU-07 | Linha: nome, documento, `NOME_TIPO_USUARIO`, e-mail | `EU:406-414` `toContainText(CPF_VO_LISTA)`, `"Visualizador Ofertante"`, `EMAIL_VO_LISTA` (idem Aluno) | ✅ PASS |
| GU-08 | Criar recarrega a lista (filtro mantido) sem recarregar a página | `EU:463-487` busca ativa → cria → `linhas toHaveCount(1)` + marca `window.semRecarga` `toBe(true)` | ✅ PASS |

#### P1: Paginar, filtrar e buscar

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| GU-09 | "Todos" + 6 chips p/ AM/GT; "Todos" + VO + AL p/ GO | `EU:401` `toHaveText(["Todos", "Visualizador Ofertante", "Aluno"])`; `P:24-26` `tiposVisiveis(AM/GT)` `toEqual(["AM","GT","VT","GO","VO","AL"])`; `P:28-30` GO `["VO","AL"]` | ✅ PASS |
| GU-10 | Chip filtra por tipo; "Todos" lista o escopo | `CI:136-140` `tipo: "AL"` → `toEqual([AL_A, AL_B, AL_SEM].sort())`; "Todos" = sem `tipo` (`CI:129-134`); clique real em `EU:442` | ✅ PASS |
| GU-11 | Nome contém (case-insensitive) ∧ chip; documento só se a busca não tem letra | `CI:146-150` `"gu-t vo"` → `[VO_A, VO_B]`; `CI:152-159` CPF pontuado → `[AL_B]`, `total` 1; `CI:161-170` `"GU-T 4"` → `[VT_MISTO]`, `total` 1; combinação com chip `CI:137` + `EU:442-444` | ✅ PASS |
| GU-12 | "Nenhum usuário encontrado." | `EU:455-457` `getByText("Nenhum usuário encontrado.")` `toBeVisible()` + `linhas toHaveCount(0)` | ✅ PASS |
| GU-13 | ≤ 20 por página, nome ↑ e documento ↑ | `P:5-7` `TAMANHO_PAGINA` `toBe(20)`; `CI:257-266` 20 nomes em ordem; `CI:268-275` `toEqual([..., EMPATE_MENOR, EMPATE_MAIOR])` (inseridos na ordem inversa) | ✅ PASS |
| GU-14 | "Anterior"/"Próxima", "Página X de Y", desabilitados nas pontas | `EU:431-439` `"Página 1 de 2"`, `anterior toBeDisabled()`, `"Página 2 de 2"`, `proxima toBeDisabled()`, `anterior toBeEnabled()` | ✅ PASS |
| GU-15 | Trocar chip/busca volta à página 1 | `EU:441-444` (chip, de pág. 2 → `"Página 1 de 2"`); `EU:446-452` (busca, de pág. 2 → `"Página 1 de 1"`) | ✅ PASS |
| GU-16 | 200 `{usuarios,total,pagina,totalPaginas}`, itens `{documento,nome,email,tipo,editavel}`, ≤ 20, `totalPaginas = max(1, ceil(total/20))` | `EA:121-146` chaves `toEqual(["pagina","total","totalPaginas","usuarios"])`, `length toBeLessThanOrEqual(20)`, `totalPaginas toBe(Math.max(1, Math.ceil(total/20)))`, chaves do item; `P:10-19` `totalPaginas(0)=1 … (41)=3` | ✅ PASS |
| GU-17 | 400 p/ página inválida, tipo inválido, busca > 100, chave extra | `S:23-24` página `0,-1,1.5,"1"` rejeitada; `S:27-28` `tipo "XX"`; `S:31-36` 100 ok / 101 rejeitada; `S:40-45` `unrecognized_keys`; ligação rota→400 `EA:206-215` `res.status() toBe(400)` | ✅ PASS |
| GU-18 | Página além do fim → 200 `usuarios: []` com totais reais | `CI:277-281` `toEqual({ usuarios: [], total: 25, pagina: 3, totalPaginas: 2 })` | ✅ PASS |
| GU-19 | VT/VO/AL → 403 `{ "erro": "Acesso negado" }` | `EA:191-201` VT `status 403` + `toEqual({ erro: "Acesso negado" })`; VO/AL pelo mesmo `whereUsuariosVisiveis === null` (`CI:142-144`) | ✅ PASS |
| GU-20 | `exigirMutacao` (sessão + CSRF) | `EA:177-186` sem CSRF → `403` | ✅ PASS (ligação do guard compartilhado) |

#### P1: Corrigir nome e e-mail

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| GU-21 | editável ⇔ `podeCriar` ∧ no escopo ∧ não é o próprio | Matriz 6×6 escrita à mão: `G:605-629` `it.each(casos)… toBe(esperado)` (36 casos); auto-edição `G:631-638` `toBe(false)`; outro AM `G:640-647` `toBe(true)`; escopo `CI:194-196` (VO de outro GO → 403); `editavel` por linha `CI:172-182` | ✅ PASS |
| GU-22 | "Editar" só em `editavel: true` | `EU:562-571` VT `toHaveCount(1)`, AM e o próprio GT `toHaveCount(0)` | ✅ PASS |
| GU-23 | Form na linha: nome, e-mail, documento preenchidos + Salvar/Cancelar/Resetar senha | `EU:579-587` `toHaveValue("GU-E2E Edicao VT")`, `toHaveValue("vt.edicao@exemplo.com")`, `toHaveValue(CPF_VT_EDICAO)`, Cancelar/Resetar `toBeVisible()`, Salvar clicado | ✅ PASS |
| GU-24 | 200 `{ usuario: {documento,nome,email,tipo} }`, nome/e-mail gravados | `EA:222-241` `toEqual({ usuario: {...} })` + `getUsuario(...).nome`; `GI:113-132` `gravado.nome`, `gravado.email` | ✅ PASS |
| GU-25 | `email` vazio → **gravado** `null` | Só o schema: `S:59-63` `expect(resultado.data?.email).toBeNull()`. Nenhum teste lê `email` `null` no banco depois de uma edição. **Mutante M9 sobreviveu** | ❌ GAP |
| GU-26 | 400 com a mensagem de validação, usuário inalterado | `S:67-71` `"Nome é obrigatório"` (`""`, `"   "`); `S:79-83` `"Email inválido"`; `S:73-77` 256 caracteres só `success toBe(false)`. O spec não define a mensagem do caso > 255 | ✅ PASS / ⚠️ Spec-precision gap (mensagem > 255) |
| GU-27 | 403 `{"erro":"Você não tem permissão para editar este usuário"}` e nada muda | `CI:194-204` `status 403` + `corpo toEqual({ erro })` (fora do escopo e fora da matriz); `EA:246-259` `status 403`, `toEqual({ erro })`, `getUsuario(CPF_VO_DO_GO_B).nome` inalterado | ✅ PASS |
| GU-28 | Inexistente: 404 "Usuário não encontrado" (AM/GT), 403 + msg GU-27 (GO) | `CI:206-212` GT → `404`, `{ erro: "Usuário não encontrado" }`; `CI:198-200` GO → `403`, `SEM_PERMISSAO` | ✅ PASS |
| GU-29 | `exigirMutacao` no PATCH | `EA:264-274` sem CSRF → `403` + banco inalterado | ✅ PASS |
| GU-30 | 400 sem `documentoAtual`, sem campo a alterar, ou com chave extra | `S:85-86`, `S:89-91` `"Nada para alterar"`, `S:96-105` `senha`/`tipo`/`cdOfertante` → `unrecognized_keys`; `EA:279-291` `400` + nome/tipo inalterados | ✅ PASS |
| GU-31 | Sucesso fecha e recarrega; erro mantém aberto com `erro` na linha | `EU:589-592` nome novo, `Salvar toHaveCount(0)`, `textbox toHaveCount(0)`; `EU:605-607` `toContainText("Documento já cadastrado")`, `Salvar toBeVisible()` | ✅ PASS |

#### P1: Corrigir o CPF/CNPJ

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| GU-32 | Troca e responde com o documento novo | `GI:147` `toEqual({ documento: novo, ... })` | ✅ PASS |
| GU-33 | Toda referência → novo, atômico (cada tabela) | GO: `GI:150-158` VO `criadoPor`/`cdOfertante`, verba, pré-curso ofertante+autor, pós-curso → `toBe(novo)`; `GI:162-169` contagem 0 com o antigo em `usuario`(×3), `verba`, `preCurso`(×2), `posCurso`, `sessao`. AL: `GI:208-213` `avaliacaoAluno`, `respostaAvaliacao`, `dadoPessoalAluno` = 1 no novo, 0 no antigo. Atomicidade: `GI:319-325` (rollback) | ✅ PASS |
| GU-34 | Encerra todas as sessões do alvo | `GI:169` antigo `toBe(0)`, `GI:172` novo `toBe(0)` | ✅ PASS |
| GU-35 | Preserva `senhaHash`, `primeiraVez`, `tipo`, `criadoPor`, `dataCriacao` e dados organizacionais/pessoais | `GI:217-220` `expect(depois).toEqual({ ...antes, documento: novo })` (linha inteira). Mas o fixture é um AL com `uf`/`responsavel`/`telefone`/`municipio` nulos: a igualdade não distingue um clobber desses campos. **Mutante M10 sobreviveu** | ❌ GAP (parte "dados organizacionais") |
| GU-36 | 409 `{"erro":"Documento já cadastrado"}`, nada muda, inclusive na corrida | Prévio: `GI:237-250` `409`, `corpo toEqual`, alvo/VO/verba/sessão/ocupado inalterados. Corrida: `GI:317-325` `409` + rollback | ✅ PASS |
| GU-37 | GO + CNPJ inválido → 400 `"CNPJ inválido"` | `GI:260-264` `status 400`, `corpo toEqual({ erro: "CNPJ inválido" })` | ✅ PASS |
| GU-38 | Não-GO + CPF inválido → 400 `"CPF inválido"` | `GI:253-257` `status 400`, `corpo toEqual({ erro: "CPF inválido" })` | ✅ PASS |
| GU-39 | Mesmo documento (normalizado) = sem troca, sessão fica | `GI:267-281` CPF pontuado, `toEqual({ documento, nome corrigido })`, sessão `toBe(1)` | ✅ PASS |
| GU-40 | Só dígitos, 14 (GO, "CNPJ") / 11 (demais, "CPF") | `EU:612-633` `toHaveValue("11222333000181")`, `maxlength "14"`, `getByLabel("CPF") toHaveCount(0)`; VT `toHaveValue("12345678901")`, `maxlength "11"` | ✅ PASS |

#### P1: Resetar a senha

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| GU-41 | `senhaHash null`, `primeiraVez true`, `tentativasFalhas 0`, `bloqueadoAte null`, 200 | `GI:357-361` os 4 campos; `EA:298-320` `200`, `{ ok: true }`, login com senha em branco → `/primeiro-acesso` | ✅ PASS |
| GU-42 | Encerra as sessões | `GI:362` `sessao.count toBe(0)` (havia 2) | ✅ PASS |
| GU-43 | Como GU-27/28, alvo inalterado | `EA:325-338` GT→AM `403` + mensagem + `senhaHash not.toBeNull()`; inexistente: mesmo `exigirAlvoEditavel` (`CI:198-212`) | ✅ PASS |
| GU-44 | `exigirMutacao`; 400 sem `documento` ou com chave extra | `EA:343-353` sem CSRF `403`; `EA:358-368` `senha` → `400`; `S:126-127` `{}` rejeitado; `S:131-136` `unrecognized_keys` | ✅ PASS |
| GU-45 | Confirmação na linha antes de enviar | `EU:663-668` "Confirmar reset"/"Cancelar" visíveis e `senhaHash not.toBeNull()` antes de confirmar | ✅ PASS |
| GU-46 | Texto exato de sucesso | `EU:672-677` `getByText("Senha resetada. No próximo acesso, o usuário entra com a senha em branco.", { exact: true })` | ✅ PASS |
| GU-47 | Nenhuma rota aceita senha do gestor | `S:96-105` (edição, `senha`), `S:131-136` (reset); `EA:358-368` `400` + senha intacta; consulta `.strict()` `S:40-45` | ✅ PASS |

#### P1: Documento fora da URL

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| GU-48 | Documento-alvo, documento novo e busca só no corpo, em **todas as rotas e telas** | Rotas: `EA:157`, `EA:231`, `EA:307` `expect(res.url()).toBe(\`${BASE_URL}/api/usuarios/...\`)` com o documento no corpo (o contrato das rotas funciona sem documento na URL). Telas: nenhum teste observa as requisições que `GestaoUsuarios.tsx`/`LinhaUsuario.tsx` disparam (sem `waitForRequest`/`request.url()`). Uma mudança do cliente para `/api/usuarios/consulta?busca=…` passaria em todos os testes | ❌ GAP (metade "telas") |
| GU-49 | URL de `/usuarios` sem query string ao filtrar/buscar/paginar/editar/resetar | `EU:460` `expect(page.url()).toMatch(/\/usuarios$/)` depois de busca, paginação e chip; `EU:682` idem depois de editar + resetar | ✅ PASS |

**Status**: ❌ Gaps present — 45/49 ACs com evidência completa; GU-03, GU-25, GU-35, GU-48 com uma parte sem evidência. ⚠️ 2 spec-precision gaps.

#### Spec-precision gaps

1. **GU-26**: "responder 400 com a mensagem de validação" não fixa a mensagem do nome > 255 (o código usa "Nome deve ter no máximo 255 caracteres"; `S:73-77` só afirma a falha).
2. **GU-33 × GU-34**: GU-33 lista "sessões" entre as referências que passam a apontar para o documento novo, e GU-34 manda encerrá-las. O estado final (zero sessões) só sai de GU-34; o spec deveria nomear um estado só.

---

### Edge Cases

- [x] GO com cursos, verbas e VOs troca o CNPJ: tudo no novo — `GI:135-172`
- [x] Alvo bloqueado: o reset desbloqueia — `GI:340-361` (`tentativasFalhas 3`, `bloqueadoAte` futuro → `0`/`null`)
- [x] Pontuação em `documentoAtual`/`documentoNovo`/`documento` normalizada — `S:108-114`, `EA:227` (PATCH), `GI:276` (`documentoNovo`), `S:119-123` + `EA:303` (reset)
- [ ] **Edição/reset esvazia a última linha → recarregar; página > `totalPaginas` → "Nenhum usuário encontrado." com "Anterior" habilitado** — sem evidência. Só o servidor (`CI:277-281`) está provado; o comportamento da tela não tem teste
- [~] **Lista do GO vazia → "Nenhum usuário encontrado." e "Página 1 de 1"** — parcial: `P:11` (`totalPaginas(0) = 1`) e `EU:455-457` (mensagem para o GT). Nenhum teste abre a lista vazia de um GO nem afirma "Página 1 de 1" com zero linhas
- [x] Só o e-mail de um usuário sem nome — `EU:636-653` (`email` gravado, `nome toBeNull()`)

---

### Discrimination Sensor

Scratch: `git worktree` descartável em `<scratchpad>/wt` (fora do repo), `src/generated` copiado, `node_modules` por junction (removida antes do `worktree remove`). Unit e integration rodaram no worktree; integration contra o `spma_test` real. Baseline sem mutação no worktree: unit 161/161, integration (`src/lib/usuarios/`) 29/29.

| # | File:line | Description | Teste que mata | Killed? |
| - | --------- | ----------- | -------------- | ------- |
| M1 | `src/lib/auth/permissoes.ts:220` | `podeEditarUsuario` sem `&& alvo.documento !== editor.documento` | `G:631` "AM não edita o próprio documento" | ✅ Killed |
| M2 | `src/lib/usuarios/consulta.ts:69` | GO: `{ tipo: "AL" }` sem o filtro de matrícula | `CI:122` GU-05 | ✅ Killed |
| M3 | `src/lib/usuarios/gestao.ts:108` | Não religa `criadoPor` (lista vazia no `updateMany`) | `GI:151` `expected null to be '<novo>'` | ✅ Killed |
| M4 | `src/lib/usuarios/gestao.ts:117` | Sem `tx.sessao.deleteMany` | `GI:172` `expected 1 to be 0` | ✅ Killed |
| M5 | `src/lib/usuarios/gestao.ts:144` | `resetarSenha` sem `bloqueadoAte: null` | `GI:340` GU-41/42 | ✅ Killed |
| M6 | `src/lib/usuarios/consulta.ts:190` | `exigirAlvoEditavel` devolve 404 também para GO | `CI:194` GU-27 e `CI:198` GU-28 | ✅ Killed |
| M7 | `src/lib/usuarios/paginacao.ts:17` | `totalPaginas` sem `Math.max(1, …)` | `P:11` "total 0 → 1 páginas" | ✅ Killed |
| M8 | `src/lib/usuarios/consulta.ts:98` | `whereDaBusca` compara documento mesmo com letra | `CI:161` GU-11 "GU-T 4" | ✅ Killed |
| M9 | `src/lib/usuarios/gestao.ts:72` | Edição sem troca grava `email: email ?? undefined` (um `null` vira "não alterar") | — | ❌ Survived → Fix 1 |
| M10 | `src/lib/usuarios/gestao.ts:103` | Troca de documento zera `uf`, `responsavel`, `telefone`, `municipio` | — | ❌ Survived → Fix 2 |
| M11 | `src/lib/usuarios/consulta.ts:165` | `buscarUsuarioVisivel` sem o escopo (`where: { documento }`) | `CI:194` GU-27 | ✅ Killed |
| M12 | `src/lib/usuarios/gestao.ts:124` | `P2002` dentro da transação não vira 409 | `GI:284` GU-36 corrida | ✅ Killed |

**Não executado (limitação de ambiente)**: um mutante só de e2e para GU-48 (cliente pondo a busca na query string). O Turbopack rejeita `node_modules` por junction fora da raiz, então o e2e não sobe no worktree, e a árvore real não pode ser mutada. A análise dos testes acima mostra que nenhuma asserção observa a URL das requisições da tela, por isso a lacuna está registrada como **GAP de evidência de GU-48**, não como resultado do sensor.

Para M9 e M10, nenhum e2e envia `email: ""` nem confere dados organizacionais depois de uma troca de documento (busca no `e2e/`), então nenhuma camada mata esses mutantes.

**Sensor depth**: P0-expanded (chave primária + autorização), 12 mutações manuais
**Resultado do sensor (iteração 1)**: 10/12 killed — FAIL ❌

**Isolamento**: `git status --porcelain` da árvore real vazio antes e depois do sensor (idêntico); `git worktree list` só com a árvore principal.

---

### Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (o rename de `NovoUsuarioForm` traz só `aoCriar`; `route.ts` ganha o `PATCH` e o SPEC_DEVIATION atualizado) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`exigirMutacao` → `corpoValidado` → guarda → serviço, como as demais rotas) |
| Spec-anchored outcome check | ❌ GU-25 e GU-35 com estado não discriminado; GU-48 sem evidência na tela |
| Per-layer Coverage Expectation | ⚠️ Serviço: falta o estado de GU-25 e um fixture de GO com dados organizacionais (GU-35). Rotas: happy + 403 + 400 + CSRF nas três |
| Every test maps to a spec requirement | ✅ (os 6 e2e pré-existentes preservados no rename cobrem GU-03 e CA-AU-05/REQ-OV-08/AVAL-01 herdados) |
| Documented guidelines followed | ✅ `AGENTS.md` (AD-039: os `.tsx` novos usam só tokens, como `text-muted-foreground`, `border-border` e `text-destructive`; a navegação sai de `navegacao.ts`), `tasks.md` Test Coverage Matrix, L-014 |

---

### Gate Check

- **Gate command** (árvore real, só leitura): `npm run typecheck && npm run test:unit && npm run test:integration`
- **Result**: typecheck exit 0; unit **780 passed** (35 arquivos), 0 failed; integration **109 passed** (13 arquivos), 0 failed
- **e2e (2 specs)**: `npx playwright test e2e/usuarios-gestao.spec.ts e2e/usuarios-page.spec.ts` → **30 passed** (3.6 min), exit 0; porta 3000 livre antes. `test-results/.last-run.json` depois: `{"status":"passed","failedTests":[]}`
- **Full-feature anterior**: `test-results/.last-run.json` antes desta validação: `{"status":"passed","failedTests":[]}` (13:46). Não reexecutado (instrução do orquestrador)
- **Test count before/after**: não medido com contagem total. Os 6 testes de `e2e/usuarios-novo-page.spec.ts` (em `3c46d53`) estão todos em `e2e/usuarios-page.spec.ts` (rename); +38 em `guards.test.ts` (36 da matriz + 2), +13 em `paginacao.test.ts`, +schema, +2 em `navegacao.test.ts`, +20 em `consulta.integration`, +9 em `gestao.integration`, +13 em `usuarios-gestao.spec.ts`, +11 e2e de UI. Nenhuma asserção existente enfraquecida (`identidade-visual.spec.ts`: só rótulo/href trocados)
- **Skipped tests**: nenhum (`.skip`/`.only` ausentes no escopo)
- **Failures**: nenhuma

---

### Fix Plans

#### Fix 1: GU-25 sem o estado gravado (M9 sobreviveu)

- **Root cause**: o `null` do e-mail vazio é provado só na saída do schema (`S:59-63`); nenhum teste lê o banco depois de editar com e-mail vazio.
- **Fix task**: em `src/lib/usuarios/gestao.integration.test.ts`, um usuário com `email: "x@exemplo.com"` recebe `atualizarCadastro(alvo, { email: null })`, e o teste afirma `prisma.usuario.findUniqueOrThrow(...).email` `toBeNull()`. Opcional: o mesmo no caminho com `documentoNovo`.
- **Done when**: M9 (`email: email ?? undefined` em `gestao.ts:72`) é morto.
- **Priority**: Major

#### Fix 2: GU-35 não discrimina os dados organizacionais (M10 sobreviveu)

- **Root cause**: a igualdade de linha inteira em `GI:217-220` roda sobre um AL cujos campos organizacionais são `null`, então zerá-los não muda nada.
- **Fix task**: no teste de troca de CNPJ do GO (`GI:135`), crie o GO com `uf`, `responsavel`, `telefone`, `municipio` e `dadosOrganizacionaisCompletos: true`. Leia a linha antes da troca e afirme `toEqual({ ...antes, documento: novo })` depois.
- **Done when**: M10 é morto.
- **Priority**: Major

#### Fix 3: GU-48 sem evidência nas telas

- **Root cause**: as asserções de URL de GU-48 (`EA:157/231/307`) leem a URL que o próprio teste montou. As requisições que a UI dispara não são observadas.
- **Fix task**: em `e2e/usuarios-page.spec.ts`, registre `page.on("request")` (ou `waitForRequest`) durante busca por CPF, paginação, edição com troca de documento e reset. Afirme que nenhuma `request.url()` de `/api/usuarios*` tem `?` nem os dígitos de documento envolvidos.
- **Done when**: um cliente que ponha a busca na query string falha o teste.
- **Priority**: Major (requisito de privacidade explícito, AD-029)

#### Fix 4: edge case "esvaziar a última linha da página"

- **Fix task**: e2e com 21 fixtures, na página 2 (1 linha). Troque o documento dessa linha para fora da busca e afirme "Nenhum usuário encontrado." e "Anterior" `toBeEnabled()`.
- **Priority**: Minor

#### Fix 5: edge case "lista do GO vazia" e GU-03 "acima da lista"

- **Fix task**: e2e com um GO sem VO/AL: `"Nenhum usuário encontrado."` + `getByText("Página 1 de 1", { exact: true })`. No mesmo teste ou num existente, afirme que o card "Novo usuário" vem antes do card "Usuários" (ordem no DOM ou `boundingBox().y`).
- **Priority**: Minor / Cosmetic

---

### Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| GU-01, GU-02, GU-04–GU-24, GU-26–GU-34, GU-36–GU-47, GU-49 | Implemented | ✅ Verified |
| GU-03 | Implemented | ⚠️ Verified (parte "acima" sem teste) |
| GU-25 | Implemented | ❌ Needs Fix (teste) |
| GU-35 | Implemented | ❌ Needs Fix (teste) |
| GU-48 | Implemented | ❌ Needs Fix (teste, metade "telas") |

(Status registrado aqui; `spec.md` não foi editado pelo Verifier.)

---

### Summary

**Overall**: ❌ Not Ready (as lacunas são de teste; o código observado cumpre o spec em todos os pontos lidos)

**Spec-anchored check**: 45/49 ACs com evidência completa | 2 spec-precision gaps
**Sensor**: 10/12 mutations killed (M9, M10 survived)
**Gate**: typecheck ok; unit 780, integration 109, e2e (2 specs) 30 passed, 0 failed

**What works**: matriz de edição completa e auto-edição; escopo GO/GT; busca com a regra "letra ⇒ só nome"; paginação estável com desempate; troca de PK com soltar/religar auto-referências e prova tabela a tabela; 409 prévio e na corrida com rollback; reset completo; contrato e ligação CSRF/403/400 das três rotas; URL da página sem query string.

**Issues found**: Fix 1 (GU-25), Fix 2 (GU-35), Fix 3 (GU-48 telas), Fix 4–5 (edge cases e GU-03).

**Next steps**: rotear os Fix 1–3 (Major) para um implementador e reverificar (iteração 1 de 3).
