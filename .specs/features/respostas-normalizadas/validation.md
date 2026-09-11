# Respostas Normalizadas Validation

**Date**: 2026-09-11
**Spec**: `.specs/features/respostas-normalizadas/spec.md`
**Diff range**: `6b28ae6..63964b4` (HEAD)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

---

## Validation: respostas-normalizadas — FAIL

**Result**: FAIL — 1 mutante sobrevivente (M5) + 1 defeito de leitura confirmado
empiricamente (chave órfã de múltipla escolha truncada) + 3 lacunas menores de cobertura.

Nada aqui é regressão de comportamento **introduzida** por esta feature contra o que os
testes hoje afirmam: o gate está verde de ponta a ponta. O que falha é a **rede de teste** —
dois comportamentos que a spec exige podem regredir sem que nenhum teste caia — e um caso de
dado histórico que a feature prometeu migrar sem perda e não migra.

---

## Superfície do diff

37 arquivos, +2202/−249. Código de produção novo: `src/lib/respostas/{forma,repositorio}.ts`.
Três migrations em sequência (`20260910082855_criar_tabelas_resposta` →
`20260910091216_backfill_respostas` → `20260910222847_remover_coluna_respostas`).
Seis rotas de formulário + três rotas de listagem/criação + três Server Components
convertidos. Quatro arquivos de teste novos.

**Invariâncias confirmadas por `git log 6b28ae6..HEAD -- <path>` vazio** (rodado por mim,
não herdado do implementador):

| Caminho | `git log` no range | Consequência |
| --- | --- | --- |
| `src/lib/auth/guards.ts` | vazio | guardas não mudaram |
| `src/lib/auth/` (diretório) | vazio | nenhuma peça de autorização mudou |
| `src/lib/pre-curso/`, `src/lib/pos-curso/`, `src/lib/avaliacao/` | vazio | `completude.ts` e `condicionais.ts` intocados |
| `src/lib/validation/` | vazio | os três schemas Zod intocados (AD-004 preservado) |
| `src/components/` | vazio | formulários React intocados |

---

## Task Completion

19 tarefas (T1–T19) marcadas `✅` em `tasks.md`, mais a lacuna da RESP-20 fechada com
commit próprio. Três marcas de desvio declaradas pelo autor, todas auditadas:

| Marca | Onde | Veredito do Verifier |
| --- | --- | --- |
| `SPEC_DEVIATION` — assinatura `(tx, alvo)` em vez de `(tx, formulario, id)` | `src/lib/respostas/repositorio.ts:7-12` | ✅ **Legítimo.** Refatoração de assinatura interna, sem efeito observável. A chave-pai composta da avaliação justifica o `alvo` discriminado. |
| `SPEC_DEVIATION` — asserção de índice em `possible_keys`, não em `key` | `tasks.md` T17 / `src/lib/respostas/agregacao.integration.test.ts:163-181` | ✅ **Legítimo, e verificado empiricamente por mim** (mutante M7 abaixo) — não aceito pela justificativa escrita. Derrubei o índice real no `spma_test` e o teste caiu. Ver ressalva no fim desta seção. |
| `SCOPE_DEVIATION` — T16 consertou o contrato HTTP além de dropar a coluna | `tasks.md` T16 | ✅ **Legítimo.** Dropar a coluna sem remontar `respostas` deixaria a API quebrada; parar ali não seria tarefa concluída. Nenhuma asserção de teste foi alterada. |

**Ressalva sobre o `possible_keys`:** a asserção prova que o índice **existe e serve** à
consulta, que é o que a RESP-18 pede literalmente ("manter um índice que cubra a busca por
chave"). Ela **não** prova que o otimizador o usa em volume real — isso a RESP-18 também não
exige. Desvio aceito, sem lição.

---

## Spec-Anchored Acceptance Criteria

Evidência-ou-zero: todo `file:line` abaixo foi aberto e lido por mim.

### P1: Resposta como entidade própria na base

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| RESP-01 — `PATCH` de N chaves persiste uma linha por chave, com chave e valor | uma linha por chave, vinculada ao registro | `src/lib/respostas/repositorio.integration.test.ts:103` — `expect(linhas).toEqual([{chave:"identifMunicipio",ordem:0,valor:"Manaus"},{chave:"planejCargaHoraria",ordem:0,valor:"40"}])` | ✅ PASS |
| RESP-02 — K opções → K linhas, cada uma com a opção e a posição | K linhas, com `ordem` = posição na seleção | `src/lib/respostas/repositorio.integration.test.ts:125` — `expect(linhas).toEqual([{ordem:0,valor:"Jovens"},{ordem:1,valor:"Mulheres"},{ordem:2,valor:"Idosos"}])`; classificação em `src/lib/respostas/forma.test.ts:118-122` (13 listas **nominais**) | ✅ PASS |
| RESP-03 — regravar uma chave substitui só ela | demais chaves inalteradas | `src/lib/respostas/repositorio.integration.test.ts:147` — `expect(...lerRespostas...).toEqual({identifMunicipio:"Belém", qualifNomeCurso:"Guiamento"})` | ✅ PASS |
| RESP-04 — lista que encolhe perde as linhas das opções que saíram | só as opções remanescentes sobrevivem | `src/lib/respostas/repositorio.integration.test.ts:168` — `expect(linhas).toEqual([{ordem:0,valor:"Idosos"}])` | ✅ PASS |
| RESP-05 — constraint física impede duas linhas para (registro, chave, posição) | unicidade no banco, não na aplicação | `prisma/schema.prisma:253` `@@unique([cdCurso, chave, ordem])`; **evidência de runtime** colhida por mim no mutante M2: o banco rejeitou com `Unique constraint failed on the constraint: TB_Resposta_Pre_Curso_CD_Curso_Chave_Ordem_key` | ⚠️ **Coberto só indiretamente** — nenhum teste dedicado tenta inserir a duplicata. Ver Lacuna 3. |
| RESP-06 — remover o pai remove as linhas, sem órfãs | `ON DELETE CASCADE` | `src/lib/respostas/repositorio.integration.test.ts:321` — `expect(await prisma.respostaPreCurso.count({where:{cdCurso:cursoDescartavel.cdCurso}})).toBe(0)` após `preCurso.delete` | ✅ PASS |

### P1: Nenhuma regra de negócio existente regride

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| RESP-07 — completude produz o mesmo veredito **e a mesma lista de pendências** | veredito idêntico + pendências idênticas às do JSON | As duas metades do critério têm asserção própria, sobre o objeto remontado: `e2e/pre-cursos-encerrar.spec.ts:126` — `expect(corpo.pendentes).toContain("qualifNomeCurso")`; `e2e/pos-cursos-encerrar.spec.ts:115` — `toContain("posAcompanhPlanoAcao")`; `e2e/avaliacoes-encerrar.spec.ts:191` — `toContain("avalGeralNota")` e `:217-218` — `toContain("avalPessoalMunicipio")` + `toContain("avalParticipConcluiuCurso")`. Reforçado por invariância: `src/lib/{pre-curso,pos-curso,avaliacao}/completude.ts` **intocados** no range | ✅ PASS |
| RESP-08 — encerramento remove as linhas das condicionais órfãs, na mesma transação do `ENCERRADO` | linhas apagadas; `status=ENCERRADO` gravado junto | `e2e/pre-cursos-encerrar.spec.ts:234-236` — `expect(respostas).not.toHaveProperty("qualifVinculoProgramaQual")` / `"infraEspecificaDisponibilidade"` / `"infraEspecificaSuficiencia"`, com `:239` provando que a NÃO-órfã sobrevive; `e2e/pos-cursos-encerrar.spec.ts:224`; `e2e/avaliacoes-encerrar.spec.ts:331-333`. Atomicidade: `src/app/api/pre-cursos/[id]/encerrar/route.ts:82-90` (`$transaction` envolvendo `apagarRespostas` + `update`) | ✅ PASS (mutante M6 mata) |
| RESP-09 — `ENCERRADO` recusa gravação com 409, sem alterar linha | HTTP 409 + dado intacto | `e2e/pre-cursos-id.spec.ts:216-219` — `expect(res.status()).toBe(409)` + `expect(depois?.respostas).toEqual(antes?.respostas)` + `expect(depois?.status).toBe("ENCERRADO")`; `e2e/pos-cursos-id.spec.ts:211`; `e2e/avaliacoes-id.spec.ts:287` | ✅ PASS |
| RESP-10 — Parte 2 com Parte 1 incompleta → 400, nada persistido, nem as chaves de Parte 1 do mesmo PATCH | HTTP 400 + zero linha | `e2e/avaliacoes-id.spec.ts:252-255` (chave de Parte 2 isolada) e **`:260-275`** (o caso duro: Parte 1 + Parte 2 no mesmo PATCH) — `expect(res.status()).toBe(400)` + `expect(depois?.respostas).toEqual(antes?.respostas)`. Implementação: gate antes do `$transaction`, `src/app/api/avaliacoes/[cpf]/[cdCurso]/route.ts:151` | ✅ PASS |
| RESP-11 — corpo reprovado pelo Zod → 400, nada persistido | HTTP 400 + zero linha | `e2e/pre-cursos-id.spec.ts:125-127` — `expect(res.status()).toBe(400)` + `expect(depois?.respostas).toEqual(antes?.respostas)` | ✅ PASS |
| RESP-12 — guardas de autorização e escopo por Ofertante inalterados | 401/403 idênticos aos de antes | **Ver análise dedicada abaixo.** Evidência real: 19 asserções de 401/403 nos 9 specs dos três formulários (`e2e/pre-cursos{,-id}.spec.ts` 3+3, `e2e/pos-cursos{,-id}.spec.ts` 3+3, `e2e/avaliacoes{,-id,-encerrar}.spec.ts` 2+4+1), ex.: `e2e/pre-cursos-id.spec.ts:232` `expect(res.status()).toBe(403)` | ✅ PASS — **mas não pela razão que `spec.md` registra** |

**RESP-12 — o argumento de invariância é insuficiente sozinho (julgamento pedido).**
`spec.md:148` marca RESP-12 Done "por invariância: `src/lib/auth/guards.ts` intocada".
Confirmei o fato (`git log 6b28ae6..HEAD -- src/lib/auth/` é vazio), mas **o fato não fecha
a AC**. A RESP-12 diz "as guardas **e o escopo por Ofertante**", e o escopo por Ofertante
não vive em `guards.ts`: vive na cláusula `where` e nos `403` das rotas — e **as nove rotas
foram modificadas nesta feature**. Guarda intocada com rota reescrita não prova escopo
preservado; esse pedaço do argumento é circular.

O que fecha de verdade a AC são duas coisas que verifiquei separadamente:
1. O `where` de escopo das rotas de listagem está **byte-a-byte igual** no diff — só um
   `include: { linhasResposta }` foi acrescentado (`git diff 6b28ae6..HEAD --
   src/app/api/pre-cursos/route.ts`, hunk `@@ -98,11 +101,17 @@`).
2. As 19 asserções de 401/403 acima passam sem nenhuma alteração de asserção.

Veredito: RESP-12 **está** coberta, mas a linha de rastreabilidade em `spec.md:148` deve
citar os e2e de 403 e a imutabilidade do `where`, não só a imutabilidade de `guards.ts`.

### P1: Migração das respostas já gravadas

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| RESP-13 — uma linha por chave (e por opção) antes de a coluna sumir | linhas criadas pela migration | `src/lib/respostas/backfill.integration.test.ts:223-229` — `expect(await lerRespostas(...)).toEqual(JSON_PRE_CURSO)`; ordem da múltipla em `:240-244` — `toEqual([{ordem:0,valor:"Jovens"},{ordem:1,valor:"Mulheres"},{ordem:2,valor:"Idosos"}])`. O teste executa **o SQL do próprio artefato de migration** (`:43-61`, `sqlDaMigration()`), não uma reimplementação — isso é qualidade acima da média. | ✅ PASS |
| RESP-14 — chave ausente do schema Zod migra do mesmo jeito, sem descartar o valor | linha criada, valor preservado | `src/lib/respostas/backfill.integration.test.ts:248-257` — `expect(linhas).toEqual([{ordem:0,valor:"resquício de troca de questionário"}])`; leitura em `repositorio.integration.test.ts:229-237`; classificação em `forma.test.ts:186-190` | ⚠️ **PASS na letra, GAP no efeito** — ver Lacuna 1 |
| RESP-15 — `status`, `dataEncerramento` e demais colunas intactos | valores idênticos aos semeados | `src/lib/respostas/backfill.integration.test.ts:300-313` — `expect(preCursoComRespostas?.status).toBe("EM_ANDAMENTO")`, `expect(preCursoSemRespostas?.dataEncerramento).toEqual(new Date("2026-01-15T12:00:00Z"))`, `expect(avaliacao?.parte1Completa).toBe(true)` | ✅ PASS |
| RESP-16 — registro com `respostas` nulo não gera linha e conclui sem erro | zero linhas, sem exceção | `src/lib/respostas/backfill.integration.test.ts:279-283` — `expect(await prisma.respostaPreCurso.count({where:{cdCurso:cdCursoSemRespostas}})).toBe(0)` (a migration ter rodado no `beforeAll` sem lançar é o "sem erro") | ✅ PASS — com duas ressalvas de precisão, abaixo |

**Ressalvas de precisão na RESP-16 (não são gaps de cobertura):**
- `backfill.integration.test.ts:279-283` e `:317-321` são **o mesmo teste duplicado**, com
  nomes diferentes e asserção idêntica. Redundância inofensiva, mas infla a contagem.
- `src/lib/respostas/repositorio.ts:162` e o checklist da T3 atribuem a RESP-16 ao caminho de
  **leitura** ("registro sem linhas devolve `{}`"). A RESP-16 é um requisito de **migração**.
  O comportamento de leitura é correto e testado (`repositorio.integration.test.ts:81-88`),
  mas está rotulado com a AC errada.

### P1: Dado pronto para agregação por pergunta

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| RESP-17 — agregar por chave e valor sem função de JSON no `WHERE` nem no `GROUP BY` | contagem correta, SQL sem JSON | `src/lib/respostas/agregacao.integration.test.ts:121-124` — escalar, `toEqual([{valor:"Sim",total:3},{valor:"Não",total:1}])`; `:141-145` — múltipla, `toEqual([{valor:ATUAR_TURISMO,total:3},{valor:RETOMAR_ESTUDOS,total:2}])` e `reduce(...)===5` (5 seleções de 4 alunos, que é o ponto da AD-041); `:158-160` — escopo por curso sem vazamento; `:186-196` — `information_schema` prova que **não sobrou nenhuma coluna JSON** nos três formulários | ✅ PASS |
| RESP-18 — manter um índice que cubra a busca por chave de pergunta | índice existe e serve à consulta | `src/lib/respostas/agregacao.integration.test.ts:168-181` — `expect(chavesPossiveis).toContain(indice)` sobre `EXPLAIN`, nas três tabelas; `prisma/schema.prisma:254,268,283` `@@index([chave])` | ✅ PASS (mutante M7 mata — verificado por mim, não aceito no papel) |

### Edge Cases

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| RESP-19 — regravar o mesmo valor mantém uma única linha | 1 linha, sem duplicar | `src/lib/respostas/repositorio.integration.test.ts:189` — `expect(linhas).toEqual([{ordem:0,valor:"Manaus"}])` | ✅ PASS |
| RESP-20 — lista vazia em múltipla escolha → 400 pelo `.min(1)`, sem persistir linha | HTTP 400 + resposta anterior intacta | `e2e/pre-cursos-id.spec.ts:152-156` — `expect(res.status()).toBe(400)` + `expect(depois?.respostas?.publicoPerfil).toEqual(["Mulheres","Jovens"])` | ✅ PASS (mutante M8 mata). Teste bem desenhado: grava **antes** para que o 400 tenha o que preservar — sem isso a asserção seria vácua. |
| RESP-21 — duas gravações concorrentes preservam merge raso, sem gravação parcial visível | semântica de merge raso sob concorrência + atomicidade | `src/lib/respostas/repositorio.integration.test.ts:240-257` — `rejects.toThrow(...)` + `expect(count).toBe(0)` + `expect(lerRespostas(...)).toEqual({})` | ⚠️ **Meia AC coberta** — ver Lacuna 2 |

**Status**: 18/21 ✅ PASS · 3 com ressalva (RESP-05 indireta, RESP-14 gap de efeito,
RESP-21 meia-AC) · 0 sem nenhuma evidência.

---

## Lacunas encontradas (ranqueadas)

### Lacuna 1 (Major) — chave órfã de **múltipla escolha** é truncada na leitura

`RESP-14` · confirmado empiricamente, não deduzido.

`classificarChave` devolve `"texto"` para chave ausente do schema atual
(`src/lib/respostas/forma.ts:29-30`), e `desserializar(itens, "texto")` devolve
**`itens[0]`** (`src/lib/respostas/forma.ts:56`). Logo, uma chave órfã que no questionário
antigo era seleção múltipla é remontada como **uma string só**, descartando em silêncio todas
as opções a partir da segunda.

Reproduzido por mim (`npx tsx`, sobre o código real):

```
forma classificada: texto
linhas no banco:    ["OpcaoA","OpcaoB","OpcaoC"]
objeto remontado:   "OpcaoA"
LOSSLESS NA LEITURA? false
```

**Não é hipótese — as chaves existem e têm nome.** `git show e2a19b1^:src/lib/validation/schemas/pos-curso.schema.ts:134-135`:

```ts
posContEstrategiasContinuidade: z.array(z.enum(OPCOES_ESTRATEGIAS_CONTINUIDADE)).min(1),
posContEstrategiasAmpliacao:    z.array(z.enum(OPCOES_ESTRATEGIAS_AMPLIACAO)).min(1),
```

As duas eram `z.array(...)` e foram **removidas** do schema pela AD-035/036 (fundidas em
`posContEstrategias`). Todo pós-curso respondido antes de 2026-08-29 carrega essas chaves
como array no JSON. O backfill migra as N linhas corretamente (armazenamento lossless), mas
`lerRespostas` devolve só a primeira opção — que é exatamente a "perda silenciosa" que a
assumption de `spec.md:45` diz estar evitando.

Por que os testes não pegam: **as duas fixtures de chave órfã semeiam um escalar**
(`backfill.integration.test.ts:22` `chaveDeQuestionarioAntigo: "resquício…"`;
`repositorio.integration.test.ts:231` `valor: "x"`) — precisamente a forma que passa.

Ressalva honesta de escopo — o contra-argumento mais forte, e por que ele não me convence:

- A **letra** da RESP-14 ("a migração SHALL criar a linha correspondente… sem descartar o
  valor") está cumprida: a migração cria as N linhas.
- A AD-041 ainda diz, com todas as letras, que a chave órfã é "**lida como texto**"
  (`.specs/STATE.md:232`). Lido ao pé da letra, o truncamento seria comportamento
  **declarado**, não defeito.

O que derruba isso: "lida como texto" é uma descrição escrita pensando em valor escalar, e
ela colide frontalmente com duas afirmações da mesma spec — o Goal "As respostas já gravadas
migram **sem perda**" (`spec.md:18`) e a assumption que justifica migrar a órfã em vez de
descartá-la, cuja razão declarada é que "**descartar seria perda silenciosa**"
(`spec.md:45`). Guardar três linhas e devolver uma é exatamente a perda silenciosa que a
assumption diz estar evitando; só mudou o lugar onde ela acontece — da migração para a
leitura. Também não se cumpre o Independent Test da story ("conferir que o objeto remontado é
igual ao JSON original").

Classificação: lacuna de **precisão da spec** (três frases da mesma spec discordam sobre o
que acontece com órfã de lista) **somada** a um defeito real de leitura. Quem decide qual das
três frases vale é o product owner — mas não dá para as três valerem ao mesmo tempo.

**Fix sugerido** (não aplicado — quem corrige é o orquestrador): `montarRespostas` já sabe
quantas linhas a chave tem; para chave desconhecida ao schema, `itens.length > 1` deveria
remontar como lista. Mais um teste com órfã de múltipla escolha nas duas suítes.

### Lacuna 2 (Major) — mutante sobrevivente: `respostasOuNulo` não tem rede

`RESP-07..RESP-12` (contrato HTTP) · mutante **M5 sobreviveu a 83 testes e2e**.

Troquei `respostasOuNulo` para devolver `{}` em vez de `null`
(`src/lib/respostas/repositorio.ts:179-181`) e rodei os **nove** specs de API dos três
formulários: **83 passed, 0 failed** (`test-results/.last-run.json` → `"status":"passed"`).

O comentário em `repositorio.ts:172-178` afirma que esse `null` "é o que mantém o contrato
da API idêntico ao de antes da normalização". Essa afirmação **não tem nenhum teste por
trás**. As três asserções que parecem cobri-la não cobrem:

- `e2e/pre-cursos.spec.ts:73`, `pos-cursos.spec.ts:122`, `avaliacoes.spec.ts:128`
  (`expect(corpo.X.respostas).toBeNull()`) batem nas rotas de **criação**, que escrevem
  `respostas: null` **literalmente** na rota (`src/app/api/pre-cursos/route.ts:73`) —
  `respostasOuNulo` nunca é chamada ali.
- `e2e/pre-cursos.spec.ts:77` e irmãs (`expect(persistido?.respostas).toBeNull()`) leem pelo
  helper de fixture, que tem a **sua própria** lógica de null duplicada
  (`scripts/e2e-fixture.ts:58-64`, `respostasPorLinha`) — o oráculo de teste reimplementa o
  comportamento em vez de observá-lo, então nunca diverge da produção.

Resultado: `GET`, `PATCH`, listagem e encerramento dos três formulários podem regredir de
`null` para `{}` sem que um único teste caia. É diferença observável para qualquer
consumidor da API.

**Fix sugerido**: uma asserção e2e de `GET` sobre registro sem nenhuma resposta
(`expect(corpo.preCurso.respostas).toBeNull()`), e/ou um teste unitário direto de
`respostasOuNulo({})`. Vale considerar eliminar a duplicação: fazer
`scripts/e2e-fixture.ts` chamar `respostasOuNulo` em vez de reimplementá-la.

### Lacuna 3 (Minor) — RESP-21 só prova atomicidade, nunca concorrência

`repositorio.integration.test.ts:240-257` é um teste de **rollback**: abre uma transação,
grava, lança, e confere que não sobrou linha. Prova a metade "sem gravação parcial visível".

A outra metade da AC — "**duas gravações concorrentes** … preservam a semântica de merge
raso" — **não tem teste nenhum**: nenhum ponto da suíte dispara dois `gravarRespostas`
sobrepostos. A AC passa por construção (chaves diferentes viram linhas diferentes, e
`design.md:156` registra que mesma chave segue "último a escrever vence", como já era), mas
a palavra "concorrentes" no critério não tem evidência executável. Marcado ⚠️ em vez de ✅
por evidência-ou-zero.

### Lacuna 4 (Minor) — RESP-05 não tem teste dedicado

Nenhum teste tenta inserir a linha duplicada e afirmar que o banco recusa. A constraint
**está viva** — colhi a prova de runtime no mutante M2 (`Unique constraint failed on the
constraint: TB_Resposta_Pre_Curso_CD_Curso_Chave_Ordem_key`) —, mas isso é subproduto de um
mutante meu, não rede de teste do projeto. A T2 declara `Tests: none` e a rastreabilidade
marca RESP-05 Done por ela. Um `expect(...).rejects.toThrow(/Unique constraint/)` de três
linhas fecharia.

### Verificado e descartado (não é lacuna)

Registro o que investiguei e **não** virou achado, para o próximo leitor não refazer:

- **`patch[chave] === null` apaga a chave em vez de gravar `null`**
  (`src/lib/respostas/repositorio.ts:211` — a chave entra em `chaves`, as linhas são
  apagadas, e nada é inserido). Com o JSON, `{chave: null}` persistia a chave com valor
  `null`. Mudança de contrato real **na teoria**, mas **inalcançável pelas rotas**: o schema
  do PATCH é `respostasPreCursoSchema.partial()`
  (`src/lib/validation/schemas/pre-curso.schema.ts:313`) e `.partial()` torna o campo
  opcional, **não** nullable — nenhum campo usa `.nullable()`. `{chave: null}` leva 400 do
  Zod antes de chegar ao repositório. Branch defensivo, sem caminho de execução.
- **Chave de lista com uma única linha** volta como `["x"]`, não como `"x"`
  (`forma.test.ts:232`) — a armadilha óbvia do desenho, e está coberta.
- **Chave de lista com zero linhas** fica ausente do objeto, que é o que o JSON fazia.
- **Ordem nas rotas de listagem**: `montarRespostas` não ordena por conta própria, mas as
  três rotas de listagem passam `include: { linhasResposta: { orderBy: [{chave:"asc"},
  {ordem:"asc"}] } }` — `src/app/api/pre-cursos/route.ts:107`,
  `src/app/api/pos-cursos/route.ts:108`, `src/app/api/avaliacoes/route.ts:129`. A ordem da
  seleção múltipla está preservada também nesse caminho. Conferi os três, um a um.

### Lacuna 5 (Cosmetic) — rótulos de rastreabilidade e checkboxes

- **Cinco dos seis Success Criteria de `spec.md:165-171` seguem `[ ]`** embora eu tenha
  verificado que **todos** estão satisfeitos: suíte sem asserção enfraquecida (provado
  mecanicamente acima), agregação sem função de JSON com índice
  (`agregacao.integration.test.ts:112-196`), backfill com round-trip idêntico
  (`backfill.integration.test.ts:223-276` — com a ressalva da Lacuna 1 para órfã de lista),
  AD-041 registrada (`.specs/STATE.md:224`) com a AD-034 marcada como superada
  (`.specs/STATE.md:221`, tachada e com "SUPERSEDED pela AD-041"), e gate
  completo verde. É só bookkeeping não atualizado, não falta de substância.
- `spec.md:148` (RESP-12) cita como evidência algo que não cobre a AC inteira (ver acima).
- `repositorio.ts:162` e T3 rotulam o retorno `{}` da leitura como RESP-16, que é AC de
  migração.
- `backfill.integration.test.ts:279` e `:317` são o mesmo teste duplicado.

---

## Discrimination Sensor

**Nota de processo (registrada de propósito, a pedido do coordenador):** os quatro primeiros
mutantes (M1–M4, M6, M7) foram injetados **na árvore real** com backup e
`git checkout --` a cada rodada. O coordenador interrompeu — com razão — porque um mutante
como `if (false && …)` é sintaticamente válido e sobreviveria a um `npm run build` caso a
sessão morresse no meio, deixando bug silencioso em código de produção. A árvore real foi
restaurada imediatamente (`git status --porcelain` voltou a ter só este `validation.md`
como não rastreado) e **o restante do sensor (M5, M8) rodou num `git worktree` isolado**.
Nenhum resultado foi descartado: M1–M4/M6/M7 já tinham terminado e foram verificados com a
árvore restaurada em seguida. `git stash` não foi usado em momento algum.

O worktree exigiu cópia real de `node_modules` (0,8 GB): o Turbopack do Next 16 recusa
junction que aponta para fora da raiz do projeto (`Symlink [project]/node_modules is invalid,
it points out of the filesystem root`) e a primeira rodada saiu com
`"status":"failed","failedTests":[]` — **exatamente a classe de falso-verde** que o
`.last-run.json` existe para pegar.

| # | Mutação | Arquivo:linha | Suíte rodada | Morto por | Resultado |
| --- | --- | --- | --- | --- | --- |
| M1 | Desembrulho genérico em laço (`while (atual.unwrap) …`) — a armadilha documentada do `ZodArray.unwrap()` | `src/lib/respostas/forma.ts:32-39` | `test:unit` (forma) | `forma.test.ts:118-122` — 18 testes, incluindo `classifica publicoPerfil como lista` | ✅ Morto (18 failed / 57 passed) |
| M2 | Não apaga as linhas antigas antes de inserir | `src/lib/respostas/repositorio.ts:218` | `test:integration` (56) | `repositorio.integration.test.ts:137` (merge raso), `:153` (lista encolhe), `:176` (regravação idêntica) — via `Unique constraint failed … _CD_Curso_Chave_Ordem_key` | ✅ Morto (3 failed) |
| M3 | Sobrescrita total em vez de merge raso (apaga todas as chaves do registro) | `src/lib/respostas/repositorio.ts:218` | `test:integration` (56) | `repositorio.integration.test.ts:137` — `faz merge raso: regravar uma chave não toca nas demais` | ✅ Morto (1 failed) |
| M4 | Ignora `ordem` ao remontar (`orderBy` → `ordem: "desc"`) | `src/lib/respostas/repositorio.ts:48` | `test:integration` (56) | `repositorio.integration.test.ts:114`, `:209`; `backfill.integration.test.ts:223`, `:268` | ✅ Morto (4 failed, 2 arquivos) |
| M5 | `respostasOuNulo` devolve `{}` em vez de `null` | `src/lib/respostas/repositorio.ts:179-181` | 9 specs e2e dos três formulários (83 testes) | — | ❌ **SOBREVIVEU** (`"status":"passed"`) → Lacuna 2 |
| M6 | Não apaga as condicionais órfãs no encerramento | `src/app/api/pre-cursos/[id]/encerrar/route.ts:83` | `e2e/pre-cursos-encerrar.spec.ts` | `e2e/pre-cursos-encerrar.spec.ts:205` — `condicionais órfãs (Q9.Qual e Q25.1/25.2/25.3) são descartadas no encerramento` | ✅ Morto (1 failed / 4 passed) |
| M7 | Remove o índice `Chave` do banco real de teste (`DROP INDEX`, recriado em seguida) | `TB_Resposta_Pre_Curso` (DDL no `spma_test`) | `agregacao.integration.test.ts` | `agregacao.integration.test.ts:172` — `a busca por chave em TB_Resposta_Pre_Curso passa pelo índice …` | ✅ Morto (1 failed / 6 passed) — **valida o SPEC_DEVIATION da T17** |
| M8 | Remove o `.min(1)` de uma seleção múltipla (`publicoPerfil`) | `src/lib/validation/schemas/pre-curso.schema.ts:244` | `e2e/pre-cursos-id.spec.ts` | `e2e/pre-cursos-id.spec.ts:137` — teste da RESP-20 | ✅ Morto (1 failed / 10 passed) |

**Sensor depth**: P0-full (8 mutações; feature de integridade de dados com migração destrutiva).
**Resultado**: **7/8 mortos, 1 sobrevivente** — ❌ FAIL.

**Isolamento verificado.** Índice recriado e conferido (`INDICE_PRESENTE=true`). Worktree
restaurado. `git status --porcelain` da árvore real, literal, após todo o sensor:

```
?? .specs/features/respostas-normalizadas/validation.md
```

Idêntico ao baseline capturado antes do sensor (a única entrada é este próprio relatório).

---

## Gate Check

- **Gate command** (Build, `tasks.md`): `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e`
- Cada etapa rodada **separadamente**, com o `$?` de cada uma gravado — nunca encadeada,
  nunca por pipe (a armadilha registrada três vezes no handoff desta feature).

| Etapa | Exit | Resultado |
| --- | --- | --- |
| `lint` | 0 | 0 erros |
| `build` | 0 | ok |
| `typecheck` | 0 | ok |
| `test:unit` | 0 | **580 passed** (26 arquivos), 0 failed, 0 skipped |
| `test:integration` | 0 | **56 passed** (9 arquivos), 0 failed, 0 skipped |
| `test:e2e` | 0 | **245 passed** (22.0 min), 0 failed, 0 skipped |

**A verdade do e2e não é a linha `N passed`** — é `test-results/.last-run.json`, conferido
diretamente (armadilha registrada três vezes no handoff desta feature):

```json
{ "status": "passed", "failedTests": [] }
```

Porta 3000 verificada **livre** antes de disparar (`netstat -ano | grep LISTENING | grep
:3000` sem saída) — sem `next dev` órfão para o Playwright adotar e "passar" sem rodar.
Servidor fresco do Playwright, `E2E_REUSE_SERVER` **não** setado. **Sem flake**: 245/245 na
primeira rodada, incluindo `pre-cursos-formulario.spec.ts` e `pos-cursos-formulario.spec.ts`,
os dois specs com intermitência conhecida — não foi preciso re-rodar arquivo nenhum.

**Testes pulados**: nenhum. `grep -rn "test.skip\|it.skip\|describe.skip\|test.fixme" e2e/ src/`
não retorna nada em toda a base — não há skip a justificar.

**Test Integrity Check**: contagens batem com as declaradas em `tasks.md` (580 / 56 / 244),
com a e2e agora em **245** — o `+1` é o teste da RESP-20 (`e2e/pre-cursos-id.spec.ts:137`),
acrescentado depois da T18 no commit que fechou a lacuna de rastreabilidade.
**Prova mecânica de "nenhuma asserção existente alterada"** (o critério de sucesso declarado
da story de não-regressão): de 36 arquivos em `e2e/`, `git diff --stat 6b28ae6..HEAD`
mostra **um único spec tocado** — `e2e/pre-cursos-id.spec.ts`, `+28/-0`, adição pura (o
teste da RESP-20) — mais `e2e/helpers/db.ts`, cuja mudança é só comentário de documentação.
Nenhum outro spec dos três formulários foi editado. Isso é exatamente o que o `design.md`
previa como critério de acerto do desenho.

Um teste foi **aposentado** na T15 (`"mantém a coluna JSON em sincronia com as linhas"`,
integração 49 → 48): justificado — ele afirmava literalmente o espelho transitório que a T15
remove, e o próprio comentário do teste, escrito na T3, já previa a remoção. **Não** é
enfraquecimento de asserção. Nenhuma asserção pré-existente foi alterada ou afrouxada em toda
a feature, que é o critério de sucesso declarado da story de não-regressão.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ — domínio, schemas Zod, guardas e componentes React literalmente intocados |
| Sem scope creep | ✅ — o único desvio (T16) era necessário para não deixar a API quebrada |
| Segue os padrões do projeto | ✅ — `$transaction` no padrão de `src/app/api/usuarios/route.ts`; camada visual não tocada (AD-039 não se aplica: nenhuma cor/token) |
| Asserção casa com o resultado definido pela spec | ⚠️ — 18/21; 3 ressalvas documentadas acima |
| Coverage Expectation por camada | ⚠️ — domínio e dados 1:1; rotas com happy+edge+erro. Falta a asserção de contrato `null` (Lacuna 2) e a de constraint (Lacuna 4) |
| Todo teste mapeia para uma AC (sem teste órfão) | ✅ — os 4 arquivos novos citam RESP-xx em comentário, verificado um a um |
| Guidelines documentadas seguidas | ✅ — `AGENTS.md` (convenções), `vitest*.config.ts`, `playwright.config.ts`. Sem threshold de cobertura documentado → default forte aplicado |

Ponto de qualidade acima da média que merece registro: `backfill.integration.test.ts:43-61`
lê e executa **o arquivo de migration real** em vez de reimplementar o SQL, e
`:105-113` restaura o schema ao estado que **encontrou** (não ao "que deveria ser") — com o
motivo do P3009 documentado no comentário. É o tipo de teste que não mente.

---

## Requirement Traceability Update

| Requirement | Status anterior | Novo status |
| --- | --- | --- |
| RESP-01, 02, 03, 04, 06, 07, 08, 09, 10, 11, 13, 15, 16, 17, 18, 19, 20 | Done | ✅ Verified |
| RESP-12 | Done (por invariância) | ✅ Verified — **corrigir a evidência citada** (e2e de 403 + `where` imutável, não só `guards.ts`) |
| RESP-05 | Done (T2) | ⚠️ Verified sem teste dedicado — Lacuna 4 |
| RESP-14 | Done (T4) | ⚠️ Needs Fix — Lacuna 1 (órfã de múltipla escolha truncada na leitura) |
| RESP-21 | Done (T3) | ⚠️ Verified pela metade — Lacuna 3 (concorrência sem teste) |
| Contrato HTTP `respostas = null` | (implícito em RESP-07..12) | ❌ Needs Fix — Lacuna 2 (mutante M5 sobreviveu) |

---

## Summary

**Overall**: ⚠️ **Não fechar ainda** — a implementação está sólida, a rede de teste tem
buracos nomeados.

**Spec-anchored check**: 18/21 ACs casam com o resultado definido pela spec; 3 com ressalva.
**Sensor**: 8 mutações, 7 mortas, 1 sobrevivente.
**Gate**: ✅ tudo verde — lint 0, build 0, typecheck 0, unit **580/580**,
integration **56/56**, e2e **245/245** (`.last-run.json` = `passed`, sem flake).

**O que funciona (e funciona bem)**: o merge raso por chave, a preservação de `ordem` na
seleção múltipla, o descarte de condicional órfã no encerramento dentro da transação, o
backfill executando o SQL real do artefato de produção, a agregação em SQL puro com índice,
e a não-regressão de 401/403/409/400 nos três formulários. A armadilha do `ZodArray.unwrap()`
foi documentada **e** coberta por asserção nominal — o mutante M1 morreu em 18 testes.

**Issues encontradas**: as 5 lacunas acima, em ordem de severidade. Duas Major
(truncamento de órfã de múltipla escolha; mutante sobrevivente no contrato `null`), duas
Minor, uma Cosmetic.

**Next steps**: rotear as Lacunas 1 e 2 como fix tasks para um implementador (não para o
Verifier — author ≠ verifier), depois re-verificar. As Lacunas 3–5 podem entrar no mesmo
lote por serem baratas.

---

## Lições destiladas

Cinco lições gravadas por `lessons.py`, todas com signal fundamentado nesta verificação:
**L-032** (`surviving_mutant`, M5), **L-033** (`ac_gap`, RESP-14), **L-034** (`ac_gap`,
RESP-21), **L-035** (`spec_precision_gap`, RESP-12), **L-036** (`spec_deviation`, T17).

**Duas observações para o mantenedor, não gravadas como lição** (são sobre o processo, e a
`lessons.md` manda não registrar opinião de metodologia):

1. **L-034 é duplicata literal da L-014, já `confirmed`, e não foi mesclada.** Usei o texto
   da L-014 caractere a caractere justamente para que a recorrência somasse; o script criou
   candidata nova. A dedup parece operar só entre candidatas, não contra uma lição já
   confirmada. Efeito prático: a L-014 recorreu numa **terceira** feature distinta
   (`cadastro-ofertante-verba`, `avaliacao-aluno`, e agora esta) e esse sinal está
   contabilizado no lugar errado.
2. **Não apliquei `penalize` na L-014**, embora a regra de demotion descreva exatamente este
   caso (lição confirmada + mesma falha recorrendo). O gatilho exige que a lição tenha sido
   **carregada** no Specify/Design desta feature, e não achei nenhum registro disso em
   `context.md`, `design.md` ou `tasks.md`. Penalizar sem essa evidência seria punir uma
   guidance que talvez nunca tenha sido lida. Decisão do orquestrador.
