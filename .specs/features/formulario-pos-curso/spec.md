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
| Lista nominal das perguntas do questionário | Transcrita 1:1 de `docs/Questionario_do_Gestor_Pos_Curso.md` (questionário real do cliente, recebido em 2026-08-29), Q1–Q26 → 26 chaves no schema Zod — ver "Dicionário de Campos" abaixo | O questionário fonte substituiu o dicionário que havia sido **derivado** das descrições por bloco. Contagem de chaves inalterada (26); conteúdo, não: +2 perguntas novas (Q5, Q23), −1 campo removido (`posFinValorDevolvido`), −1 por fusão (Q26 cobre continuidade e ampliação numa pergunta só) — ver AD-035 | y — é o documento do cliente, não mais uma derivação |
| Pré-condição de criação do Pós-Curso (o doc só diz "durante e após a execução", sem amarrar ao status do Pré-Curso) | Pós-Curso pode ser criado independente do status do Pré-Curso vinculado (`EM_ANDAMENTO` ou `ENCERRADO`) — sem gate entre os dois formulários | Decisão explícita do usuário nesta sessão | y |
| Categorias de despesa do bloco Financeiro | Q20 professores/instrutores, Q21 materiais didáticos e insumos, Q22 infraestrutura, Q23 bolsa permanência — quatro categorias, não três | Transcritas do questionário fonte; a quarta (bolsa permanência) não existia no dicionário derivado | y |
| "Motivo e descrição da alteração" (Q12) tratado como 1 único campo de texto livre | `posExecAlteracaoDetalhe: texto livre` | Confirmado pelo questionário fonte: Q12 é uma única pergunta ABERTA ("Se sim, por qual motivo? Qual alteração foi necessária?") | y |
| Opções dos campos de seleção | Transcritas do questionário fonte — ver Dicionário de Campos | Eram derivadas do domínio enquanto não havia anexo. Correções notáveis: Q2/Q3/Q4 eram texto livre ou enum inventado e são alternativas fechadas; Q10 vira texto ABERTO; Q17 e Q18 são Sim/Não, não escalas de 3 opções | y |
| "Motivos de abandono" (Q16) é seleção **múltipla** | `sel-múltipla` (≥1), 10 opções idênticas às do questionário do Aluno (Q22.1) | **Supera o AD-025** (ver AD-036): aquele AD travou o campo como seleção única quando a lista real ainda não existia. O enunciado do papel está no plural ("Principais motivos") e a pergunta equivalente do Aluno vem marcada explicitamente como MÚLTIPLA ESCOLHA. Decisão explícita do usuário nesta sessão | y |
| Validação de ordem entre as duas datas reais de execução (`posExecDataTerminoReal` não pode ser anterior a `posExecDataInicioReal`) | Rejeitar a gravação com HTTP 400 quando ambas as datas estiverem presentes no estado mesclado (existente + patch) | Mesma regra e mesma técnica (`ordemDatasValida`, validado contra o estado mesclado) que `formulario-pre-curso` teve de adicionar depois que o Verifier encontrou a lacuna nas datas previstas — aplicada aqui desde o início para as datas reais, que têm a mesma natureza de par ordenado | y — reuso de padrão já estabelecido, incluindo a lição registrada em `.specs/LESSONS.md` |
| Alternativa excludente de Q6 e Q26 ("Nenhuma ação de monitoramento...", "Não foi adotada nenhuma estratégia...") | Rejeitada com HTTP 400 quando combinada com qualquer outra opção (`multiplaComExclusiva`), e desmarcada automaticamente na UI | Mesma decisão aplicada aos 5 campos equivalentes do Pré-Curso nesta sessão | y |
| Q16 (motivos de abandono) não oferece alternativa "não houve abandono" | Mantido como no papel: a pergunta é obrigatória e exige ≥1 opção, sendo "Outro" a válvula de escape | Fidelidade ao questionário fonte, que não traz essa alternativa — diferente do dicionário derivado, que tinha inventado "Não houve abandono". Um curso sem nenhuma evasão obriga o gestor a marcar "Outro" | n — vale confirmar com o cliente se falta uma alternativa "Não houve abandono" |

**Open questions:** none - all resolved or logged above (alguns marcados como pendentes de confirmação do cliente antes de produção — ver coluna "Confirmed?").

---

## Dicionário de Campos (Anexo — base para o Zod schema de `respostas`)

**Fonte:** `docs/Questionario_do_Gestor_Pos_Curso.md` (questionário real do cliente, recebido em 2026-08-29). A numeração `Q1..Q26` abaixo é a do papel. Este anexo **substituiu** o dicionário derivado que existia antes dessa data — ver AD-035 em `STATE.md`.

O arquivo fonte reúne dois momentos de coleta — "FORMULÁRIO – DURANTE O CURSO" (Q1–Q6) e "FORMULÁRIO PÓS-CURSO" (Q7–Q26) — num único registro de Pós-Curso, como esta feature já modelava.

Chaves em camelCase, para uso direto como propriedades do JSON `PosCurso.respostas`. `sel-única` / `sel-múltipla` = seleção; `excludente` = alternativa que nega todas as outras e não pode ser combinada com nenhuma (rejeitada com 400 pelo `multiplaComExclusiva`, `src/lib/validation/multipla.ts`).

### Durante o Curso — Acompanhamento Pedagógico (Q1–Q6, 6 itens, todos obrigatórios)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `posAcompanhProblemasEstudo` | 1 | Os problemas de estudo (desafios) que os Discentes deverão resolver foram definidos? | sel-única: definidos com a Coordenação / definidos sem a Coordenação / não foram definidos / Não se aplica |
| `posAcompanhConceitosTrabalhados` | 2 | As dimensões econômica, ambiental e sociocultural foram detalhadas a partir de conceitos pertinentes a cada dimensão? | sel-única: detalhados com a Coordenação / detalhados sem a Coordenação / não foram detalhados / Não se aplica |
| `posAcompanhPlanoAcao` | 3 | O Plano de Ação foi definido pelos Docentes em conjunto com a Coordenação Didático-Pedagógica? | sel-única: definido com a Coordenação / definido sem a Coordenação / não foi definido / Não se aplica |
| `posAcompanhProvaSituacao` | 4 | A "Prova Situação" foi elaborada pelos Docentes e devidamente realizada pelos alunos? | sel-única: elaborada e realizada no 1º dia e ao longo do curso / elaborada e realizada só no 1º dia / não foi elaborada / Não se aplica |
| `posAcompanhLicaoIndividual` | 5 | A "Lição Individual" (prova de encerramento) foi devidamente realizada pelos alunos? | sel-única: Sim, foi realizada. / Não foi realizada. / Não se aplica. |
| `posAcompanhMonitoramento` | 6 | Quais ações de monitoramento foram realizadas durante o desenvolvimento do Curso? | sel-múltipla (≥1): Reuniões com alunos / Reuniões com professores / Acompanhamento individualizado / Reuniões com parceiros / Registros administrativos periódicos / **excludente:** "Nenhuma ação de monitoramento foi realizada..." |

> Q2, Q3 e Q4 eram **texto livre** ou enum inventado no dicionário derivado; no papel são as quatro alternativas fechadas acima. Q5 (`posAcompanhLicaoIndividual`) é pergunta **nova** — não existia no dicionário derivado.

### Execução (Q7–Q12, 6 chaves: 5 diretas + 1 condicional)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `posExecDataInicioReal` | 7 | Data de início do Curso/Ação de Qualificação | data (`YYYY-MM-DD`) |
| `posExecDataTerminoReal` | 8 | Data de término do Curso/Ação de Qualificação | data, não anterior a Q7 |
| `posExecCargaHorariaRealizada` | 9 | Carga horária realizada (horas) | inteiro > 0 |
| `posExecDificuldadesEnfrentadas` | 10 | Quais as dificuldades enfrentadas na execução do Curso? | **texto livre** (marcado ABERTO no papel) |
| `posExecHouveAlteracaoPlanejamento` | 11 | Houve alguma alteração no planejamento inicial? | sel-única: Sim / Não |
| `posExecAlteracaoDetalhe` | 12 | *(condicional)* Se sim, por qual motivo? Qual alteração foi necessária? | texto livre, obrigatório apenas se Q11 = "Sim" (REQ-PO-07) |

> Q10 era seleção múltipla com opções inventadas no dicionário derivado; o papel marca **(ABERTO)**.

### Participação (Q13–Q18, 6 itens, todos obrigatórios)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `posParticNumInscritos` | 13 | Número de alunos inscritos | inteiro ≥ 0 |
| `posParticNumMatriculados` | 14 | Número de alunos matriculados | inteiro ≥ 0 |
| `posParticNumConcluintes` | 15 | Número de alunos concluintes | inteiro ≥ 0 |
| `posParticMotivosAbandono` | 16 | Principais motivos atestados para o abandono do Curso | **sel-múltipla** (≥1), 10 opções: Falta de motivação/interesse / Dificuldades financeiras / Dificuldades de aprendizagem / Problemas pessoais/familiares / Não ter com quem deixar o(s) filho(s) / Horário inapropriado das aulas / Impeditivos no trabalho / Local muito distante de casa / Professores não qualificados / Outro |
| `posParticDemandaMaiorQueOferta` | 17 | A demanda pelo Curso foi maior do que a oferta disponibilizada? | sel-única: Sim / Não |
| `posParticIntencaoNovaOferta` | 18 | Pretendem ofertar o Curso novamente? | sel-única: Sim / Não |

> Q16 é **múltipla**, superando o AD-025 (ver AD-036): o enunciado está no plural e a pergunta equivalente do questionário do Aluno (Q22.1) vem marcada explicitamente como MÚLTIPLA ESCOLHA. A lista é idêntica à do Aluno, de propósito — permite cruzar a visão do gestor com a do aluno sobre o mesmo curso.
> Q17 e Q18 são Sim/Não no papel; o dicionário derivado tinha inventado escalas de 3 opções para as duas.

### Financeiro (Q19–Q25, 7 itens, todos obrigatórios)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `posFinValorTotal` | 19 | Valor total do Curso/Ação de Qualificação (R$) | monetário ≥ 0 |
| `posFinValorProfessores` | 20 | Valor pago para professores e/ou instrutores (R$) | monetário ≥ 0 |
| `posFinValorMateriais` | 21 | Valor pago para aquisição de materiais didáticos e insumos (R$) | monetário ≥ 0 |
| `posFinValorInfraestrutura` | 22 | Valor pago com infraestrutura (R$) | monetário ≥ 0 |
| `posFinValorBolsaPermanencia` | 23 | Valor destinado a bolsa permanência (transporte, alimentação, uniforme, equipamentos etc.) (R$) | monetário ≥ 0 |
| `posFinHouveDevolucaoRecursos` | 24 | Houve devolução de recursos? | sel-única: Sim / Não |
| `posFinNecessidadeAditivo` | 25 | Houve a necessidade de complementação financeira (aditivos)? | sel-única: Sim / Não |

> Q23 (`posFinValorBolsaPermanencia`) é pergunta **nova**. Em contrapartida, o campo `posFinValorDevolvido` do dicionário derivado foi **removido**: o papel pergunta apenas *se* houve devolução (Q24), nunca o valor.

### Ações para Continuidade do Curso (Q26, 1 item, obrigatório)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `posContEstrategias` | 26 | Quais estratégias foram adotadas pensando na continuidade e na ampliação da formação proposta? | sel-múltipla (≥1): Parcerias com entidades públicas / Parcerias com entidades privadas / Parcerias com IES visando extensão / Integração a projetos e programas do território / Participação em editais de financiamento / **excludente:** "Não foi adotada nenhuma estratégia de continuidade e ampliação." |

> O papel faz **uma** pergunta cobrindo continuidade *e* ampliação; o dicionário derivado tinha inventado duas perguntas separadas (`posContEstrategiasContinuidade` e `posContEstrategiasAmpliacao`), agora fundidas em `posContEstrategias`.

**Contagem:** 6+6+6+7+1 = **26 chaves**, batendo exatamente com as 26 perguntas numeradas do questionário fonte e com o "Contém 26 itens de dado" da seção 5 do documento de especificação. O saldo em relação ao dicionário derivado (que também somava 26) é: **+2** perguntas novas (Q5 Lição Individual, Q23 bolsa permanência), **−1** campo removido (`posFinValorDevolvido`), **−1** por fusão (as duas de continuidade viraram Q26).

**Condicional (1 chave, REQ-PO-07):** `posExecAlteracaoDetalhe`, exigido apenas quando `posExecHouveAlteracaoPlanejamento = "Sim"`.

**Opções excludentes (2 perguntas):** `posAcompanhMonitoramento` (Q6), `posContEstrategias` (Q26).

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
- WHEN Q12 (`posExecAlteracaoDetalhe`) ficar órfã porque Q11 passou a "Não", the system SHALL preservá-la nas gravações e descartá-la no encerramento, gravando o registro encerrado sem ela (AD-038).

---

## Requirement Traceability

| Requirement ID | Story | Tasks | Status |
|---|---|---|---|
| PO-01 | P1: Criação | T1, T4, T8 | ✅ Verified |
| PO-02 | P1: Criação | T4 | ✅ Verified |
| PO-03 | P1: Criação | T4 | ✅ Verified |
| PO-04 | P1: Preenchimento incremental | T5, T9 | ✅ Verified |
| PO-05 | P1: Preenchimento incremental | T1, T5, T9 | ✅ Verified |
| PO-06 | P1: Preenchimento incremental (edge case) | T1, T5, T9 | ✅ Verified |
| PO-07 | P1: Regra condicional | T3, T6, T9 | ✅ Verified |
| PO-08 | P1: Encerramento | T5, T6 | ✅ Verified |
| PO-09 | P1: Encerramento | T3, T6, T9 | ✅ Verified |
| PO-10 | P1: Encerramento | T3, T6, T9 | ✅ Verified |
| PO-11 | P1: Consulta e listagem escopadas | T5, T9 | ✅ Verified |
| PO-12 | P1: Consulta e listagem escopadas | T4, T7 | ✅ Verified |
| PO-13 | P1: Consulta e listagem escopadas | T2, T4, T5, T6, T9 | ✅ Verified |
| PO-14 | P1: Consulta e listagem escopadas | T2, T4, T5, T6 | ✅ Verified |

**ID format:** `PO-NN` (Pós-Curso).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 14 mapped to tasks (T1-T9), 0 unmapped.

---

## Success Criteria

- [ ] Um GO consegue criar um Pós-Curso para um Pré-Curso próprio, preenchê-lo (com múltiplas gravações parciais) e encerrá-lo completo das 26 chaves, respeitando a regra condicional, sem erro inesperado.
- [ ] Um Pós-Curso encerrado é comprovadamente somente leitura: nenhuma rota aceita alteração de `respostas` ou `status` após `ENCERRADO`.
- [ ] Nenhuma requisição de leitura ou escrita cruza o escopo de Ofertante — confirmado por teste de integração/e2e simulando acesso forjado (espelha CA-OV-15/CA-SEC-14 de features anteriores).
- [ ] O Dicionário de Campos vira, 1:1, o schema Zod de `respostas` (26 chaves, tipos e a única condicional batendo com este documento).
