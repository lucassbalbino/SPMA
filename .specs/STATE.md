# STATE — SPMA

Memória do projeto: log de decisões (AD-NNN) e snapshot de handoff.
Este arquivo é a fonte de verdade das decisões travadas. Não reabrir uma AD sem registrar uma nova AD que a substitua.

---

## Handoff (snapshot)

- **`auth-e-usuarios`: DONE.** 30/30 tarefas (T1-T30) implementadas e commitadas. Verifier rodou 3 iterações de fix→re-verify (limite do processo) - zero defeitos de produção nas três; todos os achados foram lacunas de alcance de asserção em CA-AU-10 ("senha nunca exposta"), fechadas a cada rodada. `validation.md` = PASS, `python3 scripts/validate_state.py auth-e-usuarios` = exit 0, `tasks.md` Status = Done.
- **Testes no HEAD:** 137 (87 unit / 14 integration / 36 e2e), gate completo verde (`lint && build && typecheck && test:unit && test:integration && test:e2e`). `docker compose ps` deve mostrar `spma-mysql` healthy antes de rodar integration/e2e.
- **Infra corrigida após o Verifier (achados E3/E4 da iteração 3, reproduzidos e confirmados corrigidos):** `DATABASE_URL` (`.env`, `.env.test`, `.env.example`) agora tem `?allowPublicKeyRetrieval=true` - sem isso, MySQL 8.4 (`caching_sha2_password`) trava a primeira conexão depois de todo restart do Docker num timeout de pool de 10s sem menção a auth. Gate de build é `lint && build && typecheck` (não `typecheck` antes de `build` - Next 16 gera tipos globais tipo `LayoutProps` durante o build).
- **Correção descoberta durante T2 (registrada em design.md e tasks.md):** Prisma 7 exige `prisma.config.ts` (a `DATABASE_URL` não fica mais em `schema.prisma`), `generator` com `provider = "prisma-client"` + `output`, e todo `PrismaClient` instanciado com `{ adapter }`. O pacote certo é **`@prisma/adapter-mariadb`** (não `@prisma/adapter-mysql2`, que não existe no npm). Client gerado em `src/generated/prisma` (gitignored). Nenhum model/enum de domínio mudou.
- **Desvios arquiteturais documentados (SPEC_DEVIATION no código, não pendências):** (1) `setCookieSessao` é async (Next 16 `cookies()` é async); (2) rotas de API usam `obterSessao()`+401 explícito, não `requireSession()` (que redireciona - errado para JSON); (3) `/primeiro-acesso` e `/cadastro-ofertante` vivem num grupo de rotas irmão `(onboarding)` com guarda só de sessão, não em `(protegido)` - evita loop de redirect infinito (essas páginas são o próprio destino das outras duas guardas); (4) `COOKIE_SESSAO` foi extraído para `lib/auth/session-cookie.ts` (zero dependências) para `proxy.ts` não arrastar `PrismaClient` transitivamente.
- **Infra corrigida pelo orquestrador durante Execute (fora do escopo de tasks.md original, documentado em commits próprios):** alias `@/` espelhado nos configs do Vitest; wiring do Playwright e2e contra `spma_test` (havia um bug real de ordem de `dotenv` que faria o global setup rodar `TRUNCATE` no banco de DEV); timeout do webServer do Playwright 60s→90s.
- **Arquivos da feature:** `.specs/features/auth-e-usuarios/{spec.md,design.md,tasks.md,validation.md}`.
- **Decisões locais tomadas durante Design/Tasks (não viraram AD por serem só desta feature):** stack de testes = Vitest (unit/integration) + Playwright (e2e); banco de teste dedicado `spma_test` no mesmo MySQL do docker-compose; TTL de sessão fixo de 60min (placeholder até `seguranca-transversal` formalizar REQ-SEC-09); adoção do Prisma 7 (config+adapter) em vez de fixar 6.x.
- **Limpeza feita nesta sessão:** removidos dois arquivos órfãos na raiz do repo (`schema.prisma` e `env.example`, cópias extraviadas de `spec.md`/`STATE.md` do commit inicial) - ver commits `10edaad` e `816b5ee`. WSL2 foi instalado e o Docker Desktop está funcional nesta máquina (bloqueio antigo resolvido).
- **Próxima feature após `auth-e-usuarios`:** `seguranca-transversal` (spec pronta, cobre CSRF/headers/rate-limit por IP/mascaramento de log que ficaram fora do escopo desta feature de propósito).
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
