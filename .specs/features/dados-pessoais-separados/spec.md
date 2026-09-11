# Dados Pessoais Separados Specification

**Escopo:** Large (schema físico com migração de dados, borda de persistência, rota, tela e três camadas de teste; atravessa a feature `avaliacao-aluno`, já DONE e validada).

**Fonte funcional:** pedido do usuário nesta sessão, registrado em `context.md`. Não vem do documento do cliente.

**Decisões que esta feature herda:** AD-041 (respostas normalizadas em linha), AD-004 (Zod como autoridade de forma), AD-023 (gate Parte 1 → Parte 2), AD-022 (mesmo aluno em vários cursos ao longo do tempo).

## Problem Statement

Os dados pessoais do aluno — a seção DADOS PESSOAIS do questionário — vivem hoje misturados às respostas do questionário do curso, nas mesmas linhas da mesma tabela `TB_Resposta_Avaliacao`, distinguíveis só pelo prefixo da chave. Não existe fronteira física entre "o que a pessoa é" e "o que a pessoa respondeu sobre o curso". Isso impede tratar o dado pessoal de forma própria — política de acesso, retenção ou anonimização diferente — e torna qualquer consulta sobre pessoas dependente de conhecer, de cor, quais prefixos de chave são pessoais. O usuário quer os dois separados na base.

## Goals

- [ ] Dado pessoal do aluno vive numa tabela própria, com fronteira física, não por convenção de nome de chave.
- [ ] O questionário do curso continua em `TB_Resposta_Avaliacao`, sem nenhuma mudança.
- [ ] Zero regressão: completude, gate da Parte 2, encerramento, autorização e contrato HTTP idênticos.
- [ ] Os dados pessoais já gravados migram sem perda.
- [ ] Qual chave é pessoal passa a ser declarado num único lugar do código.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Cadastro único de aluno reaproveitado entre cursos | Decisão D2 em `context.md`: destruiria a fidelidade histórica de avaliações antigas. Fica como evolução possível, não como parte desta feature. |
| Política de acesso, retenção ou anonimização do dado pessoal | Esta feature cria a fronteira que torna isso possível; não implementa nenhuma política. |
| Colunas tipadas para os campos pessoais | Decisão D3: mantém a forma de linha da AD-041 para não voltar a exigir migration a cada ajuste de questionário. |
| Mover `nome`/`e-mail` de `TB_Usuario` | Já estão fora do questionário; nada a separar. |
| Mudar perguntas, opções ou regras de completude | Esta feature move dado de lugar. |
| Pré-Curso e Pós-Curso | Não têm dado pessoal de aluno — são preenchidos pelo Gestor sobre o curso. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que conta como "dado pessoal" | As 7 chaves da seção DADOS PESSOAIS do cliente, Q3–Q9 (`avalPessoal*`) | Fronteira desenhada pelo próprio cliente no questionário, não inferida pelo agente. Q1/Q2 (nome, CPF) já vivem em `TB_Usuario`; Q10–Q16 (situação profissional e experiência) ficam no questionário | **y** (decidido pelo usuário: "apenas as 9 primeiras entram") |
| Cardinalidade da tabela nova | Continua `(CPF, curso)` — separação física, não semântica | Preserva a foto do momento; cadastro único por CPF faria avaliação de 2023 exibir dado de hoje | n (decisão do agente, D2 — reversível, mas com custo de histórico) |
| Q1 (nome) e Q2 (CPF) | Permanecem em `TB_Usuario`, fora desta feature | Já estão fora do questionário — não há o que separar. Consolidá-los junto seria outro movimento, e maior: `TB_Usuario.cpf` é PK referenciada por várias tabelas | y |
| Forma da tabela nova | `(CPF, curso, Chave, Ordem, Valor)`, igual à AD-041 | Reusa `forma.ts` e o repositório; Zod segue autoridade de forma; sem migration por ajuste de questionário | y (coerência com AD-041) |
| Contrato de domínio e HTTP | `lerRespostas` devolve UM objeto com as duas metades; API inalterada | Mesmo princípio que conteve o raio na AD-041 — a separação vive na borda de persistência | y |
| Gate `parte1Completa` | Avaliado sobre as duas fontes unidas | O conceito de Parte 1 não muda; só metade dele passa a ser lida de outra tabela | y |
| Chave pessoal ausente do schema atual | Migra e é lida como qualquer outra chave órfã | Mesma regra da RESP-14; descartar seria perda silenciosa | y |

**Open questions:** none — o escopo foi decidido pelo usuário; a cardinalidade foi decidida pelo agente e registrada acima com o custo.

---

## User Stories

### P1: Dado pessoal com fronteira física ⭐ MVP

**User Story**: Como responsável pelo dado do programa, quero o dado pessoal do aluno numa tabela própria, para que ele possa ser tratado de forma distinta do que o aluno respondeu sobre o curso.

**Why P1**: É o pedido central. Sem isso não há feature.

**Acceptance Criteria**:

1. WHEN um `PATCH` grava uma chave de dado pessoal THEN o sistema SHALL persistir a resposta em `TB_Dado_Pessoal_Aluno` e SHALL não criar linha em `TB_Resposta_Avaliacao` para essa chave. (PESSOAL-01)
2. WHEN um `PATCH` grava uma chave do questionário do curso THEN o sistema SHALL persistir em `TB_Resposta_Avaliacao`, sem tocar na tabela de dado pessoal. (PESSOAL-02)
3. WHEN um mesmo `PATCH` mistura chave pessoal e chave de curso THEN o sistema SHALL gravar cada uma na sua tabela, na mesma transação. (PESSOAL-03)
4. The system SHALL impedir, por constraint física, duas linhas para o mesmo par (aluno, curso, chave, posição) na tabela de dado pessoal. (PESSOAL-04)
5. WHEN o registro de avaliação é removido THEN o sistema SHALL remover as linhas de dado pessoal vinculadas, sem deixar órfãs. (PESSOAL-05)
6. The system SHALL declarar num único lugar do código quais chaves são pessoais, e SHALL derivar dele tanto a gravação quanto a leitura. (PESSOAL-06)

**Independent Test**: gravar por `PATCH` um bloco com chaves dos dois tipos, consultar as duas tabelas direto no banco e conferir que cada chave caiu na sua, sem duplicata.

---

### P1: Nenhuma regra de negócio existente regride ⭐ MVP

**User Story**: Como mantenedor, quero completude, gate da Parte 2, encerramento e autorização se comportando exatamente como antes, para que separar o dado não vire mudança de produto disfarçada.

**Why P1**: A feature atravessa `avaliacao-aluno`, já DONE e validada por Verifier.

**Acceptance Criteria**:

1. WHEN a completude da Parte 1 é avaliada THEN o sistema SHALL produzir o mesmo veredito e a mesma lista de pendências que produzia com tudo numa tabela só. (PESSOAL-07)
2. IF um Aluno grava uma chave de Parte 2 com a Parte 1 incompleta no estado resultante THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nenhuma linha, em nenhuma das duas tabelas. (PESSOAL-08)
3. WHILE a avaliação está com `status=ENCERRADO`, the system SHALL recusar qualquer gravação com HTTP 409, sem alterar linha em nenhuma das duas tabelas. (PESSOAL-09)
4. WHEN a avaliação é encerrada THEN o sistema SHALL remover as linhas das condicionais órfãs nas duas tabelas, na mesma transação que grava `ENCERRADO`. (PESSOAL-10)
5. The system SHALL manter inalterado o contrato HTTP: `respostas` continua um único objeto com as duas metades, e `null` quando não há nenhuma resposta. (PESSOAL-11)
6. The system SHALL manter inalteradas as guardas de autorização da avaliação — só o próprio Aluno grava, e o escopo de leitura por Ofertante não muda. (PESSOAL-12)

**Independent Test**: a suíte existente de `avaliacao-aluno` (`test:unit`, `test:integration`, `test:e2e`) passa sem alteração de asserção.

---

### P1: Migração dos dados já gravados ⭐ MVP

**User Story**: Como responsável pelo dado, quero os dados pessoais já respondidos na estrutura nova, para que a separação não custe o histórico.

**Why P1**: Criar a tabela sem mover o que existe deixa o dado antigo do lado errado da fronteira.

**Acceptance Criteria**:

1. WHEN a migração roda THEN o sistema SHALL mover para `TB_Dado_Pessoal_Aluno` todas as linhas de `TB_Resposta_Avaliacao` cuja chave é pessoal, preservando `Ordem` e `Valor`. (PESSOAL-13)
2. WHEN a migração termina THEN o sistema SHALL ter deixado em `TB_Resposta_Avaliacao` exatamente as linhas de chave não-pessoal, e nenhuma linha pessoal. (PESSOAL-14)
3. WHEN a migração roda sobre uma avaliação sem nenhuma resposta pessoal THEN o sistema SHALL não criar linha e SHALL concluir sem erro. (PESSOAL-15)
4. WHEN a migração termina THEN o sistema SHALL ter preservado `status`, `parte1Completa`, `dataEncerramento` e as demais colunas de `TB_Avaliacao_Aluno` inalteradas. (PESSOAL-16)

**Independent Test**: semear uma avaliação com respostas dos dois tipos, rodar a migração real lida do disco e conferir a contagem e o conteúdo das duas tabelas.

---

### Edge cases

- IF uma chave pessoal é regravada com menos opções que antes THEN o sistema SHALL remover as linhas das opções que saíram, na tabela de dado pessoal. (PESSOAL-17)
- IF uma chave pessoal está gravada mas ausente do schema Zod atual THEN o sistema SHALL migrá-la e lê-la como órfã, sem descartar o valor. (PESSOAL-18)
- IF a gravação falha no meio de um `PATCH` que toca as duas tabelas THEN o sistema SHALL não deixar nenhuma das duas alterada. (PESSOAL-19)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PESSOAL-01 | P1: Fronteira física | Specify | Pending |
| PESSOAL-02 | P1: Fronteira física | Specify | Pending |
| PESSOAL-03 | P1: Fronteira física | Specify | Pending |
| PESSOAL-04 | P1: Fronteira física | Specify | Pending |
| PESSOAL-05 | P1: Fronteira física | Specify | Pending |
| PESSOAL-06 | P1: Fronteira física | Specify | Pending |
| PESSOAL-07 | P1: Sem regressão | Specify | Pending |
| PESSOAL-08 | P1: Sem regressão | Specify | Pending |
| PESSOAL-09 | P1: Sem regressão | Specify | Pending |
| PESSOAL-10 | P1: Sem regressão | Specify | Pending |
| PESSOAL-11 | P1: Sem regressão | Specify | Pending |
| PESSOAL-12 | P1: Sem regressão | Specify | Pending |
| PESSOAL-13 | P1: Migração | Specify | Pending |
| PESSOAL-14 | P1: Migração | Specify | Pending |
| PESSOAL-15 | P1: Migração | Specify | Pending |
| PESSOAL-16 | P1: Migração | Specify | Pending |
| PESSOAL-17 | Edge case | Specify | Pending |
| PESSOAL-18 | Edge case | Specify | Pending |
| PESSOAL-19 | Edge case | Specify | Pending |

**Coverage:** 19 total, 19 a mapear em tasks no Design, 0 unmapped.

---

## Success Criteria

- [ ] Nenhuma linha de chave pessoal permanece em `TB_Resposta_Avaliacao`.
- [ ] A suíte existente de `avaliacao-aluno` passa sem enfraquecer nenhuma asserção.
- [ ] A lista de chaves pessoais existe num único lugar, e gravação e leitura derivam dela.
- [ ] A migração move o dado já gravado sem perda, com `Ordem` preservada.
- [ ] Gate completo verde: `lint && build && typecheck && test:unit && test:integration && test:e2e`.
