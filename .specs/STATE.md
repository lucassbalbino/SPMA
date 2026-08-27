# STATE — SPMA

Memória do projeto: log de decisões (AD-NNN) e snapshot de handoff.
Este arquivo é a fonte de verdade das decisões travadas. Não reabrir uma AD sem registrar uma nova AD que a substitua.

---

## Handoff (snapshot)

- **`auth-e-usuarios`: DONE.** 30/30 tarefas. `validation.md` = PASS (3 iterações de fix→re-verify, limite do processo - zero defeitos de produção, só lacunas de asserção em CA-AU-10 fechadas a cada rodada). Detalhe completo no histórico deste arquivo (git log) se precisar; resumo: Prisma 7 exige `prisma.config.ts` + `generator provider="prisma-client"` + `{ adapter }` via **`@prisma/adapter-mariadb`**; `DATABASE_URL` precisa de `?allowPublicKeyRetrieval=true` (MySQL 8.4 `caching_sha2_password`); gate de build é `lint && build && typecheck` nessa ordem (Next 16 gera `LayoutProps` no build).
- **`seguranca-transversal`: DONE.** 22/22 tarefas (T1-T22) implementadas e commitadas em 3 lotes de sub-agente + 1 fix do orquestrador. `validation.md` = PASS na iteração 2/3, `python3 <skill-dir>/scripts/validate_state.py seguranca-transversal` = exit 0, `tasks.md` Status = Done. Formaliza o que `auth-e-usuarios` deixou como placeholder de propósito: rate-limit por IP (REQ-SEC-03, tabela nova `TB_Tentativa_Login_Ip`), CSP com nonce por requisição via `proxy.ts` (REQ-SEC-16 - decisão confirmada com o usuário: nonce real em vez de `unsafe-inline`, custo de renderização dinâmica ~zero porque quase tudo já é dinâmico), CSRF double-submit cookie sem estado no servidor (REQ-SEC-15, `src/lib/security/csrf.ts` + `csrf-client.ts`), expiração de sessão por inatividade real - sliding window (REQ-SEC-09, `session.ts`: `setCookieSessao` não fixa mais `expires`, o cookie virou cookie de sessão do navegador e o `expiraEm` no banco é a única autoridade), erro genérico + id de correlação (REQ-SEC-11, `comTratamentoDeErro`), mascaramento de CPF em log (REQ-SEC-12, `mascararCPF`).
  - **Testes no HEAD:** 189 (118 unit / 21 integration / 50 e2e), gate completo verde (`lint && build && typecheck && test:unit && test:integration && test:e2e`).
  - **Achado do Verifier (iteração 1) e correção:** o teste de timing de `e2e/login.spec.ts` (CA-SEC-04) não discriminava a remoção da normalização (`DUMMY_HASH`) - sob `next dev` o ruído de framework (~180-400ms) domina o custo real do argon2 (~73ms), então nenhuma tolerância de razão wall-clock resolve isso de forma confiável. Fechado com um teste determinístico por chamada (spy em `verifyPassword`, assert no argumento - hash real vs `DUMMY_HASH`), não por tempo: `src/app/api/auth/login/route.integration.test.ts`. **Lição**: para provar normalização de tempo, testar QUAL operação rodou (e com qual valor), nunca calibrar uma banda de tempo de parede sob dev server - `.specs/LESSONS.md` L-011 (supersede L-010, que prescrevia a abordagem errada; L-010 nunca chegou a "confirmed", então não foi carregada em nenhuma feature).
  - **Escopo deliberadamente diferido, documentado em design.md (Riscos), não pendência esquecida:** CA-SEC-14 (403 reavaliado por escopo de Ofertante) só tem fechamento em nível de unidade (`podeAcessarOfertante` em `src/lib/auth/guards.ts`) porque nenhum recurso GET escopado por Ofertante existe ainda no código - a próxima feature (`cadastro-ofertante-verba`) **deve** chamar essa guarda em toda rota de leitura por Ofertante e adicionar o e2e de CA-SEC-14 lá. CA-SEC-17 (validação server-side de regra condicional) foi provado com a regra existente `senha === confirmacaoSenha` de `primeiro-acesso`, não com o exemplo literal P9/P9.Qual da spec (que pertence à futura feature `formularios`) - aquela feature precisa do próprio teste quando os campos condicionais existirem.
  - **Arquivos da feature:** `.specs/features/seguranca-transversal/{spec.md,design.md,tasks.md,validation.md}`.
- **`cadastro-ofertante-verba`: DONE.** 8/8 tarefas (T1-T8), executadas inline (sem sub-agente, coube num lote só) + 2 fixes do orquestrador pós-Verifier. `validation.md` = PASS na iteração 2/3, `python3 <skill-dir>/scripts/validate_state.py cadastro-ofertante-verba` = exit 0, `tasks.md` Status = Done. Primeira feature desta sessão sem spec.md pré-existente - Specify feito do zero a partir de `docs/SPMA_Especificacao_Cliente_v2.md` (note o caminho: está em `docs/`, não na raiz). Fecha o cadastro/gestão de Ofertante (as duas formas que faltavam: pré-cadastro por AM, cadastro por GT) e todo o CRUD de Verba, incluindo cálculo de saldo e validação de teto (RN-10/AD-016). Fecha também, de ponta a ponta, o gap CA-SEC-14 que `seguranca-transversal` tinha deixado só em nível de unidade: `podeAcessarOfertante` agora protege rotas reais (`GET /api/ofertantes[/[id]]`, `GET /api/verbas[/[id]]`).
  - **Testes no HEAD:** 248 (140 unit / 27 integration / 81 e2e), gate completo verde.
  - **Achado do Verifier (iteração 1) e correção:** REQ-OV-12 (validação de teto na ALOCAÇÃO a um curso, CA-OV-12/13) não tinha implementação nem teste - só `validarNovoValorTotal` existia, que serve uma checagem DIFERENTE (edição do valor TOTAL da verba, CA-OV-14, compara contra o já alocado). Fechado com `validarAlocacao(cdVerba, valorProposto)` em `src/lib/verba/saldo.ts`, comparando contra o saldo disponível ATUAL e devolvendo esse saldo no retorno (para a futura rota de criação de curso informar ao usuário). Testado em `saldo.integration.test.ts` contra os fixtures de `PreCurso` já existentes (igualdade permitida por AD-016; valor acima do saldo rejeitado). Nenhuma lição nova registrada (mutação genuína de escopo perdido, não um padrão de teste recorrente como o de `seguranca-transversal`).
  - **Novos módulos reutilizáveis para `formulario-pre-curso`:** `src/lib/verba/saldo.ts` (`calcularSaldoVerba`, `validarNovoValorTotal`, `validarAlocacao` - a rota de criação de curso **deve** chamar `validarAlocacao` antes de gravar `PreCurso.vlCursoAlocado`); `src/lib/auth/guards.ts` ganhou `podeEditarOfertante`/`podeGerenciarVerba` (escrita) ao lado de `podeAcessarOfertante` (leitura, já existia).
  - **Pendência de modelagem herdada do schema (não desta feature, mas relevante para a próxima):** `prisma/schema.prisma`, nota de rodapé "Estratégia de armazenamento das respostas" - a decisão de usar `respostas Json?` validado por Zod (em vez de uma coluna por pergunta) precisa virar uma AD formal no Design de `formulario-pre-curso`, a primeira feature de formulário. Ainda não registrada em `## Decisions`.
  - **Arquivos da feature:** `.specs/features/cadastro-ofertante-verba/{spec.md,design.md,tasks.md,validation.md}`.
- **`formulario-pre-curso`: DONE.** 10/10 tarefas (T1-T10) executadas inline (sem sub-agente, 10 tarefas coube numa sessão contínua) + 2 fixes do orquestrador pós-Verifier. `validation.md` = PASS na iteração 2/3, `python3 <skill-dir>/scripts/validate_state.py formulario-pre-curso` = exit 0, `tasks.md` Status = Done. Fecha o cadastro/preenchimento/encerramento do Pré-Curso: criação vinculada a Verba com validação de teto (reuso de `validarAlocacao`), questionário de 56 chaves (Dicionário de Campos derivado da spec, `respostas Json?` validado por Zod - formaliza AD-034), preenchimento incremental via `PATCH` com merge raso, 3 gates condicionais de encerramento (REQ-PC-07/08/09) e encerramento irreversível (`ENCERRADO`, nunca reaberto). Fecha também, de ponta a ponta, o item que `seguranca-transversal` tinha deixado pendente (CA-SEC-17, validação condicional server-side com o padrão real P9/P9.Qual) - os 3 gates condicionais SÃO esse padrão, com teste unitário e e2e dedicados.
  - **Testes no HEAD:** 267 unit / 27 integration / 115 e2e, gate completo verde (com 2 flakes de infraestrutura já confirmados não-relacionados: um em `csrf.spec.ts` de `seguranca-transversal`, um de timing de clique em checkbox em `pre-cursos-formulario.spec.ts:94` - ambos passam isoladamente, nenhum é regressão desta feature).
  - **Achados do Verifier (iteração 1) e correções:** (1) **Major** - o edge case de spec.md "término anterior ao início rejeitado com 400" não tinha nenhuma implementação nem teste; fechado com `ordemDatasValida` (`pre-curso.schema.ts`), checado pela rota PATCH contra o estado MESCLADO (existente + patch), não só o corpo cru - cobre tanto as duas datas no mesmo PATCH quanto uma em cada. (2) **Minor** - `validarCompletudePreCurso` encadeava as 3 regras condicionais como `.superRefine` sobre o schema base; o Zod PULA o callback de `superRefine` quando o schema base já tem qualquer issue - com o formulário ainda pouco preenchido (o estado normal de preenchimento incremental) as pendências condicionais nunca apareciam em `pendentes` até o resto estar quase completo (nunca permitia encerrar errado, só a lista "o que falta" ficava incompleta). Fechado reescrevendo `completude.ts` para rodar a checagem condicional como função pura independente do resultado do `safeParse` base, unindo os dois conjuntos de pendências - não depende mais desse comportamento do Zod. (3) **Minor, não corrigido de propósito** - a mensagem de erro 400 do PATCH não inclui o nome do campo (mensagem padrão do Zod v4 não carrega o path); é convenção já estabelecida e compartilhada por 9 rotas do projeto, não algo novo desta feature - corrigir isso seria escopo cruzado fora desta feature.
  - **Lição nova:** `.specs/LESSONS.md` - Zod `.superRefine()` encadeado direto num `ZodObject` é pulado inteiro se o schema base já tiver qualquer issue (confirmado empiricamente com um repro mínimo) - nunca contar com um `superRefine` para regras condicionais quando o objeto pode estar parcialmente preenchido; rodar a regra condicional como função pura separada e unir os resultados.
  - **Arquivos da feature:** `.specs/features/formulario-pre-curso/{spec.md,design.md,tasks.md,validation.md}`.
- **`formulario-pos-curso`: DONE.** 9/9 tarefas (T1-T9) executadas inline (sem sub-agente). `validation.md` = PASS na iteração 1/3 (primeira feature desta sessão sem nenhum fix pós-Verifier), `python3 <skill-dir>/scripts/validate_state.py formulario-pos-curso` = exit 0, `tasks.md` Status = Done. Fecha o cadastro/preenchimento/encerramento do Pós-Curso: criação vinculada a um Pré-Curso já existente (`PosCurso.CD_Curso` é PK e FK 1:1 ao mesmo tempo, sem coluna `CD_Ofertante` própria - todo guard resolve o escopo via `include: { preCurso: true }`), questionário de 26 chaves, 1 gate condicional de encerramento (REQ-PO-07), encerramento irreversível. Decisão desta sessão: criação do Pós-Curso **não** exige o Pré-Curso vinculado estar `ENCERRADO` (pode ser criado a qualquer momento). PASS de primeira tentativa porque aplicou desde o Design as duas lições que `formulario-pre-curso` só descobriu via Verifier: (1) `validarCompletudePosCurso` já nasceu como checagem independente (sem `.superRefine` encadeado); (2) `datasReaisEmOrdem` (ordem das datas reais de execução) já foi implementado e testado desde T1, não como fix depois.
  - **Testes no HEAD:** 309 unit / 27 integration / 149 e2e, gate completo verde, sem flakes na rodada final.
  - **Achado durante a execução (não do Verifier, do próprio autor) e correção:** o e2e de preenchimento completo (`pos-cursos-formulario.spec.ts`) travava ao selecionar "Não" num dos dois `Select` do Bloco Financeiro (`posFinHouveDevolucaoRecursos`/`posFinNecessidadeAditivo`, ambos Sim/Não) - o popup do Select do Base UI não desmonta ao fechar (diferente do Accordion), então um `getByRole("option", {name})` sem escopo podia resolver para a opção (fechada, oculta) do campo errado. Corrigido escopando a busca pelo prefixo do `data-testid` do próprio campo em vez de um role query global. Confirmado pelo Verifier como bug só do teste, não do produto - um usuário real nunca teria esse problema (só um popup fica interativo por vez).
  - **Arquivos da feature:** `.specs/features/formulario-pos-curso/{spec.md,design.md,tasks.md,validation.md}`.
- **Próxima feature:** `avaliacao-aluno` (README, ordem sugerida item 6). Quarto e último formulário (`TB_Avaliacao_Aluno`, preenchido pelo próprio Aluno) - chave composta (CPF + CD_Curso, AD-022), Parte 1 (dados pessoais/motivação) como gate da Parte 2 (AD-023), escala de avaliação própria crescente 1-5 sem "não há disponibilidade" (AD-020) - ver seção 6 do documento fonte para o dicionário de campos.
- **Pendências abertas:** nenhuma de domínio, exceto os indicadores do dashboard (feature adiada por decisão AD-024).

---

## Decisões (Architecture Decisions)

### Stack e Arquitetura

**AD-001 — Banco de dados: MySQL.**
Exigência do cliente. Não negociável.

**AD-002 — Framework: Next.js (App Router) + TypeScript, projeto monolítico.**
Front-end e rotas de API no mesmo repositório. Motivo: dev solo júnior; reduz partes móveis (um deploy, sem CORS, sem contrato de API mantido à mão). Custo aceito: curva do App Router (Server vs Client Components), relevante nos formulários condicionais, que serão `"use client"`.

**AD-003 — ORM: Prisma.**
Schema como fonte única de verdade, migrations versionadas, type-safety nas relações (6 tabelas, FKs, chave composta em TB_Avaliacao_Aluno). Escolhido sobre SQL puro/Knex pela segurança de tipos para quem trabalha sem code review.

**AD-004 — Validação: Zod, schema único por formulário compartilhado cliente/servidor.**
A regra condicional (ex.: "P9='Sim' exige P9.Qual") é escrita uma vez e validada nos dois lados. A validação do servidor é a que conta; a do cliente é feedback.

**AD-005 — Autenticação: sessão própria CPF + senha, hash com bcrypt/argon2.**
Não usar provider externo (Auth.js/OAuth): o login é CPF+senha interno com "cadastra senha no 1º acesso", fluxo custom mais simples que encaixar num framework de social login.

**AD-006 — Biblioteca de componentes visuais: shadcn/ui + Tailwind CSS.**
Decidido no Design de `auth-e-usuarios` (primeira feature com UI). Componentes copiados para o projeto (não é dependência de runtime), boa integração com Server Components do App Router, curva de aprendizado baixa — bom encaixe para dev solo júnior (AD-002).

### Perfis, Autenticação e Autorização

**AD-007 — Aluno é subtipo de Usuário (TP_Usuario='AL').**
Login próprio via CPF + senha. Não é entidade cadastral separada.

**AD-008 — Perfis:** AM (Admin Master), GT (Gestor Turismo), VT (Visualizador Turismo), GO (Gestor Ofertante), VO (Visualizador Ofertante), AL (Aluno).

**AD-009 — Cadastro em cascata (autorização de escrita, validada no backend):**
AM cria todos; GT cria GT/VT/GO; GO cria GO/VO/AL; VT/VO/AL não criam ninguém.

**AD-010 — Senha no 1º acesso:** o usuário cadastra a própria senha no primeiro login. Não há senha temporária enviada por e-mail/SMS.

**AD-011 — Validação de CPF:** algoritmo padrão módulo 11, no cliente e no servidor.

**AD-012 — Escopo/Multi-tenancy:** GO e VO têm escopo por Ofertante; AL tem escopo pelo curso em que está inscrito (não pelo Ofertante). Toda consulta filtrada pelo escopo do solicitante.

**AD-013 — Acesso fora de escopo retorna HTTP 403 Forbidden** (não "dado invisível"/404).

### Ofertante e Verba

**AD-014 — Criação de Ofertante:** três formas — pré-cadastro administrativo, por GT, ou pelo próprio GO no 1º acesso quando ainda não vinculado (nesse caso o sistema força o cadastro antes de liberar o resto).

**AD-015 — Verba pertence ao Ofertante, relação 1:N com Curso.**
Uma verba pode custear vários cursos. A FK fica no Curso (`TB_Pre_Curso.CD_Verba`), com `VL_Curso_Alocado` por curso. TB_Verba NÃO tem CD_Curso.

**AD-016 — Teto da verba:** o somatório dos valores alocados aos cursos de uma verba pode IGUALAR o valor total da verba (validação `<=`, uso de até 100%). Ultrapassar é bloqueado.

### Formulários e Status

**AD-017 — Três formulários independentes:** TB_Pre_Curso (GO, antes), TB_Pos_Curso (GO, durante+depois), TB_Avaliacao_Aluno (AL).

**AD-018 — Status irreversível (' ' → 'E') em TODOS os três formulários.**
Pré-Curso: encerrado pelo GO. Pós-Curso: encerrado pelo GO (revisado — antes era "sempre aberto"). Avaliação do Aluno: encerrada pelo próprio aluno via botão. Uma vez 'E', ninguém reabre.

**AD-019 — Escala Likert do Pré-Curso (infraestrutura), crescente:**
Não há disponibilidade=0, Péssimo=1, Ruim=2, Regular=3, Bom=4, Ótimo=5. (Revisado — a inversão anterior foi descartada pelo cliente.)

**AD-020 — Escala Likert da Avaliação do Aluno, crescente 1–5:**
Péssimo=1, Ruim=2, Regular=3, Bom=4, Ótimo=5. Sem opção "não há disponibilidade".

**AD-021 — Certificado NÃO é controlado pelo sistema.**
Nenhum campo `Certificado_Emitido`, nenhuma lógica de certificação. (Decisão do cliente.)

**AD-022 — Aluno e cursos: vários ao longo do tempo, um por vez.**
Chave de TB_Avaliacao_Aluno é composta (CPF + CD_Curso). Enquanto houver avaliação com Status=' ' (em andamento), o aluno não inicia outra. Ao encerrar ('E'), fica liberado para novo curso.

**AD-023 — Parte 1 da Avaliação do Aluno (dados pessoais/motivação) é gate da Parte 2.**
Não obrigatória na criação do aluno, mas obrigatória e completa antes de responder qualquer pergunta da avaliação do curso (Parte 2).

**AD-024 — Dashboard é feature adiada.**
Indicadores não definidos. Fatiar e implementar o resto do sistema primeiro; voltar ao dashboard quando os dados já existirem.

### Tipos de campo resolvidos (eram ambíguos no documento fonte)

**AD-025 — Seleção única (radio) para os 6 campos antes ambíguos:**
nível de formação dos professores (pré-curso); motivos de abandono (pós-curso do gestor); tipo de curso de Turismo já realizado (aluno); como ficou sabendo do curso (aluno); retomada de estudos (aluno); situação de trabalho pós-curso (aluno).
Nota: "retomada de estudos" como única é uma simplificação; revisar se surgir caso real de múltipla retomada.

**AD-026 — A-28 "Outra" abre campo de texto livre obrigatório** (A-28.1), condicional à seleção de "Outra".

**AD-027 — Enunciado genérico das tabelas de infraestrutura do pré-curso:**
"Avalie a disponibilidade e o estado de conservação dos seguintes itens:" (o documento fonte não trazia enunciado explícito para a segunda tabela).

---

## Fonte da Spec

A especificação funcional consolidada e aprovada pelo cliente (com as alterações do cliente já integradas) está em `SPMA_Especificacao_Cliente_v2.md`. Ao portar para `.specs/features/*/spec.md`, essa é a fonte de verdade do COMPORTAMENTO; este STATE.md é a fonte de verdade das DECISÕES.

---

## Decisões de Segurança (adicionadas)

**AD-028 — Rate limiting no login: 5 tentativas falhas por conta, então bloqueio temporário.**
Após 5 falhas consecutivas de senha para um mesmo CPF, a conta entra em cooldown de 15 minutos. Contador zera em login bem-sucedido. Rastreio adicional por IP para mitigar ataque distribuído (limite por IP separado do limite por conta). Mensagem de erro genérica ("CPF ou senha inválidos") — nunca revelar se o CPF existe.

**AD-029 — Nenhum dado sensível em logs, console, respostas de erro ou URLs.**
Proibido logar/retornar: senha (mesmo hash), CPF completo em log (mascarar), tokens de sessão, stack traces ao cliente em produção. CPF nunca em query string. Erros ao cliente são genéricos; o detalhe fica no log de servidor (com CPF mascarado).

**AD-030 — Senhas: hash argon2id (ou bcrypt cost>=12), nunca reversível.**
Política mínima de senha definida na spec de segurança. Senha nunca trafega/loga em texto; nunca é retornada por nenhum endpoint.

**AD-031 — Sessão: cookie httpOnly + secure + sameSite, expiração e rotação.**
Token de sessão não acessível via JS (httpOnly), só HTTPS (secure), sameSite=lax. Expira por inatividade. Regenerar identificador de sessão após login (previne session fixation).

**AD-032 — Headers de segurança e CSRF.**
Cabeçalhos de segurança padrão (CSP, X-Content-Type-Options, etc.) e proteção CSRF nas mutações state-changing, já que a auth é por cookie de sessão.

**AD-033 — Autorização verificada no servidor em toda rota, sempre.**
A cascata de criação (AD-009), o escopo por ofertante/curso (AD-012) e o 403 (AD-013) são reavaliados no backend a cada request — nunca confiar em estado do cliente nem em ocultação de menu.

### Formulários — armazenamento de respostas

**AD-034 — Respostas dos questionários (Pré-Curso, Pós-Curso, Avaliação do Aluno) armazenadas como um único campo `Json?` por formulário, com a FORMA validada por Zod na aplicação (não uma coluna por pergunta).**
Formaliza, no Design de `formulario-pre-curso` (primeira feature de formulário), a decisão já registrada como nota em `prisma/schema.prisma` ("Estratégia de armazenamento das respostas dos questionários"). Motivo: os três questionários somam ~125 campos, muitos condicionais/seleção múltipla — uma coluna por pergunta geraria migration a cada ajuste de questionário; o schema físico fica enxuto e a validação forte acontece na borda (schema Zod único, cliente/servidor, AD-004). Trade-off aceito: consultas analíticas (dashboard, feature adiada por AD-024) não conseguem agregar por campo individual via SQL puro sem materializar colunas/tabelas derivadas — decisão deixada para quando a feature de dashboard existir. Vale para `TB_Pre_Curso.Respostas`, `TB_Pos_Curso.Respostas`, `TB_Avaliacao_Aluno.Respostas` (as três já modeladas assim no schema).
