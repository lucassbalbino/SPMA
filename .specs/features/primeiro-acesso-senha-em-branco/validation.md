# Primeiro Acesso com Senha em Branco Validation

**Date**: 2026-10-13
**Spec**: `.specs/features/primeiro-acesso-senha-em-branco/spec.md`
**Diff range**: `3fdbee3..37e964a` (iteração 2). A iteração 1 cobriu `3fdbee3..d94f7a0`, com 4 commits: `b9a8fc2` spec, `f8dba9d` rota + schema + testes, `151a2df` dica no formulário + e2e, `d94f7a0` doc de deploy. O fix `37e964a` mexe só em `src/app/api/auth/login/route.integration.test.ts`.
**Verifier**: sub-agente independente (autor ≠ verificador)

## Validation: primeiro-acesso-senha-em-branco - PASS ✅ (iteração 2)

A iteração 1 deu FAIL: 2 dos 10 mutantes sobreviveram (M7 e M8, ambos no caminho da conta sem senha em `route.ts`). O fix `37e964a` acrescentou asserções ao teste de integração, sem tocar em código de produção:

- O teste de PASB-02 limpa o spy e afirma `verifyPassword` chamado uma vez com `(DUMMY_HASH, senha)`.
- Os testes de PASB-02 e PASB-03 afirmam que o contador do IP (`TentativaLoginIp.tentativas`) subiu 1.

Na iteração 2, os dois mutantes morreram no scratch em `37e964a`. Morreu também uma variante mais larga do M8 (M8b). As tabelas abaixo já estão atualizadas para a iteração 2. O que mudou desde a iteração 1 está na seção "Iteração 2", no fim.

---

## Task Completion

Não há `tasks.md` para esta feature. O escopo saiu da spec e dos commits do diff. Cada commit casa com uma parte da spec: P1 backend (`f8dba9d`), P1 tela (`151a2df`), entrega (`d94f7a0`), fix de teste do verificador (`37e964a`). Nada ficou parcial.

---

## Spec-Anchored Acceptance Criteria

| AC | Resultado que a spec define | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| PASB-01 | Conta sem senha + `senha: ""` → 200, `primeiroAcesso: true`, `proximaRota: "/primeiro-acesso"`, cookie de sessão do documento, `tentativasFalhas` zerado | `e2e/login.spec.ts:172` - contador `toBe(1)` antes (falha forçada); `:179` - `res.status() toBe(200)`; `:180` - `tentativasFalhas toBe(0)`; `:183-184` - `primeiroAcesso toBe(true)`, `proximaRota toBe("/primeiro-acesso")`; `:187-188` - `idSessao not.toBeNull()`, `getSessao(idSessao).cpfUsuario toBe(CPF_PRIMEIRO_ACESSO)` | ✅ PASS |
| PASB-02 | Conta sem senha + senha não vazia → 401 `{ erro: "CPF ou senha inválidos" }`, sem cookie, `tentativasFalhas` +1. A Assumption acrescenta: falha registrada também no IP | `src/app/api/auth/login/route.integration.test.ts:190` - `it.each(["qualquerSenha1", "   "])`; `:199` - `status toBe(401)`; `:200` - `json() toEqual({ erro: "CPF ou senha inválidos" })`; `:201` - `set-cookie toBeNull()`; `:202` - `tentativasFalhas toBe(antes + 1)`; `:203` - `tentativasIp(IP_SEM_SENHA) toBe(antesIp + 1)` | ✅ PASS |
| PASB-03 | Conta com senha + `senha: ""` → 401 genérico, sem cookie, `tentativasFalhas` +1. A Assumption acrescenta: falha registrada também no IP | `route.integration.test.ts:218-222` - `status toBe(401)`, `json() toEqual({ erro: "CPF ou senha inválidos" })`, `set-cookie toBeNull()`, `tentativasFalhas toBe(antes + 1)`, `tentativasIp(IP_COM_SENHA) toBe(antesIp + 1)` | ✅ PASS |
| PASB-04 | Documento sem conta + `senha: ""` → 401 `{ erro: "CPF ou senha inválidos" }` | `route.integration.test.ts:230-231` - `status toBe(401)`, `json() toEqual({ erro: "CPF ou senha inválidos" })` | ✅ PASS |
| PASB-05 | `verifyPassword` roda antes do veredito em todo login com senha vazia: contra o `senhaHash` real quando existe, contra `DUMMY_HASH` quando não existe | Conta com senha: `route.integration.test.ts:242-243` - `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(usuario.senhaHash, "")`. Documento sem conta: `:251-252` - `toHaveBeenCalledWith(DUMMY_HASH, "")`. Conta com `senhaHash = null`: `:207-208` - `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(DUMMY_HASH, senha)`, no PASB-02 | ✅ PASS (ver nota de precisão 3) |
| PASB-06 | Texto "Primeiro acesso? Deixe a senha em branco." em `/login`, junto ao campo de senha | `e2e/login-page.spec.ts:109` - `getByText("Primeiro acesso? Deixe a senha em branco.") toBeVisible()` | ✅ PASS (ver nota de precisão 1) |
| PASB-07 | Formulário com documento válido e senha em branco envia a requisição em vez de bloquear com "Senha é obrigatória" | `e2e/login-page.spec.ts:111-115` - preenche só o CPF, clica "Entrar", `waitForURL(/\/primeiro-acesso$/)`; unit `src/lib/validation/schemas/login.schema.test.ts:26-28` - `success toBe(true)`, `data.senha toBe("")` | ✅ PASS |

**Status**: ✅ 7/7 ACs com evidência que bate com o resultado da spec. 3 notas de precisão, nenhuma bloqueante.

### Notas de precisão da spec

1. **PASB-06, "junto ao campo de senha"**: o e2e prova que o texto exato está visível na página, não que está junto ao campo. O código liga a dica ao input (`LoginForm.tsx:86` `aria-describedby="senha-dica"`, `:89` `id="senha-dica"`), mas nenhum teste trava esse vínculo. "Junto ao" não define um resultado verificável. ⚠️ Gap de precisão, não defeito.
2. **`set-cookie toBeNull()` no teste de integração** (`:201`, `:220`): a rota emite a sessão por `next/headers`, que não aparece em `res.headers`. Então a asserção não discrimina sozinha. O que prova "sem sessão" é o status: um caminho que tentasse emitir sessão chamaria `cookies()` fora do escopo de request e não responderia 401. A cobertura vale, mas a asserção é mais fraca do que parece.
3. **PASB-05, caso literal "conta sem senha + `senha: ""`"**: a prova da conta sem senha vem do PASB-02, com senha digitada. Esse caminho responde 401 e não passa por `next/headers`. A chamada em `route.ts:57-60` não depende da senha, e um mutante que pule o verify pelo estado da conta (M7) morre. Um mutante amarrado às duas condições ao mesmo tempo (`senhaHash === null && senha === ""`) sobreviveria; isso é raciocínio, não foi rodado. Fica como resíduo aceito: nesse caminho a resposta é 200 com sessão, e o tempo não revela nada que a própria resposta já não diga. O caminho em que o tempo importa (401) está travado.

---

## Discrimination Sensor

**Iteração 1** (scratch em `d94f7a0`): `git worktree` destacado no scratchpad, com `node_modules` por junction, `.env.test` e `.env` copiados e `npx prisma generate`. Para o e2e, o `next.config.ts` do scratch levou `turbopack: { root: "C:/Users/lucas" }`, só lá. Antes de mutar, a integration de login deu 9/9 e a unit de `login.schema` 12/12. Cada mutante foi revertido com `git checkout -- src` antes do próximo.

**Iteração 2** (scratch em `37e964a`): mesmo preparo, só integration. Baseline 9/9. Rodei de novo M7 e M8 e acrescentei M8b. Os 8 mutantes já mortos não foram repetidos: o fix só acrescentou asserções, não tirou nenhuma.

| # | File:line | Mutação | Rodado | Morto? |
| --- | --- | --- | --- | --- |
| M1 | `src/app/api/auth/login/route.ts:74` | `primeiroAcesso ? senha === "" : senhaConfere` → `primeiroAcesso ? true : senhaConfere` (conta sem senha aceita qualquer senha de novo) | integration | ✅ Morto (PASB-02, 2 casos) |
| M2 | `route.ts:77` | remove `await registrarFalha(documento)` na falha | integration | ✅ Morto (PASB-02 ×2, PASB-03) |
| M3 | `route.ts:82` | `await resetarTentativas(documento)` → `if (!primeiroAcesso) await resetarTentativas(documento)` | integration (sobreviveu, esperado: o caminho de sucesso não roda lá) + e2e `login.spec.ts`, `login-page.spec.ts` | ✅ Morto no e2e (`e2e/login.spec.ts:180`, esperado 0, recebido 1) |
| M4 | `src/lib/validation/schemas/login.schema.ts:36` | `senha: z.string()` → `z.string().min(1, { message: "Senha é obrigatória" })` (cliente volta a bloquear a senha em branco) | unit | ✅ Morto (`login.schema.test.ts` "aceita senha vazia"). No e2e, PASB-07 também cairia: o `safeParse` do formulário pararia em "Senha é obrigatória" e a URL nunca chegaria a `/primeiro-acesso` (por raciocínio, não rodado) |
| M4b | `login.schema.ts:36` | `senha: z.string()` → `z.string().default("")` (corpo sem `senha` vira pedido de 1º acesso) | unit | ✅ Morto (`login.schema.test.ts` "rejeita corpo sem o campo senha") |
| M5 | `src/app/(public)/login/LoginForm.tsx:90` | remove o texto da dica | e2e `login.spec.ts`, `login-page.spec.ts` | ✅ Morto (`e2e/login-page.spec.ts:109`, elemento não encontrado) |
| M6 | `route.ts:74` | `senha === ""` → `senha.trim() === ""` (só espaços vira senha em branco) | integration | ✅ Morto (PASB-02 com `"   "`) |
| M6b | `route.ts:74` | `senha === "" \|\| (...)` (senha em branco vale para qualquer conta) | integration | ✅ Morto (PASB-03) |
| M7 | `route.ts:57` | `await verifyPassword(...)` → `usuario && usuario.senhaHash === null ? false : await verifyPassword(...)` (conta sem senha pula o `argon2.verify`) | integration | ✅ Morto na iteração 2 (PASB-02 ×2: "expected vi.fn() to be called 1 times, but got 0 times"). Na iteração 1 tinha sobrevivido a 9/9 integration e 56/56 e2e |
| M8 | `route.ts:78` | `await registrarFalhaIp(ip)` → `if (!primeiroAcesso) await registrarFalhaIp(ip)` (falha da conta sem senha não conta no IP) | integration | ✅ Morto na iteração 2 (PASB-02 ×2: "expected +0 to be 1"). Na iteração 1 tinha sobrevivido a 9/9 integration e 56/56 e2e |
| M8b | `route.ts:78` | remove `await registrarFalhaIp(ip)` (nenhuma falha de credencial conta no IP) | integration | ✅ Morto na iteração 2 (PASB-02 ×2 e PASB-03) |

M3 e M5 rodaram juntos num servidor de dev do scratch. Cada um derrubou um teste diferente, com mensagem que aponta a mutação. Na iteração 1, M7 e M8 também rodaram juntos no e2e. Na integration, cada mutante rodou sozinho nas duas iterações.

**Profundidade**: P0, ampliada (o login é caminho crítico de autenticação): 11 mutações.
**Resultado**: 11/11 mortos → PASS ✅

Isolamento, nas duas iterações:
- A junction foi desfeita com `rmdir` antes da remoção, e o `node_modules` real continua com 552 entradas.
- O worktree saiu com `git worktree remove --force`, e `git worktree list` mostra só o repo real.
- Na iteração 1, `git status --porcelain` estava vazio antes e depois.
- Na iteração 2, a linha de base já tinha arquivos alterados de fora desta feature: `e2e/*-formulario.spec.ts` e `src/components/formulario/*`, de outra frente de trabalho, além dos arquivos de lessons e deste relatório. O `porcelain` depois do sensor bateu com essa linha de base, linha a linha.

---

## Interactive UAT

Não foi feito: o verificador roda como sub-agente, sem usuário na sessão. O e2e PASB-06/07 percorre o Independent Test da segunda história pela UI real: abre `/login`, preenche só o CPF, clica "Entrar" e chega a `/primeiro-acesso`.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Minimum code | ✅ (uma linha decide o veredito, `route.ts:74`; o bloco aninhado antigo virou um só) |
| Surgical changes | ✅ (os 6 specs e2e de fixture só trocaram a senha fictícia por `""`; `security-headers.spec.ts` só deixou de preencher a senha; o fix `37e964a` só acrescenta asserções e um helper de leitura `tentativasIp`) |
| No scope creep | ✅ (`/primeiro-acesso` e a criação de contas não foram tocados, como pede o Out of Scope) |
| Matches patterns | ✅ (a dica usa o `FieldDescription` do kit de UI, sem cor literal; `tentativasIp` copia o helper `tentativasFalhas` do mesmo arquivo) |
| Spec-anchored outcome check | ✅ (7/7; notas de precisão 1-3 registradas) |
| Per-layer Coverage Expectation | ✅ Schema 1:1. Rota: falha (integration) e sucesso (e2e) cobertos, e o mecanismo de tempo nos 3 estados de conta |
| Every test maps to a requirement | ✅ (cada teste novo cita o PASB ou o edge case que prova) |
| Documented guidelines followed | `AGENTS.md` (sem cor literal no `.tsx`; `navegacao.ts` não foi tocado) ✅; memória "testes enxutos" ✅ (só o caminho de sucesso foi para o e2e, o resto ficou na integration) |

O `feat(auth)!` marca a quebra de contrato: quem entrava no 1º acesso com qualquer senha agora precisa da senha em branco. `docs/DEPLOY_TESTE.md` e a nota em `.specs/features/auth-e-usuarios/spec.md` (REQ-AU-02) registram a mudança.

---

## Edge Cases

- [x] Senha só com espaços (`"   "`) conta como senha digitada: `route.integration.test.ts:190` (`it.each` com `"   "`) → 401 e +1 no CPF e no IP. M6 morto.
- [x] Corpo sem o campo `senha` → 400 de validação: `login.schema.test.ts:32-36` (`success toBe(false)`). M4b morto. A rota transforma a falha do schema em 400 por `corpoValidado` (`route.ts:49`), mecanismo que o CA-AU-03 (`e2e/login.spec.ts:199`) já prova. Não há teste de rota com `senha` ausente, e a composição basta.
- [x] Conta sem senha bloqueada enviando senha vazia → 401 genérico: `route.ts:62` decide antes do veredito de 1º acesso. Comportamento herdado de CA-AU-08 e sem teste novo, coerente com a Assumption "já é o comportamento de toda conta bloqueada".

---

## Gate Check

Rodado pelo verificador no repo real (efeito só de leitura):

- **Iteração 2** (HEAD `37e964a`):
  - `npm run -s typecheck` → exit 0
  - `npm run -s test:integration` → 11 arquivos, **80 passed**, 0 failed (`src/app/api/auth/login` sozinho: 9/9)
  - A unit e o e2e não foram repetidos: o fix só mexe num arquivo de integração.
- **Iteração 1** (HEAD `d94f7a0`):
  - `npm run -s test:unit` → 33 arquivos, **704 passed**, 0 failed
  - `npx playwright test` com os 8 specs do diff (`login`, `login-page`, `csrf`, `identidade-visual`, `primeiro-acesso`, `primeiro-acesso-page`, `protegido-layout`, `security-headers`) → **56 passed**, 0 failed (2.6 min). A suíte e2e completa não foi rodada.
- **Contagem de testes**: unit 703 → 704 (+1: "rejeita senha vazia" virou "aceita senha vazia", e entrou "rejeita corpo sem o campo senha"). Integration 74 → 80 (+6: PASB-02 ×2, PASB-03, PASB-04, PASB-05 ×2). O fix `37e964a` não muda a contagem, só a força das asserções. A base 703/74 vem do `validation.md` de `onboarding-organizacional-go`, e o delta bate com os testes novos do diff.
- **Asserções enfraquecidas**: só a que a spec manda inverter. "rejeita senha vazia" agora é "aceita senha vazia", pela decisão do usuário (PASB-07). O teste e2e de CA-AU-02 ficou mais forte (contador antes e depois).
- Skipped: nenhum.

---

## Fix Plans

Os dois fixes da iteração 1 foram aplicados em `37e964a` e conferidos:

- **Fix 1 (Major)**: PASB-05 sem prova para a conta sem senha (M7). ✅ Fechado: `route.integration.test.ts:195,207-208`. M7 morto.
- **Fix 2 (Minor)**: falha no IP sem asserção (M8). ✅ Fechado: `route.integration.test.ts:203` (PASB-02) e `:222` (PASB-03). M8 e M8b mortos.

Nenhum fix novo.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PASB-01 | Implementing | ✅ Verified |
| PASB-02 | Implementing | ✅ Verified |
| PASB-03 | Implementing | ✅ Verified |
| PASB-04 | Implementing | ✅ Verified |
| PASB-05 | Implementing | ✅ Verified |
| PASB-06 | Implementing | ✅ Verified |
| PASB-07 | Implementing | ✅ Verified |

O verificador não editou a `spec.md`. A tabela acima é a atualização proposta.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 7/7 ACs batem com o resultado da spec; 3 notas de precisão, nenhuma bloqueante
**Sensor**: 11/11 mutações mortas (M7 e M8 fechados na iteração 2)
**Gate**: typecheck ok; 80 integration passed na iteração 2; 704 unit e 56 e2e (8 specs do escopo) passed na iteração 1; 0 failed

**What works**:
- A conta sem senha só entra com `""` e cai em `/primeiro-acesso` com sessão e contador zerado.
- Senha digitada nela, senha vazia em conta com senha e senha vazia em documento inexistente dão o mesmo 401 genérico. Os dois primeiros casos somam +1 no CPF e no IP.
- O `verifyPassword` roda nos três estados de conta.
- Só espaços conta como senha digitada.
- O schema aceita `""` e rejeita o campo ausente.
- A tela mostra a dica e envia o formulário com a senha em branco.
- Os fixtures e2e migraram para `""` e passam.

**Issues found**: nenhum bloqueante. As notas de precisão 1 e 3 ficam registradas para quem mexer de novo no login.

**Next steps**: atualizar o status dos PASB na `spec.md` para Verified e fechar a feature.

---

## Iteração 2

- **Diff do fix**: `d94f7a0..37e964a`, só `src/app/api/auth/login/route.integration.test.ts` (+17/-2):
  - Novo helper `tentativasIp(ip)` lê `prisma.tentativaLoginIp`.
  - PASB-02 ganhou `verifyPasswordSpy.mockClear()` (`:195`), o contador do IP (`:203`) e `toHaveBeenCalledTimes(1)` / `toHaveBeenCalledWith(DUMMY_HASH, senha)` (`:207-208`).
  - PASB-03 ganhou o contador do IP (`:222`).
- **Sensor**: M7, M8 e M8b, rodados no worktree em `37e964a`, todos mortos (tabela acima).
- **Gate**: integration 80/80, typecheck ok.
- **Veredito**: FAIL → PASS.
