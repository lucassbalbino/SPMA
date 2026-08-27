# Feature: formulario-pos-curso

**Escopo:** Complex (mesma natureza de ambiguidade do `formulario-pre-curso` — o documento fonte descreve os 26 itens de dado só por bloco/categoria, sem lista nominal; ver Assunções).
**Dependências:** `auth-e-usuarios` (sessão, cascata, escopo), `seguranca-transversal` (CSRF, erro genérico, `podeAcessarOfertante`), `formulario-pre-curso` (`TB_Pos_Curso.CD_Curso` é ao mesmo tempo PK e FK 1:1 para `TB_Pre_Curso.CD_Curso` — não existe Pós-Curso sem um Pré-Curso já criado).
**Fonte de decisões:** STATE.md AD-004, AD-008, AD-012, AD-013, AD-018, AD-025, AD-033, AD-034.
**Fonte funcional:** `docs/SPMA_Especificacao_Cliente_v2.md` seção 5 (Formulário de Pós-Curso), seção 3.6 (`TB_Pos_Curso`), seção 7 (segurança), seção 8 (RN-01 a RN-03, RN-08).

---

## Problem Statement

O Gestor Ofertante (GO) precisa registrar, durante e após a execução de um curso, um relatório de acompanhamento de 26 itens de dado (pedagógico, execução, participação, financeiro, continuidade) vinculado ao Pré-Curso correspondente. Hoje o model `PosCurso` existe no schema (`CD_Curso` é PK e também FK 1:1 para `PreCurso.cdCurso`), mas não há rota nem UI para criar, preencher incrementalmente, validar a regra condicional e encerrar esse formulário de forma irreversível. Sem isso, o diagnóstico de execução do curso nunca é capturado, e o dashboard futuro (AD-024) não tem esse segundo ponto de entrada.

## Goals

- [ ] GO autenticado cria um Pós-Curso vinculado a um Pré-Curso já existente do próprio Ofertante (independente do status desse Pré-Curso — ver Assunções).
- [ ] GO preenche o questionário de 26 itens (seção 5 do documento fonte) em múltiplas gravações parciais, com validação de forma (Zod) a cada gravação.
- [ ] Sistema aplica a única regra condicional (alteração no planejamento inicial) só como gate de encerramento, não de gravação parcial.
- [ ] GO encerra o Pós-Curso de forma irreversível somente quando todos os campos obrigatórios (incluindo o condicional aplicável) estão completos; a partir daí o formulário é somente leitura.
- [ ] Toda leitura/escrita reforça o escopo por Ofertante no servidor, no mesmo padrão já estabelecido por `formulario-pre-curso`/CA-SEC-14.

## Out of Scope

| Feature | Motivo |
|---|---|
| Formulário de Avaliação do Aluno (`TB_Avaliacao_Aluno`) | Feature futura própria — seção 6, inclui o gate Parte 1 → Parte 2 (AD-023). |
| Criação/edição do Pré-Curso | Já entregue por `formulario-pre-curso`. |
| Exclusão/cancelamento de Pós-Curso | Não existe no domínio; a única transição de status é encerrar (AD-018). |
| Reabertura de Pós-Curso encerrado | Proibido por AD-018 em qualquer feature. |
| Indicadores/dashboard agregando dados de pós-curso | Feature adiada, AD-024. |
| Exportação/relatórios do pós-curso | Não mencionado no documento fonte para esta feature. |
| Segundo Pós-Curso para o mesmo Pré-Curso | Relação 1:1 fixada pelo schema (`CD_Curso` é PK e FK ao mesmo tempo) — impossível por construção, não por regra de aplicação. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Lista nominal dos 26 itens de dado (o documento fonte só descreve por bloco/categoria) | Deriva-se o dicionário completo de campos (seção "Dicionário de Campos" abaixo) a partir das descrições de bloco (5.1) e do único condicional (5.2) | Mesma decisão do usuário já aplicada em `formulario-pre-curso` nesta sessão: "derive e eu reviso depois" — evita bloquear a feature por falta de planilha/anexo | y (decisão de derivar); n nos itens individuais marcados abaixo |
| Pré-condição de criação do Pós-Curso (o doc só diz "durante e após a execução", sem amarrar ao status do Pré-Curso) | Pós-Curso pode ser criado independente do status do Pré-Curso vinculado (`EM_ANDAMENTO` ou `ENCERRADO`) — sem gate entre os dois formulários | Decisão explícita do usuário nesta sessão | y |
| Nomes/opções das 3 categorias de despesa do bloco Financeiro (doc cita só "por categoria de despesa", sem listar quais) | Docentes/Instrutores, Material Didático, Infraestrutura (ver Dicionário de Campos, Bloco 4) | Categorias plausíveis de custeio de um curso de qualificação, mantendo o total de itens do bloco compatível com a contagem de 26 do documento fonte | n — revisar com o cliente antes do encerramento real da feature em produção |
| "Motivo e descrição da alteração" (campo revelado pela condicional de Execução) tratado como 1 único campo de texto livre, não 2 campos separados | `posExecAlteracaoDetalhe: texto livre` | O doc lista o campo revelado no singular ("Campo revelado"); um único campo de texto livre cobre motivo+descrição sem inventar uma segunda pergunta que o doc não pede | n — revisar |
| Opções dos campos de seleção sem lista explícita no doc (problemas de estudo, avaliação cognitiva, monitoramento, dificuldades enfrentadas, relação demanda/oferta, intenção de nova oferta, estratégias de continuidade, estratégias de ampliação) | Ver Dicionário de Campos | Mesma decisão acima — derivação com base no domínio (curso de qualificação profissional financiado por programa público), análoga ao `formulario-pre-curso` | n — revisar |
| "Motivos de abandono" é seleção única (não múltipla) | Seleção única (radio) | Já travado por **AD-025** (`STATE.md`) — "motivos de abandono (pós-curso do gestor)" é um dos 6 campos resolvidos como seleção única; reuso direto, não uma nova decisão desta feature | y |
| Validação de ordem entre as duas datas reais de execução (`posExecDataTerminoReal` não pode ser anterior a `posExecDataInicioReal`) | Rejeitar a gravação com HTTP 400 quando ambas as datas estiverem presentes no estado mesclado (existente + patch) | Mesma regra e mesma técnica (`ordemDatasValida`, validado contra o estado mesclado) que `formulario-pre-curso` teve de adicionar depois que o Verifier encontrou a lacuna nas datas previstas — aplicada aqui desde o início para as datas reais, que têm a mesma natureza de par ordenado | y — reuso de padrão já estabelecido, incluindo a lição registrada em `.specs/LESSONS.md` |

**Open questions:** none - all resolved or logged above (alguns marcados como pendentes de confirmação do cliente antes de produção — ver coluna "Confirmed?").

---

## Dicionário de Campos (Anexo — base para o Zod schema de `respostas`)

Chaves em camelCase, prefixo `pos` seguido do bloco, para uso direto como propriedades do JSON `PosCurso.respostas`. `sel-única` / `sel-múltipla` = seleção; `Outro?` = nenhum campo desta feature tem opção "Outro/Outra" (diferente do Pré-Curso — não há menção a isso na seção 5 do documento fonte).

### Bloco 1 — Acompanhamento Pedagógico (5 itens, todos obrigatórios)

| Chave | Rótulo | Tipo |
|---|---|---|
| `posAcompanhProblemasEstudo` | Problemas de estudo identificados | sel-múltipla, obrigatório (≥1): Dificuldade de leitura e interpretação / Dificuldade de concentração / Baixa frequência às aulas / Dificuldade de acesso a material didático / Conflito entre estudo e trabalho / Nenhum problema identificado |
| `posAcompanhConceitosTrabalhados` | Principais conceitos/temas trabalhados | texto livre |
| `posAcompanhPlanoAcao` | Plano de ação pedagógico adotado | texto livre |
| `posAcompanhAvaliacaoCognitiva` | Forma de avaliação cognitiva utilizada | sel-única: Prova escrita / Trabalho prático / Avaliação oral / Portfólio / Não foi realizada avaliação cognitiva |
| `posAcompanhMonitoramento` | Estratégias de monitoramento do aprendizado | sel-múltipla, obrigatório (≥1): Reuniões periódicas com os alunos / Acompanhamento individual / Relatórios de frequência / Feedback dos professores / Nenhum monitoramento formal |

### Bloco 2 — Execução (6 chaves: 5 diretas + 1 condicional, todos obrigatórios quando aplicável)

| Chave | Rótulo | Tipo |
|---|---|---|
| `posExecDataInicioReal` | Data real de início | data |
| `posExecDataTerminoReal` | Data real de término | data (SHALL ser ≥ `posExecDataInicioReal` — edge case) |
| `posExecCargaHorariaRealizada` | Carga horária efetivamente realizada (horas) | número inteiro > 0 |
| `posExecDificuldadesEnfrentadas` | Dificuldades enfrentadas na execução | sel-múltipla, obrigatório (≥1): Evasão de alunos / Problemas de infraestrutura / Indisponibilidade de professores / Questões climáticas / Restrições orçamentárias / Baixa adesão da comunidade / Nenhuma dificuldade |
| `posExecHouveAlteracaoPlanejamento` | Houve alteração no planejamento inicial? | sel-única: Sim / Não |
| *(condicional)* `posExecAlteracaoDetalhe` | Motivo e descrição da alteração | texto livre, obrigatório apenas se `posExecHouveAlteracaoPlanejamento` = "Sim" |

### Bloco 3 — Participação (6 itens, todos obrigatórios)

| Chave | Rótulo | Tipo |
|---|---|---|
| `posParticNumInscritos` | Número de inscritos | número inteiro ≥ 0 |
| `posParticNumMatriculados` | Número de matriculados | número inteiro ≥ 0 |
| `posParticNumConcluintes` | Número de concluintes | número inteiro ≥ 0 |
| `posParticMotivosAbandono` | Principal motivo de abandono | sel-única (**AD-025**): Dificuldades financeiras / Conflito com trabalho / Mudança de endereço / Desmotivação / Problemas de saúde / Não houve abandono |
| `posParticRelacaoDemandaOferta` | Relação entre demanda e oferta de vagas | sel-única: Demanda superou a oferta de vagas / Demanda foi igual à oferta / Demanda foi menor que a oferta |
| `posParticIntencaoNovaOferta` | Intenção de nova oferta do curso | sel-única: Sim / Não / Ainda não definido |

### Bloco 4 — Financeiro (7 itens, todos obrigatórios)

| Chave | Rótulo | Tipo |
|---|---|---|
| `posFinValorTotalExecutado` | Valor total executado | valor monetário ≥ 0 |
| `posFinValorDespesaDocentes` | Despesa com docentes/instrutores | valor monetário ≥ 0 |
| `posFinValorDespesaMaterialDidatico` | Despesa com material didático | valor monetário ≥ 0 |
| `posFinValorDespesaInfraestrutura` | Despesa com infraestrutura | valor monetário ≥ 0 |
| `posFinHouveDevolucaoRecursos` | Houve devolução de recursos? | sel-única: Sim / Não |
| `posFinValorDevolvido` | Valor devolvido | valor monetário ≥ 0 (`0` quando não houve devolução — resposta válida, não pendência; mesmo padrão do item de infraestrutura=0 do Pré-Curso) |
| `posFinNecessidadeAditivo` | Necessidade de aditivo orçamentário | sel-única: Sim / Não |

### Bloco 5 — Continuidade (2 itens, todos obrigatórios)

| Chave | Rótulo | Tipo |
|---|---|---|
| `posContEstrategiasContinuidade` | Estratégias de continuidade da formação | sel-múltipla, obrigatório (≥1): Nova turma no mesmo local / Ampliação para outros municípios / Parceria com instituição de ensino / Criação de curso avançado / Nenhuma estratégia definida |
| `posContEstrategiasAmpliacao` | Estratégias de ampliação da formação | sel-múltipla, obrigatório (≥1): Busca de novos parceiros financiadores / Aumento do número de vagas / Diversificação de conteúdo / Divulgação ampliada / Nenhuma estratégia definida |

**Contagem:** 5+6+6+7+2 = **26 chaves**, batendo exatamente com "Contém 26 itens de dado" (seção 5 do documento fonte). O comentário pré-existente em `prisma/schema.prisma` ("Respostas PG1..PG25") é só uma anotação descritiva anterior a esta feature, não uma contagem travada — sem divergência de convenção como a que existiu no Pré-Curso (54 vs 56): aqui a contagem de chaves do schema Zod bate 1:1 com a contagem de itens do documento fonte, porque o único condicional (`posExecAlteracaoDetalhe`) já está incluído nos "26 itens" do doc, diferente das 2 condicionais "Outro" do Pré-Curso que o doc contava junto da pergunta-mãe.

---

## User Stories

### P1: Criação do Pós-Curso vinculada a um Pré-Curso existente ⭐ MVP

**User Story**: Como Gestor Ofertante, quero iniciar o Pós-Curso de um curso que já cadastrei como Pré-Curso, para começar a registrar o acompanhamento da execução.

**Why P1**: Sem criação não há registro para preencher — é o ponto de entrada de toda a feature.

**Acceptance Criteria**:

1. WHEN um GO autenticado cria um Pós-Curso informando o `cdCurso` de um Pré-Curso do próprio Ofertante (em qualquer status), o system SHALL criar o registro com `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF do GO`. (REQ-PO-01)
2. IF já existe um Pós-Curso para o `cdCurso` informado THEN o system SHALL rejeitar a criação com HTTP 409, sem alterar o registro existente. (REQ-PO-02)
3. IF o `cdCurso` informado não existir ou pertencer a um Ofertante diferente do Ofertante do GO autenticado THEN o system SHALL rejeitar com HTTP 403 (fora de escopo) ou 404 (inexistente), sem vazar a existência de um `cdCurso` de outro Ofertante através do código de erro. (REQ-PO-03)

**Independent Test**: Criar um Pré-Curso, criar um Pós-Curso para ele (aceito), tentar criar um segundo Pós-Curso para o mesmo `cdCurso` (rejeitado com 409), tentar criar um Pós-Curso para um `cdCurso` de outro Ofertante (rejeitado com 403).

---

### P1: Preenchimento incremental do questionário ⭐ MVP

**User Story**: Como Gestor Ofertante, quero salvar as respostas do questionário aos poucos, em várias sessões, para não perder o preenchimento se eu precisar interromper.

**Why P1**: O questionário tem 26 chaves preenchidas ao longo da execução do curso (semanas/meses) — exigir tudo de uma vez não é o que a seção 5 do documento descreve (completude é exigida só no encerramento).

**Acceptance Criteria**:

1. WHILE o Pós-Curso está `EM_ANDAMENTO`, the system SHALL aceitar gravações parciais de `respostas` (PATCH com merge raso — só as chaves enviadas são alteradas), sem exigir que todos os 26 campos estejam preenchidos. (REQ-PO-04)
2. WHEN uma gravação (parcial ou completa) é submetida, the system SHALL validar a FORMA de cada campo enviado (tipo, opções válidas dentre as do Dicionário de Campos) via o schema Zod compartilhado, rejeitando com HTTP 400 qualquer valor fora de forma. (REQ-PO-05)
3. IF `posExecDataTerminoReal` for anterior a `posExecDataInicioReal` no estado resultante da gravação (existente + patch mesclados) THEN the system SHALL rejeitar a gravação desses dois campos com HTTP 400, sem persistir. (REQ-PO-06)
4. IF o GO tentar gravar `respostas` num Pós-Curso com `status=ENCERRADO` THEN the system SHALL rejeitar com HTTP 409, sem alterar nenhum dado. (REQ-PO-08, parte gravação)

**Independent Test**: Criar um Pós-Curso, gravar só o Bloco 1 (PATCH parcial), confirmar que os demais blocos continuam nulos e a gravação foi aceita; gravar `posExecDataInicioReal`/`posExecDataTerminoReal` invertidas e confirmar rejeição com 400.

---

### P1: Regra condicional como gate de encerramento ⭐ MVP

**User Story**: Como Gestor Ofertante, quero que o sistema só exija o campo de detalhe da alteração de planejamento quando ela realmente aconteceu, mas quero ser impedido de encerrar se esquecer de preenchê-lo.

**Why P1**: Seção 5.2 do documento fonte define essa regra como parte central do formulário; sem ela o Pós-Curso pode ser encerrado incompleto.

**Acceptance Criteria**:

1. WHEN `posExecHouveAlteracaoPlanejamento` = "Sim", the system SHALL exigir `posExecAlteracaoDetalhe` preenchido (não vazio, não só espaços) como condição para o encerramento. (REQ-PO-07)
2. The system SHALL permitir gravação parcial sem `posExecAlteracaoDetalhe` preenchido enquanto o Pós-Curso está `EM_ANDAMENTO` — a exigência vale só no momento do encerramento, não bloqueia PATCH intermediário.

**Independent Test**: Gravar `posExecHouveAlteracaoPlanejamento`="Sim" sem `posExecAlteracaoDetalhe`, confirmar que a gravação parcial é aceita mas uma tentativa de encerramento nesse estado é rejeitada; preencher o detalhe e confirmar que o encerramento passa a ser aceito (mantendo os demais campos obrigatórios completos).

---

### P1: Encerramento irreversível do Pós-Curso ⭐ MVP

**User Story**: Como Gestor Ofertante, quero encerrar o Pós-Curso quando terminar de preenchê-lo, sabendo que essa ação é definitiva, para travar o relatório de execução.

**Why P1**: Fecha AD-018 (revisado — Pós-Curso deixou de ser "sempre aberto" e passou a ser encerrado pelo GO) — sem isso o dado nunca fica auditável/estável.

**Acceptance Criteria**:

1. WHEN o GO aciona o encerramento e todos os 26 campos obrigatórios do Dicionário de Campos (incluindo o condicional aplicável, REQ-PO-07) estão preenchidos, the system SHALL alterar `status` para `ENCERRADO`, gravar `dataEncerramento=now()`, de forma irreversível. (REQ-PO-10)
2. IF o GO aciona o encerramento com qualquer campo obrigatório (incluindo o condicional aplicável) ausente THEN the system SHALL rejeitar com HTTP 400 listando as chaves do Dicionário de Campos pendentes, sem alterar `status`. (REQ-PO-09)
3. IF o Pós-Curso já está `ENCERRADO` THEN qualquer nova tentativa de gravação de `respostas` ou de encerramento SHALL ser rejeitada, preservando os dados atuais inalterados (somente leitura). (REQ-PO-08)
4. The system SHALL nunca permitir a transição `ENCERRADO` → `EM_ANDAMENTO` por nenhuma rota (AD-018 — sem exceção de reabertura administrativa).

**Independent Test**: Preencher todos os 26 campos de um Pós-Curso e encerrar (aceito); tentar gravar um campo após o encerramento (rejeitado, dado inalterado); tentar encerrar com um campo faltando (rejeitado, lista o campo).

---

### P1: Consulta e listagem escopadas por Ofertante ⭐ MVP

**User Story**: Como usuário do sistema, quero consultar e listar Pós-Cursos respeitando meu escopo de acesso, para nunca ver ou alterar dados de um Ofertante que não é o meu.

**Why P1**: Fecha, para este recurso, o mesmo padrão de reforço de escopo no servidor que `formulario-pre-curso` fechou para Pré-Curso (AD-012/AD-013/AD-033).

**Acceptance Criteria**:

1. WHERE um GO/VO consulta um Pós-Curso específico, the system SHALL retornar os dados apenas se o `cdOfertante` do Pré-Curso vinculado estiver no escopo do usuário (reuso de `podeAcessarOfertante`); AM/GT/VT SHALL poder consultar qualquer Pós-Curso. (REQ-PO-11)
2. WHERE um GO/VO lista Pós-Cursos, the system SHALL retornar apenas os do próprio Ofertante; AM/GT/VT SHALL receber todos (com filtro opcional por Ofertante). (REQ-PO-12)
3. IF um GO autenticado forjar uma requisição direta a um Pós-Curso de outro Ofertante (sem passar pela UI) THEN the system SHALL reavaliar a autorização no servidor a cada request e retornar HTTP 403, independentemente do que a interface exibe. (REQ-PO-13)
4. Apenas o GO vinculado ao Ofertante do Pós-Curso SHALL poder gravar respostas ou encerrar; VO (perfil de leitura, AD-008) SHALL receber HTTP 403 em qualquer tentativa de escrita. (REQ-PO-14)

**Independent Test**: Com um GO vinculado ao Ofertante A e um Pós-Curso do Ofertante B, tentar consultar/listar/gravar no Pós-Curso do Ofertante B e confirmar HTTP 403 em todos os casos; confirmar que o mesmo GO opera normalmente sobre Pós-Cursos do Ofertante A.

---

## Edge Cases

- IF nenhum Pré-Curso existir para o `cdCurso` informado na criação THEN the system SHALL rejeitar com HTTP 404, não uma exceção não tratada.
- IF um campo obrigatório de seleção múltipla for enviado como lista vazia `[]` THEN the system SHALL rejeitá-lo como campo não preenchido (não como lista válida de zero itens) — mesmo padrão do Pré-Curso.
- WHEN `posFinValorDevolvido` recebe o valor `0`, the system SHALL tratá-lo como resposta válida preenchida na checagem de completude do encerramento — `0` não é "campo vazio".
- IF qualquer valor monetário (`posFinValorTotalExecutado`, `posFinValorDespesaDocentes`, `posFinValorDespesaMaterialDidatico`, `posFinValorDespesaInfraestrutura`, `posFinValorDevolvido`) for negativo THEN the system SHALL rejeitar a gravação com HTTP 400.
- IF `posExecDataTerminoReal` for anterior a `posExecDataInicioReal` THEN the system SHALL rejeitar a gravação desses dois campos com HTTP 400 (REQ-PO-06 — cobre tanto as duas datas chegando no mesmo PATCH quanto uma data setada num PATCH anterior e a outra depois, contra o estado mesclado).
- IF o `cdCurso` de uma requisição de criação pertencer a um Ofertante diferente do Ofertante do GO autenticado THEN the system SHALL retornar HTTP 403 mesmo que o `cdCurso` exista de fato no banco (não vazar existência de dado fora de escopo via 404/400).

---

## Requirement Traceability

| Requirement ID | Story | Tasks | Status |
|---|---|---|---|
| PO-01 | P1: Criação | T1, T4, T8 | Implementing (T1 done) |
| PO-02 | P1: Criação | T4 | In Tasks |
| PO-03 | P1: Criação | T4 | In Tasks |
| PO-04 | P1: Preenchimento incremental | T5, T9 | In Tasks |
| PO-05 | P1: Preenchimento incremental | T1, T5, T9 | Implementing (T1 done) |
| PO-06 | P1: Preenchimento incremental (edge case) | T1, T5, T9 | Implementing (T1 done) |
| PO-07 | P1: Regra condicional | T3, T6, T9 | Implementing (T3 done) |
| PO-08 | P1: Encerramento | T5, T6 | In Tasks |
| PO-09 | P1: Encerramento | T3, T6, T9 | In Tasks |
| PO-10 | P1: Encerramento | T3, T6, T9 | In Tasks |
| PO-11 | P1: Consulta e listagem escopadas | T5, T9 | In Tasks |
| PO-12 | P1: Consulta e listagem escopadas | T4, T7 | In Tasks |
| PO-13 | P1: Consulta e listagem escopadas | T2, T4, T5, T6, T9 | In Tasks |
| PO-14 | P1: Consulta e listagem escopadas | T2, T4, T5, T6 | In Tasks |

**ID format:** `PO-NN` (Pós-Curso).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 14 mapped to tasks (T1-T9), 0 unmapped.

---

## Success Criteria

- [ ] Um GO consegue criar um Pós-Curso para um Pré-Curso próprio, preenchê-lo (com múltiplas gravações parciais) e encerrá-lo completo das 26 chaves, respeitando a regra condicional, sem erro inesperado.
- [ ] Um Pós-Curso encerrado é comprovadamente somente leitura: nenhuma rota aceita alteração de `respostas` ou `status` após `ENCERRADO`.
- [ ] Nenhuma requisição de leitura ou escrita cruza o escopo de Ofertante — confirmado por teste de integração/e2e simulando acesso forjado (espelha CA-OV-15/CA-SEC-14 de features anteriores).
- [ ] O Dicionário de Campos vira, 1:1, o schema Zod de `respostas` (26 chaves, tipos e a única condicional batendo com este documento).
