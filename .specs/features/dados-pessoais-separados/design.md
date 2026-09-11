# Dados Pessoais Separados Design

**Spec**: `.specs/features/dados-pessoais-separados/spec.md` (27 requisitos, `validate_spec.py` = 0)
**Contexto e decisões do agente**: `.specs/features/dados-pessoais-separados/context.md`

> Este arquivo substitui integralmente a versão anterior (marcada ⛔ DESATUALIZADA
> no histórico do git). A versão anterior descrevia uma partição de
> persistência só de leitura/escrita, chave `(CPF, curso)`, sem tela nova e sem
> mudar o questionário do curso. Dois pedidos posteriores do usuário (P2, P3 em
> `context.md`) mudaram o modelo de dados, a superfície de UI e o resultado da
> migração. Este documento reflete só o estado atual.

---

## A ideia central

Hoje as 7 perguntas de dados pessoais do Aluno (`avalPessoal*`, Q3–Q9) vivem
dentro do questionário de Avaliação do Curso, chave composta `(CPF, curso)`.
Elas saem de lá por completo e passam a:

1. viver em tabela própria, `TB_Dado_Pessoal_Aluno`, chaveada só por CPF —
   forma `(pai, Chave, Ordem, Valor)`, igual à AD-041;
2. ser coletadas uma vez, obrigatoriamente, antes de qualquer outra tela —
   gate de navegação no mesmo padrão de `requirePrimeiroAcessoConcluido`;
3. ser editáveis depois pelo próprio Aluno, numa tela de perfil.

O questionário do curso perde essas 7 perguntas: a Parte 1 cai de 19 para 12.
Nenhum outro perfil é afetado — o gate, a tela nova e a tela de perfil só
existem para `AL`.

---

## Componentes

### 1. `CHAVES_DADOS_PESSOAIS` — a fronteira declarada uma vez (PESSOAL-10)

**Novo arquivo**: `src/lib/validation/schemas/dados-pessoais.schema.ts`.

Recebe, migrados de `avaliacao.schema.ts`, os 7 campos e as 5 constantes de
opção que só eles usam (`OPCOES_GENERO`, `OPCOES_FAIXA_ETARIA`,
`OPCOES_ESCOLARIDADE`, `OPCOES_RACA_ETNIA`, `OPCOES_CONDICAO_PCD`).
`OPCOES_UF` continua importada de `pre-curso.schema.ts` (já é a fonte
compartilhada; `avaliacao.schema.ts` só a reexportava para este uso, que deixa
de existir lá).

```ts
export const respostasDadosPessoaisSchema = z.object({
  avalPessoalEstado: z.enum(OPCOES_UF).optional(),
  avalPessoalMunicipio: z.string().min(1).optional(),
  avalPessoalGenero: z.enum(OPCOES_GENERO).optional(),
  avalPessoalFaixaEtaria: z.enum(OPCOES_FAIXA_ETARIA).optional(),
  avalPessoalEscolaridade: z.enum(OPCOES_ESCOLARIDADE).optional(),
  avalPessoalRacaEtnia: z.enum(OPCOES_RACA_ETNIA).optional(),
  avalPessoalCondicaoPcd: z.enum(OPCOES_CONDICAO_PCD).optional(),
});
export type RespostasDadosPessoais = z.infer<typeof respostasDadosPessoaisSchema>;

export const CHAVES_DADOS_PESSOAIS = [
  "avalPessoalEstado",
  "avalPessoalMunicipio",
  "avalPessoalGenero",
  "avalPessoalFaixaEtaria",
  "avalPessoalEscolaridade",
  "avalPessoalRacaEtnia",
  "avalPessoalCondicaoPcd",
] as const satisfies readonly (keyof RespostasDadosPessoais)[];
```

As chaves em si **não mudam de nome** (seguem `avalPessoal*`): é o mesmo dado,
só muda de tabela. Renomear seria custo sem benefício e quebraria o rastro
para quem olhar a migration depois. **A lista é explícita, com `satisfies`,
nunca derivada do prefixo** — mesma razão da AD-041/`CHAVES_PARTE_1`: um campo
novo batizado com o mesmo prefixo não deve mudar de tabela sem alguém decidir.

Todos os 7 campos são escalares (nenhum é lista) — diferente de
`CHAVES_PARTE_1`, que tem 2 campos de seleção múltipla. Isso é relevante para
o edge case PESSOAL-25 (ver "O que é satisfeito por reuso" abaixo).

### 2. `validarCompletudeDadosPessoais` — completude sem gate condicional

**Novo arquivo**: `src/lib/dados-pessoais/completude.ts`.

Diferente de `completude.ts` da Avaliação, os 7 campos não têm nenhuma
condicional entre si (Q9 não abre um "Qual?" — é a própria pergunta que já
pede o tipo de deficiência). A função é só
`respostasDadosPessoaisSchema.required().safeParse(respostas)`, convertida em
`{ completo, pendentes }` pelo mesmo padrão de `issuesParaPendentes`. Pequena o
bastante para não justificar importar o tipo `ResultadoCompletude` do módulo
de Avaliação — os dois domínios não devem ficar acoplados por um tipo de 2
campos; a interface é redeclarada aqui.

### 3. `TB_Dado_Pessoal_Aluno` e `Usuario.dadosPessoaisCompletos`

```prisma
model DadoPessoalAluno {
  id      Int     @id @default(autoincrement()) @map("ID_Dado")
  cpf     String  @map("CPF") @db.VarChar(11)
  usuario Usuario @relation(fields: [cpf], references: [cpf], onDelete: Cascade)

  chave   String  @map("Chave") @db.VarChar(100)
  ordem   Int     @default(0) @map("Ordem")
  valor   String  @map("Valor") @db.Text

  @@unique([cpf, chave, ordem])   // PESSOAL-08
  @@index([chave])
  @@map("TB_Dado_Pessoal_Aluno")
}
```

Idêntica à forma de `RespostaAvaliacao`, só trocando a chave-pai composta
`(cpf, cdCurso)` por `cpf` sozinho — é exatamente a "mesma forma da AD-041"
que D3/`context.md` pede. `onDelete: Cascade` na FK para `Usuario` satisfaz
PESSOAL-09 (remover Aluno remove os dados pessoais, sem órfão) sem código
novo: é constraint física, não lógica de aplicação.

Em `Usuario`, um campo novo:

```prisma
dadosPessoaisCompletos Boolean @default(false) @map("Dados_Pessoais_Completos")
dadosPessoais          DadoPessoalAluno[]
```

Mesmo padrão de `primeiraVez`: flag persistida, não recomputada a cada
navegação. Diferente de `AvaliacaoAluno.parte1Completa` (que pode oscilar para
`false` de novo a cada PATCH), aqui a flag só é escrita como `true` — o
desenho do PATCH (item 6) garante que nunca persiste um estado incompleto, e
`@default(false)` cobre tanto o Aluno novo quanto, ao adicionar a coluna, todo
Aluno que já existe hoje (PESSOAL-06): `ALTER TABLE ... ADD COLUMN ... DEFAULT
false` aplica o default a toda linha existente, sem `UPDATE` manual.

### 4. Repositório: um branch novo, não uma tabela paralela ao padrão

`src/lib/respostas/repositorio.ts` ganha uma 4ª variante de `AlvoRespostas`:

```ts
export type AlvoRespostas =
  | { formulario: "preCurso"; cdCurso: number }
  | { formulario: "posCurso"; cdCurso: number }
  | { formulario: "avaliacao"; cpf: string; cdCurso: number }
  | { formulario: "dadosPessoais"; cpf: string };
```

O despacho hoje é `if/else` sequencial em 4 funções privadas
(`filtroDoPai`, `buscarLinhas`, `apagarLinhas`, `inserirLinhas`) — não há
tabela de dispatch dinâmica. Cada uma ganha um branch a mais, usando
`tx.dadoPessoalAluno` e filtrando só por `cpf` (sem `cdCurso`). `SCHEMAS`
ganha `dadosPessoais: respostasDadosPessoaisSchema`.

`montarRespostas`, `lerRespostas`, `lerRespostasParaApi`, `respostasOuNulo`,
`gravarRespostas`, `apagarRespostas` — a API pública inteira — **não muda**:
já é genérica sobre `AlvoRespostas["formulario"]`. É o mesmo raio de
destruição contido que a AD-041 e o `context.md` (D3) descrevem.

**O que é satisfeito por reuso, sem teste dedicado (PESSOAL-25):**
`gravarRespostas` apaga todas as linhas das chaves do patch e insere as novas
— é assim que uma lista que encolhe perde as opções que saíram. Esse
mecanismo já é comportamento comprovado de `repositorio.integration.test.ts`
para chaves de lista de outros formulários. Nenhum dos 7 campos de dado
pessoal é lista, então o cenário não tem chave própria para exercitar aqui —
está coberto pela mesma função, não por uma cópia do teste.

### 5. Questionário do curso encolhe (PESSOAL-11 a 15)

- **`avaliacao.schema.ts`**: remove os 7 campos `avalPessoal*` e as 5
  constantes de opção que migraram (item 1). `CHAVES_PARTE_1` perde as 7
  chaves, ficando com as 12 que sobram (Situação Profissional +
  Experiência + Motivação + Expectativas — exatamente a Tabela do
  `context.md`, linha "Socioeconômico"/"Motivação").
- **`src/lib/avaliacao/completude.ts`**: `parte1SchemaBase.pick({...})` perde
  as 7 chaves pessoais (linhas 24-30 hoje). As 2 condicionais
  (`avalProfissAtividadeEspecifica`, `avalExperienciaTipoCursoAnterior`) não
  mudam de tratamento — continuam fora do pick, resolvidas por
  `condicionais.ts`, que não referencia nenhuma chave pessoal (confirmado —
  nenhuma mudança lá).
- **`AvaliacaoForm.tsx`**: remove o objeto `{ titulo: "Dados Pessoais", ... }`
  de `BLOCOS_PARTE_1` (hoje o primeiro item do array) e os 6 imports de opção
  que só ele usava (`OPCOES_CONDICAO_PCD`, `OPCOES_ESCOLARIDADE`,
  `OPCOES_FAIXA_ETARIA`, `OPCOES_GENERO`, `OPCOES_RACA_ETNIA`, `OPCOES_UF`).
  **Consequência que o Verifier precisa julgar**: os `data-testid` dos blocos
  seguintes (`bloco-parte1-2`, `bloco-parte1-3`, ...) deslocam um índice para
  trás, porque são gerados por posição no array
  (`BLOCOS_PARTE_1.map((bloco, indice) => ...)`).
- **Rota `PATCH /api/avaliacoes/[cpf]/[cdCurso]`**: ganha uma checagem
  explícita, no mesmo estilo de `temChaveDeParte2` que já existe ali —
  antes do `safeParse` (que hoje simplesmente ignoraria chave desconhecida em
  silêncio, já que `z.object()` descarta chave fora do schema por padrão, sem
  erro):

  ```ts
  const chavesPessoaisEnviadas = Object.keys(corpo ?? {}).filter((chave) =>
    (CHAVES_DADOS_PESSOAIS as readonly string[]).includes(chave),
  );
  if (chavesPessoaisEnviadas.length > 0) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }
  ```

  Sem essa checagem explícita, PESSOAL-13 falharia silenciosamente: o Zod não
  erra em chave desconhecida, só a descarta — o PATCH devolveria 200 e
  ignoraria o campo, não 400.

### 6. Migração dos dados já gravados — descarte, não movimento (PESSOAL-21 a 24)

Duas migrations SQL, mesmo motivo da AD-041 (`start:prod` roda só `prisma
migrate deploy && next start`, sem passo manual entre migrations):

| Migration | O quê |
| --- | --- |
| `..._criar_tabela_dado_pessoal_aluno` | `ALTER TABLE TB_Usuario ADD COLUMN Dados_Pessoais_Completos BOOLEAN NOT NULL DEFAULT false`; `CREATE TABLE TB_Dado_Pessoal_Aluno` (forma do item 3); FK para `TB_Usuario` |
| `..._descartar_dados_pessoais_do_questionario` | `DELETE FROM TB_Resposta_Avaliacao WHERE Chave IN (as 7 chaves, literais)` |

Diferente da AD-041 (que tinha um `INSERT ... SELECT` complexo com
`JSON_TABLE`), aqui não há nada para mover: as respostas já são linhas
(pós-AD-041), então o descarte é um `DELETE` simples por `Chave`. A decisão de
descartar em vez de mover já está tomada (`context.md`, P3) — o usuário
autorizou reiniciar os Alunos, e mover exigiria decidir "qual curso vence"
quando o mesmo Aluno respondeu em dois.

A lista de 7 chaves aparece literal no SQL — duplicação deliberada, mesma
razão da versão anterior deste documento: a migration é registro histórico
imutável, não deve mudar de comportamento se a constante TypeScript for
editada depois.

**Risco aceito, registrado**: chave pessoal órfã (de um formulário anterior às
7 atuais, se algum dia existiu com nome diferente) não seria coberta pelo
`WHERE Chave IN (...)` literal. Não há evidência de que isso exista (as 7
chaves são estáveis desde a criação do questionário do Aluno). Se existisse,
ficaria para trás em `TB_Resposta_Avaliacao` sem erro — aceito como limite,
não como bug, mesmo padrão de risco que a versão anterior deste documento já
registrava.

### 7. Gate de navegação (PESSOAL-01 a 06)

**Novo guard**, `src/lib/auth/guards.ts`, mesmo padrão de
`requirePrimeiroAcessoConcluido`/`requireOfertanteVinculado` (síncrono, recebe
só os campos que precisa, `redirect()`):

```ts
export function requireDadosPessoaisCompletos(usuario: {
  tipo: TipoUsuario;
  dadosPessoaisCompletos: boolean;
}): void {
  if (usuario.tipo === "AL" && !usuario.dadosPessoaisCompletos) {
    redirect("/dados-pessoais");
  }
}
```

Encadeado em `src/app/(protegido)/layout.tsx`, depois de
`requireOfertanteVinculado` (a ordem entre os dois não importa — são
perfis mutuamente exclusivos, `GO` vs `AL` — mas segue a ordem que o guard foi
adicionado, por consistência de leitura):

```ts
const { usuario } = await requireSession();
requirePrimeiroAcessoConcluido(usuario);
requireOfertanteVinculado(usuario);
requireDadosPessoaisCompletos(usuario);
```

**SPEC_DEVIATION, para o Verifier julgar.** `spec.md` (PESSOAL-01, PESSOAL-02)
e `context.md` (P2) descrevem a tela como "a tela principal (`/painel`)":
o texto de PESSOAL-02 diz literalmente "redirecionando para a tela
principal". A implementação usa uma rota própria, `/dados-pessoais`, e não
`/painel` em si.

Motivo: `/painel` já vive dentro do grupo `(protegido)`, e
`requireDadosPessoaisCompletos` roda no layout desse grupo — que envolve
`/painel` também. Se o alvo do redirect fosse `/painel`, visitar `/painel`
disparava o próprio guard de novo, e o resultado é um 307 em loop para si
mesmo. **Este é exatamente o mesmo obstáculo, documentado com a mesma causa
técnica (Server Components não expõem o pathname da requisição ao layout),
que já tirou `/primeiro-acesso` e `/cadastro-ofertante` de `(protegido)` — ver
o comentário em `src/app/(protegido)/layout.tsx`, linhas 8-21, confirmado
empiricamente por curl naquela feature.** A mesma solução se aplica aqui:
`/dados-pessoais` vive em `src/app/(onboarding)/`, grupo irmão guardado só
por `requireSession()`, ao lado de `/primeiro-acesso` e `/cadastro-ofertante`.

O efeito para o Aluno é o mesmo que o texto da spec pede: a primeira coisa que
ele vê depois de logar/criar senha, obrigatória, bloqueando todo o resto — só
que por uma URL própria, pela mesma razão de engenharia que já valeu para
`/cadastro-ofertante` (que também não é literalmente "a tela principal", e
ninguém reabriu essa decisão desde então).

### 8. Rota de gravação — `PATCH /api/usuarios/me/dados-pessoais`

Primeira rota do projeto em `/api/usuarios/me/*`: opera sempre sobre o CPF da
própria sessão, nunca recebe CPF na URL nem no corpo. Isso satisfaz
PESSOAL-19 ("recusar com 403 qualquer tentativa sobre outro CPF") **por
construção**: não existe parâmetro para apontar outro CPF. `podeGerenciarAvaliacao`
resolveu o mesmo problema com um guard explícito porque a URL da avaliação
carrega `[cpf]`; aqui não há URL de terceiro para restringir.

Sem rota GET dedicada: as duas telas que leem o dado atual
(`/dados-pessoais` e `/meus-dados`) são Server Components que chamam
`lerRespostas(prisma, alvo)` direto, mesmo padrão de
`avaliacoes/[cpf]/[cdCurso]/page.tsx` (linha 47). Uma rota GET só para
espelhar isso via HTTP não teria consumidor.

Ordem RH→CSRF→Sessão→Guard→Zod→Transação, igual a toda rota mutante do
projeto:

```ts
async function gravarDadosPessoais(request: Request) {
  if (!(await verificarCSRF(request))) return 403;

  const sessao = await obterSessao();
  if (!sessao) return 401;

  if (sessao.usuario.tipo !== "AL") return 403; // PESSOAL-20 no backend

  const corpo = await request.json().catch(() => null);
  const entrada = respostasDadosPessoaisSchema.safeParse(corpo);
  if (!entrada.success) return 400; // PESSOAL-05/18 (campo inválido)

  const alvo = { formulario: "dadosPessoais" as const, cpf: sessao.usuario.cpf };
  const atuais = await lerRespostas(prisma, alvo);
  const mescladas = { ...atuais, ...entrada.data };

  const { completo } = validarCompletudeDadosPessoais(mescladas);
  if (!completo) return 400; // PESSOAL-05/18 (campo faltando)

  const { respostas } = await prisma.$transaction(async (tx) => {
    await gravarRespostas(tx, alvo, entrada.data);
    await tx.usuario.update({
      where: { cpf: sessao.usuario.cpf },
      data: { dadosPessoaisCompletos: true },
    });
    return { respostas: await lerRespostasParaApi(tx, alvo) };
  }, ISOLAMENTO_RESPOSTAS);

  return NextResponse.json({ respostas });
}
```

**Decisão de desenho: tudo-ou-nada, deliberadamente diferente do merge raso
de `AVAL-07`.** A rota de Avaliação aceita qualquer PATCH parcial e persiste o
que veio, mesmo incompleto — a Parte 1 pode ficar incompleta por várias
gravações, só a Parte 2 é bloqueada enquanto isso. Aqui **o PATCH só persiste
quando o estado RESULTANTE (mesclado) tem os 7 campos válidos** — senão nada é
gravado, nem os campos que vieram válidos no mesmo corpo. É o que PESSOAL-05 e
PESSOAL-18 pedem literalmente ("não persistir nenhuma linha" /
"não persistir nada, mantendo o Aluno com o cadastro completo"), e é o que
permite ao mesmo endpoint servir dois casos diferentes sem bifurcar:

- **Primeira gravação** (`/dados-pessoais`, tela nova): estado anterior vazio
  — só passa se o Aluno mandar os 7 de uma vez.
- **Edição** (`/meus-dados`, perfil): estado anterior já completo — um PATCH
  de 1 campo mescla com os outros 6 já salvos, o resultado continua completo,
  passa. Se o valor enviado for inválido (`z.enum` rejeita, `z.string().min(1)`
  rejeita vazio), já falha no `safeParse`, antes mesmo de chegar à checagem de
  completude — cobre o "deixa vazia ou inválida" de PESSOAL-18 sem regra
  própria.

Como o gate só deixa persistir estado completo, a flag `dadosPessoaisCompletos`
nunca precisa ser escrita como `false` depois de `true` — diferente de
`parte1Completa`, que pode oscilar.

### 9. Telas

**`src/components/dados-pessoais/DadosPessoaisForm.tsx`** — Client Component
compartilhado pelas duas telas (mesmo padríncipio de reuso de
`AvaliacaoForm`/`PreCursoForm`, mas aqui compartilhado entre DUAS rotas
diferentes, por isso mora em `src/components/`, não colocado junto de um
`page.tsx` só). Renderização direta dos 7 campos (select/radio/texto) sem a
máquina de `BLOCOS_PARTE_1`/`renderCampo` da Avaliação — 7 campos fixos não
justificam metadado genérico. Props: `respostasIniciais`, `aoConcluir:
() => void`. Faz o PATCH, trata 400 exibindo a mensagem, chama `aoConcluir()`
em caso de sucesso.

**`src/app/(onboarding)/dados-pessoais/page.tsx`** — Server Component,
`requireSession()` só (herdado do layout do grupo), sem fetch prévio (o
estado é sempre vazio aqui: o tudo-ou-nada do item 8 garante que nunca existe
gravação parcial). Renderiza `DadosPessoaisForm` com `respostasIniciais={{}}`
e `aoConcluir` fazendo `router.push("/painel")`.

**`src/app/(protegido)/meus-dados/page.tsx`** — Server Component. `notFound()`
se `usuario.tipo !== "AL"` (PESSOAL-20 reforçado no backend da tela, mesmo
padrão de `avaliacoes/[cpf]/[cdCurso]/page.tsx`). Busca
`lerRespostas(prisma, { formulario: "dadosPessoais", cpf: usuario.cpf })` e
passa para `DadosPessoaisForm` como `respostasIniciais`; `aoConcluir` fica
na própria tela (mensagem de sucesso, sem navegação).

**`src/lib/ui/navegacao.ts`** — novo `ItemNavegacao`:
`{ rotulo: "Meus dados", href: "/meus-dados" }`, adicionado ao array de
`TipoUsuario.AL` (hoje só `MINHA_AVALIACAO`). Convenção de UI, não
autorização (AD-039) — o backend do item acima já recusa por `notFound()`
independente do menu.

---

## O que NÃO muda

- `src/lib/respostas/forma.ts` — classificação/serialização não sabe nem
  precisa saber como o pai é identificado.
- API pública de `repositorio.ts` (`montarRespostas`, `lerRespostas`,
  `lerRespostasParaApi`, `respostasOuNulo`, `gravarRespostas`,
  `apagarRespostas`).
- `condicionais.ts` — nenhuma chave pessoal aparece em nenhuma regra
  condicional da Avaliação.
- Rotas de Pré-Curso e Pós-Curso — formulário alheio a esta feature.
- Contrato HTTP da Avaliação, exceto pelo desaparecimento natural das 7
  chaves de `respostas` (elas simplesmente não existem mais nesse
  formulário) e a nova rejeição 400 se alguém insistir em enviá-las.

## O que muda e por quê os testes existentes mudam (para o Verifier julgar)

Confirmado por busca no repositório: `avalPessoal*` aparece em
`e2e/avaliacoes-formulario.spec.ts`, `e2e/avaliacoes-id.spec.ts`,
`e2e/avaliacoes-encerrar.spec.ts` (preenchimento das 7 perguntas dentro do
fluxo do curso) e em `src/lib/validation/schemas/avaliacao.schema.test.ts`,
`src/lib/avaliacao/completude.test.ts`, `src/lib/avaliacao/condicionais.test.ts`,
`src/lib/respostas/repositorio.integration.test.ts`,
`src/lib/respostas/backfill.integration.test.ts`. Cada um desses precisa
parar de preencher/afirmar essas 7 chaves como parte da Avaliação — não é
afrouxamento de teste, é a mudança de propósito que a spec pede (as 7
perguntas não pertencem mais a esse formulário). Testes novos cobrem o mesmo
comportamento no lugar novo (gate, rota, telas).

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| Chave pessoal órfã fora da lista de 7 atuais não é descartada pela migration | Aceito e documentado (item 6) — nenhuma evidência de que exista; o `WHERE Chave IN (...)` literal é histórico imutável. |
| `/dados-pessoais` não é literalmente "a tela principal" do texto da spec | SPEC_DEVIATION documentado no item 7, mesma causa técnica e mesma solução já usada por `/cadastro-ofertante`. |
| PESSOAL-25 (lista que encolhe) sem chave própria para testar | Satisfeito por reuso do mecanismo já testado em `repositorio.integration.test.ts` para outros formulários — nenhum dos 7 campos é lista (item 4). |
| `Object.keys(corpo)` em `chavesPessoaisEnviadas` recebe `corpo` não-objeto (`null`, array, string) | `corpo ?? {}` cobre `null`; `request.json()` que devolve array/string já falha no `safeParse` normal antes de importar — a checagem de chave pessoal roda só depois de confirmar que `corpo` é um objeto (mesma ordem que `temChaveDeParte2` já usa hoje). |

## Test Coverage Matrix

Mesma matriz herdada de `respostas-normalizadas`/`avaliacao-aluno` — nada
mudou em `AGENTS.md`, Vitest ou Playwright.

| Code Layer | Required Test Type | Location Pattern | Run Command |
| --- | --- | --- | --- |
| Domínio (`src/lib/**`, exceto acesso a dados) | unit | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Acesso a dados (`repositorio.ts`) | integration | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Migration com dados | integration | `src/**/*.integration.test.ts` | `npm run test:integration` |
| Rotas API e telas | e2e | `e2e/*.spec.ts` | `npm run test:e2e` |
| Schema Prisma / migration estrutural | none | - | build gate only |

## Gate Check Commands

Mesma política herdada de `respostas-normalizadas`: e2e roda em ~6min
paralelizada, sem razão para gate reduzido por tarefa.

| Gate Level | Command |
| --- | --- |
| Quick | `npm run test:unit` |
| Full | `npm run test:unit && npm run test:integration && npm run test:e2e` |
| Build | `npm run lint && npm run build && npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e` |

**Conferir sempre `test-results/.last-run.json`** (`status` + `failedTests`),
nunca a linha `N passed` nem o exit code de um pipe/encadeamento. Checar
`netstat -ano | grep LISTENING | grep :3000` antes de rodar e2e.
