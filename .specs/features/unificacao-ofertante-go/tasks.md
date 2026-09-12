# unificacao-ofertante-go Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of verdade do fluxo completo (ciclo por tarefa, delegação a sub-agentes, Verifier, sensor de discriminação).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/unificacao-ofertante-go/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerado a partir do código (amostragem de `src/lib/**/*.test.ts`, `e2e/*.spec.ts`) e do pedido explícito do usuário nesta sessão de manter os testes enxutos. Guidelines encontradas: nenhum `AGENTS.md`/config de cobertura formal - convenção observada no próprio repositório (unit colocado por arquivo; rotas de API provadas via e2e, não via um arquivo `*.integration.test.ts` por rota - só `login` tem um, por causa de uma nuance de timing já registrada em `.specs/LESSONS.md` L-011).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Validação pura (CNPJ, documento, máscara) | unit | Todo branch + casos de borda já testados em `cpf.test.ts` (dígito repetido, tamanho inválido) | `src/lib/validation/*.test.ts`, `src/lib/log/mask.test.ts` | `npm run test:unit` |
| Domínio (guards, cascata, schemas Zod) | unit | 1:1 com os REQ-UGO desta feature; todo edge case listado no spec | `src/lib/auth/*.test.ts`, `src/lib/validation/schemas/*.test.ts` | `npm run test:unit` |
| Rotas de API + páginas que já têm e2e cobrindo o fluxo | e2e (convenção já estabelecida no projeto - não introduzir um arquivo integration novo por rota) | Só os cenários que a mudança de schema/escopo força a tocar (fixture, tipo de `cdOfertante`, CNPJ) - não ampliar cobertura além disso (pedido do usuário) | `e2e/*.spec.ts` | `npm run test:e2e` |
| Fixtures/scripts de suporte a teste (`e2e-fixture.ts`, `dev-seed-demo.ts`, `prisma/seed.ts`) | none (não é código de produção) | - | - | gate de build (typecheck) |
| Schema Prisma / migration | none | - | - | gate de build (`prisma generate && next build`) |
| Docs/AD (spec de `cadastro-ofertante-verba`, doc do cliente) | none | - | - | revisão humana |

## Gate Check Commands

> `Quick`/`Full` seguem a convenção já usada no projeto (ex.: `identidade-visual`). `Build` aqui é **lint+build+typecheck sem os test suites** - deliberado: T4 (migração de schema) deixa o resto do código vermelho até a Fase 3 (domínio) e a Fase 4 (rotas/e2e) recuperarem cada camada. Isso é esperado numa migração de PK compartilhada (mesmo padrão que a AD-041 já assumiu em 19 tarefas) - não é uma regressão a investigar. O **gate completo** (linha `Full-feature` abaixo) só precisa estar 100% verde na ÚLTIMA tarefa da Fase 6, antes do Verifier.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com teste unit (Fases 1 e 3) | `npm run test:unit` |
| Full | Tarefas com e2e tocando o fluxo que a tarefa mudou (Fase 4 e 6) | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | Tarefas de schema/fixture/seed (Fases 1, 2, 5) - só compila, não roda test suites ainda | `npm run lint && npm run build && npm run typecheck` |
| Full-feature (obrigatório na última tarefa, T23) | Fechamento da feature, antes do Verifier | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

---

## Execution Plan

Fases são ordenadas e rodam em sequência; tarefas dentro de uma fase rodam em ordem.

**Nota sobre "Depends on":** dentro de uma fase a execução é sempre sequencial (um agente, uma tarefa por vez - ver Execution Protocol) - por isso cada tarefa lista como dependência a tarefa imediatamente anterior na ordem de execução, formando uma corrente única T1→T2→...→T23 (mesmo padrão já usado em `respostas-normalizadas/tasks.md`). Isso é mais forte do que a dependência técnica estrita de algumas tarefas (ex.: T3 não usa de fato o resultado de T2), mas nunca mais fraco - "roda depois de" é sempre verdade sob execução sequencial. A razão técnica real de cada dependência está descrita em "What"/"Reuses" de cada tarefa.

### Phase 1: Fundação - validadores e schema

```
T1 → T2 → T3 → T4
```

### Phase 2: Fixtures de teste

A seta de entrada mostra a dependência de fronteira com a fase anterior.

```
T4 → T5
```

### Phase 3: Domínio - guards, cascata, schemas Zod

```
T5 → T6 → T7 → T8 → T9 → T10
```

### Phase 4: Rotas, páginas e seus e2e existentes

```
T10 → T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 5: Scripts de seed

```
T16 → T17 → T18
```

### Phase 6: Varredura mecânica de e2e + consistência de docs

```
T18 → T19 → T20 → T21 → T22 → T23
```

---

## Task Breakdown

### T1: Criar validador de CNPJ ✅

**What**: `src/lib/validation/cnpj.ts` com `normalizarCNPJ`/`validarCNPJ` (dígito verificador módulo 11, pesos 5-4-3-2-9-8-7-6-5-4-3-2 e 6-5-4-3-2-9-8-7-6-5-4-3-2), espelhando a forma de `cpf.ts`.
**Where**: `src/lib/validation/cnpj.ts`
**Depends on**: None
**Reuses**: `src/lib/validation/cpf.ts` (mesma forma: `calcularDigitoVerificador`, `normalizar*`, `validar*`)
**Requirement**: UGO-07, UGO-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `validarCNPJ` rejeita tamanho != 14, sequência de dígito repetido, e dígito verificador incorreto
- [x] `validarCNPJ` aceita um CNPJ real conhecido (dígitos verificadores corretos)
- [x] `normalizarCNPJ` remove pontuação/máscara
- [x] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T2: Criar validador de documento (CPF ou CNPJ pelo comprimento) ✅

**What**: `src/lib/validation/documento.ts` com `normalizarDocumento`/`validarDocumento(valor): {valido, tipo}`, delegando para `cpf.ts` (11 dígitos) ou `cnpj.ts` (14 dígitos) - único ponto que decide qual algoritmo aplicar quando o chamador ainda não sabe o `tipo` do usuário (login).
**Where**: `src/lib/validation/documento.ts`
**Depends on**: T1
**Reuses**: `validarCPF`/`normalizarCPF` (T1's par existente), `validarCNPJ`/`normalizarCNPJ` (T1)
**Requirement**: UGO-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] 11 dígitos válidos -> `{valido:true, tipo:"CPF"}`
- [x] 14 dígitos válidos -> `{valido:true, tipo:"CNPJ"}`
- [x] Qualquer outro comprimento, ou dígito verificador inválido -> `{valido:false, tipo:null}`
- [x] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T3: Tornar o mascaramento de log consciente do tipo de documento

**What**: `mascararCPF` (REQ-SEC-12/AD-029) continua existindo sem mudança de comportamento para CPF; nenhuma máscara nova é aplicada a CNPJ (REQ-UGO-12/AD-043) - o objetivo desta tarefa é só confirmar/testar explicitamente que nenhum call site passa um CNPJ de GO para `mascararCPF` esperando ofuscação (grep + teste que documenta a decisão).
**Where**: `src/lib/log/mask.ts`
**Depends on**: T2
**Reuses**: `mascararCPF` existente, sem reescrita de lógica
**Requirement**: UGO-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Teste novo documenta que `mascararCPF` aplicado a um CNPJ de 14 dígitos produz uma máscara "de CPF" (comportamento aceito, não usado em produção para CNPJ) - guarda de regressão para não crescer indevidamente
- [ ] Grep confirma (comentário no PR/task) que nenhum log de produção passa `usuario.documento` de um GO por `mascararCPF`
- [ ] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T4: Migrar `prisma/schema.prisma` para o modelo unificado (AD-043)

**What**: Uma migration Prisma cobrindo: (1) `Usuario.cpf` renomeado para `documento` (`@id @db.VarChar(14)`); (2) `Usuario` ganha `responsavel`/`telefone`/`uf`/`municipio` (nullable); `nome`/`email` existentes reaproveitados; (3) `model Ofertante` removido; (4) `Verba.cdOfertante` e `PreCurso.cdOfertante` passam de `Int` para `String @db.VarChar(14)`, `@relation` apontando para `Usuario.documento`; (5) larguras de `Sessao.cpfUsuario`, `AvaliacaoAluno.cpf`, `RespostaAvaliacao.cpf`, `DadoPessoalAluno.cpf`, `Usuario.criadoPor`, `PreCurso.criadoPor`, `PosCurso.criadoPor` ajustadas de `VarChar(11)` para `VarChar(14)` (nomes de campo mantidos, ver design.md §1). Nenhuma tentativa de preservar o Ofertante/GO/VO de demo hoje existente (isso é T18).
**Where**: `prisma/schema.prisma` + migration gerada em `prisma/migrations/`
**Depends on**: T3
**Reuses**: padrão de migration já usado em `20260910222847_remover_coluna_respostas` (drop de model/coluna)
**Requirement**: UGO-01, UGO-02, UGO-03, UGO-06, UGO-07, UGO-13, UGO-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npx prisma migrate dev` aplica limpo em `spma` (dev) e a migration é commitada
- [ ] `model Ofertante` não existe mais no schema
- [ ] `Usuario.documento`, `Usuario.responsavel/telefone/uf/municipio` existem; `Usuario.cpf` não existe mais
- [ ] `Verba.cdOfertante`/`PreCurso.cdOfertante` são `String`
- [ ] Gate check passa: `npm run lint && npm run build && npm run typecheck` **NÃO** precisa passar ainda neste ponto (esperado quebrar em `guards.ts`/`cascata.ts`/schemas/rotas até a Fase 3/4) - rodar mesmo assim e registrar os erros esperados no commit, não silenciá-los

**Tests**: none
**Gate**: build

---

### T5: Atualizar fixtures de e2e para o modelo unificado

**What**: `scripts/e2e-fixture.ts` + `e2e/helpers/db.ts`: remove os comandos `criarOfertante`/`getOfertante`/`listarOfertantesPorNome`; `UsuarioFixture`/`upsertUsuario` ganham campos organizacionais opcionais (`nome`/`uf`/`responsavel`/`telefone`/`municipio`, só usados quando `tipo:"GO"`) gravados direto no `Usuario`; `criarVerba`/`criarPreCurso`/`deletePreCursosPorOfertante` trocam `cdOfertante: number` por `string`. **Decisão deliberada de nomenclatura**: o campo `cpf` do tipo `UsuarioFixture` continua se chamando `cpf` (não vira `documento`) mesmo aceitando um valor de 14 dígitos para GO - é uma abstração de teste própria, não um espelho 1:1 do schema Prisma, e renomear obrigaria tocar todo spec e2e do projeto (~30 arquivos) sem nenhum ganho (pedido do usuário de minimizar o diff).
**Where**: `scripts/e2e-fixture.ts`, `e2e/helpers/db.ts`
**Depends on**: T4
**Reuses**: estrutura de comando existente (`switch (comando)`), tipos `UsuarioFixture`/`UsuarioPersistido` já existentes
**Requirement**: UGO-01, UGO-13 (suporte de teste)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `criarOfertante`/`getOfertante`/`listarOfertantesPorNome` removidos de `e2e-fixture.ts` e `db.ts`
- [ ] `upsertUsuario` grava `nome`/`uf`/`responsavel`/`telefone`/`municipio` quando informados
- [ ] `criarVerba`/`criarPreCurso`/`deletePreCursosPorOfertante` aceitam `cdOfertante` como `string`
- [ ] `npx tsc --noEmit` limpo nos dois arquivos (fixture ainda não é exercitado por nenhum spec até a Fase 4/6, mas precisa compilar)
- [ ] Gate check passa: `npm run lint && npm run build && npm run typecheck`

**Tests**: none
**Gate**: build

---

### T6: Reescrever `guards.ts` para escopo por GO/CNPJ

**What**: Nova função `resolverEscopoOfertante(usuario)` (GO -> o próprio `documento`; VO -> `cdOfertante`; demais -> `null`), usada internamente por `podeAcessarOfertante`, `podeEditarOfertante`, `podeGerenciarPreCurso`, `podeMatricularAluno`, `podeAcessarAvaliacao` (assinaturas públicas inalteradas). `requireOfertanteVinculado` passa a checar dados organizacionais incompletos (`nome`/`uf` nulos) em vez de `cdOfertante === null`.
**Where**: `src/lib/auth/guards.ts`
**Depends on**: T5
**Reuses**: as 6 guardas existentes, só o corpo interno muda
**Requirement**: UGO-14, UGO-17, UGO-18, UGO-19, UGO-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Todo teste existente de `guards.test.ts` atualizado para `cdOfertante`/`documento` como `string`
- [ ] Novo teste: GO acessando um recurso cujo `cdOfertanteAlvo` é o próprio `documento` -> permitido
- [ ] Novo teste: VO acessando um recurso de um GO diferente do seu `cdOfertante` -> negado
- [ ] `requireOfertanteVinculado` redireciona quando `nome`/`uf` do GO são nulos, não redireciona quando completos
- [ ] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T7: Atualizar `cascata.ts` - GO deixa de criar GO, tipos de `cdOfertante`

**What**: `TIPOS_PERMITIDOS.GO` passa de `["GO", "VO", "AL"]` para `["VO", "AL"]` (UGO-18/AD-043). `resolverOfertante` passa a operar sobre `string | null` em vez de `number | null`.
**Where**: `src/lib/auth/cascata.ts`
**Depends on**: T6
**Reuses**: estrutura existente da função, só os tipos e a matriz mudam
**Requirement**: UGO-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `cascata.test.ts`: `MATRIZ_ESPERADA.GO` vira `["VO", "AL"]`; a combinação GO-cria-GO passa a esperar `false`
- [ ] Testes de `resolverOfertante` atualizados para `cdOfertante: string`
- [ ] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T8: Reescrever `usuarioSchema` - documento condicional por tipo + campos organizacionais

**What**: Campo `cpf` renomeado para `documento`; `superRefine` no nível do objeto decide `validarCNPJ` (quando `tipo==="GO"`) ou `validarCPF` (demais), seguido de `transform` que normaliza de acordo; `nome`/`uf` obrigatórios apenas quando `tipo==="GO"` (mantendo `nome` como já era para os demais tipos); `responsavel`/`telefone`/`municipio` opcionais, só aceitos quando `tipo==="GO"`.
**Where**: `src/lib/validation/schemas/usuario.schema.ts`
**Depends on**: T7
**Reuses**: `validarCPF`/`normalizarCPF`, `validarCNPJ`/`normalizarCNPJ` (T1)
**Requirement**: UGO-01, UGO-06, UGO-07, UGO-08, UGO-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] GO com CNPJ inválido -> issue no campo `documento`
- [ ] AM/GT/VT/AL com CPF inválido -> issue no campo `documento` (comportamento inalterado)
- [ ] GO sem `uf` -> issue de campo obrigatório
- [ ] Tipo != GO com `responsavel`/`telefone`/`municipio` informado -> aceito e ignorado, ou rejeitado (decidir e testar um dos dois, documentando a escolha no teste)
- [ ] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T9: Reescrever `loginSchema` - aceitar CPF ou CNPJ

**What**: `cpf` (renomeado para `documento` no schema, mantendo o nome de campo na API HTTP a decidir em T11/T16 sem quebrar contrato) validado via `validarDocumento` (T2) em vez de `validarCPF` direto.
**Where**: `src/lib/validation/schemas/login.schema.ts`
**Depends on**: T8
**Reuses**: `validarDocumento`/`normalizarDocumento` (T2)

**Requirement**: UGO-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] CPF de 11 dígitos válido -> aceito e normalizado (comportamento inalterado)
- [ ] CNPJ de 14 dígitos válido -> aceito e normalizado
- [ ] Documento de tamanho diferente de 11/14 -> rejeitado com a mesma mensagem genérica
- [ ] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T10: Substituir `ofertante.schema.ts` por `organizacao.schema.ts`

**What**: Novo `src/lib/validation/schemas/organizacao.schema.ts` com os mesmos 6 campos de `ofertanteSchema` (nome, responsavel, email, telefone, uf, municipio) - reaproveitado como o corpo do PATCH de dados organizacionais do GO (T12/T13). `ofertante.schema.ts` e seu teste são removidos.
**Where**: `src/lib/validation/schemas/organizacao.schema.ts` (novo); remove `src/lib/validation/schemas/ofertante.schema.ts` e `ofertante.schema.test.ts`
**Depends on**: T9
**Reuses**: corpo de `ofertanteSchema` quase inalterado, só o nome do arquivo/export muda
**Requirement**: UGO-01, UGO-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Mesma cobertura de teste que `ofertante.schema.test.ts` tinha, migrada para `organizacao.schema.test.ts`
- [ ] `ofertante.schema.ts`/`.test.ts` não existem mais
- [ ] Gate check passa: `npm run test:unit`

**Tests**: unit
**Gate**: quick

---

### T11: `POST /api/usuarios` - GO se identifica por CNPJ, cascata sem Ofertante separado

**What**: Checagem de existência do `cdOfertante` informado passa de `prisma.ofertante.findUnique` para `prisma.usuario.findUnique({ where: { documento: cdOfertante, tipo: "GO" } })` (rejeita também um documento que existe mas não é GO). `resolverOfertante`/`exigeOfertanteEVerba` continuam chamados como hoje, agora com tipos `string`.
**Where**: `src/app/api/usuarios/route.ts`, `e2e/usuarios.spec.ts`
**Depends on**: T10
**Reuses**: `podeCriar`, `resolverOfertante`, `exigeOfertanteEVerba`, `podeMatricularAluno` - inalterados na assinatura
**Requirement**: UGO-01, UGO-06, UGO-08, UGO-09, UGO-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `e2e/usuarios.spec.ts`: fixtures usam `cdOfertante` string; CNPJ de teste válido para os GOs criados via API
- [ ] Teste "GO criando GO herda o próprio ofertante" (linha ~201) atualizado para esperar 403 (UGO-18), não mais sucesso
- [ ] Teste "GO não cria verba de carona" (linha ~373) removido ou adaptado (a combinação GO-cria-GO já é bloqueada antes de chegar em `exigeOfertanteEVerba`)
- [ ] Novo teste: AM/GT cria GO com CNPJ válido + nome + uf -> 201, sem nenhum registro em uma tabela `Ofertante` (ela não existe mais)
- [ ] Novo teste: `cdOfertante` informado aponta para um documento que existe mas é tipo AL -> 400 "Ofertante informado não existe"
- [ ] Gate check passa: `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T12: Substituir `/api/ofertantes` por `/api/usuarios/[documento]/organizacao`

**What**: Remove `src/app/api/ofertantes/route.ts` e `[id]/route.ts`. Novo `GET/PATCH /api/usuarios/[documento]/organizacao/route.ts`: `GET` aplica `podeAcessarOfertante`, `PATCH` aplica `podeEditarOfertante`, ambos usando `organizacaoSchema` (T10) e operando sobre `Usuario` (não mais `Ofertante`). `e2e/ofertantes.spec.ts` -> `e2e/organizacao.spec.ts`, `e2e/ofertantes-id.spec.ts` -> `e2e/organizacao-id.spec.ts`, mesmos cenários (CA-OV-01..07 originais), alvo trocado de Ofertante para GO.
**Where**: remove `src/app/api/ofertantes/route.ts`, `src/app/api/ofertantes/[id]/route.ts`; cria `src/app/api/usuarios/[documento]/organizacao/route.ts`; renomeia `e2e/ofertantes.spec.ts` -> `e2e/organizacao.spec.ts`, `e2e/ofertantes-id.spec.ts` -> `e2e/organizacao-id.spec.ts`
**Depends on**: T11
**Reuses**: `podeAcessarOfertante`/`podeEditarOfertante` (T6), `organizacaoSchema` (T10), padrão de `comTratamentoDeErro`/`verificarCSRF` já usado em `ofertantes/[id]/route.ts`
**Requirement**: UGO-01, UGO-05, UGO-15, UGO-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `GET /api/usuarios/[documento]/organizacao`: AM/GT/VT sempre; GO/VO só o próprio -> 403 fora de escopo
- [ ] `PATCH`: mesmos campos de REQ-UGO-01, validação e persistência direta no `Usuario`
- [ ] Nenhuma rota `/api/ofertantes*` responde mais (404 do Next.js)
- [ ] `e2e/organizacao.spec.ts`/`organizacao-id.spec.ts` cobrem os mesmos cenários que `ofertantes.spec.ts`/`ofertantes-id.spec.ts` cobriam, adaptados ao novo alvo
- [ ] Gate check passa: `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T13: `PATCH /api/usuarios/me/organizacao` + tela `/cadastro-ofertante`

**What**: Nova rota de auto-cadastro/completude (mirrors `PATCH /api/usuarios/me/dados-pessoais`, tudo-ou-nada): GO autenticado completa os próprios dados organizacionais. `src/app/(onboarding)/cadastro-ofertante/page.tsx` reescrita: mesmo formulário de 6 campos (sem CNPJ, que já é a identidade fixa do GO logado), chamando a nova rota.
**Where**: `src/app/api/usuarios/me/organizacao/route.ts` (novo), `src/app/(onboarding)/cadastro-ofertante/page.tsx`, `e2e/cadastro-ofertante-page.spec.ts`
**Depends on**: T12
**Reuses**: padrão exato de `src/app/api/usuarios/me/dados-pessoais/route.ts` (tudo-ou-nada, mesmo guard de sessão)
**Requirement**: UGO-01, UGO-02, UGO-03, UGO-04, UGO-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] GO com dados organizacionais incompletos, ao acessar qualquer rota protegida, é redirecionado a `/cadastro-ofertante` (via `requireOfertanteVinculado`, T6)
- [ ] Submeter o formulário completa os dados e libera o acesso (redirect para `/painel`)
- [ ] GO com dados já completos que tenta submeter de novo -> 409, dados inalterados
- [ ] `e2e/cadastro-ofertante-page.spec.ts` atualizado para o novo formulário/rota
- [ ] Gate check passa: `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T14: `POST/GET /api/verbas` - GO por CNPJ, sem `prisma.ofertante`

**What**: `criarVerba`: checagem de existência troca `prisma.ofertante.findUnique` por `prisma.usuario.findUnique({where:{documento: cdOfertante, tipo:"GO"}})`. `listarVerbas`: `where.cdOfertante` vira `string`; leitura do escopo do próprio usuário usa `resolverEscopoOfertante` (T6) em vez de `usuario.cdOfertante` direto.
**Where**: `src/app/api/verbas/route.ts`, `e2e/verbas.spec.ts`, `e2e/verbas-id.spec.ts`
**Depends on**: T13
**Reuses**: `podeGerenciarVerba`, `calcularSaldoVerba` (inalterados)
**Requirement**: UGO-14, UGO-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `criarVerba` com `cdOfertante` de um GO válido -> 201 (comportamento inalterado, só o tipo mudou)
- [ ] `criarVerba` com `cdOfertante` que não corresponde a nenhum GO -> 400 (mesma mensagem)
- [ ] `listarVerbas` como GO/VO retorna só as verbas do próprio CNPJ (VO via `resolverEscopoOfertante`)
- [ ] `verbas-id.spec.ts` roda sem alteração de código de produção (confirmado por `podeAcessarOfertante` já genérico) - só fixtures ajustadas
- [ ] Gate check passa: `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T15: `usuarios/novo` - lista GOs em vez de Ofertantes, CNPJ na criação

**What**: `usuarios/novo/page.tsx` troca `prisma.ofertante.findMany` por `prisma.usuario.findMany({ where: { tipo: "GO" } })` (para AM/GT escolherem o GO ao criar um VO). `NovoUsuarioForm` ganha campo de CNPJ + campos organizacionais quando `tipo` selecionado for GO.
**Where**: `src/app/(protegido)/usuarios/novo/page.tsx`, `src/app/(protegido)/usuarios/novo/NovoUsuarioForm.tsx`, `e2e/usuarios-novo-page.spec.ts`
**Depends on**: T14
**Reuses**: `podeGerenciarVerba` (inalterado), estrutura de formulário existente

**Requirement**: UGO-01, UGO-13, UGO-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] GT/AM veem uma lista de GOs (não mais "Ofertantes") ao criar um VO
- [ ] Criar um GO pela tela pede CNPJ + nome + UF (+ opcionais)
- [ ] `e2e/usuarios-novo-page.spec.ts` atualizado para os novos rótulos/campos
- [ ] Gate check passa: `npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T16: Login aceita CNPJ - prova e2e

**What**: Adiciona a `e2e/login.spec.ts` um cenário de login bem-sucedido com um GO de fixture identificado por CNPJ válido, ao lado dos cenários de CPF já existentes.
**Where**: `e2e/login.spec.ts`
**Depends on**: T15
**Reuses**: fixture `upsertUsuario` (T5), `loginSchema` (T9)
**Requirement**: UGO-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Novo teste: GO com CNPJ válido faz login com sucesso (sessão criada)
- [ ] Teste existente de CPF continua verde, inalterado
- [ ] Gate check passa: `npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T17: `prisma/seed.ts` - campo `documento`

**What**: `seedAdminMaster` grava `documento` em vez de `cpf` (AM continua CPF de 11 dígitos - só o nome do campo Prisma muda).
**Where**: `prisma/seed.ts`
**Depends on**: T16
**Reuses**: lógica existente, sem mudança de comportamento

**Requirement**: UGO-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npm run db:seed` roda sem erro contra o schema novo
- [ ] Gate check passa: `npm run lint && npm run build && npm run typecheck`

**Tests**: none
**Gate**: build

---

### T18: `scripts/dev-seed-demo.ts` - cenário de demo no formato unificado (Decisão C/AD-043)

**What**: Remove a criação separada de `Ofertante`; o GO de demo (`CPF_GO` -> `CNPJ_GO`, um CNPJ de teste válido) grava nome/uf/responsavel/email/municipio diretamente no próprio `Usuario`; `Verba`/`PreCurso` referenciam `CNPJ_GO` direto. `limpar()` ajustado (sem `prisma.ofertante`). Autorizado pelo usuário nesta sessão: apaga e recria o registro de demo existente.
**Where**: `scripts/dev-seed-demo.ts`
**Depends on**: T17
**Reuses**: estrutura existente do script (idempotente, `--limpar`)
**Requirement**: UGO-01 (migração/Decisão C)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `npm run dev:seed-demo:limpar` remove o cenário antigo (Ofertante+GO+VO+Verba+PreCurso+Avaliações de demo)
- [ ] `npm run dev:seed-demo` recria o mesmo cenário navegável, GO com CNPJ de teste válido
- [ ] Gate check passa: `npm run lint && npm run build && npm run typecheck`

**Tests**: none
**Gate**: build

---

### T19: Varredura - fixtures de `e2e/pre-cursos*.spec.ts`

**What**: Em cada arquivo da família (`pre-cursos.spec.ts`, `pre-cursos-page.spec.ts`, `pre-cursos-formulario.spec.ts`, `pre-cursos-novo.spec.ts`, `pre-cursos-id.spec.ts`, `pre-cursos-encerrar.spec.ts`): remove a chamada a `criarOfertante`, funde `nome`/`uf` no `upsertUsuario` do GO, troca a variável `cdOfertante`/`cdOfertante2` (hoje `number`) pelo próprio CNPJ do GO de fixture (`string`). Mudança puramente mecânica, sem cobertura nova (pedido do usuário) - nenhum destes specs testa CNPJ em si.
**Where**: `e2e/pre-cursos*.spec.ts`
**Depends on**: T18
**Reuses**: `upsertUsuario` com os novos campos organizacionais (T5)
**Requirement**: UGO-01, UGO-13 (regressão)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Nenhum arquivo da família chama mais `criarOfertante`/`getOfertante`
- [ ] Todos os testes da família continuam verdes com a mesma contagem de antes
- [ ] Gate check passa: `npm run test:e2e -- pre-cursos`

**Tests**: e2e
**Gate**: full

---

### T20: Varredura - fixtures de `e2e/pos-cursos*.spec.ts`

**What**: Mesma varredura mecânica de T19, aplicada à família `pos-cursos*.spec.ts` (`pos-cursos.spec.ts`, `-page`, `-formulario`, `-novo`, `-id`, `-encerrar`).
**Where**: `e2e/pos-cursos*.spec.ts`
**Depends on**: T19
**Reuses**: mesmo padrão de T19
**Requirement**: UGO-01, UGO-13 (regressão)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Nenhum arquivo da família chama mais `criarOfertante`/`getOfertante`
- [ ] Todos os testes da família continuam verdes com a mesma contagem de antes
- [ ] Gate check passa: `npm run test:e2e -- pos-cursos`

**Tests**: e2e
**Gate**: full

---

### T21: Varredura - fixtures de `e2e/avaliacoes*.spec.ts`

**What**: Mesma varredura mecânica de T19, aplicada à família `avaliacoes*.spec.ts` (`avaliacoes.spec.ts`, `-page`, `-novo`, `-id`, `-encerrar`, `-formulario`).
**Where**: `e2e/avaliacoes*.spec.ts`
**Depends on**: T20
**Reuses**: mesmo padrão de T19
**Requirement**: UGO-01, UGO-13 (regressão)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Nenhum arquivo da família chama mais `criarOfertante`/`getOfertante`
- [ ] Todos os testes da família continuam verdes com a mesma contagem de antes
- [ ] Gate check completo passa (última tarefa de código da feature): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`

**Tests**: e2e
**Gate**: full

---

### T22: Anotar `cadastro-ofertante-verba/spec.md` como superada

**What**: Anotação (não reescrita, mesmo padrão da AD-042 sobre `avaliacao-aluno/spec.md`): REQ-OV-01..07 marcados como superados por `unificacao-ofertante-go`/AD-043; REQ-OV-08..12 (Verba/saldo/teto) marcados como ainda válidos, só com a FK de tipo alterado.
**Where**: `.specs/features/cadastro-ofertante-verba/spec.md`
**Depends on**: T21
**Reuses**: padrão de anotação já usado em `avaliacao-aluno/spec.md` pela AD-042
**Requirement**: (consistência de artefato, não um REQ funcional)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] REQ-OV-01..07 marcados com nota de superação apontando para `unificacao-ofertante-go`
- [ ] REQ-OV-08..12 permanecem sem marca de superação, com uma nota de que a FK mudou de tipo

**Tests**: none
**Gate**: quick

---

### T23: Anotar SPEC_DEVIATION em `docs/SPMA_Especificacao_Cliente_v2.md`

**What**: Nota de desvio deliberado (mesmo padrão `SPEC_DEVIATION` já usado no código) nas seções 2.2/2.3/3.3, registrando que o documento do cliente descreve Ofertante como entidade própria e que a unificação com o GO é decisão do usuário desta sessão, não erro de leitura da spec fonte.
**Where**: `docs/SPMA_Especificacao_Cliente_v2.md`
**Depends on**: T22
**Reuses**: padrão de nota já usado em outras seções do documento (verificar formato exato antes de escrever)
**Requirement**: (consistência de artefato, não um REQ funcional)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Seções 2.2/2.3/3.3 têm uma nota `SPEC_DEVIATION` explícita, com referência à AD-043

**Tests**: none
**Gate**: quick

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5
Phase 3:  T6 ------→ T7 ------→ T8 ------→ T9 ------→ T10
Phase 4:  T11 -----→ T12 -----→ T13 -----→ T14 -----→ T15 -----→ T16
Phase 5:  T17 -----→ T18
Phase 6:  T19 -----→ T20 -----→ T21 -----→ T22 -----→ T23
```

**Empacotamento previsto:** 23 tarefas, orçamento de ~7 por worker, cortando só em fronteira de fase → **4 batches** (Fases 1+2 = 5 tarefas; Fase 3 = 5 tarefas; Fase 4 = 6 tarefas; Fases 5+6 = 7 tarefas). Como isso passa de um batch, o Execute precisa apresentar a oferta de sub-agentes antes de começar.

Execução é estritamente sequencial dentro de cada fase - um agente (ou sub-agente de lote) trabalha uma tarefa por vez, em ordem. Fases rodam em sequência.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 arquivo novo | ✅ Granular |
| T2 | 1 arquivo novo | ✅ Granular |
| T3 | 1 arquivo (verificação + teste) | ✅ Granular |
| T4 | 1 arquivo (schema) + migration gerada | ✅ Granular (mudança única e coesa de modelo de dados) |
| T5 | 2 arquivos fortemente acoplados (fixture + seu wrapper de tipos) | ⚠️ OK - coesos, mesma mudança de forma |
| T6 | 1 arquivo | ✅ Granular |
| T7 | 1 arquivo | ✅ Granular |
| T8 | 1 arquivo | ✅ Granular |
| T9 | 1 arquivo | ✅ Granular |
| T10 | 1 arquivo novo + remoção de 2 | ✅ Granular (substituição 1:1) |
| T11 | 1 rota + seu e2e existente | ⚠️ OK - rota e prova e2e da mesma rota, mesma mudança |
| T12 | 2 rotas removidas + 1 nova + 2 e2e renomeados | ⚠️ Maior, mas uma única substituição de endpoint coesa (justificado em design.md) |
| T13 | 1 rota nova + 1 página + 1 e2e | ⚠️ OK - mesmo fluxo ponta a ponta |
| T14 | 1 rota + 2 e2e | ⚠️ OK - mesma rota, dois arquivos de teste que já cobriam a mesma rota |
| T15 | 1 página + 1 form colocado + 1 e2e | ⚠️ OK - mesma tela |
| T16 | 1 arquivo | ✅ Granular |
| T17 | 1 arquivo | ✅ Granular |
| T18 | 1 arquivo | ✅ Granular |
| T19-T21 | Famílias de arquivos (glob), mudança mecânica idêntica repetida | ⚠️ Deliberado - ver justificativa abaixo |
| T22-T23 | 1 arquivo cada | ✅ Granular |

**Justificativa das exceções (⚠️):** nenhuma combina responsabilidades diferentes - cada uma é uma ÚNICA mudança mecânica ou um ÚNICO fluxo ponta a ponta espalhado por arquivos que já eram acoplados antes desta feature (rota + seu e2e; família de specs que já compartilhavam o mesmo padrão de fixture). Dividir mais fundo criaria uma tarefa que produz código sem prova (violaria "nenhuma tarefa produz código não verificado") ou dividiria uma família de arquivos idênticos em N tarefas idênticas sem nenhum ganho de clareza - o oposto do pedido do usuário de manter a feature enxuta.

---

## Diagram-Definition Cross-Check

Cada tarefa depende só da imediatamente anterior na corrente única T1→T2→...→T23 (ver nota em Execution Plan) - toda seta correspondente aparece no diagrama da fase de origem ou de destino (o diagrama de cada fase repete a tarefa de fronteira recebida da fase anterior, mesmo padrão de `respostas-normalizadas/tasks.md`).

| Task | Depends On (corpo da tarefa) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (nenhuma seta) | ✅ Match |
| T2 | T1 | T1 → T2 (Fase 1) | ✅ Match |
| T3 | T2 | T2 → T3 (Fase 1) | ✅ Match |
| T4 | T3 | T3 → T4 (Fase 1) | ✅ Match |
| T5 | T4 | T4 → T5 (Fase 2) | ✅ Match |
| T6 | T5 | T5 → T6 (Fase 3) | ✅ Match |
| T7 | T6 | T6 → T7 (Fase 3) | ✅ Match |
| T8 | T7 | T7 → T8 (Fase 3) | ✅ Match |
| T9 | T8 | T8 → T9 (Fase 3) | ✅ Match |
| T10 | T9 | T9 → T10 (Fase 3) | ✅ Match |
| T11 | T10 | T10 → T11 (Fase 4) | ✅ Match |
| T12 | T11 | T11 → T12 (Fase 4) | ✅ Match |
| T13 | T12 | T12 → T13 (Fase 4) | ✅ Match |
| T14 | T13 | T13 → T14 (Fase 4) | ✅ Match |
| T15 | T14 | T14 → T15 (Fase 4) | ✅ Match |
| T16 | T15 | T15 → T16 (Fase 4) | ✅ Match |
| T17 | T16 | T16 → T17 (Fase 5) | ✅ Match |
| T18 | T17 | T17 → T18 (Fase 5) | ✅ Match |
| T19 | T18 | T18 → T19 (Fase 6) | ✅ Match |
| T20 | T19 | T19 → T20 (Fase 6) | ✅ Match |
| T21 | T20 | T20 → T21 (Fase 6) | ✅ Match |
| T22 | T21 | T21 → T22 (Fase 6) | ✅ Match |
| T23 | T22 | T22 → T23 (Fase 6) | ✅ Match |

Nenhuma tarefa depende de uma tarefa de fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: cnpj.ts | Validação pura | unit | unit | ✅ OK |
| T2: documento.ts | Validação pura | unit | unit | ✅ OK |
| T3: mask.ts | Validação pura | unit | unit | ✅ OK |
| T4: schema.prisma | Schema Prisma | none | none | ✅ OK |
| T5: e2e-fixture.ts/db.ts | Fixtures/scripts | none | none | ✅ OK |
| T6: guards.ts | Domínio | unit | unit | ✅ OK |
| T7: cascata.ts | Domínio | unit | unit | ✅ OK |
| T8: usuario.schema.ts | Domínio | unit | unit | ✅ OK |
| T9: login.schema.ts | Domínio | unit | unit | ✅ OK |
| T10: organizacao.schema.ts | Domínio | unit | unit | ✅ OK |
| T11: usuarios/route.ts | Rota de API | e2e | e2e | ✅ OK |
| T12: ofertantes->organizacao route | Rota de API | e2e | e2e | ✅ OK |
| T13: me/organizacao + página | Rota de API + página | e2e | e2e | ✅ OK |
| T14: verbas/route.ts | Rota de API | e2e | e2e | ✅ OK |
| T15: usuarios/novo page | Página | e2e | e2e | ✅ OK |
| T16: login.spec.ts | Rota de API (prova adicional) | e2e | e2e | ✅ OK |
| T17: seed.ts | Fixtures/scripts | none | none | ✅ OK |
| T18: dev-seed-demo.ts | Fixtures/scripts | none | none | ✅ OK |
| T19-T21: varreduras e2e | Rota de API (regressão de fixture) | e2e | e2e | ✅ OK |
| T22-T23: docs | Docs/AD | none | none | ✅ OK |

Nenhuma violação: todo `Tests: none` corresponde a uma linha "none" da matriz (fixtures/scripts, schema, docs); nenhuma tarefa usa "testado em outra tarefa" como justificativa.
