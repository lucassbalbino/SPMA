# revisao-usabilidade-1 Validation

## Validation: revisao-usabilidade-1 - FAIL

**Date**: 2026-11-12
**Spec**: `.specs/features/revisao-usabilidade-1/spec.md` (RU-01..RU-62)
**Diff range**: `main..2714d42` (merge-base `2f1df57`; 37 commits, `95caecc docs(revisao-usabilidade): specify the client usability review` .. `2714d42 docs(revisao-usabilidade): record AD-054 and deploy note`)
**Verifier**: independent sub-agent (author != verifier). Read-only over the real tree; every mutation ran in a detached scratch worktree.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T32 (32 tasks) | ✅ Done | All `Status: Done`, every Done-when box checked in `tasks.md`. |
| No migration | ✅ | `git diff main...HEAD -- prisma` is empty (Success Criterion). |

---

## Spec-Anchored Acceptance Criteria

Legend: ✅ PASS (asserted value = spec outcome) · ⚠️ spec-precision gap · ❌ GAP (no evidence or wrong layer for the claim) · ◐ partial (one conjunct unasserted, L-014).

### P1: Salvar e concluir sem pendência fantasma

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-01 | 2xx on Salvar → "Campos pendentes" empty AND "Alterações salvas." | `e2e/pos-cursos-formulario.spec.ts:344` `expect(getByTestId("lista-pendencias")).toHaveCount(0)` + `:345` `toHaveText("Alterações salvas.")` | ✅ (M12 killed) |
| RU-02 | Concluir with unsaved changes → "Salve antes de concluir.", no dialog, no conclusion request | `e2e/pos-cursos-formulario.spec.ts:336` `toHaveText("Salve antes de concluir.")`; `:338` `getByTestId("confirmacao")).toHaveCount(0)`; `:340` `expect(pedidosDeEncerramento).toBe(0)`; `:339` status "Em andamento" | ✅ (M13 killed) |
| RU-03 | After saving, Concluir opens the dialog again and concludes | `e2e/pos-cursos-formulario.spec.ts:348` `expect((await encerrar(page)).ok()).toBe(true)` (helper clicks Concluir then "Sim") + `:349` `toHaveText("Encerrado")` | ✅ |

### P1: Mensagens de validação em português e com a pergunta

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-04 | Zod configured in Portuguese (browser and server) | `src/lib/api/requisicao.test.ts:96` `corpo: { erro: "Muito grande: esperado que number fosse <=100" }`; browser receives it `e2e/pre-cursos-formulario.spec.ts:368` | ✅ (server path asserted; browser-side default message not asserted, but each schema imports `zod-pt` in the module both sides load) |
| RU-05 | Questionnaire PATCH 400 → `erro` (pt) + `campo` (first issue key) | Unit: `src/lib/api/requisicao.test.ts:73` `corpo: { erro: "Nome é obrigatório", campo: "nome" }`. Route: pre-curso only, `e2e/pre-cursos-id.spec.ts:196-197` `toEqual({ erro: "Nome da formação é obrigatório", campo: "qualifNomeCurso" })`. **No test asserts `campo` on `PATCH /api/avaliacoes/...` or `PATCH /api/pos-cursos/...`** | ❌ GAP (2 of 3 questionnaire routes unproven, M14 survived) |
| RU-06 | Form shows `<rótulo>: <erro>` | `e2e/pre-cursos-formulario.spec.ts:368` `toHaveText("18. Taxa de evasão esperada (%): Muito grande: esperado que number fosse <=100")` | ✅ (pre-curso; the other two forms share `CascaFormulario`, but their routes' `campo` is unproven, see RU-05) |
| RU-07 | Q17 with >3 reasons → API 400 `erro` "Selecione no máximo 3 motivos" | Schema only: `src/lib/validation/schemas/avaliacao.schema.test.ts:213-214` `path).toEqual(["avalMotivMotivosParticipacao"])`, `message).toBe("Selecione no máximo 3 motivos")`. No API-level assertion; the story's Independent Test names `campo: "avalMotivMotivosParticipacao"` on the PATCH response | ◐ partial (message proven at schema layer; 400+`campo` at the route not asserted) |
| RU-08 | 3 ticked → unticked options disabled | `e2e/avaliacoes-formulario.spec.ts:400` `toBeDisabled()` for 3,4,5; `:404` ticked stay enabled; `:410` untick re-enables | ✅ (M20, see sensor) |
| RU-09 | Exact Part 2 notice text | `e2e/avaliacoes-formulario.spec.ts:372-373` `toHaveText("Para liberar a Parte 2, responda todas as perguntas da Parte 1 e clique em Salvar.")` | ✅ |

### P1: Nome da formação no lugar do código

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-10 | P8 trimmed, or `Formação sem nome (nº <cdCurso>)` for empty/null/spaces | `src/lib/cursos/nome.test.ts:10` `toBe("Mecânica Básica")` (trim); `:19` `toBe("Formação sem nome (nº 7)")` for `"   "`, `""`, `null`, `undefined` | ✅ (M08 killed) |
| RU-11 | 3 lists show the name and never `#<cdCurso>` | `e2e/pre-cursos-page.spec.ts:141-142`, `e2e/pos-cursos-page.spec.ts:147-148`, `e2e/avaliacoes-page.spec.ts:158-159`: name + fallback visible, `not.toContainText("Pré-curso #")` / `"Pós-curso #"` / `"Avaliação #"` | ✅ (note: the absence check targets the old prefix, not the bare `#<cdCurso>` the spec names; low risk) |
| RU-12 | Title `Cadastro de Formação - <nome>` | `e2e/pre-cursos-formulario.spec.ts:324` `toHaveText("Cadastro de Formação - Guia de Turismo Local")` | ✅ |
| RU-13 | Title `Avaliação de Formação - <nome>`, released or not | released: `e2e/pos-cursos-formulario.spec.ts:258-259`; waiting: `:236` `toHaveText(\`Avaliação de Formação - Formação sem nome (nº ${cdCurso})\`)` | ✅ |
| RU-14 | Title `<nome> - CPF <cpf formatado>` | `e2e/avaliacoes-formulario.spec.ts:340-341` `toHaveText(\`Artesanato Local - CPF ${cpfFormatado}\`)` | ✅ |
| RU-15 | Closed selector shows the same text as the option | `e2e/cursos-novo.spec.ts:113-115` `[data-slot="select-value"]).toHaveText("Capacitação GO — saldo R$ 1000.00")` | ✅ |
| RU-16 | Resource shown only by `dsVerba`, no `#<cdVerba>` "nem outro identificador" | list: `e2e/verbas-page.spec.ts:106` `not.toContainText(\`#${cdVerbaA}\`)`, `:223`, `:316`; selector: `e2e/cursos-novo.spec.ts:97-98` `"Capacitação GO — saldo R$ 1000.00"`, `:126-127` `"Ofertante Novo Pré-Curso — Capacitação GO — saldo R$ 1000.00"` | ⚠️ Spec-precision gap: spec says "só pelo nome" / assumption "sem nenhuma informação extra", but the selector label adds the balance and, for AM, the ofertante name (as `tasks.md` T9 planned). `#n` is gone either way |
| RU-57 | Empty/blank name → "Nome da formação é obrigatório", nothing created | `src/lib/validation/schemas/pre-curso.schema.test.ts:141-142` (absent, `""`, `"   "`); API `e2e/pre-cursos.spec.ts:157-158` `erro).toBe("Nome da formação é obrigatório")` + count unchanged; UI `e2e/cursos-novo.spec.ts:169-171` | ✅ |
| RU-58 | `POST /api/cursos` writes trimmed name into P8, same transaction | `e2e/pre-cursos.spec.ts:115` persisted `respostas).toEqual({ qualifNomeCurso: NOME_FORMACAO })` (sent with surrounding spaces); `:122` via GET; UI `e2e/cursos-novo.spec.ts:150` `toHaveValue("Mecânica Básica")` | ✅ (M10 killed) |
| RU-59 | PATCH Q8 blank → 400 `erro` + `campo: "qualifNomeCurso"` | `e2e/pre-cursos-id.spec.ts:194-199` `toEqual({ erro: "Nome da formação é obrigatório", campo: "qualifNomeCurso" })`, previous name kept | ✅ |
| RU-60 | `dsVerba` label "Nome do recurso" on create and edit | create `e2e/verbas-page.spec.ts:193` `getByLabel("Nome do recurso")).toBeVisible()`; edit `:303-304` `linha.getByLabel("Nome do recurso")` `toHaveValue("Verba E original")` | ✅ |

### P1: Concluir com confirmação e aviso de salvamento

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-17 | Button "Concluir" in the 3 forms; status label stays "Encerrado" | Each form's `encerrar` helper clicks `getByRole("button", { name: "Concluir" })` (`e2e/pre-cursos-formulario.spec.ts:113`, `e2e/pos-cursos-formulario.spec.ts:151`, `e2e/avaliacoes-formulario.spec.ts:126`); status `e2e/pre-cursos-formulario.spec.ts:423` `toHaveText("Encerrado")` | ✅ |
| RU-18 | Dialog with exact text, "Sim" and "Não" | `e2e/pre-cursos-formulario.spec.ts:453-454` `toContainText("Após a conclusão não será possível alterar os dados, tem certeza que deseja concluir?")`; `:456` "Sim" visible; `:458` "Não" clicked | ✅ (M21, see sensor) |
| RU-19 | "Não" closes, saves nothing, concludes nothing | `e2e/pre-cursos-formulario.spec.ts:459` dialog `toHaveCount(0)`; `:460` "Em andamento"; `:461` `expect(pedidos).toBe(0)` (no non-GET request) | ✅ |
| RU-20 | Fixed notice under the status while editable | `e2e/pre-cursos-formulario.spec.ts:485-486` `toHaveText("O sistema não salva automaticamente. Salve o progresso do cadastramento.")`; absent when read-only `:491` | ✅ |

### P1: Excluir formação

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-21 | "Excluir" while in progress and `podeGerenciarPreCurso` | shown: `e2e/pre-cursos-formulario.spec.ts:561` (clicked by GO); hidden when concluded `:613`, hidden for VO `:618` | ✅ |
| RU-22 | Confirmation with the exact text, Sim/Não | `e2e/pre-cursos-formulario.spec.ts:563-564` `toContainText("Tem certeza que deseja excluir o cadastro? Após a exclusão não será possível recuperar os dados.")` | ✅ |
| RU-23 | DELETE removes curso+pré+pós in a transaction, 200, screen goes to `/pre-cursos` | `src/lib/cursos/exclusao.integration.test.ts:91` `toEqual(NENHUMA)` (curso, pré, pós = 0); `e2e/cursos-excluir.spec.ts:105-107` `status).toBe(200)`, `{ ok: true }`; UI `e2e/pre-cursos-formulario.spec.ts:568` `toHaveURL(/\/pre-cursos$/)` | ✅ |
| RU-24 | Resource balance includes the freed amount again | `src/lib/cursos/exclusao.integration.test.ts:98` `toBe(antes - 400)` then `:102` `toBe(antes)` | ✅ |
| RU-25 | With a student → 409 with exact text, nothing deleted | `src/lib/cursos/exclusao.integration.test.ts:112-117` `status).toBe(409)`, exact `erro`, `linhas).toEqual(TODAS)`; route `e2e/cursos-excluir.spec.ts:116-118`; UI `e2e/pre-cursos-formulario.spec.ts:588-592` | ✅ (M01 equivalent, see sensor) |
| RU-26 | Concluded → 409 with exact text, nothing deleted | `src/lib/cursos/exclusao.integration.test.ts:127-129`; `e2e/cursos-excluir.spec.ts:127-129` | ✅ (M02 killed) |
| RU-27 | Not manager → 403; missing → 404 | `src/lib/cursos/exclusao.integration.test.ts:141-142` 403 + nothing gone (GO alheio, VO); `:161-162` 404 `"Formação não encontrada"`; route `e2e/cursos-excluir.spec.ts:137`, `:148-149`; CSRF `:162` | ✅ (M17 killed) |

### P1: Excluir aluno

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-28 | "Excluir" on an Aluno row being edited, not on other profiles | absent on VT row `e2e/usuarios-page.spec.ts:883`; present on AL row (clicked) `:899` | ✅ |
| RU-29 | Same confirmation as RU-22 | `e2e/usuarios-page.spec.ts:901-902` `toContainText("Tem certeza que deseja excluir o cadastro? ...")` | ✅ |
| RU-30 | `POST /api/usuarios/excluir` (document in body) deletes user, enrollments, sessions; 200 | `src/lib/usuarios/excluir-aluno.integration.test.ts:90` `toEqual({ usuario: 0, avaliacoes: 0, sessoes: 0 })` (2 enrollments + 1 session before); route `e2e/usuarios-gestao.spec.ts:489-491` 200, `{ ok: true }`, user gone; UI `e2e/usuarios-page.spec.ts:906-907` | ✅ (M16 killed) |
| RU-31 | Personal data, concluded or answered evaluation → 409 exact text, nothing deleted | `src/lib/usuarios/excluir-aluno.integration.test.ts:100-102` (dados pessoais), `:114-116` (one answer), `:128-130` (ENCERRADO): `status 409`, `corpo).toEqual(MENSAGEM)`, counts unchanged; route `e2e/usuarios-gestao.spec.ts:451-453`; UI `e2e/usuarios-page.spec.ts:892` | ✅ (M03, M04 killed) |
| RU-32 | Target not Aluno → 400 "Só é possível excluir aluno." | `src/lib/usuarios/excluir-aluno.integration.test.ts:137-139`; route `e2e/usuarios-gestao.spec.ts:459-461` | ✅ |
| RU-33 | Out of scope → 403 "Você não tem permissão para editar este usuário"; 404 only for AM | `e2e/usuarios-gestao.spec.ts:467-469` exact 403 body; `:475` AM + missing → 404; CSRF `:481` | ✅ |

### P2: Nomes por extenso e termos do cliente

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-34 | "Olá, <nome>", "Você está no perfil de <por extenso>", "Portanto, está apto a realizar:", module list | `e2e/painel.spec.ts:54` `toHaveText("Você está no perfil de Gestor Turismo")`; `:55` `toHaveText("Portanto, está apto a realizar:")`; `:56-62` module list. **"Olá, <nome>" is not asserted anywhere** (`grep -rn "Olá" e2e` = 0; rendered at `src/app/(protegido)/painel/page.tsx:19`) | ◐ partial (L-014 conjunct missing; the behavior predates the feature) |
| RU-35 | Module names per profile | `src/lib/ui/navegacao.test.ts:190` `modulosDoPerfil(tipo)).toEqual(MODULOS_ESPERADOS[tipo])` with the literals at `:48-65` | ✅ |
| RU-36 | Menu item names | `src/lib/ui/navegacao.test.ts:139-149` exact ordered list; e2e `e2e/identidade-visual.spec.ts:258-267`, `:329-337` | ✅ |
| RU-37 | GO/VO "Recursos Recebidos"; AM/GT "Recursos" | `e2e/verbas-page.spec.ts:115` GO sees "Recursos Recebidos"; AM test `e2e/verbas-page.spec.ts:328-330` sees "Recursos", not "Recursos Recebidos" | ✅ |
| RU-38 | "Usuários Cadastrados" | `e2e/usuarios-page.spec.ts:719` `getByText("Usuários Cadastrados", { exact: true })).toBeVisible()` | ✅ |
| RU-39 | Client terms in every visible message, including API errors | Updated API messages asserted e.g. `e2e/avaliacoes-id.spec.ts:301`, `e2e/pos-cursos-formulario.spec.ts:229`, `e2e/verbas-page.spec.ts:273`, `e2e/usuarios-page.spec.ts:251`; verifier grep of `erroHttp(...)` in `src/app/api/**` finds no remaining "verba/curso/pré-curso/pós-curso" | ⚠️ Spec-precision gap: "toda mensagem visível" is unbounded. Residue: heading `Parte 2 — Avaliação Pós-Curso` (`src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/AvaliacaoForm.tsx:468`); question labels keep "Curso" (`PreCursoForm.tsx:143`, `PosCursoForm.tsx:177`, `AvaliacaoForm.tsx:159`). These are paper-questionnaire texts the spec neither includes nor excludes |

### P2: Datas do planejamento

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-40 | 17b ≥ 13 (merged) → 400 exact text | unit `src/lib/validation/schemas/pre-curso.schema.test.ts:641-643` (same day and later); API `e2e/pre-cursos-id.spec.ts:169-173` 400 + exact `erro` + nothing stored | ✅ (M05, M19 killed) |
| RU-41 | 14 < 13 → 400 exact text | unit `src/lib/validation/schemas/pre-curso.schema.test.ts:654` `toBe("A data de término da formação não pode ser anterior à data de início.")`; route status 400 `e2e/pre-cursos-id.spec.ts:245` (message passthrough is the same `throw erroHttp(400, violacao)` proven by RU-40) | ✅ |
| RU-42 | 17c < 17b → 400 exact text | unit `src/lib/validation/schemas/pre-curso.schema.test.ts:663` `toBe("A data de término da inscrição não pode ser anterior à data de início.")`; same passthrough | ✅ |
| RU-61 | PATCH without any of the 4 dates → stores without date check | `e2e/pre-cursos-encerrar.spec.ts:296-297` `status).toBe(200)` on stored out-of-order dates + value persisted; with a date `:303-304` 400 + message | ✅ (M11 killed) |
| RU-62 | Conclusion with dates out of order → 400 with the rule's message, not concluded | `e2e/pre-cursos-encerrar.spec.ts:307-309` 400, `erro).toBe(mensagem)`, `status).toBe("EM_ANDAMENTO")` | ✅ (M15 killed) |
| Edge | 13 or 17b empty → RU-40 does not apply | `src/lib/validation/schemas/pre-curso.schema.test.ts:647-648` `toBeNull()` | ✅ |

### P2: Telefone/WhatsApp com DDD

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-43 | Label "Telefone/WhatsApp (com DDD)" (ofertante, Editar Perfil) | `e2e/cadastro-ofertante-page.spec.ts:404` `getByLabel("Telefone/WhatsApp (com DDD)", { exact: true })`; `e2e/meus-dados.spec.ts:207`, `:214` | ✅ |
| RU-44 | Mask `(DD) NNNN-NNNN` / `(DD) NNNNN-NNNN` while typing | `src/lib/validation/telefone.test.ts:36-41` (10 and 11 digits, partial, overflow); `e2e/cadastro-ofertante-page.spec.ts:406` `toHaveValue("(61) 99928-1374")` | ✅ |
| RU-45 | Not 10/11 digits or DDD outside 11-99 → exact message | `src/lib/validation/telefone.test.ts:25` (9, 12 digits, DDD 10, DDD 00); `:61-62` exact message; `src/lib/validation/schemas/organizacao.schema.test.ts:44-46` the doc's `999281374`; UI `e2e/cadastro-ofertante-page.spec.ts:420-421` (message shown, no request sent) | ✅ (M06, M07 killed) |
| RU-46 | Valid phone stored as digits only | `src/lib/validation/telefone.test.ts:49` `toBe("61999281374")`; persisted `e2e/perfil.spec.ts:60`, `e2e/meus-dados.spec.ts:185`, `e2e/cadastro-ofertante-page.spec.ts:184` | ✅ |
| Edge | Legacy phone (masked or free text) shown as stored | **No test.** And the code contradicts it: `src/components/perfil/PerfilForm.tsx:32` and `src/components/dados-pessoais/DadosPessoaisForm.tsx:101` initialize the field with `mascaraTelefone(inicial.telefone)`, which strips non-digits and truncates to 11 digits. The masked value is what gets submitted (`PerfilForm.tsx:42`), so a GO who only edits the name silently rewrites a free-text legacy phone (e.g. `"6133334444 / 61999281374"` becomes `"61333344446"`) | ❌ GAP (edge case unhandled, silent data change) |

### P2: Editar Perfil

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-47 | "Editar Perfil" (`/meus-dados`) in all 6 menus | `src/lib/ui/navegacao.test.ts:132-134` `rotuloDe(tipo, "/meus-dados")).toBe("Editar Perfil")` for every type; `e2e/identidade-visual.spec.ts:350` | ✅ |
| RU-48 | AM/GT/VT/GO/VO see current name, e-mail, phone in editable fields | `e2e/meus-dados.spec.ts:204` current name `toHaveValue("GT Editar Perfil")`; `:212-214` new values after reload; AM gets the form `:167-168` | ✅ |
| RU-49 | PATCH writes name, e-mail, phone of the session user; 200 | `e2e/perfil.spec.ts:56-60` 200, `nome`, `email`, `telefone).toBe("61999281374")` | ✅ |
| RU-50 | Empty name or invalid e-mail → 400, nothing written | route: `e2e/perfil.spec.ts:68-70` (invalid e-mail: 400, `"E-mail inválido"`, name unchanged); empty name at schema layer only `src/lib/validation/schemas/perfil.schema.test.ts:20,26` `"Nome é obrigatório"` | ✅ (empty-name branch shares the same `corpoValidado` path) |
| RU-51 | GO with empty phone → 400 "Telefone é obrigatório" | `e2e/perfil.spec.ts:80-82` 400, exact `erro`, stored phone unchanged | ✅ |
| RU-52 | AL → 403 on the profile route; AL form gains optional phone | `e2e/perfil.spec.ts:88-89` 403 + name unchanged; `e2e/meus-dados.spec.ts:185` (saved digits), `:190` (no DDD rejected), `:197` (empty clears) | ✅ |
| RU-53 | Not AM → password notice exact text | `e2e/meus-dados.spec.ts:224` GO and `:229` AL `toHaveText("A troca de senha deve ser pedida ao gestor do seu curso.")`; AM `:170` `toHaveCount(0)` | ✅ |
| RU-54 | No document accepted in URL or body | `e2e/perfil.spec.ts:99-101` other user's `documento` in the body is ignored; `src/lib/validation/schemas/perfil.schema.test.ts:31` stripped; the route has no path param (`src/app/api/usuarios/me/perfil/route.ts:19`) | ✅ |

### P2: Valor previsto

| Req | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RU-55 | Under Q19: "Estava previsto inicialmente R$ 60.000,00" | `e2e/pos-cursos-formulario.spec.ts:431-432` `toHaveText("Estava previsto inicialmente R$ 60.000,00")` | ✅ |
| RU-56 | Q19 does not have to equal the planned value | `e2e/pos-cursos-formulario.spec.ts:435-438` 400000 ≠ 60000 saved, `ok()).toBe(true)`, "Alterações salvas." | ✅ |

**Status**: ❌ Gaps present. 55/62 ✅, 1 ❌ (RU-05), 2 ◐ (RU-07, RU-34), 2 ⚠️ spec-precision (RU-16, RU-39); 1 edge case ❌ (legacy phone).

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/verifier-wt HEAD`, with a `node_modules` junction, `.env`/`.env.test` copies and `src/generated` copied. Harness-only change in the scratch: `turbopack: { root: "C:\\Users\\lucas" }` in `next.config.ts`, needed because Turbopack refuses a junctioned `node_modules` outside the root. Each mutant was one exact string replacement, ran against its targeted tests, and was reverted with `git checkout -- <file>` (`git status -- src e2e` was empty after each one).

| # | File:line | Mutation | Tests run | Result |
| - | --------- | -------- | --------- | ------ |
| M01 | `src/lib/cursos/exclusao.ts:44` | drop `_count.avaliacoes > 0` check | `exclusao.integration.test.ts` | ⚪ Survived, **equivalent**: the FK on `TB_Avaliacao_Aluno` rejects the DELETE (P2003), which the catch at `:56` maps to the same 409 and message. This shows the race-path fallback works |
| M02 | `src/lib/cursos/exclusao.ts:48` | drop the `ENCERRADO` check | `exclusao.integration.test.ts` | ✅ Killed (`:125`) |
| M03 | `src/lib/usuarios/gestao.ts:192` | skip the `lerRespostas` "has answers" check | `excluir-aluno.integration.test.ts` | ✅ Killed (`:112`) |
| M04 | `src/lib/usuarios/gestao.ts:186` | skip the `dadosPessoais` check | `excluir-aluno.integration.test.ts` | ✅ Killed (`:98`) |
| M05 | `src/lib/validation/schemas/pre-curso.schema.ts:393` | `inscricao >= formacao` → `>` | `pre-curso.schema.test.ts` | ✅ Killed (same-day case) |
| M06 | `src/lib/validation/telefone.ts:22` | DDD lower bound 11 → 10 | `telefone.test.ts` | ✅ Killed |
| M07 | `src/lib/validation/telefone.ts:18` | accept 9-11 digits | `telefone.test.ts`, `organizacao.schema.test.ts` | ✅ Killed (3 tests) |
| M08 | `src/lib/cursos/nome.ts:8` | no `trim()` | `nome.test.ts` | ✅ Killed (2 tests) |
| M09 | `src/lib/api/requisicao.ts:51` | never add `campo` | `requisicao.test.ts` | ✅ Killed |
| M10 | `src/app/api/cursos/route.ts:78` | don't write the name into P8 | `e2e/pre-cursos.spec.ts -g "nasce s"` | ✅ Killed (`:115`) |
| M11 | `src/app/api/pre-cursos/[id]/route.ts:79` | always check dates (drop the RU-61 guard) | `e2e/pre-cursos-encerrar.spec.ts -g RU-61` | ✅ Killed (`:296`) |
| M12 | `src/components/formulario/useFormularioRespostas.ts:124` | don't clear `pendentes` after save | `e2e/pos-cursos-formulario.spec.ts -g RU-01` | ✅ Killed (`:344`) |
| M13 | `src/components/formulario/useFormularioRespostas.ts:143` | don't block Concluir with unsaved changes | `e2e/pos-cursos-formulario.spec.ts -g RU-01` | ✅ Killed (`:336`) |
| M14 | `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:107` | drop `informarCampo: true` | `e2e/avaliacoes-id.spec.ts` (whole spec) | ❌ **Survived**: 18/18 passed. No test asserts `campo` on this route (non-equivalent: RU-05 requires it) → Fix 1 |
| M15 | `src/app/api/pre-cursos/[id]/encerrar/route.ts:47` | conclusion skips the date check | `e2e/pre-cursos-encerrar.spec.ts -g RU-61` | ✅ Killed (`:307`) |
| M16 | `src/lib/usuarios/gestao.ts:197` | don't delete the enrollments before the user | `excluir-aluno.integration.test.ts` | ✅ Killed (`:88`, FK error) |
| M17 | `src/lib/cursos/exclusao.ts:40` | drop the `podeGerenciarPreCurso` authority check | `exclusao.integration.test.ts` | ✅ Killed (`:139`, 2 tests) |
| M19 | `src/app/api/pre-cursos/[id]/route.ts:82` | never check dates on PATCH | `e2e/pre-cursos-id.spec.ts -g RU-40` | ✅ Killed (`:169`) |
| M20 | `src/components/formulario/CampoResposta.tsx:173` | ignore `maxSelecoes` (no disabling) | `e2e/avaliacoes-formulario.spec.ts -g RU-08` | ✅ Killed (`:400`) |
| M21 | `src/components/formulario/ConfirmarAcao.tsx:53` | button calls `aoConfirmar()` directly (no dialog) | `e2e/pre-cursos-formulario.spec.ts -g RU-18` | ✅ Killed (`:453`) |

**Sensor depth**: P0-style (deletion and data-integrity paths), 20 manual behavior-level mutants.
**Result**: 20 injected: 18 killed, 1 survived (M14, weak coverage → Fix 1), 1 equivalent (M01, excluded from the score). Sensor verdict: not clean

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Thin routes over `excluirCurso`/`excluirAluno`; `nomeDaFormacao` and the phone helpers are small pure functions. |
| Surgical changes | ✅ Routes, `data-testid`, enums and columns untouched (AD-054); no migration. |
| No scope creep | ✅ |
| Matches patterns | ✅ `exigirMutacao` + `comTratamentoDeErro` on the 3 new routes; `exigirAlvoEditavel` reused for student deletion; document in the body (GU-48). |
| Spec-anchored outcome check | ❌ RU-05 (avaliacao/pos-curso `campo`), legacy-phone edge case |
| Per-layer Coverage Expectation | ◐ Domain 1:1 met (unit + integration). New routes have happy + 4xx + CSRF e2e. Gap: questionnaire PATCH `campo` only proven for one of 3 routes |
| Every test maps to a spec requirement | ✅ New tests carry `RU-xx` tags; pre-existing assertions were updated, not deleted (IDV-09/12/13, PESSOAL-20 superseded explicitly) |
| Documented guidelines followed | ✅ `AGENTS.md` (AD-039: no literal colors in `alert-dialog.tsx`/`ConfirmarAcao.tsx`, menu from `navegacao.ts`), memory `feedback_test_scope` (cheapest layer: unit/integration carry the rules, e2e for screens and routes) |

---

## Edge Cases

- [x] P8 only spaces → fallback name (`src/lib/cursos/nome.test.ts:19`)
- [x] Second concurrent delete → 404 (`src/lib/cursos/exclusao.integration.test.ts:161`; the P2003/P2025 catch at `src/lib/cursos/exclusao.ts:56-62`)
- [x] Student enrolled between screen open and "Sim" → 409 (check runs inside the transaction; M01 shows the FK fallback also yields the 409)
- [ ] **Legacy phone shown as stored, NOT handled** (`src/components/perfil/PerfilForm.tsx:32`, `src/components/dados-pessoais/DadosPessoaisForm.tsx:101`)
- [x] Q13 or Q17b empty → RU-40 not applied (`src/lib/validation/schemas/pre-curso.schema.test.ts:647-648`)

---

## Gate Check

- **Gate command (Build)**: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Verifier re-run (real tree)**: `npm run test:unit` → **933 passed, 0 failed** (44 files).
- **Author's run (T31, not re-run here)**: lint 0 errors / 51 pre-existing warnings; typecheck and build OK; 154 integration; 347 e2e with 2 DB-slowness failures that passed on rerun.
- **Verifier scratch runs (unmutated baseline)**: 4 unit files 202/202; 2 integration files 13/13; `e2e/pre-cursos-encerrar.spec.ts -g RU-61` 1/1.
- **Test count delta**: new files `nome.test.ts`, `telefone.test.ts`, `perfil.schema.test.ts`, `exclusao.integration.test.ts`, `excluir-aluno.integration.test.ts`, `e2e/cursos-excluir.spec.ts`, `e2e/perfil.spec.ts`, plus RU-tagged cases in 20 existing specs. No test deleted; PESSOAL-20's 404 assertion was replaced by RU-47/48, which supersede it.
- **Skipped tests**: none observed.

---

## Fix Plans

### Fix 1 (Major): prove `campo` on the avaliação and pós-curso PATCH routes (RU-05, RU-07; M14)

- **Root cause**: `informarCampo: true` is wired at `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:107` and `src/app/api/pos-cursos/[cdCurso]/route.ts:74`, but no test asserts the 400 body of those routes. Removing the flag survives the route's whole spec.
- **Fix task**: in `e2e/avaliacoes-id.spec.ts`, PATCH with 4 reasons in `avalMotivMotivosParticipacao` → `expect(await res.json()).toEqual({ erro: "Selecione no máximo 3 motivos", campo: "avalMotivMotivosParticipacao" })` and nothing persisted (this is the story's own Independent Test). In `e2e/pos-cursos-id.spec.ts`, one out-of-range value → `toEqual({ erro: <pt message>, campo: "<chave>" })`.
- **Done when**: mutant M14 (and the same mutant on the pós route) is killed.

### Fix 2 (Major): keep legacy phones as stored (spec edge case)

- **Root cause**: `useState(() => mascaraTelefone(inicial.telefone))` at `src/components/perfil/PerfilForm.tsx:32` (and `src/components/dados-pessoais/DadosPessoaisForm.tsx:101`) rewrites any stored value. `mascaraTelefone` strips non-digits and truncates to 11. Submitting the form then persists the rewritten value even when the person changed only the name.
- **Fix task**: initialize with the raw stored value (mask only on `onChange`), and/or send `telefone` only when it was edited. Add an e2e in `e2e/meus-dados.spec.ts`: a GT with legacy `"(61) 3333-4444 ramal 2"` sees exactly that text, saves a name change, and `getUsuario(...).telefone` is unchanged. Confirm the intended behavior with the user if a legacy value must be revalidated on save (RU-45 vs. the edge case).
- **Done when**: the new test passes and fails on the current code.

### Fix 3 (Minor): assert "Olá, <nome>" on the panel (RU-34)

- `e2e/painel.spec.ts`: seed the GT with a name and `expect(...).toHaveText("Olá, <nome>")`.

### Fix 4 (Spec, no code): settle RU-16 and RU-39 wording

- RU-16: the selector shows `<nome> — saldo R$ x`, and for AM `<ofertante> — <nome> — saldo R$ x`. Either amend the spec ("sem `#<cdVerba>`; o seletor acrescenta saldo e, para o AM, o ofertante") or drop the extras.
- RU-39: state whether questionnaire question texts and the student form's `Parte 2 — Avaliação Pós-Curso` heading (`AvaliacaoForm.tsx:468`) are in scope.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RU-01..RU-04, RU-06, RU-08..RU-15, RU-17..RU-33, RU-35..RU-38, RU-40..RU-62 | Implementing | ✅ Verified |
| RU-05 | Implementing | ❌ Needs Fix (Fix 1) |
| RU-07 | Implementing | ❌ Needs Fix (Fix 1) |
| RU-34 | Implementing | ⚠️ Needs test (Fix 3) |
| RU-16, RU-39 | Implementing | ⚠️ Verified with spec-precision note (Fix 4) |
| Edge: legacy phone | - | ❌ Needs Fix (Fix 2) |

(`spec.md` traceability not edited by the Verifier: the report is the evidence artifact; the orchestrator updates statuses after the fixes.)

---

## Summary

**Overall**: ❌ Not Ready. Small, well-bounded gaps: one surviving non-equivalent mutant and one unhandled edge case.

**Spec-anchored check**: 55/62 matched spec outcome; 1 gap, 2 partial, 2 spec-precision gaps, 1 edge-case gap.
**Sensor**: 20 injected, 18 killed, 1 survived (M14), 1 equivalent (M01)
**Gate**: unit 933/933 (verifier); author's full Build gate green.

**What works**: the stale-pending bug (RU-01..03), both deletions with their "child" rules inside a transaction (integration-proven, 7 of 8 mutants killed, the 8th equivalent), date rules and their PATCH/conclusion split (RU-40..42, 61, 62), course name end to end (RU-10..15, 57..59), the confirmation dialog, menu/panel terminology, phone validation, and Editar Perfil.

**Issues found**: Fix 1 (route `campo` unproven, M14), Fix 2 (legacy phone rewritten), Fix 3 (greeting unasserted), Fix 4 (spec wording).

**Next steps**: route Fix 1-3 to an implementer, then re-verify (iteration 1 of 3).
