# Alterações no Questionário do Gestor – Pré-Curso

**Data:** 2026-10-21
**Fonte:** solicitação do cliente (três alterações pontuais)
**Documento afetado:** `docs/Questionario_do_Gestor_Pre_Curso.md`
**Feature afetada:** `.specs/features/formulario-pre-curso`

Este documento registra **o que muda** no questionário e **onde** a mudança repercute no sistema. Ele não altera, por si, nenhum arquivo: é a especificação da alteração.

---

## Resumo

| # | Alteração | Perguntas | Chaves novas |
|---|---|---|---|
| A1 | Q7 passa a ser **7a** e ganha os campos **7b**, **7c** e **7d** (com condicional "Qual?") | Seção 2 | 4 |
| A2 | Q10 ganha a opção **Idiomas** na lista de características | Seção 2 | 0 |
| A3 | Q17 passa a ser **17a** e ganha os campos **17b**, **17c** e **17d** | Seção 3 | 3 |

**Total:** 7 chaves novas no JSON `PreCurso.respostas` — de **56** para **63** chaves; condicionais de **9** para **10**.

---

## A1 — Seção 2: desdobramento da pergunta 7

### Texto final no questionário

> **7a.** Endereço da Sede onde a ação de qualificação é realizada:
>
> **7b.** Município:
>
> **7c.** UF:
>
> **7d.** Outros municípios foram contemplados com a Ação de Qualificação?
>
> - a) Sim. Qual? \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
> - b) Não

*(O enunciado de 7d foi grafado "fora contemplados" na solicitação; registrado aqui como "foram contemplados".)*

### Dicionário de campos

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `qualifEndereco` | 7a | Endereço da Sede onde a ação de qualificação é realizada | texto *(chave inalterada — só o número do rótulo muda)* |
| `qualifMunicipio` | 7b | Município | texto |
| `qualifUf` | 7c | UF | sel-única (27 UFs — reaproveita `OPCOES_UF`) |
| `qualifOutrosMunicipios` | 7d | Outros municípios foram contemplados com a Ação de Qualificação? | sel-única: Sim **(Qual?)** / Não (`OPCOES_SIM_NAO`) |
| `qualifOutrosMunicipiosQuais` | 7d | *(condicional)* Sim. Qual? | texto, obrigatório apenas se `qualifOutrosMunicipios = "Sim"` |

### Regra condicional (nova, 10ª — família REQ-PC-09)

```
chave: "qualifOutrosMunicipiosQuais"
dependeDe: ["qualifOutrosMunicipios"]
exigidaQuando: qualifOutrosMunicipios === "Sim"
```

Mesma forma das outras condicionais "Qual?" (ex.: `qualifVinculoProgramaQual`), portanto herda de graça: visibilidade na tela, exigência no encerramento e limpeza de órfãs.

---

## A2 — Seção 2: nova opção em Q10

"Idiomas" entra na lista de características contempladas, **antes** da opção "Outro. Qual?" — que passa de `k)` para `l)`:

> - i) Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)
> - j) Eventos
> - **k) Idiomas**
> - l) Outro. Qual? \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Nenhuma chave nova: `qualifCaracteristicas` continua sendo seleção múltipla (≥ 1) e `qualifCaracteristicasOutra` continua condicionada só a "Outro". A opção é texto literal `"Idiomas"`, sem campo condicional.

---

## A3 — Seção 3: desdobramento da pergunta 17

### Texto final no questionário

> **17a.** Número previsto de alunos:
>
> **17b.** Data prevista de início de inscrição:
>
> **17c.** Data prevista de término de inscrição:
>
> **17d.** Número de vagas:

### Dicionário de campos

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `planejNumAlunosPrevistos` | 17a | Número previsto de alunos | inteiro > 0 *(chave inalterada)* |
| `planejDataInicioInscricao` | 17b | Data prevista de início de inscrição | data (`YYYY-MM-DD`) |
| `planejDataTerminoInscricao` | 17c | Data prevista de término de inscrição | data, não anterior a 17b |
| `planejNumVagas` | 17d | Número de vagas | inteiro > 0 |

### Ordem das datas de inscrição

17c não pode ser anterior a 17b, pela mesma regra que já vale para Q13/Q14: rejeição com **400 na gravação** (não só no encerramento), avaliada contra o JSON **já mesclado** em `PATCH /api/pre-cursos/[id]`. Implementação sugerida: estender `ordemDatasValida` (`src/lib/validation/schemas/pre-curso.schema.ts`) para checar os dois pares, mantendo a regra de "só valida quando as duas datas do par estão presentes".

---

## Impacto na contagem da feature

| Métrica | Antes | Depois |
|---|---|---|
| Perguntas numeradas no papel | 32 | 32 *(7 e 17 passam a ter subitens; a numeração final não muda)* |
| Chaves no JSON `respostas` | 56 | **63** |
| Chaves condicionais | 9 | **10** |
| Chaves sempre obrigatórias | 47 | **53** |
| Perguntas com opção excludente | 5 | 5 |
| Pares de datas com ordem validada | 1 | **2** |

Quebra das 63: Seção 1 = 6 · Seção 2 = 12 (8 + 4 de A1) · Seção 3 = 10 (7 + 3 de A3) · Seção 4 = 3 · Q22 = 1 · Infra Básica = 9 · Infra Complementar = 8 · Infra Específica = 4 · Corpo Docente = 5 · Divulgação = 2 · Parcerias = 1 · Suporte = 2.

---

## Artefatos a atualizar

| Arquivo | O que muda |
|---|---|
| `docs/Questionario_do_Gestor_Pre_Curso.md` | Texto do papel: 7a–7d, "Idiomas" em Q10, 17a–17d |
| `.specs/features/formulario-pre-curso/spec.md` | Dicionário de Campos (3 seções), contagem 56 → 63, lista de condicionais 9 → 10, nova AD/assunção sobre a origem da alteração |
| `.specs/features/formulario-pre-curso/design.md` | Pares de datas validados na gravação; nova regra condicional |
| `.specs/features/formulario-pre-curso/tasks.md` / `validation.md` | Tarefas e critérios dos 7 campos novos |
| `src/lib/validation/schemas/pre-curso.schema.ts` | `"Idiomas"` em `OPCOES_CARACTERISTICAS`; 7 chaves novas em `respostasPreCursoSchema`; `ordemDatasValida` cobrindo o par de inscrição |
| `src/lib/pre-curso/condicionais.ts` | Nova regra `qualifOutrosMunicipiosQuais` |
| `src/app/(protegido)/pre-cursos/[id]/PreCursoForm.tsx` | Rótulos "7." → "7a." e "17." → "17a."; campos 7b/7c/7d (+ `outroChave`/`outroRotulo`) e 17b/17c/17d nas Seções 2 e 3 |
| `src/app/api/pre-cursos/[id]/route.ts` | Nada, se a validação de ordem continuar dentro de `ordemDatasValida` |
| `src/lib/validation/schemas/pre-curso.schema.test.ts` | Fixture `RESPOSTA_COMPLETA` + casos dos campos novos e do novo par de datas |
| `src/lib/pre-curso/completude.test.ts` · `condicionais.test.ts` | Fixtures e caso "7d = Sim sem Qual? → pendente" |
| `e2e/pre-cursos-formulario.spec.ts` · `e2e/pre-cursos-encerrar.spec.ts` | Preenchimento dos campos novos; **atenção ao índice** (ver abaixo) |

### Atenção ao índice do e2e

`e2e/pre-cursos-formulario.spec.ts` marca as opções de `qualifCaracteristicas` por **posição** (`marcarOpcao(page, "qualifCaracteristicas", 10) // Outro`). Com "Idiomas" inserido antes de "Outro", "Outro" passa a ser o índice **11**. É a única quebra mecânica das três alterações.

---

## Pontos de atenção

1. **UF/Município aparecem duas vezes.** Q1 (`identifUf`) e Q2 (`identifMunicipio`) são da *Entidade Responsável*; 7b/7c são do *local onde a ação é realizada* — podem divergir legitimamente. Nenhuma validação de igualdade entre os dois pares é proposta. Se o cliente entender que são sempre o mesmo dado, o caminho é remover 7b/7c, não espelhá-los.
2. **Pré-cursos EM_ANDAMENTO já criados ficam incompletos.** `respostas` é coluna `Json?`, então não há migração de banco; mas os 6 novos campos sempre obrigatórios passam a aparecer em `pendentes` e bloqueiam o encerramento até serem preenchidos. Pré-cursos **já encerrados** não são revalidados — ficam gravados com 56 chaves, e qualquer agregação futura precisa tratar as 7 chaves novas como ausentes nesses registros.
3. **Inscrição vs. realização.** Não se propõe exigir que 17c seja anterior a Q13 (início do curso): o papel não diz isso e inscrição durante o curso é prática real. Confirmar com o cliente se deve virar regra.
4. **Vagas vs. alunos previstos.** 17d e 17a são independentes; nenhuma regra do tipo "previstos ≤ vagas" é proposta sem pedido explícito.
5. **Pós-Curso.** `docs/Questionario_do_Gestor_Pos_Curso.md` não é alterado por estas três solicitações. Se o Pós-Curso passar a comparar realizado × previsto para vagas/inscrição, isso é alteração própria.

---

## Como foi aplicado no SPMA (2026-10-21)

Detalhe em `.specs/features/alteracoes-pre-curso-gestor/spec.md` e na AD-049 de `.specs/STATE.md`.

- **As três alterações são os 6 itens "Pendentes" do MTur** (`docs/Alteracoes_MTur_1.md`: 1.3, 1.4, 1.9, 1.11, 1.12 e 1.13), agora liberados.
- **7a:** o texto ficou "Endereço onde a ação de qualificação é realizada". A versão "da Sede" citada acima é a anterior ao item 1.2 do MTur, já aplicado; só o número do rótulo mudou.
- **Q10:** "Idiomas" entrou antes de "Outro". As demais opções mantêm a redação revisada pelo MTur (ex.: "Cultura e Lazer (produtor(a) / recreacionista / artesã(o))", "Eventos (cerimonialista / organizador(a) de eventos)"), não a citada em A2.
- **7d:** o campo condicional aparece como "7d. Qual?", no mesmo padrão de "9. Qual?".
- **Ordem das datas de inscrição:** 17c anterior a 17b é recusado na gravação com a mesma mensagem do par do curso ("Data de término não pode ser anterior à data de início").
- **Sem migração de banco:** as respostas são linhas `(Chave, Ordem, Valor)` desde a AD-041 (não mais coluna `Json?`), e a forma de cada chave sai do schema. O efeito do ponto de atenção 2 vale do mesmo jeito.
- **Specs da feature `formulario-pre-curso`:** não foram reescritos. A AD-049 registra que `alteracoes-pre-curso-gestor` os supera nos itens tocados.
- **Pontos de atenção 3 e 4:** nenhuma regra nova foi criada.
