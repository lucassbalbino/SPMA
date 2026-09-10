# Respostas Normalizadas Specification

**Escopo:** Complex (rescinde uma AD formal de arquitetura de dados, mexe em schema físico com migração de dados, e atravessa três features já DONE - `formulario-pre-curso`, `formulario-pos-curso`, `avaliacao-aluno` - em rota, domínio, formulário React e três camadas de teste).

**Fonte funcional:** decisão do usuário nesta sessão (product owner), registrada em `context.md`. Não vem do documento do cliente: `docs/SPMA_Especificacao_Cliente_v2.md` não fala de estratégia de persistência.

**Decisão de arquitetura que esta feature rescinde:** AD-034 (`.specs/STATE.md`) - "Respostas dos questionários armazenadas como um único campo `Json?` por formulário (não uma coluna por pergunta)". A rescisão precisa virar uma AD nova, seguindo o precedente do AD-040.

## Problem Statement

As respostas dos três questionários vivem num único campo `respostas Json?` por registro. Não existe "resposta" como entidade: para saber quantos alunos responderam X a uma pergunta, é preciso varrer e parsear o JSON de todos os registros. O usuário quer o dado pronto para agregação por pergunta - contar e cruzar respostas entre alunos, cursos e períodos - o que o JSON opaco não entrega. A decisão é normalizar: uma linha por resposta, nos três formulários, substituindo a coluna JSON.

## Goals

- [ ] Cada resposta de cada pergunta vira uma linha própria, nos três formulários.
- [ ] O campo `respostas Json?` deixa de existir em `TB_Pre_Curso`, `TB_Pos_Curso` e `TB_Avaliacao_Aluno`.
- [ ] Zero regressão de comportamento: completude, gates condicionais, encerramento irreversível, merge raso do PATCH, autorização e escopo continuam idênticos.
- [ ] As respostas já gravadas migram sem perda.
- [ ] Agregação por pergunta é uma consulta SQL direta, com índice, sem parsear JSON.
- [ ] AD-034 rescindido por uma AD nova em `.specs/STATE.md`.

## Out of Scope

| Item | Motivo |
| --- | --- |
| A tela de dashboard/relatório | Adiada por AD-024 até o cliente definir os indicadores. Esta feature entrega o dado pronto, não a visualização. |
| Exportação CSV/Excel/BI | Levantada na discussão, não escolhida pelo usuário. |
| Auditoria por resposta (autor e histórico de alteração por linha) | Levantada na discussão, não escolhida. A tabela nova é o lugar natural se um dia for pedida. |
| Registry de código estável por opção | Guardamos o texto que o Zod já valida. Ver Assumptions - contrapartida assumida. |
| Mudança nas perguntas, opções ou regras de completude dos questionários | Esta feature move dados de lugar; não toca no conteúdo nem nas regras. |
| Versionamento de questionário na resposta | Não pedido. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo dos três formulários, não só o do Aluno | Pré-Curso, Pós-Curso e Avaliação do Aluno normalizados na mesma feature | Escolha explícita do usuário, contra a recomendação de fazer só o do Aluno (o único que é por aluno) | y |
| Tabela substitui o JSON, não convive | `respostas Json?` é removida ao fim da migração; a tabela nova é a única fonte | Escolha explícita do usuário | y |
| Identificador da pergunta | A chave já existente no schema Zod (`avalPessoalGenero`, `posFinHouveDevolucaoRecursos`, ...) | Já é estável e já é fonte de verdade da forma (AD-004); um registry paralelo de códigos seria artefato novo a manter | y (decisão do agente, baixo risco) |
| Valor guardado como texto validado pelo Zod, em coluna única | A linha guarda o texto da opção exatamente como o Zod valida hoje; tipo real derivado do schema na leitura | Evita inventar registry opção→código para ~127 perguntas nos três questionários | n (contrapartida: reescrever texto de opção passa a exigir tocar nos dados, como em AD-035/036/037) |
| Múltipla escolha vira uma linha por opção selecionada | Chaves de array (ex.: `avalMotivMotivosParticipacao`, até 3 opções) viram N linhas, com a ordem preservada numa coluna própria | Torna "contar por opção" um `GROUP BY` trivial - o uso final escolhido foi relatório agregado | y |
| Sem colunas tipadas para valor numérico | Likert 1-5 e nota 0-10 guardados como texto; agregação numérica usa `CAST` | Os indicadores do dashboard ainda não existem (AD-024); criar coluna para indicador hipotético é desenhar para requisito inexistente | n (reversível: adicionar coluna derivada depois não quebra nada) |
| Chave órfã do questionário antigo migra normalmente | Chave presente no JSON mas ausente do schema atual (resquício de AD-035/036/037) vira linha como qualquer outra | A tabela é indexada por string e não conhece o schema vigente, então o backfill é lossless por construção; descartar seria perda silenciosa | y |
| Regra do AD-038 preservada | Encerramento continua descartando resposta condicional órfã, agora como `DELETE` das linhas | Escolha explícita do usuário | y |
| Nenhuma mudança de autorização | As guardas dos três formulários (`podeGerenciarPreCurso`, `podeGerenciarPosCurso`, `podeGerenciarAvaliacao`) ficam intocadas | Esta feature é de persistência, não de permissão | y |

**Open questions:** none - todas resolvidas na discussão ou registradas acima.

---

## User Stories

### P1: Resposta como entidade própria na base ⭐ MVP

**User Story**: Como responsável pelo dado do programa, quero cada resposta de cada pergunta gravada como uma linha própria, para que o sistema possa contar e cruzar respostas sem parsear JSON.

**Why P1**: É o pedido central. Sem isso não há feature.

**Acceptance Criteria**:

1. WHEN um `PATCH` grava N chaves de resposta num dos três formulários THEN o sistema SHALL persistir uma linha por chave, vinculada ao registro do formulário, contendo a chave da pergunta e o valor. (RESP-01)
2. WHEN a chave gravada é de múltipla escolha com K opções selecionadas THEN o sistema SHALL persistir K linhas para essa chave, cada uma com uma opção e a sua posição na seleção. (RESP-02)
3. WHEN um `PATCH` regrava uma chave que já tem resposta THEN o sistema SHALL substituir o valor daquela chave e SHALL deixar as demais chaves do registro inalteradas. (RESP-03)
4. WHEN uma chave de múltipla escolha é regravada com menos opções que antes THEN o sistema SHALL remover as linhas das opções que saíram da seleção. (RESP-04)
5. The system SHALL impedir, por constraint física, duas linhas para o mesmo par (registro do formulário, chave da pergunta, posição). (RESP-05)
6. WHEN o registro-pai de um formulário é removido THEN o sistema SHALL remover as linhas de resposta vinculadas, sem deixar órfãs. (RESP-06)

**Independent Test**: gravar respostas num pré-curso via `PATCH`, consultar a tabela nova direto no banco e conferir uma linha por chave (e uma por opção nas múltiplas); regravar uma chave e conferir que só ela mudou.

---

### P1: Nenhuma regra de negócio existente regride ⭐ MVP

**User Story**: Como mantenedor, quero que completude, gates condicionais e encerramento continuem se comportando exatamente como antes, para que trocar o armazenamento não vire uma mudança de produto disfarçada.

**Why P1**: A feature atravessa três features já DONE e validadas. Uma regressão aqui é pior que não ter feito a normalização.

**Acceptance Criteria**:

1. WHEN a completude de qualquer um dos três formulários é avaliada sobre um dado conjunto de respostas THEN o sistema SHALL produzir o mesmo veredito e a mesma lista de pendências que produzia com o JSON. (RESP-07)
2. WHEN um formulário é encerrado THEN o sistema SHALL remover as linhas das respostas condicionais que não se aplicam (AD-038), na mesma transação que grava `status=ENCERRADO`. (RESP-08)
3. WHILE um formulário está com `status=ENCERRADO`, the system SHALL recusar qualquer gravação de resposta com HTTP 409, sem alterar nenhuma linha. (RESP-09)
4. IF um Aluno grava uma chave de Parte 2 com a Parte 1 incompleta no estado resultante THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nenhuma linha daquele `PATCH`, nem as chaves de Parte 1 enviadas junto. (RESP-10)
5. IF o corpo de um `PATCH` falha na validação Zod THEN o sistema SHALL responder HTTP 400 e SHALL não persistir nenhuma linha. (RESP-11)
6. The system SHALL manter inalteradas as guardas de autorização e o escopo por Ofertante dos três formulários. (RESP-12)

**Independent Test**: a suíte já existente das três features (`test:unit`, `test:integration`, `test:e2e`) passa sem alteração de asserção - só as fixtures que montam `respostas` mudam de forma.

---

### P1: Migração das respostas já gravadas ⭐ MVP

**User Story**: Como responsável pelo dado, quero que as respostas já gravadas apareçam na estrutura nova, para que a normalização não custe o histórico.

**Why P1**: Dropar a coluna sem backfill é perda de dado irreversível.

**Acceptance Criteria**:

1. WHEN a migração roda sobre um registro com `respostas` preenchido THEN o sistema SHALL criar uma linha por chave (e uma por opção, nas chaves de múltipla escolha) antes de a coluna ser removida. (RESP-13)
2. IF o JSON de um registro contiver uma chave ausente do schema Zod atual THEN a migração SHALL criar a linha correspondente do mesmo jeito, sem descartar o valor. (RESP-14)
3. WHEN a migração termina THEN o sistema SHALL ter preservado `status`, `dataEncerramento` e todas as demais colunas dos três formulários inalterados. (RESP-15)
4. WHEN a migração roda sobre um registro com `respostas` nulo THEN o sistema SHALL não criar nenhuma linha para esse registro e SHALL concluir sem erro. (RESP-16)

**Independent Test**: semear registros nos três formulários com JSON preenchido (incluindo múltipla escolha e uma chave fora do schema atual), rodar a migração, e conferir linha a linha que o objeto remontado é igual ao JSON original.

---

### P1: Dado pronto para agregação por pergunta

**User Story**: Como responsável pelo programa, quero contar respostas por pergunta direto em SQL, para que o dashboard futuro (AD-024) não precise parsear JSON.

**Why P1**: É a razão de ser da mudança. Sem prova de que a agregação ficou direta, a feature entregou custo sem benefício.

**Acceptance Criteria**:

1. WHEN uma consulta agrupa respostas por chave de pergunta e valor THEN o sistema SHALL responder a partir da tabela de respostas, sem função de JSON no `WHERE` nem no `GROUP BY`. (RESP-17)
2. The system SHALL manter um índice que cubra a busca por chave de pergunta. (RESP-18)

**Independent Test**: uma consulta de agregação sobre respostas semeadas de vários alunos do mesmo curso devolve a contagem correta por opção, e o plano de execução usa o índice.

---

## Edge Cases

- IF uma chave é regravada com exatamente o mesmo valor que já tem THEN o sistema SHALL manter uma única linha, sem duplicar. (RESP-19)
- IF uma chave de múltipla escolha é enviada com lista vazia THEN o sistema SHALL recusar com HTTP 400 pela validação Zod já existente (`.min(1)`), sem persistir linha. (RESP-20)
- IF duas gravações concorrentes tocam o mesmo registro THEN o sistema SHALL preservar a semântica de merge raso, sem que uma gravação parcial de uma delas fique visível. (RESP-21)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RESP-01 | P1: Resposta como entidade | Design | Pending |
| RESP-02 | P1: Resposta como entidade | Design | Pending |
| RESP-03 | P1: Resposta como entidade | Design | Pending |
| RESP-04 | P1: Resposta como entidade | Design | Pending |
| RESP-05 | P1: Resposta como entidade | Design | Pending |
| RESP-06 | P1: Resposta como entidade | Design | Pending |
| RESP-07 | P1: Sem regressão | Design | Pending |
| RESP-08 | P1: Sem regressão | Design | Pending |
| RESP-09 | P1: Sem regressão | Design | Pending |
| RESP-10 | P1: Sem regressão | Design | Pending |
| RESP-11 | P1: Sem regressão | Design | Pending |
| RESP-12 | P1: Sem regressão | Design | Pending |
| RESP-13 | P1: Migração | Design | Pending |
| RESP-14 | P1: Migração | Design | Pending |
| RESP-15 | P1: Migração | Design | Pending |
| RESP-16 | P1: Migração | Design | Pending |
| RESP-17 | P1: Agregação | Design | Pending |
| RESP-18 | P1: Agregação | Design | Pending |
| RESP-19 | Edge case | Design | Pending |
| RESP-20 | Edge case | Design | Pending |
| RESP-21 | Edge case | Design | Pending |

**Coverage:** 21 total, 21 a mapear em tasks no Design, 0 unmapped.

---

## Success Criteria

- [ ] Os três formulários gravam e leem respostas linha a linha; `respostas Json?` não existe mais no schema.
- [ ] A suíte completa das três features passa sem enfraquecer nenhuma asserção existente.
- [ ] Uma consulta de agregação por pergunta roda sem função de JSON e usa índice.
- [ ] O backfill reconstrói, para cada registro semeado, um objeto idêntico ao JSON original.
- [ ] AD nova em `.specs/STATE.md` rescinde AD-034 e os três `spec.md` afetados deixam de afirmar o contrário.
- [ ] Gate completo verde: `lint && build && typecheck && test:unit && test:integration && test:e2e`.
