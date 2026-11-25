# dashboard-powerbi Specification

## Problem Statement

O módulo "Visualização de Relatórios" existe no painel desde a revisão de usabilidade, mas não abre nada (AD-024 adiou o dashboard). O cliente montou o relatório no Power BI, com RLS por documento (`segurança_SPMA` + `USERNAME()`), e entregou uma rotina de referência em Node ("SPMA Embedded 2.0", protótipo Python validado, versão Node só testada contra API simulada). Esta feature acopla essa rotina ao SPMA no modelo *App owns data*: o visitante não precisa de conta Microsoft, e cada perfil vê o relatório filtrado pelo próprio escopo.

**Princípio desta feature: a menor alteração possível no sistema.** Nenhuma migration, nenhuma tabela, nenhuma mudança na sessão, no login, no layout ou no `globals.css`. O que existe é reaproveitado (sessão, `comTratamentoDeErro`, `resolverEscopoOfertante`, `navegacao.ts`); o que é novo fica isolado em `src/lib/powerbi/`, numa rota de API e numa página.

## Goals

- [ ] AM, GT, VT, GO e VO abrem `/relatorios` e veem o relatório do Power BI embutido, sem conta Microsoft, filtrado pelo escopo que já têm no sistema.
- [ ] O Aluno não recebe dashboard nem ingresso.
- [ ] O token de embed é renovado sozinho enquanto a página está aberta; sair da página ou do sistema remove o relatório.
- [ ] Falhas da Microsoft ou configuração ausente nunca derrubam o SPMA: a tela diz "indisponível" e o resto do sistema segue igual.
- [ ] Trocar de um relatório único para um relatório por grupo de perfil é só configuração (variáveis de ambiente), sem código.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Dashboard para o Aluno (AL) | Decisão do usuário (2026-11-25): AL é o único perfil sem acesso. |
| Conteúdo, indicadores e páginas do relatório | Responsabilidade do cliente no Power BI (AD-024: indicadores definidos com o produto). |
| Alterar o `.pbix`, a role `segurança_SPMA` ou os relacionamentos do modelo | Fora do código do SPMA; a feature só envia identidade e role. |
| Mais de um dashboard por perfil (seletor `?painel=`) | Nenhum perfil tem dois relatórios hoje; o catálogo admite o acréscimo depois. |
| Revogar um embed token já emitido | Não existe na API do Power BI; o token vale até expirar (~1 h), limite aceito no manual do cliente. |
| Detectar troca de usuário em outra aba do mesmo navegador | Risco baixo (mesmo navegador, mesma pessoa em regra); registrado em design.md. |
| Auditoria persistida em banco | Exigiria tabela nova; a auditoria é uma linha de log sem dado pessoal (PBI-22). |
| Fila/semáforo de chamadas à Microsoft e cache de falha do Entra | Medido em 2026-11-25: 2000 pedidos simultâneos corretos com Microsoft simulada; o limite por sessão (PBI-20) já limita o volume. |
| Capacidade de produção, atualização agendada do dataset, gateway | Infraestrutura Microsoft do cliente. |
| Ler a sessão sem estendê-la | Decisão do usuário (2026-11-25): o dashboard aberto mantém a sessão viva. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem acessa | AM, GT, VT, GO, VO. AL não. | Resposta do usuário: "o único sem acesso será o aluno, o resto terão acessos limitados". | y |
| O que é "acesso limitado" | O mesmo escopo de leitura que o perfil já tem no SPMA (`escopoDeLeitura`): AM/GT/VT nacional, GO o próprio CNPJ, VO o CNPJ do GO vinculado. Quem aplica o filtro é o RLS do Power BI. | É a única definição de escopo que o sistema já tem (AD-012); inventar outra criaria duas fontes de verdade. | n |
| Identidade enviada ao Power BI (`username`) | `resolverEscopoOfertante(usuario) ?? usuario.documento`: GO manda o próprio CNPJ, VO manda o CNPJ do GO, AM/GT/VT mandam o próprio documento. | Funciona com a role única validada pelo cliente (o VO é lido como o GO dele) e com roles por grupo. Mandar o CPF do VO deixaria o painel dele vazio. | n |
| Organização dos relatórios | Catálogo com dois painéis: `nacional` (AM, GT, VT) e `ofertante` (GO, VO). Os dois usam o relatório padrão (`SPMA_REPORT_ID`) e a role `segurança_SPMA` até o cliente decidir; um relatório próprio por painel entra por variável de ambiente. | Resposta do usuário: "ainda não sei". Funciona hoje e muda sem código. | y |
| Modelo semântico | Um dataset só (`SPMA_DATASET_ID`), compartilhado pelos relatórios. | Padrão recomendado ao cliente (uma atualização, um RLS). Datasets separados por painel exigiriam outra variável; fora do escopo. | n |
| "VM" no manual do cliente | Ignorado: o SPMA não tem perfil VM (AD-008). | O catálogo decide os perfis pelo enum do sistema. | n |
| Sessão e renovação | A renovação do token (~1 vez por hora) passa pela sessão normal e a estende. | Resposta do usuário: "sim, mantém viva". | y |
| Homologação real | Feita pelo usuário com as credenciais reais no `.env` local (segredo já trocado), seguindo o roteiro da T11. | Resposta do usuário. | y |
| Nomes das variáveis | Os do manual do cliente (`SPMA_TENANT_ID`, `SPMA_CLIENT_ID`, `SPMA_CLIENT_SECRET`, `SPMA_DATASET_ID`, `SPMA_REPORT_ID`, `SPMA_EMBED_URL`) mais o par opcional `SPMA_REPORT_ID_<PAINEL>` / `SPMA_EMBED_URL_<PAINEL>`. `SPMA_WORKSPACE_ID` não é lido. | Continuidade com o manual; o `GenerateToken` usado não precisa do workspace. | n |
| Limite de pedidos | 20 pedidos por sessão numa janela fixa de 60 s, em memória. Na virada de duas janelas passam até 40 pedidos em poucos segundos. | Uso normal é 1 abertura + ~1 renovação/hora; produção roda um processo só (AD-047). Limite de abuso, não de cota. Lacuna de precisão apontada pelo Verifier (iteração 1). | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Gestores e visualizadores veem o dashboard do próprio escopo ⭐ MVP

**User Story**: As a usuário AM, GT, VT, GO ou VO, I want abrir "Visualização de Relatórios" e ver o relatório do Power BI filtrado pelo meu escopo so that eu acompanhe os indicadores sem sair do SPMA nem ter conta Microsoft.

**Why P1**: É a feature.

**Acceptance Criteria**:

1. WHEN um usuário AM, GT, VT, GO ou VO autenticado abre `/relatorios` THEN the system SHALL exibir o título "Visualização de Relatórios" e montar o relatório do Power BI dentro do contêiner `relatorio-powerbi`. (PBI-01)
2. WHEN um usuário AM, GT, VT, GO ou VO autenticado chama `GET /api/powerbi/embed` THEN the system SHALL responder 200 com um corpo de exatamente quatro campos (`reportId`, `embedUrl`, `embedToken`, `expiration`) e o cabeçalho `Cache-Control: no-store`. (PBI-02)
3. The system SHALL enviar ao `GenerateToken` como `username` o CNPJ do GO vinculado quando o perfil é VO, e o próprio documento quando o perfil é AM, GT, VT ou GO. (PBI-03)
4. The system SHALL pedir o embed token com `allowEdit: false`, a role do painel do perfil (`segurança_SPMA` nos dois painéis) e o dataset configurado em `identities.datasets` e `datasets`. (PBI-04)
5. The system SHALL obter a identidade e o relatório exclusivamente da sessão no servidor; query string, corpo e cabeçalhos do pedido SHALL NOT alterar o `username` nem o relatório. (PBI-05)
6. WHERE `SPMA_REPORT_ID_<PAINEL>` e `SPMA_EMBED_URL_<PAINEL>` estão definidos the system SHALL usar esse relatório para os perfis do painel; sem eles, SHALL usar `SPMA_REPORT_ID` e `SPMA_EMBED_URL`. (PBI-06)

**Independent Test**: Logar como GT com credenciais reais, abrir `/relatorios` e ver o relatório; logar como GO e ver só os cursos do próprio CNPJ.

---

### P1: Só quem pode recebe o ingresso ⭐ MVP

**User Story**: As a cliente dono dos dados, I want que nenhum ingresso saia para quem não deve so that o RLS nunca seja contornado.

**Why P1**: Segurança do dado (AD-033).

**Acceptance Criteria**:

1. IF o pedido a `GET /api/powerbi/embed` não tem sessão válida THEN the system SHALL responder 401 `{ "erro": "Não autenticado" }` sem chamar a Microsoft. (PBI-07)
2. IF o perfil da sessão é AL THEN the system SHALL responder 403 `{ "erro": "Acesso negado" }` na API sem chamar a Microsoft, e `/relatorios` SHALL exibir "Seu perfil não tem acesso a relatórios." (PBI-08)
3. IF o perfil é VO e não tem GO vinculado (`cdOfertante` nulo) THEN the system SHALL responder 403 `{ "erro": "Acesso negado" }` sem chamar a Microsoft. (PBI-09)
4. The system SHALL exibir o módulo "Visualização de Relatórios", com link para `/relatorios`, no menu e no painel de AM, GT, VT, GO e VO, e SHALL NOT exibi-lo para AL. (PBI-10)

**Independent Test**: Teste unitário da rota com sessão AL/VO sem vínculo/sem sessão; e2e do painel e de `/relatorios` como AL.

---

### P1: O relatório se mantém sozinho e some ao sair ⭐ MVP

**User Story**: As a usuário com o dashboard aberto, I want que o relatório continue funcionando sem recarregar e desapareça quando eu saio so that eu não veja erro de token vencido e ninguém use o meu ingresso depois.

**Why P1**: Sem renovação o relatório quebra em ~1 h; sem parada o ingresso fica na página.

**Acceptance Criteria**:

1. WHILE `/relatorios` está aberta, WHEN um ingresso com `restante` milissegundos de validade é aplicado the client SHALL agendar o próximo pedido para `max(1000, restante − min(120000, restante / 2))` ms e aplicar o ingresso novo com `setAccessToken`, sem montar o relatório de novo. (PBI-11)
2. IF o pedido ao endpoint falha (status não-2xx ou erro de rede) ou o ingresso recebido tem menos de 30 000 ms de validade THEN the client SHALL remover o relatório e exibir "Dashboard indisponível. Entre novamente ou tente mais tarde." (PBI-12)
3. WHEN a página é desmontada (navegação, logout, fechamento) THEN the client SHALL remover o relatório do contêiner, cancelar a renovação agendada e abortar o pedido em andamento, e nenhuma resposta que chegue depois SHALL montar o relatório de novo. (PBI-13)
4. IF o relatório embutido emite o evento `error` enquanto a página está ativa THEN the client SHALL exibir "Falha ao exibir relatório". (PBI-14)

**Independent Test**: Teste unitário do controlador com SDK, `fetch` e relógio falsos.

---

### P1: Falhas externas não derrubam o SPMA ⭐ MVP

**User Story**: As a operador do SPMA, I want que a falta de configuração ou uma falha da Microsoft só desligue o dashboard so that o resto do sistema, o build e o deploy sigam iguais.

**Why P1**: O CI compila sem as variáveis do Power BI; a Microsoft pode cair ou limitar chamadas.

**Acceptance Criteria**:

1. IF alguma variável obrigatória está ausente ou inválida (GUID malformado, embed URL fora de `https://app.powerbi.com/reportEmbed` ou com `reportId` diferente, par `_<PAINEL>` incompleto) THEN `GET /api/powerbi/embed` SHALL responder 503 `{ "erro": "Dashboard não configurado" }`, e nenhuma outra rota SHALL ser afetada. (PBI-15)
2. IF o Entra ID ou o `GenerateToken` responde com erro, resposta incompleta, ou não responde em 10 000 ms THEN the system SHALL responder 502 `{ "erro": "Dashboard temporariamente indisponível" }`, sem detalhe da causa. (PBI-16)
3. WHEN o Entra ID ou o `GenerateToken` responde 429 ou 503 THEN the system SHALL repetir a chamada uma única vez, depois de `Retry-After` segundos (máximo 5 s; 1 s quando o cabeçalho falta ou é inválido). (PBI-17)
4. The system SHALL reaproveitar o token do Entra até 120 s antes da expiração e, enquanto ele é obtido, fazer uma única chamada ao Entra para qualquer número de pedidos simultâneos. (PBI-18)
5. The system SHALL fazer uma chamada ao `GenerateToken` por pedido ao endpoint e SHALL NOT reaproveitar um embed token entre pedidos. (PBI-19)
6. IF uma mesma sessão faz mais de 20 pedidos ao endpoint dentro de uma janela fixa de 60 s, contada a partir do primeiro pedido da janela, THEN the system SHALL responder 429 `{ "erro": "Muitas requisições. Tente novamente em instantes." }` sem chamar a Microsoft. (PBI-20)

**Independent Test**: Testes unitários do serviço e da rota com Microsoft simulada.

---

### P1: Segurança transversal ⭐ MVP

**User Story**: As a responsável pela segurança, I want que a abertura do iframe não afrouxe a CSP e que nenhum segredo vaze so that a integração respeite REQ-SEC-16 e AD-029.

**Why P1**: A CSP atual bloqueia o iframe; o segredo do cliente é o dado mais sensível da integração.

**Acceptance Criteria**:

1. The system SHALL incluir `frame-src https://app.powerbi.com` na CSP das páginas, mantendo todas as demais diretivas atuais sem alteração. (PBI-21)
2. WHEN um embed token é emitido THEN the system SHALL registrar no log uma linha com o perfil e o painel, sem documento, CPF, CNPJ, token ou segredo; e WHEN uma chamada à Microsoft falha THEN o log SHALL conter só o id de correlação e o status HTTP. (PBI-22)
3. The system SHALL NOT incluir o client secret nem o token do Entra em nenhuma resposta, log ou código enviado ao navegador. (PBI-23)

**Independent Test**: e2e do cabeçalho CSP em `/relatorios`; testes unitários que inspecionam corpo de resposta e chamadas de log.

---

## Edge Cases

- IF o VO perde o vínculo com o GO depois de abrir o dashboard THEN a próxima renovação SHALL receber 403 e o client SHALL exibir a mensagem de PBI-12. (PBI-09 + PBI-12)
- IF a sessão expira com o dashboard aberto (nenhum pedido em 60 min) THEN a renovação SHALL receber 401 e o client SHALL exibir a mensagem de PBI-12. (PBI-07 + PBI-12)
- IF o Entra falha com vários pedidos esperando o mesmo token THEN todos SHALL receber 502, e o pedido seguinte SHALL tentar o Entra de novo (a falha não fica guardada). (PBI-16 + PBI-18)
- WHEN o token do Entra vence no meio de uma rajada de pedidos THEN the system SHALL renová-lo com uma única chamada. (PBI-18)
- WHEN o documento tem zero à esquerda THEN the system SHALL enviá-lo como texto, com os zeros. (PBI-03)
- IF a query string traz `documento`, `reportId` ou `username` THEN the system SHALL ignorá-los. (PBI-05)
- IF `SPMA_REPORT_ID_OFERTANTE` está definido sem `SPMA_EMBED_URL_OFERTANTE` (ou o contrário) THEN the system SHALL responder 503 (configuração inválida), sem usar o padrão em silêncio. (PBI-15)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PBI-01 | P1: Dashboard do escopo | Execute | Implementing |
| PBI-02 | P1: Dashboard do escopo | Execute | Implementing |
| PBI-03 | P1: Dashboard do escopo | Execute | Implementing |
| PBI-04 | P1: Dashboard do escopo | Execute | Implementing |
| PBI-05 | P1: Dashboard do escopo | Execute | Implementing |
| PBI-06 | P1: Dashboard do escopo | Execute | Implementing |
| PBI-07 | P1: Só quem pode | Execute | Implementing |
| PBI-08 | P1: Só quem pode | Execute | Implementing |
| PBI-09 | P1: Só quem pode | Execute | Implementing |
| PBI-10 | P1: Só quem pode | Execute | Implementing |
| PBI-11 | P1: Renovação e parada | Execute | Implementing |
| PBI-12 | P1: Renovação e parada | Execute | Implementing |
| PBI-13 | P1: Renovação e parada | Execute | Implementing |
| PBI-14 | P1: Renovação e parada | Execute | Implementing |
| PBI-15 | P1: Falhas externas | Execute | Implementing |
| PBI-16 | P1: Falhas externas | Execute | Implementing |
| PBI-17 | P1: Falhas externas | Execute | Implementing |
| PBI-18 | P1: Falhas externas | Execute | Implementing |
| PBI-19 | P1: Falhas externas | Execute | Implementing |
| PBI-20 | P1: Falhas externas | Execute | Implementing |
| PBI-21 | P1: Segurança transversal | Execute | Implementing |
| PBI-22 | P1: Segurança transversal | Execute | Implementing |
| PBI-23 | P1: Segurança transversal | Execute | Implementing |

**Coverage:** 23 total, 23 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Com as credenciais reais, GT e VT veem o relatório nacional e um GO vê só os próprios cursos (roteiro da T11).
- [ ] Um VO vê o mesmo recorte do GO dele.
- [ ] O Aluno não vê o módulo e recebe 403 na API.
- [ ] `npm run build` passa no CI sem nenhuma variável `SPMA_*`.
- [ ] Nenhuma migration e nenhuma alteração em `session.ts`, `guards.ts`, `CascaProtegida.tsx`, `globals.css` ou `next.config.ts`.
