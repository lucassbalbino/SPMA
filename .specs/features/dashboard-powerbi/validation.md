# dashboard-powerbi Validation

## Validation: dashboard-powerbi - PASS ✅ (iteração 2)

Na iteração 1 o veredito foi FAIL: 4 mutações sobreviveram. O commit `8488519` acrescentou 4 testes e não mudou código de produção. Agora as 29 mutações morrem. Os 23 ACs têm evidência `arquivo:linha`. A lacuna de precisão do PBI-20 foi fechada na spec. Os gates estão verdes: typecheck limpo, 1091 testes unitários. A T11 (Power BI real) segue pendente com o usuário.

**Date**: 2026-11-25
**Spec**: `.specs/features/dashboard-powerbi/spec.md`
**Diff range**: `7b9918e..8488519` (código de `426fc03` a `c961dd5`; correções de teste em `8488519`). As seções abaixo de "Iteração 2" registram a iteração 1 (`7b9918e..c961dd5`).

---

## Iteração 2 (commit `8488519`)

O que mudou: só testes e a spec. `git show --stat 8488519` lista `painel-cliente.test.ts`, `servico.test.ts`, `spec.md` e `tasks.md`. Nenhum arquivo de produção mudou.

| Lacuna | Teste novo | Asserção | Mutação reaplicada |
| ------ | ---------- | -------- | ------------------ |
| M12, PBI-16 | `src/lib/powerbi/servico.test.ts:342` "Entra sem expires_in → ErroMicrosoft, sem chegar ao GenerateToken" | `SVT:346` `toBeInstanceOf(ErroMicrosoft)`; `SVT:347` `chamadas.gerar toBe(0)` | ✅ Morta |
| M23, PBI-12 | `src/lib/powerbi/painel-cliente.test.ts:150` "exatamente 30 000 ms de validade ainda é montado" | `PCT:154` `embed toHaveBeenCalledTimes(1)`; `PCT:155` `reset not.toHaveBeenCalled()`; `PCT:156` `status toEqual([""])` | ✅ Morta |
| M24, PBI-13 | `src/lib/powerbi/painel-cliente.test.ts:185` "fetch abortado pelo parar não avisa nem remove de novo" (o `buscar` rejeita com `AbortError` quando o sinal aborta) | `PCT:205` `status toEqual([])`; `PCT:206` `reset toHaveBeenCalledTimes(1)`; `PCT:207` `embed not.toHaveBeenCalled()` | ✅ Morta |
| M29, PBI-17 | `src/lib/powerbi/servico.test.ts:236` `["-1", 1000]` no `it.each` | `SVT:252` `esperas toEqual([1000])` | ✅ Morta |
| PBI-20 (precisão) | `spec.md`, AC 6 de "Falhas externas": "janela fixa de 60 s, contada a partir do primeiro pedido da janela"; a tabela de suposições registra a rajada de até 40 pedidos na virada | Bate com `limite.ts:21,27-32` e com `LMT:20,23` (59 999 negado, 60 000 libera) | ✅ Precisa |

**Sensor, iteração 2**: worktree isolado a partir de `8488519`, com junções para `node_modules` e `src/generated`. As 4 sobreviventes foram reaplicadas e morreram. As 29 mutações foram rodadas de novo, e as 29 morreram. As junções e o worktree foram removidos. `git status --porcelain` do repo real ficou igual antes e depois: `?? .specs/features/dashboard-powerbi/validation.md`, `?? "Claude outputs/"`.

**Gates, iteração 2** (PowerShell, repo real, `8488519`): `npm run typecheck` limpo; `npm run test:unit` **1091 passed** (50 arquivos), 0 failed, 0 skipped. São 4 testes a mais que os 1087 da iteração 1. O e2e não foi rodado de novo: a iteração 2 não tocou em nenhum arquivo que ele exercite, e na iteração 1 deu 31 passed.

**Resultado**: 23/23 ACs com evidência; 0 spec-precision gaps; sensor 29/29 mortas. **PASS ✅**
**Verifier**: sub-agente independente (autor ≠ verificador)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 catálogo | ✅ Done | 426fc03 |
| T2 configuração | ✅ Done | 9e7c4ef |
| T3 serviço | ✅ Done | a6aad8e |
| T4 limitador | ✅ Done | 0117896 |
| T5 rota | ✅ Done | e6f1dc5 |
| T6 controlador do cliente | ✅ Done | 080d18a |
| T7 página | ✅ Done | 8cd4d2b |
| T8 navegação | ✅ Done | aa920d7. Desvio registrado: `e2e/identidade-visual.spec.ts` ganhou o item nas 2 listas do GT. |
| T9 CSP | ✅ Done | f2a6325 |
| T10 docs | ✅ Done | c961dd5 |
| T11 homologação real | ⏳ Pendente | Manual, do usuário. Ver a seção da T11. |

---

## Spec-Anchored Acceptance Criteria

Caminhos curtos: `RT` = `src/app/api/powerbi/embed/route.test.ts`, `SVT` = `src/lib/powerbi/servico.test.ts`, `CFT` = `src/lib/powerbi/configuracao.test.ts`, `CAT` = `src/lib/powerbi/catalogo.test.ts`, `LMT` = `src/lib/powerbi/limite.test.ts`, `PCT` = `src/lib/powerbi/painel-cliente.test.ts`, `NVT` = `src/lib/ui/navegacao.test.ts`, `E2E-R` = `e2e/relatorios.spec.ts`.

| AC | Resultado definido na spec | `arquivo:linha` + asserção | Resultado |
| -- | -------------------------- | -------------------------- | --------- |
| PBI-01 | Título "Visualização de Relatórios" e relatório montado no contêiner `relatorio-powerbi` | `E2E-R:43` `getByRole("heading",{level:1,name:"Visualização de Relatórios"})).toBeVisible()`; `E2E-R:44` `getByTestId("relatorio-powerbi")).toBeVisible()`; montagem pelo controlador: `PCT:83` `sdk.embed toHaveBeenCalledWith(CONTAINER,{type:"report",id:"rel-1",embedUrl:…,accessToken:"token-1",tokenType:7,permissions:9})` | ✅ parcial automático. O automático prova o título, o contêiner e o controlador com SDK simulado. A montagem do iframe real só a T11 prova. |
| PBI-02 | 200, exatamente 4 campos, `Cache-Control: no-store` | `RT:178` `status toBe(200)`; `RT:179` `headers.get("cache-control") toBe("no-store")`; `RT:181` `Object.keys(corpo).sort() toEqual(["embedToken","embedUrl","expiration","reportId"])`; `RT:182-185` cada campo pelo valor. Para AM, GT, VT, GO e VO (`RT:165-171`). | ✅ |
| PBI-03 | VO manda o CNPJ do GO; AM/GT/VT/GO o próprio documento | `CAT:49` `toBe(CPF)` (AM/GT/VT); `CAT:53` `toBe(CNPJ_GO)` (GO); `CAT:59` VO → `toBe(CNPJ_GO)`; na rota: `RT:186` `gerarEmbed toHaveBeenCalledWith({relatorio, username, role:"segurança_SPMA"})` com VO → `CNPJ_GO` (`RT:170`) | ✅ |
| PBI-04 | `allowEdit: false`, role do painel, dataset em `identities.datasets` e `datasets` | `SVT:107` `corpos[0] toEqual({datasets:[{id:DATASET}],reports:[{id:REPORT,allowEdit:false}],identities:[{username:"01234567890",roles:["segurança_SPMA"],datasets:[DATASET]}]})`; `CAT:42-43` role `toBe("segurança_SPMA")` nos dois painéis | ✅ |
| PBI-05 | Identidade e relatório só da sessão; query, corpo e cabeçalhos não mudam nada | `RT:201` `comQuery toEqual(semQuery)` com `?documento=…&reportId=…&username=…`. Corpo e cabeçalhos: por construção, `route.ts:21` `async function embed()` não recebe o `Request`. | ✅ (query por teste; corpo e cabeçalhos por leitura) |
| PBI-06 | Par `_<PAINEL>` usado pelo painel; sem ele, o padrão | `CFT:37` os dois painéis no padrão (`toEqual` do objeto inteiro); `CFT:65` só `ofertante` troca; `CFT:79` só `nacional` troca; a rota usa o relatório do painel: `RT:182-183` com `NACIONAL`/`OFERTANTE` distintos | ✅ |
| PBI-07 | 401 `{ "erro": "Não autenticado" }` sem chamar a Microsoft | `RT:82` `status toBe(401)`; `RT:83` `json() toEqual({erro:"Não autenticado"})`; `RT:84` `gerarEmbed not.toHaveBeenCalled()` | ✅ (o teste simula a rejeição do guard; a mensagem real vem de `src/lib/api/guardas.ts:27`, código compartilhado e anterior à feature) |
| PBI-08 | API: 403 `{ "erro": "Acesso negado" }` sem Microsoft; página: "Seu perfil não tem acesso a relatórios." | `RT:92-94` `toBe(403)`, `toEqual({erro:"Acesso negado"})`, `gerarEmbed not.toHaveBeenCalled()`; `E2E-R:78` `getByText("Seu perfil não tem acesso a relatórios.",{exact:true})).toBeVisible()`; `E2E-R:79` contêiner `toHaveCount(0)` | ✅ |
| PBI-09 | VO sem `cdOfertante` → 403 `{ "erro": "Acesso negado" }` sem Microsoft | `RT:102-104`; `CAT:65` `identidadePowerBi(VO sem vínculo) toBeNull()` | ✅ |
| PBI-10 | Módulo com link `/relatorios` para AM, GT, VT, GO, VO; nunca para AL | `NVT` `HREFS_ESPERADOS` e `MODULOS_ESPERADOS` dos 6 perfis (com `/relatorios` em AM/GT/VT/GO/VO); teste de coerência `expect(modulosDoPerfil(tipo).includes("Visualização de Relatórios")).toBe(temPainel)` e `rotuloDe(tipo,"/relatorios")`; `expect(hrefsDe(AL)).not.toContain("/relatorios")`; e2e `e2e/painel.spec.ts:63` (lista do GT no painel) e `e2e/identidade-visual.spec.ts:305,381` (menu do GT) | ✅ |
| PBI-11 | Espera = `max(1000, restante − min(120000, restante/2))`; renovação por `setAccessToken`, sem novo `embed` | `PCT:73` `calcularEspera(restante) toBe(espera)` para 3 600 000→3 480 000, 180 000→90 000, 40 000→20 000, 1 500→1 000; `PCT:98` agendado `toEqual([3_480_000])`; `PCT:108-109` `embed toHaveBeenCalledTimes(1)`, `setAccessToken toHaveBeenCalledWith("token-2")` | ✅ |
| PBI-12 | Não-2xx, erro de rede ou validade < 30 000 ms → remove o relatório e mostra "Dashboard indisponível. Entre novamente ou tente mais tarde." | `PCT:128-130` (401/403/429/502/503) `reset toHaveBeenCalledWith(CONTAINER)`, `status toEqual([MENSAGEM_INDISPONIVEL])`; `PCT:137-138` rede; `PCT:145-147` 29 999 ms; `PCT:211` texto exato da mensagem; `E2E-R:45` texto na tela real | ✅ (iteração 1: M23 sobreviveu; fechado na iteração 2, `PCT:150-156`) |
| PBI-13 | Desmontar: remove o relatório, cancela a renovação, aborta o pedido; resposta tardia não monta | `PCT:169-171` `reset toHaveBeenCalledWith(CONTAINER)`, `cancelados toEqual([handle])`, `inits[0].signal?.aborted toBe(true)`; `PCT:182-184` resposta tardia: `embed not.toHaveBeenCalled()`, `status toEqual([])`, `agendados toEqual([])` | ✅ (iteração 1: M24 sobreviveu; fechado na iteração 2, `PCT:185-207`) |
| PBI-14 | Evento `error` → "Falha ao exibir relatório" | `PCT:195` `status toEqual(["", MENSAGEM_FALHA_RELATORIO])`; `PCT:212` texto exato; `PCT:205` depois de `parar()` nada muda | ✅ |
| PBI-15 | Config ausente/inválida → 503 `{ "erro": "Dashboard não configurado" }`; nenhuma outra rota afetada | `CFT:88` cada obrigatória ausente → `toEqual({ok:false,motivo:"ausente",variavel})`; `CFT:96` só espaços; `CFT:116`, `CFT:126` GUID; `CFT:138` 6 formas de embed URL inválida; `CFT:146-166` par incompleto ou de outro relatório; `RT:131-134` 503 com corpo exato e sem chamar a Microsoft; servidor real: `E2E-R:38-39` `status toBe(503)`, `toEqual({erro:"Dashboard não configurado"})`. "Nenhuma outra rota": as 31 e2e passam com o Power BI desligado pelo `.env.test`. | ✅ |
| PBI-16 | Erro, resposta incompleta ou mais de 10 000 ms → 502 `{ "erro": "Dashboard temporariamente indisponível" }`, sem detalhe | `RT:145-146` `toBe(502)`, `toEqual({erro:"Dashboard temporariamente indisponível"})` para `ErroMicrosoft(403/503/null)`; `SVT:304` `AbortSignal.timeout` chamado com `[[10_000],[10_000]]`; `SVT:318-319` timeout → `ErroMicrosoft` com `status toBeNull()`; `SVT:330` GenerateToken sem token, com expiration inválida, vazio; `SVT:337` Entra sem `access_token` | ✅ (iteração 1: M12 sobreviveu; fechado na iteração 2, `SVT:342-347`) |
| PBI-17 | 429/503 → 1 nova tentativa após `Retry-After` (máx. 5 s; 1 s se falta ou é inválido) | `SVT:251-252` `esperas toEqual([esperaMs])`, `chamadas.gerar toBe(2)` para "2"→2000, "30"→5000, ausente→1000, "abc"→1000; `SVT:268-269` 503 no Entra; `SVT:278-280` segunda falha → `status toBe(503)`, 2 chamadas; `SVT:290-292` 403 não repete | ✅ (iteração 1: M29 sobreviveu; fechado na iteração 2, `SVT:236`) |
| PBI-18 | Token do Entra até 120 s antes de vencer; uma chamada para N pedidos simultâneos | `SVT:156` `chamadas.entra toBe(1)` com 200 simultâneos; `SVT:183` 1 chamada em `3 600 000 − 120 000 − 1`; `SVT:187-188` 2 chamadas na fronteira exata | ✅ |
| PBI-19 | Um `GenerateToken` por pedido, nunca reaproveitado | `SVT:157` `chamadas.gerar toBe(200)`; `SVT:170-172` mesmo usuário → `embed-1`, `embed-2` | ✅ |
| PBI-20 | Mais de 20 pedidos da mesma sessão em 60 s → 429 com a mensagem da spec, sem Microsoft | `LMT:10-11` 20 passam, o 21º `toBe(false)`; `LMT:20,23` 59 999 → negado, 60 000 → libera; `LMT:30-31` chaves separadas; `RT:115-119` `toBe(429)`, `toEqual({erro:"Muitas requisições. Tente novamente em instantes."})`, `gerarEmbed toHaveBeenCalledTimes(20)` | ✅ (a spec agora fixa a janela de 60 s; ver abaixo) |
| PBI-21 | `frame-src https://app.powerbi.com` e as demais diretivas sem alteração | `E2E-R:60` `diretivas toContain("frame-src https://app.powerbi.com")`; `E2E-R:61-71` `default-src`, `object-src`, `frame-ancestors`, `base-uri`, `form-action`, `script-src` e `style-src` com nonce, cada um pelo valor; o diff de `src/proxy.ts` acrescenta só a linha 53; `e2e/security-headers.spec.ts` passa sem alteração | ✅ |
| PBI-22 | Sucesso: perfil e painel, sem documento/token/segredo; falha: só id de correlação e status | `RT:211` `logs toContainEqual(["powerbi.embed emitido",{perfil:"VO",painel:"ofertante"}])`; `RT:213-216` sem CPF, CNPJ, token, segredo; `RT:157-160` `erro[0] toMatch(/^[0-9a-f-]{36}$/)`, `toContain(429)`, sem CPF nem segredo | ✅ |
| PBI-23 | Segredo e token do Entra fora de resposta, log e código do navegador | Resposta: `RT:181` só 4 chaves; `SVT:143-144` retorno sem `aad-1` nem segredo; erros: `SVT:351-352` mensagem, stack e JSON sem segredo nem `aad-1`; config: `CFT:178` falha sem o segredo; logs: `RT:160,216`. Navegador: por leitura, `PainelPowerBi.tsx:14` só importa `painel-cliente`, que não importa nada; as `SPMA_*` não são `NEXT_PUBLIC_`. | ✅ (navegador por leitura) |

**Status**: ✅ 23/23 ACs com evidência. Na iteração 1, quatro ACs tinham mutante sobrevivente (PBI-12, PBI-13, PBI-16, PBI-17) e havia 1 spec-precision gap. A iteração 2 fechou tudo.

### Spec-precision gap (fechado na iteração 2)

- **PBI-20**: a spec diz "mais de 20 pedidos dentro de 60 s". O limitador usa janela fixa por sessão (`limite.ts:21,27-32`), como o design define (design.md:141). Na janela fixa, uma sessão pode passar até 40 pedidos em ~2 s se eles caírem nas duas pontas de duas janelas. A spec não diz se a janela é fixa ou deslizante. Os testes provam a janela fixa. Sugestão: escrever "20 pedidos por janela fixa de 60 s" na spec. **Fechado em `8488519`**: o PBI-20 agora diz "janela fixa de 60 s, contada a partir do primeiro pedido da janela", e a suposição registra a rajada de até 40 pedidos.

---

## Edge Cases

- [x] VO perde o vínculo depois de abrir → renovação 403 → mensagem de PBI-12. `RT:102` (403) + `PCT:124-130` (403 → `MENSAGEM_INDISPONIVEL`). O teste do cliente usa o 403 no primeiro pedido, não na renovação; a renovação com falha é provada com 401 em `PCT:150-158`.
- [x] Sessão expira com o dashboard aberto → renovação 401 → mensagem. `PCT:150-158` `status toEqual(["", MENSAGEM_INDISPONIVEL])`, `reset toHaveBeenCalledWith(CONTAINER)`.
- [x] Entra falha com vários esperando → todos 502; o seguinte tenta de novo. `SVT:219-226` (50 rejeitam com `ErroMicrosoft`, 1 chamada; depois `chamadas.entra toBe(2)`) + `RT:139-146` (`ErroMicrosoft` → 502).
- [x] Token do Entra vence numa rajada → 1 renovação. `SVT:201` `chamadas.entra toBe(2)` para 1 + 100 pedidos.
- [x] Documento com zero à esquerda sai como texto. `CAT:73-75` `toBe("01234567890")`; `SVT:110` `username:"01234567890"` no corpo; `RT:23,166` CPF `"01234567890"` chega igual ao serviço.
- [x] Query com `documento`, `reportId`, `username` é ignorada. `RT:192-201`.
- [x] Par `_OFERTANTE` incompleto → 503, sem cair no padrão. `CFT:146-156` (`motivo:"invalida"`, nome da metade que falta) + `RT:122-134` (`invalida` → 503).

---

## Gate Check

Rodado pelo Verifier, no PowerShell, em `c961dd5`.

- **Typecheck**: `npm run typecheck` → limpo.
- **Unit**: `npm run test:unit` → **1087 passed**, 0 failed, 0 skipped (50 arquivos).
- **e2e**: `npx playwright test e2e/relatorios.spec.ts e2e/painel.spec.ts e2e/identidade-visual.spec.ts e2e/security-headers.spec.ts --workers=2` → **31 passed**, 0 failed.
- **Test count antes da feature**: 962 unit (linha de base em tasks.md, HEAD `7b9918e`).
- **Test count depois**: 1087 unit. **Delta**: +125.
- **Asserções enfraquecidas**: nenhuma. Os dois testes e2e de menu do GT ganharam um item na lista exata, sem afrouxar a asserção.
- **Não rodado pelo Verifier**: `npm run lint` e `npm run build` (build gate da T10). O autor registra os dois verdes sem nenhuma `SPMA_*`.

---

## Discrimination Sensor

**Profundidade**: P0 expandida (autorização e segurança), 29 mutações manuais.
**Isolamento**: `git worktree` em `scratchpad/verif-wt` a partir de `c961dd5`, com junções para `node_modules` e `src/generated`. Cada mutação foi aplicada, testada com `npx vitest run <testes>` e revertida. Depois as junções foram removidas e o worktree também. `git status --porcelain` do repo real, antes e depois: `?? "Claude outputs/"` nos dois.

| # | Mutação | Arquivo | Teste que matou | Resultado |
| - | ------- | ------- | --------------- | --------- |
| M01 | Tirar `!username` do 403 | `src/app/api/powerbi/embed/route.ts:26` | `RT` "VO sem GO vinculado → 403" | ✅ Morta |
| M02 | Chamar o serviço antes do 403 | `route.ts:24` | `RT` AL 403, VO 403 e mais 6 | ✅ Morta |
| M03 | VO manda o próprio documento | `src/lib/powerbi/catalogo.ts:57` | `CAT` VO, `RT` VO 200 e 403 | ✅ Morta |
| M04 | `allowEdit: true` | `src/lib/powerbi/servico.ts:146` | `SVT` "pede só leitura…" | ✅ Morta |
| M05 | Sem `pendente` compartilhado (cada pedido chama o Entra) | `servico.ts:114` | `SVT` 200 simultâneos, rajada, falha com 50 | ✅ Morta |
| M06 | Nova tentativa também em 403 | `servico.ts:100` | `SVT` "403 não tenta de novo" | ✅ Morta |
| M07 | Sem nova tentativa em 429 | `servico.ts:100` | `SVT` 4 casos de Retry-After | ✅ Morta |
| M08 | `pendente` não zera (falha do Entra fica guardada) | `servico.ts:132` | `SVT` "Entra falha com 50…", "reaproveita…" | ✅ Morta |
| M09 | Timeout de 30 s | `servico.ts:25` | `SVT` "timeout de 10 000 ms" | ✅ Morta |
| M10 | Sem teto de 5 s no Retry-After | `servico.ts:28` | `SVT` "Retry-After 30 → 5000" | ✅ Morta |
| M11 | Margem do token do Entra = 0 | `servico.ts:26` | `SVT` "reaproveita… até 120 s" | ✅ Morta |
| M12 | Entra sem `expires_in` aceito | `servico.ts:126` | - | ❌ **Sobreviveu** → Fix 1 |
| M13 | `>` no lugar de `>=` no limite | `src/lib/powerbi/limite.ts:32` | `LMT` 21º negado, `RT` 429 | ✅ Morta |
| M14 | Limite por documento, não por sessão | `route.ts:30` | `RT` 11 testes (503/502/200) | ✅ Morta |
| M15 | Sem `Cache-Control: no-store` | `route.ts:64` | `RT` 200 dos 5 perfis | ✅ Morta |
| M16 | Log de sucesso com `username` | `route.ts:55` | `RT` "registra perfil e painel…" | ✅ Morta |
| M17 | 502 com a causa no corpo | `route.ts:50` | `RT` 502 (3 casos) | ✅ Morta |
| M18 | Par incompleto cai no padrão | `src/lib/powerbi/configuracao.ts:113` | `CFT` 2 edge cases + segredo | ✅ Morta |
| M19 | Sem `if (parado) return` depois do `json()` | `src/lib/powerbi/painel-cliente.ts:78` | `PCT` "resposta que chega depois de parar…" | ✅ Morta |
| M20 | Renovação monta de novo (sem `setAccessToken`) | `painel-cliente.ts:87` | `PCT` "ingresso renovado entra por setAccessToken" | ✅ Morta |
| M21 | `parar()` não aborta o fetch | `painel-cliente.ts:62` | `PCT` "remove…, cancela… e aborta" | ✅ Morta |
| M22 | `parar()` não cancela o timer | `painel-cliente.ts:60` | `PCT` "remove…, cancela… e aborta" | ✅ Morta |
| M23 | Validade mínima com `<=` (fronteira 30 000) | `painel-cliente.ts:83` | - | ❌ **Sobreviveu** → Fix 2 |
| M24 | `catch` avisa mesmo depois de `parar()` | `painel-cliente.ts:111` | - | ❌ **Sobreviveu** → Fix 3 |
| M25 | `calcularEspera` com teto de 60 s | `painel-cliente.ts:19` | `PCT` calcularEspera + agendamento | ✅ Morta |
| M26 | Evento `error` ignorado | `painel-cliente.ts:100` | `PCT` "o evento error avisa…" | ✅ Morta |
| M27 | AL recebe o módulo | `src/lib/ui/navegacao.ts:102` | `NVT` coerência PBI-10, AL sem `/relatorios`, mais 2 | ✅ Morta |
| M28 | Role sem o "ç" | `catalogo.ts:32` | `CAT` role, `RT` GO e VO | ✅ Morta |
| M29 | `Retry-After` negativo aceito | `servico.ts:60` | - | ❌ **Sobreviveu** → Fix 4 |

Mutações que só o e2e pegaria, avaliadas por leitura: tirar a linha `frame-src` de `src/proxy.ts:53` cai em `E2E-R:60`; trocar o texto do card de sem acesso em `page.tsx:26` cai em `E2E-R:78`; tirar o `data-testid` do contêiner cai em `E2E-R:44` e `:79`.

**Resultado (iteração 1)**: 25/29 mortas, 4 sobreviventes. FAIL ❌. **Iteração 2**: 29/29 mortas. PASS ✅

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ Módulos pequenos; nada além do que a spec pede |
| Mudanças cirúrgicas | ✅ Nenhuma migration; `session.ts`, `guards.ts`, `CascaProtegida.tsx`, `globals.css` e `next.config.ts` fora do diff |
| Sem escopo extra | ✅ |
| Segue os padrões | ✅ `comTratamentoDeErro`, `erroHttp`, `exigirSessao`; serviço em `globalThis` como o Prisma |
| AD-039 (sem cor literal, sem `style=`) | ✅ `page.tsx` e `PainelPowerBi.tsx` só usam tokens |
| Navegação de fonte única | ✅ `navegacao.ts` e teste de coerência com o catálogo |
| Asserções batem com a spec | ✅ status, corpos e mensagens exatos (`toEqual`); exceções nos Fix 1-4 |
| Cobertura por camada | ✅ domínio 1:1 com os ACs; rota com 200/401/403/429/502/503 |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ |
| Diretrizes do projeto | ✅ `AGENTS.md`, memória "teste enxuto" (e2e só para o que a unidade não prova) |

---

## Fix Plans

Os 4 são só de teste. Nenhum muda código de produção. **Todos aplicados em `8488519` e conferidos na iteração 2.**

### Fix 1: Entra sem `expires_in` (PBI-16)

- **Causa**: nenhum teste manda resposta do Entra com `access_token` e sem `expires_in`. Sem a checagem de `servico.ts:126`, o serviço seguiria com cache `NaN` e chamaria o Entra a cada pedido, em vez de responder 502.
- **Task**: em `SVT`, ao lado de "Entra sem access_token" (`SVT:333`), um caso `{ access_token: "aad-1" }` (sem `expires_in`) e outro com `expires_in: "abc"` → `toBeInstanceOf(ErroMicrosoft)`.
- **Prioridade**: Minor.

### Fix 2: Fronteira de 30 000 ms (PBI-12)

- **Causa**: só 29 999 ms é testado. Trocar `<` por `<=` em `painel-cliente.ts:83` passa.
- **Task**: em `PCT`, um caso com `agora = Date.parse(EXPIRACAO) − 30_000` → `sdk.embed toHaveBeenCalledTimes(1)` e status `[""]`.
- **Prioridade**: Minor.

### Fix 3: Abort real depois de `parar()` (PBI-13)

- **Causa**: o `fetch` falso ignora o `signal`. No navegador, `abort()` faz o `fetch` rejeitar com `AbortError`, e isso cai no `catch`. Se o `if (!parado)` de `painel-cliente.ts:111` sumisse, a página desmontada chamaria `reset` de novo e mostraria a mensagem de indisponível. Nenhum teste pega isso.
- **Task**: em `PCT`, um `buscar` que rejeita com `DOMException("aborted","AbortError")` quando o `signal` aborta; chamar `parar()` antes da resposta; afirmar `status toEqual([])` e `sdk.reset toHaveBeenCalledTimes(1)`.
- **Prioridade**: Minor.

### Fix 4: `Retry-After` negativo (PBI-17)

- **Causa**: a spec manda 1 s quando o cabeçalho é inválido. O caso `"-1"` não é testado. Sem `segundos < 0` (`servico.ts:60`), a espera seria −1000 ms.
- **Task**: em `SVT:231`, acrescentar `["-1", 1000]` ao `it.each`.
- **Prioridade**: Minor.

---

## Requirement Traceability Update

| Requirement | Status anterior | Status novo |
| ----------- | --------------- | ----------- |
| PBI-02 a PBI-23 | Implementing | ✅ Verified (PBI-12, 13, 16 e 17 depois da iteração 2) |
| PBI-01 | Implementing | ⏳ Automático verde; montagem real depende da T11 |

---

## T11 — homologação com o Power BI real: pendente (executada pelo usuário)

Roteiro da T11 (`tasks.md`). Rodar com o segredo já trocado no `.env` local e `npm run dev`. Anotar ✅/❌ e uma observação em cada item.

- [ ] GT e VT veem o relatório com visão nacional
- [ ] AM vê o mesmo
- [ ] GO vê só os cursos do próprio CNPJ; um segundo GO não vê os do primeiro
- [ ] VO vê o mesmo recorte do GO dele
- [ ] AL não vê o módulo; `/relatorios` mostra o card de sem acesso
- [ ] Nenhum erro de CSP no console (se houver `frame-src` bloqueado, ampliar para `https://*.powerbi.com` e repetir)
- [ ] Sair pelo menu remove o relatório; voltar sem logar cai no login
- [ ] Renovação: com o DevTools, confirmar o segundo `GET /api/powerbi/embed` agendado e o relatório seguindo sem recarregar (ou forçar com um token de validade curta)
- [ ] Desligar a rede por um instante na renovação → mensagem de indisponível
- [ ] Usuário criado depois do último refresh do dataset: anotar o que ele vê (documenta o comportamento da role do cliente)

### Ativação local (2026-11-25, Claude, a pedido do usuário)

Variáveis `SPMA_*` do arquivo do cliente no `.env` local (ignorado pelo git), `npm run dev`, usuários do cenário de demonstração. **Primeira chamada real à Microsoft: a rotina funciona de ponta a ponta.** O segredo antigo ainda é aceito pelo Entra ID, então a troca dele continua pendente.

| Perfil (demo) | Painel | `GET /api/powerbi/embed` |
| --- | --- | --- |
| AM 70000000159 | 200, cartão "Visualização de Relatórios" presente | 200, 4 campos, `reportId` confere, `no-store` |
| GT 40200030094 | 200, cartão presente | 200, idem |
| VT 70000000230 | 200, cartão presente | 200, idem |
| GO 60000369000126 (CNPJ) | 200, cartão presente | 200, idem |
| VO 70000000310 | 200, cartão presente | 200, idem |
| AL 60000383643 | 307 (gate de onboarding do aluno) | 403 `{"erro":"Acesso negado"}` |

Navegador (Chromium sem interface, GT): o clique no cartão do painel abre `/relatorios`, e o iframe `https://app.powerbi.com/reportEmbed?reportId=c9a243a7…` monta no contêiner com 894×502 px. O relatório do cliente aparece com as abas Visão Executiva, Oferta e Distribuição, Público-Alvo, Planejamento, Formação, Aluno e Efetividade. Nenhum bloqueio de `frame-src`. Os indicadores mostram "--" porque os documentos de demonstração não existem no modelo do cliente (regra "documento inexistente não apresenta dados"). Há 33 avisos de `style-src` iguais em `/painel` e em `/relatorios`: vêm das ferramentas de desenvolvimento do Next (`NEXTJS-PORTAL`, só no `npm run dev`), não da rotina.

Ainda pendente com o usuário: os recortes por perfil com documentos que existam no modelo (itens 1 a 4 acima), logout, renovação e queda de rede.

---

## Summary

**Overall**: ✅ Ready para a T11. O automático está completo; falta só a homologação do usuário com o Power BI real.

**Spec-anchored check**: 23/23 ACs com evidência; 0 spec-precision gaps; PBI-01 real depende da T11.
**Sensor**: 29/29 mortas (iteração 2).
**Gate**: typecheck limpo; unit 1091 passed (iteração 2); e2e 31 passed (iteração 1, sem mudança desde então).

**O que funciona**: autorização (401/403 antes da Microsoft, VO como o GO dele, AL fora do menu e da API), corpo e cabeçalho do 200, cache e coalescência do token do Entra, nova tentativa em 429/503, limite por sessão, configuração tudo-ou-nada, CSP, logs sem dado pessoal, renovação e parada no cliente.

**Próximos passos**: o usuário roda a T11 com o Power BI real e anota o resultado na seção da T11.
