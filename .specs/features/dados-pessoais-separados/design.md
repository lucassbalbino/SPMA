# Dados Pessoais Separados Design

**Spec**: `.specs/features/dados-pessoais-separados/spec.md`
**Contexto e decisões do agente**: `.specs/features/dados-pessoais-separados/context.md`

---

## A ideia central

A fronteira é **física no banco e invisível acima dele**. Uma tabela nova,
`TB_Dado_Pessoal_Aluno`, recebe as 7 chaves da seção DADOS PESSOAIS do
questionário (Q3–Q9); `TB_Resposta_Avaliacao` fica com todo o resto. Acima da borda de persistência, nada muda:
`lerRespostas` continua devolvendo UM objeto `{ chave: valor }` com as duas
metades unidas, e `gravarRespostas` continua aceitando UM patch e decide
sozinho onde cada chave mora.

É o mesmo movimento que conteve o raio de destruição na AD-041. Completude,
condicionais, gate da Parte 2, rotas, formulário React e todas as asserções de
teste seguem vendo exatamente o que sempre viram.

**Consequência prática do desenho:** nenhuma rota muda. A partição vive em
`repositorio.ts`, e as seis rotas que gravam respostas não sabem que existem
duas tabelas.

---

## Componentes

### 1. `CHAVES_PESSOAIS` — a fronteira declarada uma vez (PESSOAL-06)

**Onde**: `src/lib/validation/schemas/avaliacao.schema.ts`, ao lado de
`CHAVES_PARTE_1`, com o mesmo padrão
`as const satisfies readonly (keyof RespostasAvaliacao)[]`.

Esse `satisfies` é o que impede a lista de apodrecer: renomear ou remover uma
chave do schema quebra a compilação aqui, em vez de silenciosamente deixar de
particionar. A mesma proteção que `CHAVES_PARTE_1` já tem.

As 7 chaves são exatamente os `avalPessoal*` — Q3 a Q9 do questionário, a
seção que o cliente chamou de DADOS PESSOAIS: estado, município, gênero, faixa
etária, escolaridade, cor/raça/etnia e condição PCD.

**A lista é explícita, não derivada do prefixo.** Casar por `startsWith
("avalPessoal")` seria mais curto e frágil: amarraria a fronteira de
persistência a uma convenção de nome, e uma chave nova batizada com o prefixo
mudaria de tabela sem ninguém decidir. A lista obriga a decisão a ser
explícita; o `satisfies` garante que ela não referencie chave inexistente.

Situação profissional e experiência (Q10–Q16) e motivação/expectativa
(Q17–Q21) **não** entram (D1 em `context.md`).

**Relação com `CHAVES_PARTE_1`:** as duas listas se cruzam mas não coincidem —
`CHAVES_PESSOAIS` é subconjunto próprio de `CHAVES_PARTE_1` (7 de 19). São
conceitos diferentes e devem permanecer listas diferentes: `CHAVES_PARTE_1`
define um **gate de preenchimento** (AD-023), `CHAVES_PESSOAIS` define **onde o
dado mora**. Derivar uma da outra acoplaria decisões que mudam por razões
distintas.

### 2. `TB_Dado_Pessoal_Aluno` — mesma forma da AD-041

```prisma
model DadoPessoalAluno {
  id        Int            @id @default(autoincrement()) @map("ID_Dado")
  cpf       String         @map("CPF") @db.VarChar(11)
  cdCurso   Int            @map("CD_Curso")
  avaliacao AvaliacaoAluno @relation(fields: [cpf, cdCurso], references: [cpf, cdCurso], onDelete: Cascade)

  chave     String         @map("Chave") @db.VarChar(100)
  ordem     Int            @default(0) @map("Ordem")
  valor     String         @map("Valor") @db.Text

  @@unique([cpf, cdCurso, chave, ordem])   // PESSOAL-04
  @@index([chave])
  @@map("TB_Dado_Pessoal_Aluno")
}
```

Idêntica a `RespostaAvaliacao`, de propósito: reusa `forma.ts` inteiro
(classificação de tipo pelo schema Zod, serialização, remontagem) e o índice em
`Chave` mantém a agregação por pergunta viável também do lado pessoal.

### 3. Partição no repositório

Três funções de `repositorio.ts` ganham um ramo para o formulário `avaliacao`:

| Função | Hoje | Depois |
| --- | --- | --- |
| `buscarLinhas` | uma query | duas queries (as duas tabelas), concatenadas |
| `apagarLinhas` | um `deleteMany` | particiona as chaves e apaga em cada tabela |
| `inserirLinhas` | um `createMany` | particiona as linhas e insere em cada tabela |

A partição é uma função pura, testável isolada:

```ts
function ehChavePessoal(chave: string): boolean
function particionar<T extends { chave: string }>(itens: T[]): { pessoais: T[]; curso: T[] }
```

`gravarRespostas` não muda de forma: continua apagando as chaves do patch e
inserindo as novas, só que agora cada metade na sua tabela — e tudo dentro da
mesma transação que já existe, com `ISOLAMENTO_RESPOSTAS` (READ COMMITTED), o
que satisfaz PESSOAL-19 sem código novo.

`montarRespostas` não muda: recebe as linhas já concatenadas e remonta o objeto
único. A ordenação por `(chave, ordem)` passa a ser feita em memória após
concatenar, porque vem de duas queries.

### 4. Migração em dois passos

| Migration | O quê |
| --- | --- |
| `..._criar_tabela_dado_pessoal` | cria `TB_Dado_Pessoal_Aluno` |
| `..._mover_dados_pessoais` | `INSERT ... SELECT` das linhas pessoais + `DELETE` delas de `TB_Resposta_Avaliacao` |

SQL, não script TS, pela mesma razão da AD-041: `start:prod` roda
`prisma migrate deploy && next start`, então um passo manual entre as duas
migrations seria fácil de esquecer — e esquecê-lo deixaria o dado pessoal do
lado errado da fronteira, com o código já lendo do lado novo.

A lista de chaves aparece literal no SQL da migration. **Isso é duplicação
deliberada**: a migration é um registro histórico imutável do que foi movido
naquele momento, e não pode mudar de comportamento quando alguém editar a lista
no TypeScript depois. Um comentário no SQL e outro na constante registram a
relação nos dois sentidos.

Diferente da AD-041, aqui não há fase de espelho: as linhas **mudam de lugar**,
não ganham uma segunda representação. A migration roda antes de o app subir, no
mesmo processo, então não existe janela em que o código novo veja o dado velho.

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| A lista no SQL da migration diverge da lista no TypeScript | Aceito e documentado: a migration é histórico imutável. O teste de migração afirma a contagem exata movida, então divergência aparece como falha, não como silêncio. |
| Chave pessoal órfã (fora do schema atual) fica sem migrar | O `WHERE Chave IN (...)` da migration usa a lista literal, que inclui as chaves conhecidas hoje. Órfã pessoal de questionário antigo permaneceria em `TB_Resposta_Avaliacao`. **Aceito**: nenhuma chave pessoal foi removida do schema até hoje (verificável no git), e o valor não se perde — só fica do lado antigo. Registrado como limite, não como bug. |
| Duas queries por leitura de avaliação | Custo real, mas pequeno: são duas queries indexadas por chave-pai, no mesmo registro. A alternativa (uma `UNION`) trocaria clareza por microssegundos. |
| `parte1Completa` calculado sobre objeto incompleto | Não se aplica: o gate roda sobre o objeto já unido pelo repositório, que é o mesmo de antes. |

---

## O que NÃO muda

- Nenhuma rota (`src/app/api/avaliacoes/**`).
- Nenhum componente React.
- `completude.ts`, `condicionais.ts`, os schemas Zod.
- O contrato HTTP.
- Nenhuma asserção de teste existente.
