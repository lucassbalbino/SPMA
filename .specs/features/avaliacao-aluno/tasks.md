# avaliacao-aluno Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/avaliacao-aluno/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Herdada de `auth-e-usuarios`/`seguranca-transversal`/`cadastro-ofertante-verba`/`formulario-pre-curso`/`formulario-pos-curso` (mesma stack já aprovada e em uso): Vitest (unit) + Playwright (e2e). Nenhum `AGENTS.md`/config com threshold de cobertura explícito além do que os testes existentes já praticam — aplicado o padrão forte (1:1 com ACs da spec + todo edge case listado), igual às 5 features anteriores.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/pure logic (`avaliacao.schema.ts`, `completude.ts`, `guards.ts` extensão) | unit | All branches; 1:1 to spec ACs; every listed edge case | `src/lib/**/*.test.ts` | `npm run test:unit` |
| API routes + páginas (matrícula, leitura/gravação parcial com 2 gates, encerramento, listagem, formulários) | e2e | Todas as rotas/telas tocadas: happy path + cada edge case listado + paths de erro, contra `spma_test` real | `e2e/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

> Herdada das features anteriores - mesma ordem de build.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with e2e tests | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | After phase completion or config/scaffold-only tasks | `npm run lint && npm run build && npm run typecheck` |

---

## Execution Plan

Phases são ordenadas e rodam sequencialmente. **9 tarefas no total** → excede o limite de lote único (~8), oferecido delegação em sub-agentes ao usuário antes do Execute (ver seção final deste documento).

### Phase 1: Fundações (schema, guardas, completude em 2 níveis)

```
T1 → T3
(T2 é independente)
```

### Phase 2: Rotas de API

```
T1 → T4
T2 → T4
T1 → T5
T2 → T5
T3 → T5
T2 → T6
T3 → T6
```

### Phase 3: Telas

```
T4 → T7
T1 → T8
T4 → T8
T5 → T9
T6 → T9
T1 → T9
```

---

## Task Breakdown

### Phase 1: Fundações

#### T1: `src/lib/validation/schemas/avaliacao.schema.ts`

**What**: `matricularAlunoSchema` (`{ cpf: string, cdCurso: number }`, reusa `validarCPF` de `src/lib/validation/cpf.ts`); `respostasAvaliacaoSchema` com as 44 chaves do Dicionário de Campos de `spec.md`, **todas `.optional()`** (ver design.md Approach Exploration §2 — obrigatoriedade condicional fica 100% em `completude.ts`, T3); `respostasAvaliacaoParcialSchema` (mesmo schema, exportado com esse nome por simetria com as outras features); `escalaAvaliacaoCurso = z.number().int().min(1).max(5)` (AD-020) aplicado aos 8 campos `avalCurso*`; `CHAVES_PARTE_1` (array com as 19 chaves da Parte 1, usado por T5 para classificar o corpo do PATCH); constantes de opções por campo de seleção (`OPCOES_GENERO`, `OPCOES_FAIXA_ETARIA`, etc.), reexportando `OPCOES_UF` de `pre-curso.schema.ts` para `avalPessoalEstado`.
**Where**: `src/lib/validation/schemas/avaliacao.schema.ts`
**Depends on**: None
**Reuses**: `validarCPF` (`src/lib/validation/cpf.ts`), `OPCOES_UF` (`pre-curso.schema.ts`); mesmo estilo geral de `pre-curso.schema.ts`/`pos-curso.schema.ts`
**Requirement**: AVAL-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `matricularAlunoSchema` rejeita CPF com dígito verificador inválido e `cdCurso` ausente/não-positivo
- [x] `respostasAvaliacaoSchema` tem exatamente 44 chaves (teste de contagem — mitigação do risco de transcrição divergir da spec, mesmo padrão de `formulario-pos-curso` T1)
- [x] `CHAVES_PARTE_1` tem exatamente 19 entradas e cada uma corresponde a uma chave real de `respostasAvaliacaoSchema`
- [x] cada campo de seleção única rejeita um valor fora do seu enum
- [x] campos de seleção múltipla aceitam array de strings dentre as opções válidas, rejeitam item fora do enum, e rejeitam lista vazia `[]` como não-preenchido
- [x] `avalMotivMotivosParticipacao` aceita 1 a 3 itens e rejeita 4 itens (limite explícito do documento, edge case da spec)
- [x] os 8 campos `avalCurso*` (escala) rejeitam `0` e `6`, aceitam `1` e `5`
- [x] `avalGeralNota` rejeita `-1` e `11`, aceita `0` e `10`
- [x] `avalParticipPercentualFrequencia` rejeita `-1` e `101`, aceita `0` e `100`
- [x] `respostasAvaliacaoSchema` (mesmo sem `.partial()`) aceita `{}` e aceita um subconjunto de 1 campo válido (todas as chaves já são opcionais na FORMA, por design)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(avaliacao-aluno): add avaliacao response schema and field dictionary constants`

---

#### T2: `src/lib/auth/guards.ts` — autoridades de matrícula, escrita e leitura

**What**: `export const podeMatricularAluno = podeGerenciarPreCurso;` (alias, mesma regra — GO do Ofertante-alvo); `podeGerenciarAvaliacao(usuario: { tipo: TipoUsuario; cpf: string }, cpfAvaliacao: string): boolean` (`usuario.tipo === "AL" && usuario.cpf === cpfAvaliacao` — primeira guarda de identidade pura do projeto, ver design.md); `podeAcessarAvaliacao(usuario: { tipo: TipoUsuario; cpf: string; cdOfertante: number | null }, alvo: { cpfAluno: string; cdOfertante: number }): boolean` (AL só a própria; GO/VO via `podeAcessarOfertante`; AM/GT/VT sempre `true`).
**Where**: `src/lib/auth/guards.ts` (modificar)
**Depends on**: None
**Reuses**: `podeGerenciarPreCurso`, `podeAcessarOfertante` (ambos já existentes e testados)
**Requirement**: AVAL-06, AVAL-09, AVAL-18, AVAL-20, AVAL-21, AVAL-23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `podeMatricularAluno` exportado e se comporta identicamente a `podeGerenciarPreCurso` (GO do Ofertante-alvo → `true`; GO de outro Ofertante → `false`; AM/GT/VT/VO/AL → `false`)
- [x] `podeGerenciarAvaliacao`: AL com CPF igual ao da avaliação → `true`; AL com CPF diferente → `false`; qualquer perfil não-AL (incluindo o GO que matriculou) → `false`
- [x] `podeAcessarAvaliacao`: AL com CPF igual ao alvo → `true` independente do `cdOfertante`; AL com CPF diferente → `false`; GO/VO do `cdOfertante` do alvo → `true`; GO/VO de outro Ofertante → `false`; AM/GT/VT → `true` para qualquer alvo

**Tests**: unit
**Gate**: quick

**Commit**: `feat(avaliacao-aluno): add matricula and identity-based authorization guards`

---

#### T3: `src/lib/avaliacao/completude.ts`

**What**: `validarCompletudeParte1(respostas: unknown): { completo: boolean; pendentes: string[] }` — schema dedicado das 17 chaves sempre-obrigatórias de Parte 1 (as 19 chaves menos os 2 condicionais) via `.safeParse` + função pura para os 2 condicionais (`avalProfissAtividadeEspecifica` se `avalProfissAtuaTurismo="Sim"`; `avalExperienciaTipoCursoAnterior` se `avalExperienciaCursoAnterior="Sim"`), unindo os dois conjuntos de pendências. `validarCompletudeParte2(respostas: unknown): { completo: boolean; pendentes: string[] }` — se `avalParticipConcluiuCurso` ausente, pendente sozinho; se `="Não"`, exige só `avalParticipMotivoNaoConclusao`; se `="Sim"`, roda um schema dedicado das 22 chaves restantes via `.safeParse` (`avalGeralComentariosFinais` nunca entra). `validarCompletudeAvaliacao(respostas: unknown)` — união das duas acima, usada só no encerramento. Nenhuma função encadeia `.superRefine` no schema base (ver design.md Approach Exploration §2 e lição L-016 de `formulario-pre-curso`).
**Where**: `src/lib/avaliacao/completude.ts`
**Depends on**: T1
**Reuses**: `respostasAvaliacaoSchema`/tipos de `avaliacao.schema.ts` (T1); a técnica (não o código) de `src/lib/pos-curso/completude.ts`
**Requirement**: AVAL-08, AVAL-12, AVAL-13, AVAL-15, AVAL-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `validarCompletudeParte1`: as 17 chaves sempre-obrigatórias preenchidas + `avalProfissAtuaTurismo="Não"` + `avalExperienciaCursoAnterior="Não"` → `completo=true`
- [x] `validarCompletudeParte1`: `avalProfissAtuaTurismo="Sim"` sem `avalProfissAtividadeEspecifica` → pendente inclui a chave; idem para `avalExperienciaCursoAnterior="Sim"` sem `avalExperienciaTipoCursoAnterior`
- [x] `validarCompletudeParte1`: campo condicional aparece em `pendentes` mesmo com a maioria dos outros campos de Parte 1 também ausentes (prova direta contra a lição L-016 — testado desde o início)
- [x] `validarCompletudeParte2`: `avalParticipConcluiuCurso="Não"` + `avalParticipMotivoNaoConclusao` preenchido → `completo=true`, mesmo com as 22 chaves restantes todas ausentes
- [x] `validarCompletudeParte2`: `avalParticipConcluiuCurso="Não"` sem `avalParticipMotivoNaoConclusao` → `completo=false`, pendente é só essa chave (as 22 não aparecem)
- [x] `validarCompletudeParte2`: `avalParticipConcluiuCurso="Sim"` com as 22 chaves preenchidas → `completo=true`
- [x] `validarCompletudeParte2`: `avalParticipConcluiuCurso="Sim"` com 1 das 22 chaves ausente → `completo=false`, pendente lista exatamente essa chave
- [x] `validarCompletudeParte2`: `avalGeralComentariosFinais` ausente nunca aparece em `pendentes`, mesmo com `avalParticipConcluiuCurso="Sim"` e todo o resto preenchido
- [x] `validarCompletudeAvaliacao`: une pendências de Parte 1 e Parte 2 corretamente (caso com uma pendência de cada)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(avaliacao-aluno): add two-tier closure-completeness validation`

---

### Phase 2: Rotas de API

#### T4: `src/app/api/avaliacoes/route.ts` — matrícula e listagem

**What**: `POST` (CSRF → sessão → busca `Usuario` pelo CPF informado, 404 se não existir, 400 se `tipo≠AL` → busca `PreCurso` pelo `cdCurso`, 404 se não existir → `podeMatricularAluno` contra o `cdOfertante` do curso, 403 se fora de escopo → confere duplicidade do par via `findUnique`, 409 se já existe → confere RN-12 via `findFirst({ where: { cpf, status: "EM_ANDAMENTO" } })`, 409 se encontrado → cria com `status=EM_ANDAMENTO`, `parte1Completa=false`, `respostas=null`); `GET` lista escopada (AM/GT/VT todos; GO/VO só o próprio Ofertante via `curso: { cdOfertante }`; AL só `{ cpf: sessao.usuario.cpf }`).
**Where**: `src/app/api/avaliacoes/route.ts`
**Depends on**: T1, T2
**Reuses**: `matricularAlunoSchema` (T1), `podeMatricularAluno` (T2), `verificarCSRF`, `comTratamentoDeErro`, `obterSessao`, mesma estrutura de `src/app/api/pos-cursos/route.ts`
**Requirement**: AVAL-01, AVAL-02, AVAL-03, AVAL-04, AVAL-05, AVAL-06, AVAL-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO matricula um Aluno (CPF de um usuário `tipo=AL`) num curso do próprio Ofertante → 201, `status=EM_ANDAMENTO`, `parte1Completa=false`, `respostas=null`
- [x] e2e: CPF informado não corresponde a nenhum usuário → 404
- [x] e2e: CPF informado corresponde a um usuário que não é `tipo=AL` → 400
- [x] e2e: par (CPF, cdCurso) já matriculado → 409, nenhum novo registro criado
- [x] e2e: Aluno já tem outra avaliação `EM_ANDAMENTO` noutro curso → 409, registro existente inalterado (RN-12)
- [x] e2e: `cdCurso` inexistente → 404
- [x] e2e: `cdCurso` de um curso de outro Ofertante → 403, nenhum registro criado
- [x] e2e: usuário não-GO (incluindo AL) tentando matricular → 403
- [x] e2e: GO vinculado ao Ofertante A lista só as avaliações de cursos do Ofertante A; GT lista todas; Aluno lista só a(s) própria(s)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao-aluno): add matricula and scoped listing endpoint`

---

#### T5: `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts` — consulta e gravação parcial com os dois gates

**What**: `GET` consulta escopada (`podeAcessarAvaliacao` via `include: { curso: true }` para o `cdOfertante`); `PATCH` — CSRF → sessão → 404 se não existe → `podeGerenciarAvaliacao` (só o próprio Aluno), 403 caso contrário → 409 se `status=ENCERRADO` → valida FORMA do corpo com `respostasAvaliacaoParcialSchema` (400) → mescla `existente.respostas` + corpo em memória → `validarCompletudeParte1` no estado mesclado → `parte1CompletaResultante` → se o corpo tiver alguma chave fora de `CHAVES_PARTE_1` e `parte1CompletaResultante === false`, 400 sem persistir nada (AVAL-10) → senão persiste `respostas` + `parte1Completa=parte1CompletaResultante` numa única `update`.
**Where**: `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts`
**Depends on**: T1, T2, T3
**Reuses**: `respostasAvaliacaoParcialSchema`, `CHAVES_PARTE_1` (T1), `validarCompletudeParte1` (T3), `podeAcessarAvaliacao`/`podeGerenciarAvaliacao` (T2), mesma estrutura de `src/app/api/pos-cursos/[cdCurso]/route.ts`
**Requirement**: AVAL-07, AVAL-08, AVAL-09, AVAL-10, AVAL-11, AVAL-14, AVAL-17 (parte gravação), AVAL-20, AVAL-21, AVAL-23

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: o próprio Aluno grava um bloco parcial de Parte 1 → 200, `parte1Completa` permanece `false`, os demais campos continuam ausentes
- [x] e2e: o próprio Aluno completa as 19 chaves de Parte 1 (2 condicionais incluídas) → 200, `parte1Completa=true` na mesma resposta
- [x] e2e: tentativa de gravar uma chave de Parte 2 enquanto `parte1Completa` resultante é `false` → 400, nada persistido (nem as chaves de Parte 1 do mesmo PATCH)
- [x] e2e: com Parte 1 já completa, gravação de uma chave de Parte 2 isolada → 200
- [x] e2e: gravação parcial de Parte 2 sem preencher todas as 25 chaves é aceita enquanto `EM_ANDAMENTO` (a obrigatoriedade condicional não bloqueia PATCH intermediário)
- [x] e2e: o GO que fez a matrícula tenta gravar → 403
- [x] e2e: outro Aluno (CPF diferente) tenta gravar → 403
- [x] e2e: gravação num registro já `ENCERRADO` → 409, dado inalterado
- [x] e2e: o próprio Aluno consulta a própria avaliação → 200; consulta de outro CPF → 403
- [x] e2e: GO/VO do Ofertante do curso consultam → 200; GO/VO de outro Ofertante → 403; AM/GT/VT → 200 em qualquer avaliação

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao-aluno): add scoped read and two-gate partial-save endpoint`

---

#### T6: `src/app/api/avaliacoes/[cpf]/[cdCurso]/encerrar/route.ts` — encerramento irreversível

**What**: CSRF → sessão → 404 se não existe → `podeGerenciarAvaliacao` (só o próprio Aluno), 403 caso contrário → 409 se já `ENCERRADO` → `validarCompletudeAvaliacao`; se completo, `status=ENCERRADO` + `dataEncerramento=now()`; se incompleto, 400 com `{ pendentes }`.
**Where**: `src/app/api/avaliacoes/[cpf]/[cdCurso]/encerrar/route.ts`
**Depends on**: T2, T3
**Reuses**: `validarCompletudeAvaliacao` (T3), `podeGerenciarAvaliacao` (T2), mesma ordem RH→CSRF→Sessão→Guard e mesmo padrão de `src/app/api/pos-cursos/[cdCurso]/encerrar/route.ts`
**Requirement**: AVAL-12, AVAL-13, AVAL-15, AVAL-16, AVAL-17, AVAL-18, AVAL-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: Parte 1 completa + `avalParticipConcluiuCurso="Não"` + `avalParticipMotivoNaoConclusao` preenchido (as 22 chaves de Parte 2 restantes vazias) → 200, `status=ENCERRADO` (prova AVAL-12 fim-a-fim)
- [x] e2e: Parte 1 completa + `avalParticipConcluiuCurso="Sim"` com as 22 chaves preenchidas → 200, `status=ENCERRADO` (prova AVAL-13 fim-a-fim)
- [x] e2e: `avalParticipConcluiuCurso="Sim"` com 1 das 22 chaves faltando → 400, `pendentes` lista a chave, `status` permanece `EM_ANDAMENTO`
- [x] e2e: Parte 1 incompleta → 400, `pendentes` lista as chaves de Parte 1 faltantes, `status` permanece `EM_ANDAMENTO`
- [x] e2e: segunda tentativa de encerrar uma avaliação já `ENCERRADO` → 409
- [x] e2e: o GO que fez a matrícula tenta encerrar → 403
- [x] e2e: após o encerramento, uma tentativa de `PATCH` em `/api/avaliacoes/[cpf]/[cdCurso]` (T5) recebe 409 (fecha AVAL-17/19 fim-a-fim)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao-aluno): add irreversible closure endpoint`

---

### Phase 3: Telas

#### T7: `src/app/(protegido)/avaliacoes/page.tsx` — listagem

**What**: Server Component (`requireSession`) que consulta `AvaliacaoAluno` via Prisma com o mesmo escopo de `GET /api/avaliacoes` (AM/GT/VT todos, GO/VO só o próprio Ofertante via `curso: { cdOfertante }`, Aluno só a própria) e renderiza uma lista com CPF (quando aplicável), curso, status e link para `[cpf]/[cdCurso]`.
**Where**: `src/app/(protegido)/avaliacoes/page.tsx`
**Depends on**: T4
**Reuses**: `requireSession`, mesmo padrão de escopo de T4, `Card` (herdado de `formulario-pre-curso`)
**Requirement**: AVAL-22 (tela)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO vinculado ao Ofertante A vê só as avaliações de cursos do Ofertante A
- [x] e2e: GT vê todas as avaliações cadastradas
- [x] e2e: Aluno vê só a(s) própria(s) avaliação(ões)
- [x] e2e: cada item lista o status atual e linka para a tela de detalhe (T9)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao-aluno): add scoped avaliacao listing page`

---

#### T8: `src/app/(protegido)/avaliacoes/novo/page.tsx` + `MatricularAlunoForm.tsx` — matrícula

**What**: `page.tsx` (Server Component, `requireSession`, `requireOfertanteVinculado`, carrega via `prisma.preCurso.findMany({ where: { cdOfertante } })` os cursos do GO para o seletor); `MatricularAlunoForm.tsx` (Client Component — campo de CPF do Aluno + `Select` de curso, `fetch` + `headerCSRF` para `POST /api/avaliacoes`, redireciona para `[cpf]/[cdCurso]` em sucesso, exibe a mensagem de erro do servidor em cada caso — CPF inválido, CPF não é Aluno, já matriculado, RN-12).
**Where**: `src/app/(protegido)/avaliacoes/novo/` (`page.tsx` novo, `MatricularAlunoForm.tsx` novo)
**Depends on**: T1, T4
**Reuses**: padrão exato de `pos-cursos/novo/NovoPosCursoForm.tsx` (Client Component separado, `useState` + `fetch`, sem lib de formulário), `Select`/`Input` já existentes, `matricularAlunoSchema` (T1, validação client-side espelhando o servidor)
**Requirement**: AVAL-01, AVAL-02, AVAL-03, AVAL-04, AVAL-05 (tela)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] e2e: GO matricula um Aluno existente num curso do próprio Ofertante → redireciona para a tela de preenchimento (T9)
- [x] e2e: seletor de curso mostra só os do próprio Ofertante do GO autenticado
- [x] e2e: tentativa com CPF de um usuário não-Aluno exibe a mensagem de erro do servidor sem redirecionar
- [x] e2e: tentativa de matricular um Aluno que já tem avaliação `EM_ANDAMENTO` noutro curso exibe a mensagem de erro (RN-12) sem redirecionar

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao-aluno): add matricula screen`

---

#### T9: `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/page.tsx` + `AvaliacaoForm.tsx` — preenchimento e encerramento

**What**: `page.tsx` (Server Component, `requireSession`, carrega a `AvaliacaoAluno` via Prisma com `include: { curso: true }`, checando `podeAcessarAvaliacao`, `notFound()` se inexistente/fora de escopo); `AvaliacaoForm.tsx` (Client Component — 2 `Accordion` (Parte 1 sempre habilitada para o dono; Parte 2 com `disabled` até `parte1Completa`, com aviso explicando o motivo do bloqueio), mesmo padrão orientado a metadados (`BLOCOS`/`renderCampo`) de `PosCursoForm.tsx`, um `useState<Record<string, unknown>>` único para `respostas`, botão "Salvar rascunho" faz `PATCH` em `/api/avaliacoes/[cpf]/[cdCurso]`, botão "Encerrar" faz `POST` em `/api/avaliacoes/[cpf]/[cdCurso]/encerrar` e exibe a lista de `pendentes` quando bloqueado; dentro de Parte 2, os campos além de "Concluiu o curso?" ficam `disabled` enquanto `avalParticipConcluiuCurso≠"Sim"`, refletindo o gate de completude no cliente; campos desabilitados e mensagem de somente-leitura quando `status=ENCERRADO`; apenas o dono (Aluno) vê os controles de edição/encerramento — demais perfis com acesso de leitura veem só os dados).
**Where**: `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/` (`page.tsx` novo, `AvaliacaoForm.tsx` novo)
**Depends on**: T1, T5, T6
**Reuses**: `Accordion`/`RadioGroup`/`Checkbox`/`Select`/`Textarea`/`Field*`/`Input`/`Button` já existentes, constantes de opções de `avaliacao.schema.ts` (T1), `headerCSRF`, mesmo padrão de `PosCursoForm.tsx` (metadados de blocos, sem lib externa de formulário)
**Requirement**: AVAL-07 a AVAL-19 (tela — fecha as stories de preenchimento/gates/encerramento de ponta a ponta pela UI)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] e2e: o Aluno abre a própria avaliação `EM_ANDAMENTO`, preenche a Parte 1 e salva rascunho → Parte 2 passa a ficar habilitada na mesma tela (reflete `parte1Completa`)
- [ ] e2e: antes da Parte 1 completa, os controles de Parte 2 aparecem desabilitados com o aviso do gate
- [ ] e2e: o Aluno preenche `avalParticipConcluiuCurso="Não"`, informa o motivo e encerra sem preencher o restante da Parte 2 → tela reflete `status=ENCERRADO`
- [ ] e2e: noutra avaliação, o Aluno preenche `avalParticipConcluiuCurso="Sim"` sem completar as 22 chaves e tenta encerrar → bloqueado, pendências exibidas referenciando os campos
- [ ] e2e: o Aluno reabre uma avaliação já `ENCERRADO` → nenhum campo é editável, botões "Salvar rascunho"/"Encerrar" ausentes ou desabilitados
- [ ] e2e: um GO do Ofertante do curso abre a tela → vê os dados, sem controles de edição/encerramento
- [ ] e2e: outro Aluno tentando acessar a URL diretamente → página de não encontrado/negado

**Tests**: e2e
**Gate**: full

**Commit**: `feat(avaliacao-aluno): add fill-in and closure screen`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T3
          T2  (sem dependências, mesma fase)
Phase 2:  T1 ------→ T4
          T2 ------→ T4
          T1 ------→ T5
          T2 ------→ T5
          T3 ------→ T5
          T2 ------→ T6
          T3 ------→ T6
Phase 3:  T4 ------→ T7
          T1 ------→ T8
          T4 ------→ T8
          T1 ------→ T9
          T5 ------→ T9
          T6 ------→ T9
```

Dentro de cada fase, tarefas sem dependência entre si ainda executam em ordem sequencial (uma por vez, sem paralelismo intra-fase) — a ordem numérica é a ordem de execução; as setas acima marcam só dependência real, não sequência de execução.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: schema Zod de 44 campos + `CHAVES_PARTE_1` + constantes de opções | 1 arquivo | ✅ Granular |
| T2: 3 guardas de autorização (`podeMatricularAluno`, `podeGerenciarAvaliacao`, `podeAcessarAvaliacao`) | 1 arquivo, cohesivo (mesma extensão de `guards.ts`) | ⚠️ 3 funções, cohesivo (mesmo módulo, mesma feature, cada uma pequena) |
| T3: `validarCompletudeParte1`/`Parte2`/`Avaliacao` | 1 arquivo, cohesivo (as 3 funções compõem uma única unidade de completude) | ⚠️ 3 funções, cohesivo |
| T4: `POST`/`GET /api/avaliacoes` | 1 endpoint (1 arquivo, 2 verbos do mesmo recurso) | ✅ Granular |
| T5: `GET`/`PATCH /api/avaliacoes/[cpf]/[cdCurso]` | 1 endpoint (1 arquivo, 2 verbos do mesmo recurso) | ✅ Granular |
| T6: `POST /api/avaliacoes/[cpf]/[cdCurso]/encerrar` | 1 endpoint | ✅ Granular |
| T7: listagem | 1 tela (1 arquivo) | ✅ Granular |
| T8: matrícula | 1 tela (Server Component + seu Client Component colocado) | ⚠️ 2 arquivos, cohesivo (mesma tela) |
| T9: preenchimento/encerramento | 1 tela (Server Component + seu Client Component colocado) | ⚠️ 2 arquivos, cohesivo (mesma tela) |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1, T2 | T1 → T4, T2 → T4 | ✅ Match |
| T5 | T1, T2, T3 | T1 → T5, T2 → T5, T3 → T5 | ✅ Match |
| T6 | T2, T3 | T2 → T6, T3 → T6 | ✅ Match |
| T7 | T4 | T4 → T7 | ✅ Match |
| T8 | T1, T4 | T1 → T8, T4 → T8 | ✅ Match |
| T9 | T1, T5, T6 | T1 → T9, T5 → T9, T6 → T9 | ✅ Match |

Nenhuma dependência aponta para uma fase posterior à do dependente.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: avaliacao.schema.ts | Domain/pure logic | unit | unit | ✅ OK |
| T2: guards.ts (extensão) | Domain/pure logic | unit | unit | ✅ OK |
| T3: completude.ts | Domain/pure logic | unit | unit | ✅ OK |
| T4: POST/GET /api/avaliacoes | API route | e2e | e2e | ✅ OK |
| T5: GET/PATCH /api/avaliacoes/[cpf]/[cdCurso] | API route | e2e | e2e | ✅ OK |
| T6: POST /api/avaliacoes/[cpf]/[cdCurso]/encerrar | API route | e2e | e2e | ✅ OK |
| T7: listagem | Página (API route consumida) | e2e | e2e | ✅ OK |
| T8: matrícula | Página + Client Component | e2e | e2e | ✅ OK |
| T9: preenchimento/encerramento | Página + Client Component | e2e | e2e | ✅ OK |

Nenhuma violação — todo `Tests` de tarefa bate com a camada correspondente na Test Coverage Matrix.

---

## Delegação em sub-agentes

9 tarefas > ~8 (limite de lote único do skill) → oferta obrigatória ao usuário antes do Execute. Empacotamento por fase inteira, ~7 tarefas por lote:

- **Lote 1** (Fases 1–2, 6 tarefas: T1–T6) — fundações + rotas de API.
- **Lote 2** (Fase 3, 3 tarefas: T7–T9) — telas.

Alternativa: executar tudo inline, sem sub-agentes, dado que 9 tarefas é um volume administrável numa única sessão contínua (mesmo volume de `formulario-pos-curso`, que rodou assim). Pergunta ao usuário antes do Execute.
