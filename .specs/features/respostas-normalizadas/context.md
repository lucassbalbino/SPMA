# Respostas Normalizadas Context

**Gathered:** 2026-09-10
**Spec:** `.specs/features/respostas-normalizadas/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Cada resposta de cada pergunta, de cada um dos três questionários (Pré-Curso, Pós-Curso, Avaliação do Aluno), passa a ser uma linha própria na base de dados. O campo `respostas Json?` deixa de existir nos três modelos. Nenhuma regra de negócio existente muda de comportamento.

---

## Implementation Decisions

### Escopo: quais formulários

- **Os três**: `TB_Pre_Curso`, `TB_Pos_Curso` e `TB_Avaliacao_Aluno`. Decisão do usuário, contra a recomendação de fazer só o do Aluno.
- Premissa confirmada no código, não é requisito novo: múltiplos Alunos já têm, cada um, sua própria avaliação do mesmo curso (chave composta `@@id([cpf, cdCurso])`, `prisma/schema.prisma:231`). Esta feature não mexe nisso.

### Estratégia de armazenamento

- A tabela normalizada **substitui** o `respostas Json?` - não convive com ele. A coluna é removida ao fim da migração.
- A aplicação **remonta o objeto de respostas em memória** ao ler. Isso é o que mantém `completude.ts` e `condicionais.ts` dos três domínios funcionando sem reescrita: eles continuam recebendo um objeto JS com as mesmas chaves de hoje.
- O schema Zod continua sendo a fonte de verdade da FORMA (AD-004). O que muda é só onde os dados repousam.

### Uso final do dado

- **Relatório/dashboard agregado**: contar e cruzar respostas por pergunta entre alunos, cursos e períodos. O dado precisa ficar pronto para `GROUP BY (pergunta, valor)` sem parsear JSON.
- A tela de dashboard em si continua fora de escopo (AD-024, adiada até o cliente definir os indicadores). Esta feature entrega o dado, não a visualização.
- Não foram pedidos: exportação CSV/BI, nem auditoria por resposta (quem gravou cada uma, histórico de alterações). Ficam fora.

### Ciclo de vida da resposta condicional órfã

- No encerramento, a resposta condicional que não se aplica continua sendo **descartada** - AD-038 mantido sem mudança de regra. Com linhas individuais, "descartar" vira `DELETE` das linhas órfãs, na mesma transação do encerramento.

### Agent's Discretion

Decisões que o usuário não pediu para revisar e que eu tomo como construtor, registradas como assumptions na spec:

- **Identificador da pergunta**: a chave que já existe no schema Zod (`avalPessoalGenero`, `posFinHouveDevolucaoRecursos`, etc.). Já é estável e já é a fonte de verdade; criar um registry paralelo de códigos seria um artefato novo a manter.
- **Valor**: guardado como o texto que o Zod já valida hoje, numa coluna única. Sem registry opção→código para as ~127 perguntas dos três questionários. Contrapartida assumida: reescrever o texto de uma opção (como já houve em AD-035/036/037) passa a exigir tocar nos dados, não só no schema.
- **Múltipla escolha**: uma linha por opção selecionada, com a ordem preservada. É o que torna "contar por opção" um `GROUP BY` trivial, que é o uso final escolhido.
- **Migração**: backfill do JSON para linhas antes de dropar a coluna. Chave desconhecida ao schema atual (resquício da troca de questionários, AD-035/036/037) migra como linha normal - a tabela é indexada por string e não precisa conhecer o schema vigente, então a migração é lossless por construção.

### Declined / Undiscussed Gray Areas → Assumptions

- **Colunas tipadas para valor numérico** (Likert 1-5, nota 0-10): não discutido. Default do agente: coluna única de texto; agregação numérica usa `CAST`. Motivo: os indicadores do dashboard ainda não estão definidos (AD-024), e criar uma coluna para um indicador hipotético é desenhar para requisito que não existe.
- **Versionamento de questionário** (guardar a que versão do questionário a resposta pertence): não discutido, não pedido. Default: fora de escopo.

---

## Specific References

O usuário chegou aqui a partir de uma pergunta sobre rastreabilidade ("os formulários têm indicação de quem respondeu?"). A resposta - que a identidade de quem responde a avaliação é o próprio CPF na chave composta, e que as respostas vivem num JSON opaco - é o que motivou o pedido. Isso reforça que o valor buscado é o dado ficar consultável por pergunta, não só armazenado.

---

## Deferred Ideas

- **Auditoria por resposta**: quem gravou cada linha e quando, com histórico de alterações antes do encerramento. Levantado por mim como opção de uso final, não escolhido pelo usuário. Se um dia for pedido, a tabela normalizada é o lugar natural para as colunas de autor/timestamp.
- **Exportação CSV/Excel/BI** da base crua de respostas. Mesma origem, também não escolhido.
- **Códigos estáveis por opção** (registry opção→código, imune a reescrita de texto). Vale reabrir se o cliente trocar o texto dos questionários de novo.
