# auth-e-usuarios Validation

**Date**: 2026-08-25
**Spec**: `.specs/features/auth-e-usuarios/spec.md`
**Diff range**: `816b5ee..HEAD` (HEAD = `6a03c0a`), branch `main` — 42 commits, 96 arquivos
**Verifier**: independent sub-agent (author ≠ verifier), agente novo sem contexto das iterações 1 e 2
**Iteração**: 3 de no máximo 3 do ciclo fix→re-verify

**Verdict**: ❌ FAIL — um mutante sobrevivente, severidade **Minor**. O fix da iteração 2 (`24cef5b`) está correto e foi confirmado empiricamente: o mutante M8 daquela iteração agora morre, pela linha exata que o commit acrescentou. O gate completo passa com 137 testes. O achado novo é que **o mesmo padrão de asserção parcial que a iteração 2 fechou em `/api/auth/primeiro-acesso` continua aberto no endpoint irmão `/api/auth/login`**, numa variante mais estreita: lá a metade "senha" de CA-AU-10 só está travada *dentro* do objeto `usuario`, não no corpo inteiro. Nenhum defeito de produção; o fix é uma linha de teste.

---

## Contexto: iterações 1 e 2 (resumo)

| Iteração | Veredito | Achado | Fix |
| --- | --- | --- | --- |
| 1 | ❌ FAIL | Mutante sobrevivente no ramo `resto < 2 ? 0 : ...` do módulo 11 (`src/lib/validation/cpf.ts:12`) sem fixture positiva; CA-AU-10 sem asserção em `/api/auth/primeiro-acesso` | `7247f58` (2 fixtures de CPF), `744bfc4` (asserção de hash) |
| 2 | ❌ FAIL | Os dois fixes da it. 1 confirmados, mas o fix de CA-AU-10 cobria só a metade "hash" — o eco da senha em texto puro continuava indetectável | `24cef5b` (asserção da metade "senha") |
| 3 | ❌ FAIL | `24cef5b` confirmado correto e eficaz. O mesmo padrão de asserção parcial persiste em `/api/auth/login` (M2b) | — (reportado, não corrigido) |

---

## Verificação do fix desta iteração — `24cef5b`

Diff lido diretamente (`git show 24cef5b`), não aceito pela mensagem de commit: `+6 −3` em `e2e/primeiro-acesso.spec.ts`, nenhum código de produção tocado.

O commit faz exatamente o que promete:

1. Captura o corpo **uma única vez** numa variável — `const corpoResposta = await res.text();` (`e2e/primeiro-acesso.spec.ts:54`). Isso corrige um risco real do formato anterior: `res.text()` era consumido inline, e uma segunda leitura do corpo no mesmo teste seria frágil.
2. Mantém a asserção de hash — `expect(corpoResposta).not.toMatch(/senhaHash|\$argon2/i)` (`:55`).
3. Acrescenta a asserção de senha em texto puro — `expect(corpoResposta).not.toContain(NOVA_SENHA)` (`:56`), onde `NOVA_SENHA = "NovaSenha123"` (`:7`) é a constante efetivamente enviada no corpo da requisição (`:46`).
4. Reescreve o comentário para citar as duas metades de CA-AU-10 em vez de só o hash (`:51-53`).

A asserção incide sobre o **texto cru** do corpo, não sobre uma propriedade de um sub-objeto — pega vazamento em qualquer nível e sob qualquer nome de campo. É a forma mais forte disponível, e mais forte que a usada em `login.spec.ts` (ver M2b).

**Comprovação empírica, não leitura**: M1 do sensor reinjeta a mutação exata que sobreviveu à iteração 2 e ela agora **morre**, na linha 56, com o corpo recebido contendo `"senha":"NovaSenha123"`. Antes deste commit a mesma mutação passava o suite inteiro.

---

## Task Completion

Conferido por conta própria: 30 headings `#### TN`, 80 caixas de Done-when, `- [ ]` não marcadas = **0**.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T7 (Phase 0: Bootstrap) | ✅ Done | T2 registra a correção `@prisma/adapter-mysql2` → `@prisma/adapter-mariadb` |
| T8-T14 (Phase 1: Domínio puro) | ✅ Done | - |
| T15-T18 (Phase 2: Sessão) | ✅ Done | T17 carrega o SPEC_DEVIATION de `setCookieSessao` async |
| T19-T23 (Phase 3: Rotas de API) | ✅ Done | As cinco rotas usam `obterSessao()` + 401 explícito |
| T24-T30 (Phase 4: Páginas) | ✅ Done | T25/T26/T27 carregam o SPEC_DEVIATION do route group `(onboarding)` |

`tasks.md:12` continua `**Status**: In Progress`. Virar para `Done` é decisão do orquestrador, não do Verifier, e não enquanto o veredito for FAIL.

---

## Spec-Anchored Acceptance Criteria

Todas as citações abaixo foram reconferidas **nesta iteração**, linha a linha, contra os arquivos em `6a03c0a`. As citações de `primeiro-acesso.spec.ts` deslocaram +3 linhas em relação ao relatório da iteração 2 por causa de `24cef5b`; estão atualizadas aqui.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| **CA-AU-01** senha correta → autenticado + sessão com cookie httpOnly/secure/sameSite | 200; cookie com os três atributos; sessão persistida | `e2e/login.spec.ts:64` `expect(res.status()).toBe(200)`; `:68-70` `expect(cookies).toMatch(/HttpOnly/i)` / `/Secure/i` / `/SameSite=Lax/i`; `:75` `expect(getSessao(idSessao!)?.cpfUsuario).toBe(CPF_COM_SENHA)`; UI: `e2e/login-page.spec.ts:53-55` | ✅ PASS |
| **CA-AU-02** 1º acesso → definição de senha antes de qualquer módulo; indicador desativado | login sinaliza 1º acesso; `primeiraVez` vira `false`; `senhaHash` preenchido; rotas protegidas desviam | gatilho: `e2e/login.spec.ts:89-90`; conclusão: `e2e/primeiro-acesso.spec.ts:59` `expect(usuario?.primeiraVez).toBe(false)`, `:61` `expect(usuario?.senhaHash).toContain("$argon2")`; gate: `e2e/protegido-layout.spec.ts:48` `await expect(page).toHaveURL(/\/primeiro-acesso$/)`; guarda unitária: `src/lib/auth/guards.test.ts:61,67` | ✅ PASS |
| **CA-AU-03** CPF com DV inválido → rejeitado com indicação de CPF inválido | erro específico de CPF inválido, não o genérico de credencial | `e2e/login.spec.ts:105-106` `expect(res.status()).toBe(400)`, `expect(await res.json()).toEqual({ erro: "CPF inválido" })`; `:108` `expect(res.status()).not.toBe(401)`; UI: `e2e/login-page.spec.ts:66`; algoritmo: `src/lib/validation/cpf.test.ts:6,10,14,18,22,27,32,36,40,44,48,52` (12 casos) | ✅ PASS |
| CA-AU-03 (parte) "sem tocar o banco" | não observável por HTTP | `src/app/api/auth/login/route.ts:31` `safeParse` → `:35-40` retorno 400 → `:43` primeiro `prisma.usuario.findUnique`. Ordem reconferida por leitura nesta iteração | ⚠️ Spec-precision gap (declarado, evidência honesta) |
| **CA-AU-04** CPF inexistente vs. senha errada → indistinguíveis | mesmo status e mesmo corpo | `e2e/login.spec.ts:127` `expect(senhaErrada.status()).toBe(inexistente.status())`; `:128` `expect(await senhaErrada.text()).toBe(await inexistente.text())`; `:129` `expect(await inexistente.json()).toEqual(ERRO_GENERICO)`; UI: `e2e/login-page.spec.ts:90-91` | ✅ PASS (M5 confirma) |
| **CA-AU-05** GO cria AL → aceito + autoria registrada | 201; `criadoPor` = CPF do criador; `dataCriacao` gravada | `e2e/usuarios.spec.ts:72` `expect(res.status()).toBe(201)`; `:78` `expect(criado?.criadoPor).toBe(CPF_GO_CRIADOR)`; `:79` `expect(new Date(criado!.dataCriacao).getTime()).toBeGreaterThan(0)`; UI: `e2e/usuarios-novo-page.spec.ts:50,54`; matriz: `src/lib/auth/cascata.test.ts:30` | ✅ PASS (M6 confirma) |
| **CA-AU-06** GO forja criação de GT → 403 no servidor | 403; nenhum usuário criado | `e2e/usuarios.spec.ts:95` `expect(res.status()).toBe(403)`; `:96` `expect(getUsuario(CPF_FORJADO_GT)).toBeNull()`; matriz: `src/lib/auth/cascata.test.ts:30` | ✅ PASS (M3 confirma) |
| **CA-AU-07** GO sem Ofertante → obrigado a cadastrar antes | desvio para `/cadastro-ofertante`; liberado após cadastrar | `e2e/protegido-layout.spec.ts:60` `await expect(page).toHaveURL(/\/cadastro-ofertante$/)`; `e2e/cadastro-ofertante-page.spec.ts:50-51`; guarda: `src/lib/auth/guards.test.ts:80,86,94` | ✅ PASS |
| **CA-AU-08** 5 senhas erradas → 6ª bloqueada por 15 min; sucesso zera contador | bloqueio de 15 min na 5ª falha; contador zerado em sucesso | bloqueio: `e2e/login.spec.ts:152-153`, `:158-159`; janela exata: `src/lib/auth/rate-limit.integration.test.ts:68-69,72`; limiar: `:91-92`; reset: `e2e/login.spec.ts:179` `expect(getUsuario(CPF_RESET_CONTADOR)?.tentativasFalhas).toBe(0)` e `rate-limit.integration.test.ts:143-144` | ✅ PASS (M7 confirma) |
| **CA-AU-09** login rotaciona o id de sessão; o anterior deixa de ser aceito | id novo ≠ anterior; anterior removido | `e2e/login.spec.ts:201` `expect(idNovo).not.toBe(idAnterior)`; `:203` `expect(getSessao(idAnterior!)).toBeNull()`; integração: `src/lib/auth/session.integration.test.ts:55,61` | ✅ PASS |
| **CA-AU-10** nenhum endpoint que retorna dados de usuário expõe **senha nem hash** | resposta sem `senha` e sem `senhaHash` | `/primeiro-acesso` (as duas metades, corpo cru): `e2e/primeiro-acesso.spec.ts:55-56`; `/usuarios`: `e2e/usuarios.spec.ts:81` (metade "senha" é vacuosa — ver nota); `/login`: `e2e/login.spec.ts:219-222` — hash no corpo cru, **senha só dentro de `corpo.usuario`** | ⚠️ **GAP parcial** — ver M2b |

**Nota sobre `/api/usuarios`**: a metade "senha" de CA-AU-10 é **vacuosa** nesse endpoint — `usuarioSchema` (`src/lib/validation/schemas/usuario.schema.ts:5-11`) não tem campo `senha`, então nenhuma senha em texto puro existe no escopo da rota. Um vazamento do registro Prisma inteiro traria `senhaHash: null`, que casa com `/senhaHash/i`. A asserção de `usuarios.spec.ts:81` é adequada ali. **Não é gap.**

**Status**: ✅ 10/10 ACs cobertas com asserção ancorada na spec · ⚠️ 2 spec-precision gaps declarados (CA-AU-03 "sem tocar o banco", T30 "antes de renderizar o layout") · ❌ 1 metade de AC sem discriminação em `/api/auth/login` (comprovado por M2b)

---

## Discrimination Sensor

**Sensor depth**: P0-full (auth é caminho crítico; 8 mutações ≥ o mínimo de 5).

**Isolamento**: `git worktree add --detach C:/Users/lucas/AppData/Local/Temp/s3 HEAD`; `node_modules`, `src/generated/prisma` (gitignored), `.env` e `.env.test` copiados por `robocopy` (cópia real, não junction — Turbopack rejeita symlink que aponta para fora da raiz). Baseline do scratch conferido **verde antes de qualquer mutação**: gate completo, exit 0, 137 testes. Cada mutação foi revertida com `git checkout -- .` no scratch e o estado limpo reconferido antes da seguinte. Worktree removido ao final. `git status --porcelain` da árvore real: **vazio antes e vazio depois** (`diff` contra o baseline gravado: idêntico); `git worktree list` só mostra a árvore real; HEAD segue `6a03c0a`. **`git stash` não foi usado em momento algum.**

| # | Mutation | File:line | Description | Killed? |
| - | -------- | --------- | ----------- | ------- |
| M1 | Eco da senha em texto puro no 1º acesso (**re-injeção do sobrevivente da iteração 2**) | `src/app/api/auth/primeiro-acesso/route.ts:47` | acrescenta `senha: entrada.data.senha` ao objeto `usuario` da resposta | ✅ **Killed** — `e2e/primeiro-acesso.spec.ts:56`, a linha nova de `24cef5b`; 1 falha / 3 passes |
| M2a | Eco da senha no login, **dentro** de `usuario` | `src/app/api/auth/login/route.ts:81` | acrescenta `senha` ao objeto `usuario` da resposta | ✅ Killed — `e2e/login.spec.ts:222` `expect(corpo.usuario).not.toHaveProperty("senha")`; 1 falha / 10 passes |
| M2b | Eco da senha no login, **no nível de cima** do corpo | `src/app/api/auth/login/route.ts:82` | acrescenta `senha` como campo irmão de `usuario`/`primeiroAcesso` | ❌ **Survived** — 11/11 testes de `login.spec.ts` + `login-page.spec.ts` continuaram verdes |
| M3 | Matriz de cascata afrouxada | `src/lib/auth/cascata.ts:18` | `GO: [GO, VO, AL]` → `GO: [GO, VO, AL, GT]` | ✅ Killed — `src/lib/auth/cascata.test.ts:30`; 1 falha / 86 passes (unit) |
| M4 | Escopo do Ofertante decidido pelo cliente | `src/lib/auth/cascata.ts:47-51` | remove o ramo `criador.tipo === GO`, fazendo `cdOfertanteInformado` vencer | ✅ Killed — 2 falhas / 85 passes (unit) |
| M5 | Erro de login vira enumerável | `src/app/api/auth/login/route.ts:45-47` | separa `!usuario` num 401 com mensagem própria ("CPF nao cadastrado") | ✅ Killed — 2 falhas: `e2e/login.spec.ts:115` (API) e `e2e/login-page.spec.ts:73` (UI) |
| M6 | Autoria registrada errada | `src/app/api/usuarios/route.ts:53` | `criadoPor: criador.cpf` → `criadoPor: dados.cpf` | ✅ Killed — 2 falhas: `e2e/usuarios.spec.ts:63` (API) e `e2e/usuarios-novo-page.spec.ts:28` (UI) |
| M7 | Login bem-sucedido não zera o contador | `src/app/api/auth/login/route.ts:62` | `await resetarTentativas(cpf);` comentado | ✅ Killed — `e2e/login.spec.ts:164`. Nota: `test:integration` sozinho **não** pega (14/14 verdes) — a chamada vive na rota, não na lib |

**Result**: 8 injetadas, **7 killed, 1 survived** — ❌ FAIL

### M2b — mutante sobrevivente, análise

**Não é mutante equivalente** — comprovado, não inferido. Com M2b injetado, o corpo da resposta de `/api/auth/login` passa a ser:

```
{"usuario":{"cpf":"12345678062","nome":"Usuário 12345678062","tipo":"AL","primeiraVez":false,"cdOfertante":null},"senha":"SenhaValida123","primeiroAcesso":false,"proximaRota":"/painel"}
```

A senha em texto puro está no corpo, e **o suite inteiro continua verde**. Na mesma execução foi comprovado que uma asserção candidata **mata** o mutante: acrescentando `expect(texto).not.toContain(SENHA);` ao teste de CA-AU-10, ele falha com exatamente o corpo acima.

**Por que as asserções atuais não pegam** (`e2e/login.spec.ts:216-222`):

| Asserção | Alvo | Alcance |
| --- | --- | --- |
| `expect(texto).not.toContain("$argon2")` | hash | corpo inteiro ✅ |
| `expect(texto).not.toMatch(/senhaHash/i)` | hash | corpo inteiro ✅ |
| `expect(corpo.usuario).not.toHaveProperty("senhaHash")` | hash | só dentro de `usuario` |
| `expect(corpo.usuario).not.toHaveProperty("senha")` | **senha** | **só dentro de `usuario`** ❌ |

A metade "hash" está travada no corpo inteiro; a metade "senha", só num sub-objeto. `/senhaHash/i` não casa com `"senha":"SenhaValida123"` — o campo se chama `senha` e o valor não tem `$argon2`.

**É exatamente o mesmo padrão de bug das iterações 1 e 2**, agora no endpoint irmão e numa variante mais estreita: não é a ausência total da asserção (como era em `/primeiro-acesso`), é a asserção existir com alcance menor que o da sua gêmea. `/api/auth/login` também recebe senha em texto puro no corpo da requisição (`route.ts:42`) e também devolve um objeto `usuario` (`:74-84`) — a caracterização da iteração 2 de que `/primeiro-acesso` seria "o único endpoint" com essa forma estava **incorreta**; são dois.

Ironia útil: depois de `24cef5b`, `/api/auth/primeiro-acesso` está **mais bem protegido** que `/api/auth/login`. O fix usou `not.toContain` sobre o texto cru (pega qualquer nível, qualquer nome de campo); o login usa `not.toHaveProperty` sobre um sub-objeto.

Severidade **Minor**, com escopo honesto:
- Risco em produção hoje: **zero**. `login/route.ts:74-84` monta a resposta campo a campo e não inclui `senha`; o comentário em `:73` diz isso explicitamente.
- Risco real: uma regressão que ecoe a senha fora de `usuario` (por exemplo `...entrada.data` espalhado na resposta durante um debug) passa o gate inteiro sem ser vista.
- Não é um defeito de `24cef5b`: aquele commit fez o que o fix task pedia, e fez bem. Este é um buraco preexistente em `login.spec.ts`, que só ficou visível porque a iteração 3 foi procurar a recorrência do padrão em vez de reverificar só o ponto corrigido.

---

## Ambiente: dois artefatos quebrados e uma fragilidade de configuração

Achados desta iteração que **não são defeitos do código da feature**, mas bloqueiam o gate e merecem roteamento próprio.

### E1 — `next-env.d.ts` e `.next/dev/types/root-params.d.ts` preenchidos com NUL (árvore real)

O gate rodado na **árvore real** falha no `typecheck` com centenas de `error TS1127: Invalid character`, todas na linha 1 desses dois arquivos. Causa confirmada por inspeção de bytes (`od -c`): os dois estão **inteiramente preenchidos com `\0`** — 296 e 101 bytes, tamanho correto, conteúdo zerado. Assinatura clássica de arquivo cujo processo escritor morreu antes do flush. `mtime` = `2026-08-25 20:07:32`, três minutos depois de `24cef5b` — bate com o reinício do processo host que interrompeu a tentativa anterior da iteração 3.

Os dois são **gitignored** (`.gitignore:14` e `:12`) e **gerados** — por isso `git status --porcelain` segue vazio e nenhum commit está contaminado. Remédio: apagar os dois (ou rodar `npm run build`, que os regenera). Não foi feito aqui — o Verifier é read-only sobre a árvore real.

### E2 — Docker Desktop parado; `spma_test` inacessível

`docker ps` falhava (daemon fora) e a porta 3306 estava fechada, então `test:integration` e `test:e2e` não tinham banco. Mesmo reinício de host. Docker Desktop foi reiniciado e o container `spma-mysql` (`restart: unless-stopped`) voltou sozinho e saudável.

### E3 — Fragilidade real: a conexão só funciona com o cache do `caching_sha2_password` quente

Com o MySQL de pé e saudável, `test:integration` **continuava** falhando — 3 arquivos, 14 testes pulados, todos os hooks com `Hook timed out in 10000ms`, e o Prisma reportando `pool timeout: failed to retrieve a connection from pool after 10011ms (pool connections: active=0 idle=0 limit=10)`. TCP e handshake MySQL 8.4.11 respondiam normalmente do host.

Causa-raiz isolada conectando com o driver `mariadb` cru:

```
ER_CANNOT_RETRIEVE_RSA_KEY (errno 45044): RSA public key is not available client side.
Either set option `cachingRsaPublicKey` to indicate public key path,
or allow public key retrieval with option `allowPublicKeyRetrieval`
```

MySQL 8.4 usa `caching_sha2_password`. Enquanto o cache de autenticação do servidor está quente, os clientes usam o caminho rápido e tudo funciona. **Depois de todo reinício do MySQL o cache esfria**, e aí um cliente sem TLS precisa buscar a chave RSA pública do servidor — que o `DATABASE_URL` do projeto (`mysql://spma:spma_dev_only@localhost:3306/spma_test`, `.env.test:3`) não habilita. Resultado: `test:integration` e `test:e2e` quebram com um timeout opaco de 10s que não menciona autenticação em lugar nenhum.

Uma conexão com `allowPublicKeyRetrieval: true` reaquece o cache do servidor e destrava tudo — foi o que permitiu rodar o gate desta iteração. **A correção durável é do projeto**: acrescentar `allowPublicKeyRetrieval=true` (dev/test apenas) à `DATABASE_URL`, ou fixar `cachingRsaPublicKey`, ou usar TLS. Sem isso, todo desenvolvedor perde tempo com o mesmo timeout opaco depois de cada `docker compose restart` ou reboot. Escopo natural: `seguranca-transversal` ou uma task de infra — **não** um AC de `auth-e-usuarios`.

### E4 — O gate só é válido depois de um `build` prévio

Num worktree pristino (sem `.next`), `npm run typecheck` falha com `src/app/layout.tsx(20,50): error TS2304: Cannot find name 'LayoutProps'` — o Next 16 gera esse tipo global em `.next/types/`. A ordem documentada em `tasks.md` (`lint && typecheck && build && ...`) só passa se um `build` ou `dev` já rodou antes. Não é defeito da feature, mas torna o gate não reprodutível em checkout limpo/CI. Vale inverter para `lint && build && typecheck && ...` numa task de infra.

---

## Code Quality — foco em `24cef5b`

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `+6 −3` numa linha lógica de asserção. Nenhum helper, nenhuma fixture nova, nenhum refactor de carona |
| Surgical changes | ✅ Um arquivo, exatamente o do fix task. Zero alteração em código de produção |
| No scope creep | ✅ Não mexeu em rota, schema nem config |
| Matches patterns | ✅ Usa `NOVA_SENHA`, a constante já definida no arquivo (`:7`) e efetivamente enviada (`:46`) — não um literal duplicado |
| Testes não-rasos | ✅ Comprovado por M1: a linha nova é a que mata o mutante que motivou o commit |
| Reuso do corpo da resposta | ✅ Melhoria genuína: captura `res.text()` uma vez em `corpoResposta` em vez de reconsumir o corpo |
| Comentários justificam-se | ✅ `:51-53` cita o CA e explica *por que* este endpoint importa; foi atualizado junto com a asserção em vez de ficar desatualizado |
| Spec-anchored outcome check | ✅ Para `/primeiro-acesso`: assere as duas metades que CA-AU-10 nomeia |
| Per-layer Coverage Expectation met | ✅ Domínio 1:1 com ACs; as cinco rotas com happy + 401 + 400 + erro específico (403/409) |
| Every test maps to a spec requirement | ✅ A asserção nomeia CA-AU-10; nenhum teste órfão no diff |
| Documented guidelines followed | ✅ `AGENTS.md` (ler `node_modules/next/dist/docs/` antes de escrever código Next) — o diff não toca código Next |
| Would senior engineer approve? | ✅ Sim, sem ressalvas sobre o commit em si. A ressalva é que o mesmo cuidado não foi estendido a `login.spec.ts` (M2b) |

Nenhum problema de qualidade em `24cef5b`. É um fix exemplar do ponto que lhe foi pedido.

---

## Desvios documentados (reconferidos, não são achados novos)

| Desvio | Verificação |
| ------ | ----------- |
| `setCookieSessao` async | ✅ `src/lib/auth/session.ts:74` — SPEC_DEVIATION citando o doc de `cookies()` do Next 16 |
| Rotas de API usam `obterSessao()` + 401, não `requireSession()` | ✅ Justificado em `src/lib/auth/guards.ts:7-9`; 401 asserido em `usuarios.spec.ts:149-150`, `primeiro-acesso.spec.ts:90-91`, `logout.spec.ts:72-73` |
| `(onboarding)` em vez de `(protegido)` para `/primeiro-acesso` e `/cadastro-ofertante` | ✅ SPEC_DEVIATION nos dois layouts; nenhum segmento de grupo aparece na URL |
| `session-cookie.ts` isolado para manter Prisma fora do proxy | ✅ `src/proxy.ts` importa só `next/server` e `@/lib/auth/session-cookie` |
| `field.tsx` no lugar do componente shadcn "form" | ✅ SPEC_DEVIATION em `src/components/ui/field.tsx:1` |

Total de marcadores `SPEC_DEVIATION` em `src/` + `e2e/`: **5**, todos com justificativa no ponto de uso.

---

## Edge Cases

- [x] CPF com todos os dígitos iguais rejeitado — `src/lib/validation/cpf.test.ts:36,40`
- [x] CPF com tamanho errado e string vazia rejeitados — `cpf.test.ts:44,48,52`
- [x] CPF válido cujo dígito verificador nasce de resto 0/1 aceito — `cpf.test.ts:18,22`. Aritmética do módulo 11 **recalculada à mão nesta iteração** para as duas fixtures: `52601815906` (1º DV: soma 199, resto 1 → dígito 0 ✓) e `35379907580` (2º DV: soma 342, resto 1 → dígito 0 ✓). As duas exercitam o ramo em dígitos verificadores diferentes
- [x] Login em conta sem senha abre sessão pendente, não erro — `e2e/login.spec.ts:86-90`
- [x] Senha curta rejeitada sem alterar `primeiraVez` — `e2e/primeiro-acesso.spec.ts:102-118`
- [x] Confirmação divergente rejeitada — `src/lib/validation/schemas/primeiro-acesso.schema.test.ts`
- [x] Logout sem sessão não gera 5xx — `e2e/logout.spec.ts:63-75`
- [x] Cookie de sessão inválido (uuid inexistente) tratado como ausente — `usuarios.spec.ts:150`, `primeiro-acesso.spec.ts:91`
- [x] GO que já tem Ofertante recebe 409 e nada é criado — `e2e/ofertantes.spec.ts:91-102`
- [x] Perfil não-GO na rota de Ofertante recebe 403 — `e2e/ofertantes.spec.ts:107-118`
- [x] Não-GO sem `cdOfertante` não é preso na guarda de Ofertante — `src/lib/auth/guards.test.ts:91-95` (AD-012)
- [x] Payload forjando `cdOfertante` ignorado quando criador é GO — `e2e/usuarios.spec.ts:129-132` (M4 confirma)
- [x] Sessão expirada tratada como inválida — `src/lib/auth/session.integration.test.ts:82`
- [x] Seed do Admin Master idempotente — `prisma/seed.integration.test.ts`
- [x] Resposta de `/api/auth/primeiro-acesso` não ecoa a senha em claro — `e2e/primeiro-acesso.spec.ts:56` (fechado por `24cef5b`; M1 confirma)
- [ ] **Resposta de `/api/auth/login` não ecoa a senha em claro fora de `usuario` — sem asserção** (origem do mutante M2b)

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:integration && npm run test:e2e`
- **Onde**: worktree pristino em `HEAD` = `6a03c0a`, com o cache de auth do MySQL quente (ver E3)
- **Exit code**: `0`
- **Result**: **137 passed, 0 failed, 0 skipped**
  - `lint` (eslint) — ✅ limpo
  - `typecheck` (`tsc --noEmit`) — ✅ limpo
  - `build` (`next build`, Next.js 16 + Turbopack) — ✅ compilou
  - `test:unit` — 8 arquivos, **87 testes**
  - `test:integration` — 3 arquivos, **14 testes** (contra `spma_test`)
  - `test:e2e` — **36 testes** (chromium, 1 worker), 3.6m
- **Test count antes desta iteração**: 137 · **depois**: 137 · **Delta**: 0 — esperado: `24cef5b` acrescenta uma asserção **dentro** de um teste existente, não um caso novo
- **Test integrity**: nenhuma contagem caiu, nenhum teste removido, nenhuma asserção enfraquecida. O diff de `24cef5b` é aditivo em asserções (`+2` asserções, `−1` reescrita para usar a variável capturada)
- **Ressalva importante**: o mesmo comando roda na **árvore real** falha no `typecheck` — por E1 (dois arquivos gerados preenchidos com NUL), não por código. Antes de E2/E3 serem resolvidos, integration e e2e também não rodavam. O resultado acima é o do checkout limpo, que é o estado reprodutível da feature

---

## Fix Plans

### Fix 1: assertar a metade "senha" de CA-AU-10 no corpo inteiro em `/api/auth/login`

- **Root cause**: `e2e/login.spec.ts:222` assere `expect(corpo.usuario).not.toHaveProperty("senha")` — trava a senha apenas *dentro* do sub-objeto `usuario`, enquanto a metade "hash" (`:219-220`) está travada no corpo inteiro. Um eco da senha em qualquer outro ponto do corpo passa. `/api/auth/login` recebe a senha em texto puro (`route.ts:42`) e devolve um objeto `usuario` (`:74-84`) — mesma forma de `/primeiro-acesso`. M2b sobrevive ao suite inteiro.
- **Fix task**: em `e2e/login.spec.ts`, no teste `CA-AU-10` (`:210`), acrescentar uma linha ao lado das existentes: `expect(texto).not.toContain(SENHA);` (`SENHA` já é a constante do arquivo, `:12`). Manter as quatro asserções atuais — a nova é complementar, não substituta.
- **Where**: `e2e/login.spec.ts` (uma linha; nenhum código de produção muda)
- **Verify**: reinjetar M2b (`senha,` como campo irmão de `usuario` em `src/app/api/auth/login/route.ts:82`) num worktree scratch e confirmar que `npx playwright test e2e/login.spec.ts` **falha**. Já comprovado nesta iteração que a asserção proposta mata o mutante.
- **Done when**: o suite e2e mata M2b, e o gate completo segue verde (137 testes) na árvore não mutada.
- **Priority**: **Minor** — nenhum defeito em produção; a resposta é montada campo a campo. É fechamento da última metade não discriminada de um AC de segurança.

### Fix 2 (infra, fora do escopo de `auth-e-usuarios`): destravar a conexão com o MySQL após reinício

- **Root cause**: E3 — `caching_sha2_password` + `DATABASE_URL` sem `allowPublicKeyRetrieval`. Depois de cada reinício do MySQL, `test:integration`/`test:e2e` falham com timeout opaco de 10s.
- **Fix task**: acrescentar `?allowPublicKeyRetrieval=true` à `DATABASE_URL` de `.env.test` (e `.env` de dev), ou documentar o passo de reaquecimento no README.
- **Priority**: **Major** para produtividade (bloqueia o gate inteiro sem dizer por quê), **Cosmetic** para o produto.

### Fix 3 (infra): tornar o gate reprodutível em checkout limpo

- **Root cause**: E4 — `typecheck` antes de `build` falha sem `.next/types` (`LayoutProps`).
- **Fix task**: inverter a ordem do gate em `tasks.md` para `lint && build && typecheck && ...`.
- **Priority**: **Minor**.

### Housekeeping (não é fix task): limpar os artefatos corrompidos

`rm next-env.d.ts && rm -rf .next` na árvore real (E1), ou simplesmente `npm run build`. Ambos são gitignored e regenerados; nenhum commit está afetado.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| REQ-AU-01 | Implementing | ✅ Verified |
| REQ-AU-02 | Implementing | ✅ Verified |
| REQ-AU-03 | ✅ Verified | ✅ Verified (aritmética das fixtures reconferida à mão) |
| REQ-AU-04 | Implementing | ✅ Verified (M5 confirma discriminação) |
| REQ-AU-05 | Implementing | ✅ Verified (M3, M6 confirmam) |
| REQ-AU-06 | Implementing | ✅ Verified (M3 confirma) |
| REQ-AU-07 | Implementing | ✅ Verified (M6 confirma) |
| REQ-AU-08 | Implementing | ✅ Verified (M4 confirma) |
| REQ-AU-09 | Implementing | ✅ Verified |
| REQ-AU-10 | Implementing | ✅ Verified |
| REQ-AU-11 | Implementing | ✅ Verified (M7 confirma) |
| REQ-AU-12 | ⚠️ Verified com uma metade de CA-AU-10 sem discriminação | ⚠️ Verified com uma metade de CA-AU-10 sem discriminação **em `/api/auth/login`** (Fix 1) — a metade de `/primeiro-acesso` foi fechada por `24cef5b` |

---

## Summary

**Overall**: ⚠️ Issues — um fix de uma linha de teste antes de fechar a feature

**Spec-anchored check**: 10/10 ACs com asserção que bate o valor definido na spec; 2 spec-precision gaps declarados e honestos; 1 metade de AC (CA-AU-10 "senha" em `/api/auth/login`) sem discriminação comprovada
**Sensor**: 7/8 mutantes mortos (P0-full)
**Gate**: 137 passed, 0 failed, 0 skipped, exit 0 (em checkout limpo)

**O que a iteração 3 confirma**: `24cef5b` é correto, mínimo e empiricamente eficaz — M1 reinjeta o sobrevivente da iteração 2 e ele morre na linha exata que o commit acrescentou. Nenhuma regressão: 137 testes, contagem inalterada como previsto. Seis mutações em áreas nunca antes sondadas (matriz de cascata, resolução de escopo, não-enumerabilidade, autoria, reset de contador, eco de senha no login dentro de `usuario`) morreram todas — o suite discrimina bem em toda a largura da feature.

**O que ainda falta**: o padrão de asserção parcial que motivou as iterações 1 e 2 **recorre em `/api/auth/login`**. Lá a metade "hash" de CA-AU-10 é asserida no corpo inteiro, mas a metade "senha" só dentro de `corpo.usuario`; um eco fora desse sub-objeto sobrevive ao suite inteiro (M2b, comprovado com o corpo real da resposta). A afirmação da iteração 2 de que `/primeiro-acesso` era "o único endpoint" com senha em texto puro + objeto `usuario` estava incorreta — `/api/auth/login` tem a mesma forma. Fix de uma linha, já validada contra o mutante.

**Achados de ambiente** (não são defeitos da feature, mas bloqueiam o gate): dois arquivos gerados preenchidos com NUL na árvore real (E1); Docker parado (E2, resolvido); e uma fragilidade real de configuração em que a conexão do Prisma só funciona com o cache do `caching_sha2_password` quente (E3) — vale uma task de infra própria.

**Next steps**: esta é a **iteração 3 de 3**. Pelo bound do `validate.md`, o ciclo fix→re-verify se esgotou: escalar ao usuário em vez de rodar uma 4ª rodada. A recomendação do Verifier é que Fix 1 é de baixíssimo risco (uma linha de teste, zero código de produção, mutante e asserção já validados empiricamente) e que Fix 2 merece virar task de infra independente. Nenhuma mudança de código de produção é necessária em nenhum dos dois.
