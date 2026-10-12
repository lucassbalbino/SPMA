# Onboarding Organizacional do GO Validation

**Date**: 2026-10-12
**Spec**: `.specs/features/onboarding-organizacional-go/spec.md`
**Diff range**: `6cd0de3..6e0cda9` (iteração 2; a iteração 1 cobriu `6cd0de3..829e75d`, 9 commits, `bd73b4d` só docs; `6e0cda9` é o fix, só testes e spec)
**Verifier**: sub-agente independente (autor ≠ verificador)

## Validation: onboarding-organizacional-go - PASS ✅ (iteração 2)

Iteração 1 deu FAIL: 3 mutantes sobreviveram (M9, M11, M12). O fix `6e0cda9` acrescentou 3 testes, e na iteração 2 os três foram mortos no scratch (seção "Iteração 2" no fim). As tabelas abaixo são da iteração 1; OGO-08 e OGO-13 foram revistos na iteração 2.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Migration + teste de integração conferidos; o mutante `DEFAULT true` foi morto |
| T2 | ✅ Done | Schema exige os 6 campos; mutantes mortos |
| T3 | ✅ Done | Flag gravada + 409; mutantes mortos |
| T4 | ⚠️ Partial | O guard está certo, mas o "OGO-08 segue provado pelo teste existente" não se confirma: o teste usa um **AL**, e trocar a ordem dos guards no layout não quebra nada (M9) |
| T5 | ✅ Done | `nomeInicial` morto por e2e |
| T6 | ✅ Done | Schema e tela; mutantes mortos |
| T7 | ⚠️ Partial | OGO-11 provado. A metade de OGO-13 que diz "inclusive o `email` informado pelo criador" não tem asserção de persistência (M12) |
| T8 | ✅ Done | Só seed, sem teste (correto pela matriz) |

---

## Spec-Anchored Acceptance Criteria

| AC | Resultado que a spec define | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| OGO-01 | GO com flag false → redirect `/cadastro-ofertante` | `src/lib/auth/guards.test.ts:89-92` - `toThrow("NEXT_REDIRECT:/cadastro-ofertante")` + `redirect toHaveBeenCalledWith("/cadastro-ofertante")`; `e2e/protegido-layout.spec.ts:73` - `toHaveURL(/\/cadastro-ofertante$/)` a partir de `/painel` | ✅ PASS |
| OGO-02 | Os 6 campos aparecem, com o Nome preenchido com o nome da criação e editável | `e2e/cadastro-ofertante-page.spec.ts:260` - `expect(getByLabel("Nome")).toHaveValue(NOME_DA_CRIACAO)`; os outros 5 campos são preenchidos por label em `:135-140` (prova que existem); editável: `:164` faz `fill` no Nome | ✅ PASS |
| OGO-03 | Persiste os 6 valores, flag `true`, navegação liberada | `e2e/cadastro-ofertante-page.spec.ts:179-187` - `estadoOrganizacional(...)).toEqual({6 valores, dadosOrganizacionaisCompletos: true})`; `:192` - `/painel` `toHaveURL(/\/painel$/)`; unit `guards.test.ts:118-120` (flag true não redireciona) | ✅ PASS |
| OGO-04 | 400; nenhum campo nem a flag persistidos | `e2e/cadastro-ofertante-page.spec.ts:217-220` - `status 400`, `erro === "Telefone é obrigatório"`, estado antes == depois, flag `false`; unit `organizacao.schema.test.ts:37-54` - cada campo ausente e `""` → mensagem do campo, email malformado, UF fora da lista | ✅ PASS (⚠️ ver nota de precisão 1) |
| OGO-05 | Flag true + PATCH → 409, valores preservados | `e2e/cadastro-ofertante-page.spec.ts:232,247-248` - flag `true` antes, `status 409`, estado (6 campos + flag) igual ao de antes, com corpo completo e válido | ✅ PASS |
| OGO-06 | Não-GO nunca redirecionado para `/cadastro-ofertante`, qualquer flag | `src/lib/auth/guards.test.ts:124-130` - `it.each(AM,GT,VT,VO,AL)` com flag `false` → `redirect not.toHaveBeenCalled()` | ✅ PASS |
| OGO-07 | Não-GO + PATCH `/me/organizacao` → 403 | `e2e/cadastro-ofertante-page.spec.ts:349` - sessão de AM → `status 403` | ✅ PASS |
| OGO-08 | **GO** com `primeiraVez=true` cria a senha antes do formulário organizacional | `e2e/protegido-layout.spec.ts:52-62` - `toHaveURL(/\/primeiro-acesso$/)`, mas o usuário é um **AL** (`:23`), em quem o guard organizacional nunca age | ❌ GAP - o mutante M9 (inverter a ordem dos guards no layout) sobrevive. Ver também nota de precisão 2 |
| OGO-09 | 201; GO e verba criados | `e2e/usuarios.spec.ts:437` - `status 201`; `:440` tipo GO; `:457-459` verba com `cdOfertante` = CNPJ do GO e `vlVerba` 12500.5; unit `usuario.schema.test.ts:66-73`; UI `e2e/usuarios-novo-page.spec.ts:157-169` | ✅ PASS |
| OGO-10 | 400 com qualquer um dos 5 campos; nem usuário nem verba | unit `usuario.schema.test.ts:120-139` - para cada um dos 5, `issues toEqual([objectContaining({path:[campo], message})])`; e2e `usuarios.spec.ts:479-483` - `status 400`, mensagem do email, `getUsuario(...)).toBeNull()` (a verba depende do GO por FK) | ✅ PASS |
| OGO-11 | Nasce com flag `false` e os 5 campos nulos | `e2e/usuarios.spec.ts:447-452` - flag `toBe(false)`, `email/responsavel/telefone/uf/municipio toBeNull()` | ✅ PASS |
| OGO-12 | Com GO selecionado, só CNPJ, nome, tipo e verba | `e2e/usuarios-novo-page.spec.ts:141-145` - `cdOfertante` e os 5 campos `toHaveCount(0)`, `#vlVerba` visível | ✅ PASS |
| OGO-13 | Criação de AM/GT/VT/VO/AL inalterada, inclusive o `email` informado | unit `usuario.schema.test.ts:171-185` - AL/VO/GT aceitam email e `result.data.email` preservado; `:160-168` uf aceita para != GO; UI `usuarios-novo-page.spec.ts:136` - E-mail visível com VO | ⚠️ PARCIAL - nada afirma que o email chega gravado no banco para um tipo != GO; o mutante M12 (`email: null` no `create`) sobrevive em todos os specs de usuário |
| OGO-14 | Todo GO pré-existente com flag `false` | `prisma/onboarding-organizacional-migracao.integration.test.ts:119-120` - GO e AL pré-migration com `dadosOrganizacionaisCompletos toBe(false)`, rodando o `migration.sql` real | ✅ PASS |
| OGO-15 | GO antigo com nome+UF e flag false é barrado | `e2e/protegido-layout.spec.ts:76-86` - GO com nome e UF, flag false → `toHaveURL(/\/cadastro-ofertante$/)`; unit `guards.test.ts:96-107` | ✅ PASS |
| OGO-16 | Migration preserva os dados organizacionais | `prisma/onboarding-organizacional-migracao.integration.test.ts:137` - `expect(go).toEqual(ORGANIZACAO)` (os 6 valores) | ✅ PASS |
| OGO-17 | Flag true: tela abre; envio → 409 sem alterar nada | `e2e/cadastro-ofertante-page.spec.ts:296,303-304` - flag true, URL fica em `/cadastro-ofertante`, botão Cadastrar visível; a parte do 409 é `:247-248` | ✅ PASS |
| OGO-18 | Sem sessão → `/login` | `e2e/cadastro-ofertante-page.spec.ts:309` - `toHaveURL(/\/login$/)` | ✅ PASS |
| OGO-19 | Nome pré-preenchido inalterado é aceito | `e2e/cadastro-ofertante-page.spec.ts:267-271` - `status 200`, `nome toBe(NOME_DA_CRIACAO)`, flag `true` | ✅ PASS |
| OGO-20 | Nome nulo → campo vazio, preenchimento exigido | `e2e/cadastro-ofertante-page.spec.ts:283,289-292` - `toHaveValue("")`, "Nome é obrigatório" visível, estado antes == depois, `nome` null, flag false | ✅ PASS |

**Status**: ❌ 1 AC com gap (OGO-08), 1 parcial (OGO-13), 18 com evidência que bate com o resultado da spec.

### Notas de precisão da spec

1. **OGO-04 / "vazio"**: `textoObrigatorio` é `z.string().min(1)`, sem `trim`. `"   "` passa como nome/responsável/telefone/município. A spec diz "ausente, vazio ou inválido" e "nenhum fica vazio", sem dizer se só espaço conta como vazio. ⚠️ Gap de precisão da spec, não defeito. Decisão do usuário.
2. **OGO-08 fora da navegação**: o grupo `(onboarding)` só exige sessão, e `PATCH /api/usuarios/me/organizacao` não olha `primeiraVez`. Um GO com `primeiraVez=true`, logado, consegue abrir `/cadastro-ofertante` pela URL ou chamar a API e ligar a flag antes de criar a senha. Pela navegação a ordem vale; por URL ou API, não. É o mesmo padrão de antes da feature, e a Assumption "Primeiro login" só promete a ordem da cadeia de guards. ⚠️ Gap de precisão: a spec não diz se OGO-08 cobre acesso direto.

---

## Discrimination Sensor

Scratch: `git worktree` destacado em `829e75d` dentro do scratchpad, com `node_modules` por junction, `.env.test` e `.env` copiados, e `npx prisma generate`. O Turbopack recusa um `node_modules` por symlink fora da raiz do projeto, então o scratch levou `turbopack: { root: "C:/Users/lucas" }` no `next.config.ts` (só lá, só para subir o servidor de dev). Antes de mutar, os 5 specs no scratch deram 47 passed e 1 failed (o CA-AU-05 pré-existente). Unit 126/126 e integration 2/2.

| # | File:line | Mutação | Rodado | Morto? |
| --- | --- | --- | --- | --- |
| M1 | `src/lib/auth/guards.ts:65` | `!usuario.dadosOrganizacionaisCompletos` → `usuario.dadosOrganizacionaisCompletos` | unit | ✅ Morto (`guards.test.ts`, 3 testes) |
| M2 | `src/lib/auth/guards.ts:65` | remove `usuario.tipo === "GO" &&` | unit | ✅ Morto (`guards.test.ts` OGO-06, 5 testes) |
| M3 | `src/app/api/usuarios/me/organizacao/route.ts:50` | remove `dadosOrganizacionaisCompletos: true` do `update` | e2e | ✅ Morto (`cadastro-ofertante-page.spec.ts:147,223,251`) |
| M4 | `.../me/organizacao/route.ts:42` | checagem do 409 → `if (false)` | e2e | ✅ Morto (`cadastro-ofertante-page.spec.ts:223`) |
| M5 | `src/lib/validation/schemas/usuario.schema.ts:76` | laço de rejeição do GO → `if (false)` | unit | ✅ Morto (`usuario.schema.test.ts` OGO-10 email/uf) |
| M5b | `usuario.schema.ts:19` | tira `"email"` de `CAMPOS_FORA_DA_CRIACAO_DO_GO` | unit | ✅ Morto |
| M5c | `usuario.schema.ts:12` | tira `"municipio"` de `CAMPOS_NUNCA_NA_CRIACAO` | unit | ✅ Morto |
| M5d | `usuario.schema.ts:77` | corpo do laço do GO pulado com `continue` | unit | ✅ Morto |
| M6 | `src/lib/validation/schemas/organizacao.schema.ts:17` | `telefone` → `z.string().optional()` | unit | ✅ Morto (`organizacao.schema.test.ts` telefone) |
| M6b | `organizacao.schema.ts:10` | remove `.min(1)` (vazio aceito) | unit | ✅ Morto (5 testes) |
| M7 | `prisma/migrations/20261012120000_onboarding_organizacional_go/migration.sql:8` | `DEFAULT false` → `DEFAULT true` | integration | ✅ Morto (`...migracao.integration.test.ts:115`) |
| M7b | mesmo `migration.sql` | acrescenta `UPDATE ... SET Tel_Organizacao = NULL WHERE TP_Usuario='GO'` | integration | ✅ Morto (`...migracao.integration.test.ts:124`) |
| M8 | `src/app/(onboarding)/cadastro-ofertante/page.tsx:18` | `nomeInicial={usuario.nome ?? ""}` → `nomeInicial={""}` | e2e | ✅ Morto (`cadastro-ofertante-page.spec.ts:251`) |
| M9 | `src/app/(protegido)/layout.tsx:37-38` | inverte a ordem: `requireDadosOrganizacionaisCompletos` antes de `requirePrimeiroAcessoConcluido` | e2e `protegido-layout.spec.ts` | ❌ **Sobreviveu** (4/4 passaram) |
| M10 | `.../me/organizacao/route.ts:35` | checagem de não-GO → `if (false)` | e2e | ✅ Morto (`cadastro-ofertante-page.spec.ts:333`) |
| M11 | `src/app/api/usuarios/[documento]/organizacao/route.ts:71` | rota por documento passa a ligar `dadosOrganizacionaisCompletos: true` | e2e `organizacao-id`, `organizacao`, `cadastro-ofertante-page` | ❌ **Sobreviveu** (25/25 passaram) |
| M12 | `src/app/api/usuarios/route.ts:178` | `email: dados.email ?? null` → `email: null` | e2e `usuarios`, `usuarios-novo-page` | ❌ **Sobreviveu** (só falhou o CA-AU-05 pré-existente) |
| M14 | `src/app/(protegido)/usuarios/novo/NovoUsuarioForm.tsx:68` | `pedeEmail = tipo !== "GO"` → `true` | e2e | ✅ Morto (`usuarios-novo-page.spec.ts:124`) |

**Profundidade**: P0, ampliada (o gate de autenticação é caminho crítico): 18 mutações.
**Resultado**: 15/18 mortos → FAIL ❌

O que os sobreviventes significam:
- **M9 (OGO-08)**: com a ordem invertida, um GO novo (`primeiraVez=true`, flag false) cai em `/cadastro-ofertante` antes de criar a senha. O teste que deveria pegar isso usa um AL.
- **M11 (invariante da Assumption "GO editando os próprios dados")**: a spec diz que a rota `[documento]` "**nunca** liga a flag, então não serve de atalho para pular o onboarding". O código de hoje respeita isso (conferido em `[documento]/organizacao/route.ts:69-73`), e a pergunta ainda aberta (`Confirmed? n`) **não** abre um bypass hoje. Mas nenhum teste trava o invariante: o fixture do e2e cria GO com a flag em `true` por padrão, então ligar a flag por essa rota passa despercebido.
- **M12 (OGO-13)**: a linha não foi mexida pela feature, mas OGO-13 é AC desta feature e promete o email preservado na criação de não-GO. Só a camada do schema prova isso, a persistência não.

Isolamento: o worktree foi removido com `git worktree remove --force` (a junction foi desfeita antes, então o `node_modules` real ficou intacto). `git status --porcelain` do repo real estava vazio antes e continuou vazio depois. Os mutantes M7 e M7b passaram pelo `spma_test` compartilhado. A rodada limpa seguinte do teste de integração recriou a coluna com `DEFAULT false` (2/2 verdes), e todo e2e reseta o banco.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (`proxy.ts` e 2 specs alheios mudaram só em comentário ou fixture, por causa da renomeação) |
| No scope creep | ✅ |
| Matches patterns | ✅ (o guard copia `requireDadosPessoaisCompletos`; a migration e o teste copiam o precedente de dados pessoais) |
| Spec-anchored outcome check | ❌ OGO-08 (prova com AL), OGO-13 parcial |
| Per-layer Coverage Expectation | ⚠️ Domínio 1:1 ok. No e2e falta a ordem dos guards para GO |
| Every test maps to a requirement | ✅ |
| Documented guidelines followed | `AGENTS.md` (sem cor literal; navegação em `navegacao.ts`, que não foi tocado) ✅; memória "testes enxutos" ✅ |

---

## Edge Cases

- [x] OGO-17: flag true, URL direta → tela abre, envio dá 409
- [x] OGO-18: sem sessão → `/login`
- [x] OGO-19: nome inalterado aceito
- [x] OGO-20: nome nulo → campo vazio, preenchimento exigido

---

## Gate Check

Rodado pelo verificador no repo real (efeito só de leitura):

- `npm run typecheck` → exit 0
- `npm run test:unit` → 33 arquivos, **703 passed**, 0 failed
- `npm run test:integration` → 11 arquivos, **74 passed**, 0 failed
- e2e, no scratch em `829e75d`, com os 5 specs do escopo (`cadastro-ofertante-page`, `protegido-layout`, `usuarios`, `usuarios-novo-page`, `organizacao-id`): **47 passed, 1 failed** (`.last-run.json` com `failedTests` = só o CA-AU-05). A suíte e2e completa não foi rodada de novo pelo verificador. O autor relata 244/1.
- Contagem de testes: o autor relata 690 unit / 72 integration antes da feature (não reconferido). Nenhuma asserção ficou mais fraca. Os testes do contrato antigo (`{nome, uf}`, "GO sem uf → issue") foram substituídos de acordo com as decisões 1 e 2 do usuário.

**Alegação de falha pré-existente, CA-AU-05 (`e2e/usuarios-novo-page.spec.ts:80`): CONFIRMADA.** No worktree em `6cd0de3` (antes da feature), `npx playwright test e2e/usuarios-novo-page.spec.ts` falha nesse mesmo teste (mesmo id `8d22c78a...-887aa1163b448f10a7c6`) com o mesmo diff: esperado `["AL","VO"]`, recebido `["Aluno","Selecione","Visualizador Ofertante"]`. `fe2d383` ("commit Nome ALuno on form") é ancestral de `6cd0de3` e reescreveu `NovoUsuarioForm.tsx` e `src/lib/ui/tipos-usuario.ts`. Fica fora do escopo desta feature.

---

## Fix Plans

### Fix 1 (Major): OGO-08 sem prova para o GO
- **Causa**: `e2e/protegido-layout.spec.ts:52` prova a ordem com um AL, e o guard organizacional nunca age sobre um AL.
- **Tarefa**: em `e2e/protegido-layout.spec.ts`, criar um GO com `primeiraVez: true`, `senha: null` e `dadosOrganizacionaisCompletos: false`, logar e afirmar que `/painel` vai para `/primeiro-acesso`, **não** para `/cadastro-ofertante`.
- **Pronto quando**: M9 (inverter as linhas 37 e 38 de `layout.tsx`) faz esse teste falhar.

### Fix 2 (Major): invariante "a rota `[documento]` nunca liga a flag" sem teste
- **Tarefa**: em `e2e/organizacao-id.spec.ts`, um GO com `dadosOrganizacionaisCompletos: false` edita o próprio CNPJ por `PATCH /api/usuarios/[documento]/organizacao` (200). Afirmar que a flag continua `false` no banco e que `/painel` ainda redireciona para `/cadastro-ofertante`. Variante mais barata: AM edita um GO pendente e a flag continua `false`.
- **Pronto quando**: M11 faz esse teste falhar.

### Fix 3 (Minor): OGO-13, email de não-GO gravado
- **Tarefa**: num caso existente de `e2e/usuarios.spec.ts` que cria VO ou AL, mandar `email` e afirmar `getUsuario(...)?.email === <email enviado>`.
- **Pronto quando**: M12 faz esse teste falhar.

### Decisões pendentes do usuário (não são fix tasks)
- Assumption `Confirmed? n`: o GO editando os próprios dados pela rota `[documento]`. Conferido: **não** permite pular o gate hoje (a rota não grava a flag). Com o Fix 2, isso fica travado por teste.
- Nota de precisão 1 (só espaço conta como vazio?) e nota 2 (OGO-08 vale também para URL ou API direta?).

---

## Requirement Traceability Update

| Requirement | Status anterior | Status novo |
| --- | --- | --- |
| OGO-01..20 | Done | ✅ Verified (OGO-08 e OGO-13 depois do fix `6e0cda9`) |

---

## Summary

**Overall (iteração 1)**: ❌ Not Ready. Os testes não pegavam 3 regressões possíveis. **Iteração 2: ✅ Ready**, ver abaixo.

**Spec-anchored check**: 18/20 ACs com evidência que bate com a spec; OGO-08 sem prova, OGO-13 parcial; 2 gaps de precisão da spec.
**Sensor**: 15/18 mortos (sobreviveram M9, M11, M12).
**Gate**: typecheck ok, 703 unit, 74 integration, e2e do escopo 47/1 (a falha é CA-AU-05, pré-existente e confirmada).

**O que funciona**: gate por flag, escrita da flag e 409, schema com os 6 obrigatórios, criação enxuta, migration que preserva dados, nome pré-preenchido.

**Próximos passos**: Fix 1 a 3 (só testes), depois rodar o verificador de novo.

---

## Iteração 2 (re-verificação do fix `6e0cda9`)

**Range**: `6cd0de3..6e0cda9`. O fix mexe só em `e2e/protegido-layout.spec.ts`, `e2e/organizacao-id.spec.ts`, `e2e/usuarios.spec.ts`, `spec.md` e `tasks.md`. Nenhum arquivo de produção mudou desde `829e75d`, então os 15 mutantes mortos na iteração 1 continuam válidos.

### Evidência revista

| AC | Resultado que a spec define | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| OGO-08 | **GO** com `primeiraVez=true` cria a senha antes do formulário organizacional | `e2e/protegido-layout.spec.ts:98-107`: GO com `primeiraVez: true`, `senha: null` e `dadosOrganizacionaisCompletos: false` (os dois guards valem para ele); `/painel` → `toHaveURL(/\/primeiro-acesso$/)` | ✅ PASS |
| OGO-13 | Criação de não-GO inalterada, inclusive o `email` | `e2e/usuarios.spec.ts:573`: `getUsuario(CPF_NOVO_AL_PELO_AM)?.email).toBe("aluno-pelo-am@exemplo.dev")`, lido do banco depois de um AM criar um AL; mais a camada de schema da iteração 1 | ✅ PASS |
| Invariante AD-044 (Assumption: a rota `[documento]` nunca liga a flag) | AM edita um GO pendente: 200, flag continua `false`, gate continua valendo | `e2e/organizacao-id.spec.ts:244` `status 200`; `:247` `dadosOrganizacionaisCompletos toBe(false)`; `:254` `/painel` do GO → `toHaveURL(/\/cadastro-ofertante$/)` | ✅ PASS |

Os gaps de precisão 1 e 2 (campo só com espaços; GO com `primeiraVez=true` em acesso direto a `(onboarding)`) agora estão em `spec.md` como linhas de Assumption com `Confirmed? n`, pendentes de decisão do usuário. Nenhum dos dois contradiz um AC escrito: OGO-08 é provado pela navegação de `(protegido)`, que é o que a Assumption "Primeiro login" promete. Ficam como decisão documentada, não como gap.

### Sensor: os sobreviventes de novo

Scratch: novo `git worktree` destacado em `6e0cda9`, com `node_modules` por junction, `.env.test` e `.env`, `npx prisma generate` e `turbopack.root` no `next.config.ts` só do scratch. Antes de mutar, `protegido-layout`, `organizacao-id` e `usuarios` deram **34/34 passed** (`.last-run.json` com `status: passed`).

| # | Mutação | Spec rodado | Morto? |
| --- | --- | --- | --- |
| M9 | inverte as linhas 37 e 38 de `src/app/(protegido)/layout.tsx` | `e2e/protegido-layout.spec.ts` | ✅ Morto (`protegido-layout.spec.ts:98` OGO-08; `toHaveURL` falhou) |
| M11 | `[documento]/organizacao/route.ts:71` liga `dadosOrganizacionaisCompletos: true` | `e2e/organizacao-id.spec.ts` | ✅ Morto (`organizacao-id.spec.ts:225` AD-044) |
| M12 | `src/app/api/usuarios/route.ts:178` `email: null` | `e2e/usuarios.spec.ts` | ✅ Morto (`usuarios.spec.ts:554` AVAL-01) |

**Sensor acumulado**: 18/18 mortos.

Isolamento: a junction foi removida antes do `git worktree remove --force` (o `node_modules` real ficou intacto). `git status --porcelain` do repo real mostra só `?? .specs/features/onboarding-organizacional-go/validation.md`.

### Gate

O fix não toca produção nem testes unit ou integration, então valem os números da iteração 1: typecheck exit 0, 703 unit, 74 integration. e2e dos 3 specs alterados, no scratch em `6e0cda9`: **34 passed, 0 failed**. CA-AU-05 continua pré-existente (confirmado em `6cd0de3`), fora do escopo.

### Veredito da iteração 2

**Result**: PASS ✅. 20/20 ACs com evidência que bate com a spec, sensor 18/18 mortos, 2 decisões pendentes do usuário registradas em `spec.md`.
