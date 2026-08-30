# Feature: avaliacao-aluno

**Escopo:** Complex (dupla condicionalidade inédita na base — gate Parte 1 → Parte 2, AD-023 — mais o gate interno "Concluiu o curso?" que libera/bloqueia 22 das 25 chaves da Parte 2; chave composta CPF+CD_Curso; regra RN-12 de "uma avaliação em andamento por vez" cruzando todos os cursos do aluno; dados demográficos sensíveis).
**Dependências:** `auth-e-usuarios` (sessão, cascata GO→AL, escopo), `seguranca-transversal` (CSRF, erro genérico, `podeAcessarOfertante`), `cadastro-ofertante-verba` (Ofertante/Verba), `formulario-pre-curso` (`TB_Avaliacao_Aluno.CD_Curso` é FK para `TB_Pre_Curso.CD_Curso` — não existe avaliação sem um Pré-Curso já criado).
**Fonte de decisões:** STATE.md AD-004, AD-008, AD-009, AD-012, AD-013, AD-018, AD-020, AD-022, AD-023, AD-025, AD-033, AD-034.
**Fonte funcional:** `docs/SPMA_Especificacao_Cliente_v2.md` seção 6 (Formulário de Avaliação do Aluno), seção 3.7 (`TB_Avaliacao_Aluno`), seção 7 (segurança), seção 8 (RN-06, RN-07, RN-09, RN-12, RN-13, RN-14).

---

## Problem Statement

O quarto e último formulário do sistema — a Avaliação do Aluno — ainda não tem rota nem UI, embora o model `AvaliacaoAluno` já exista no schema (chave composta CPF+CD_Curso, flag `parte1Completa`, `respostas Json?`). O aluno precisa se inscrever num curso (vínculo criado pelo Gestor Ofertante, mesmo padrão de toda criação de recurso-filho já estabelecido nesta base), preencher os dados pessoais/motivação (Parte 1) antes de a Parte 2 (avaliação do curso, liberada só após a conclusão) abrir, e encerrar de forma irreversível quando terminar. Sem isso, o ciclo de coleta de dados do sistema fica incompleto e o dashboard futuro (AD-024) não tem esse terceiro e último ponto de entrada.

## Goals

- [ ] GO autenticado matricula um Aluno (CPF já cadastrado) num curso (`cdCurso`) do próprio Ofertante, criando a avaliação com `status=EM_ANDAMENTO`.
- [ ] O próprio Aluno preenche a Parte 1 (19 chaves) em gravações parciais; o sistema calcula `parte1Completa` a cada gravação.
- [ ] A Parte 2 (25 chaves) só aceita gravação depois de `parte1Completa=true`; dentro da Parte 2, a resposta a "Concluiu o curso?" decide se as 22 chaves de avaliação de fato são exigidas no encerramento.
- [ ] O próprio Aluno encerra a avaliação de forma irreversível quando todos os campos aplicáveis estiverem completos.
- [ ] RN-12 é reforçada: um Aluno nunca tem duas avaliações `EM_ANDAMENTO` simultâneas, mesmo em cursos diferentes.
- [ ] Toda leitura/escrita reforça o escopo (Aluno vê só a própria; GO/VO por Ofertante; AM/GT/VT nacional), no mesmo padrão de CA-SEC-14/REQ-PO-13.

## Out of Scope

| Feature | Motivo |
|---|---|
| Criação da conta do Aluno (`TP_Usuario=AL`) | Já entregue por `auth-e-usuarios` (cascata GO→AL, AD-009). Esta feature só matricula um Aluno já existente num curso. |
| Cancelamento/edição da matrícula pelo GO após criada | Não mencionado no documento fonte; o único ciclo descrito é criar → aluno preenche → aluno encerra. |
| Reabertura de avaliação encerrada | Proibido por AD-018 em qualquer feature. |
| Indicadores/dashboard agregando avaliações | Feature adiada, AD-024. |
| Exportação/relatórios da avaliação | Não mencionado no documento fonte para esta feature. |
| Múltiplas retomadas de estudo simultâneas (campo `avalContinuidadeRetomadaEstudos`) | AD-025 já resolveu como seleção única; revisar apenas se surgir caso real de múltipla retomada. |
| Segunda avaliação para o mesmo par (CPF, cdCurso) | Impossível por construção — chave composta é PK (`@@id([cpf, cdCurso])`), não regra de aplicação. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Quem cria a matrícula (linha `AvaliacaoAluno` inicial, vinculando um Aluno a um curso) — o documento fonte descreve só que "o Aluno vincula-se ao curso via avaliação" (seção 2.3/3.1), sem dizer quem aciona esse vínculo | O Gestor Ofertante (GO) do curso cria a matrícula, informando o CPF de um Aluno já cadastrado | Mesmo padrão estrutural de toda criação de recurso-filho já estabelecido nesta base: GT cria Verba, GO cria Pré-Curso, GO cria Pós-Curso — nenhuma feature até agora deixou a criação de um recurso-filho para o próprio usuário-alvo (o Aluno não teria como descobrir/escolher cursos de Ofertantes sem uma tela de "catálogo público" que o documento fonte nunca descreve) | y — alta confiança estrutural; revisar se o cliente descrever um fluxo de autoinscrição |
| Somente GO (não AM/GT) cria a matrícula | Mesma restrição de `podeGerenciarPreCurso` (só o GO dono do Ofertante do curso, sem exceção administrativa) | A seção 4 do documento fonte já atribui o preenchimento do pré-curso exclusivamente ao GO sem exceção de AM/GT; a matrícula é a mesma classe de operação (gestão operacional do curso) | y |
| Papel de "Concluiu o curso?" (Q22) como gate interno da Parte 2 | Com `"Não"`, exigem-se apenas Q22.1 (motivos) e Q23 (frequência). Com `"Sim"`, exigem-se Q23 e as 21 chaves de Q24 a Q37; Q38 é opcional nos dois casos | O questionário fonte põe o cabeçalho "Avaliação do curso (apenas para quem concluiu)" **em Q24**, não antes — Q22 e Q23 são do bloco "Participação", que todo aluno responde. Corrige o gate anterior, derivado da leitura da seção 6.3 do documento de especificação, que bloqueava Q23 junto do resto | y — o cabeçalho do papel é explícito sobre onde o gate começa |
| Nome (Q1) e CPF (Q2) não são chaves próprias do JSON `respostas` | Vêm do cadastro do próprio Usuário (`TB_Usuario.NM_Usuario`) e da chave primária da avaliação (`TB_Avaliacao_Aluno.CPF`) — não duplicados na Parte 1 | Evita duplicar dado já modelado noutra tabela/coluna; a UI exibe os dois como somente-leitura a partir da sessão, sem reperguntar. Confirmado pelo questionário fonte, que abre pedindo exatamente esses dois dados | y |
| Contagem de chaves: 19 (Parte 1) + 26 (Parte 2) = **45** | Bate exatamente com os "45 itens de dado" da seção 6 do documento de especificação | O dicionário derivado somava 44 e tolerava a diferença de 1 sem explicá-la. A chave que faltava é `avalOportunSituacaoTrabalhoOutra`, o campo "Quais?" da opção j de Q30 — visível só no questionário fonte | y — diferença resolvida, não mais tolerada |
| `avalOportunSituacaoTrabalho` (Q30) e `avalOportunIntencaoAtuarTurismo` (Q31) tratados como dois campos diretos, sem condicional entre si | Ambos exigidos diretamente (quando Q22 = "Sim"), sem um revelar o outro | Confirmado pelo questionário fonte: são duas perguntas numeradas independentes. Q30 tem, sim, um condicional próprio — a opção "Outra. Quais?" que revela `avalOportunSituacaoTrabalhoOutra` | y |
| `avalGeralComentariosFinais` (Q38) é opcional (não bloqueia encerramento) | Não entra na lista de chaves exigidas no encerramento | Q38 é comentário livre de melhoria ("algum comentário, crítica, elogio ou sugestão"), por natureza opcional. Q36, apesar de também ser ABERTA, é exigida: o papel a numera como pergunta de avaliação, não como espaço de sugestão | n — revisar com o cliente antes de produção |
| Opções de seleção de todas as perguntas | Transcritas do questionário fonte — ver Dicionário de Campos | Eram derivadas do domínio enquanto não havia anexo. Correções notáveis: Q9 (PCD) não é Sim/Não mas o tipo da deficiência; Q12 é lista fechada, não texto livre; Q23 são 4 faixas, não número 0–100; Q36 é texto ABERTO, não seleção; Q22.1 é múltipla | y |
| Lista nominal das perguntas do questionário | Transcrita 1:1 de `docs/Questionario_do_Aluno_1.md` (questionário real do cliente, recebido em 2026-08-29), Q1–Q38 → 45 chaves no schema Zod | O questionário fonte substituiu o dicionário derivado das descrições por bloco — ver AD-035 | y — é o documento do cliente, não mais uma derivação |

**Open questions:** none - all resolved or logged above (vários marcados como pendentes de confirmação do cliente antes de produção — ver coluna "Confirmed?").

---

## Dicionário de Campos (Anexo — base para o Zod schema de `respostas`)

**Fonte:** `docs/Questionario_do_Aluno_1.md` (questionário real do cliente, recebido em 2026-08-29). A numeração `Q1..Q38` abaixo é a do papel: Q1–Q21 formam a Parte 1, Q22–Q38 a Parte 2. Este anexo **substituiu** o dicionário derivado que existia antes dessa data — ver AD-035 em `STATE.md`.

Chaves em camelCase, para uso direto como propriedades do JSON `AvaliacaoAluno.respostas`. **Q1 (nome completo) e Q2 (CPF) não são chaves deste JSON**: vêm de `TB_Usuario.NM_Usuario` e da própria chave primária da avaliação, e a UI os exibe como somente-leitura a partir da sessão.

### Parte 1 — Dados Pessoais (Q3–Q9, 7 itens)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalPessoalEstado` | 3 | Estado de residência | sel-única (27 UFs) |
| `avalPessoalMunicipio` | 4 | Município e Estado | texto |
| `avalPessoalGenero` | 5 | Gênero | sel-única: Feminino / Masculino / Prefiro não informar |
| `avalPessoalFaixaEtaria` | 6 | Faixa etária | sel-única: Até 18 anos / 19 a 25 / 26 a 35 / 36 a 50 / Acima de 50 anos |
| `avalPessoalEscolaridade` | 7 | Qual o seu nível de escolaridade | sel-única, 10 opções: Sem escolaridade → Pós-graduação completa |
| `avalPessoalRacaEtnia` | 8 | Qual a sua cor/raça/etnia? | sel-única: Branco / Negro / Pardo / Amarelo / Indígena |
| `avalPessoalCondicaoPcd` | 9 | Você é uma Pessoa com Deficiência (PCD)? | sel-única, 5 opções: "Não sou uma Pessoa com Deficiência." / física / auditiva / visual / intelectual-mental |

> Q9 **não é Sim/Não**: o papel pede o tipo da deficiência na mesma pergunta. Q8 não traz "Prefiro não informar", e Q5 não traz "Não binário" — ambos existiam só no dicionário derivado.

### Parte 1 — Situação Profissional (Q10–Q13, 4 chaves, 1 condicional)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalProfissCondicaoTrabalho` | 10 | Qual sua condição atual de trabalho? | sel-única, 9 opções: Estagiário(a) / MEI / PJ / Profissional Liberal / Autônomo-Freelancer / Informal / Formal (CLT) / Estudante / Desempregado |
| `avalProfissAtuaTurismo` | 11 | Atualmente você trabalha na área de Turismo? | sel-única: Sim / Não |
| `avalProfissAtividadeEspecifica` | 12 | *(condicional)* Se sim, em qual atividade? | **sel-única**, 10 opções (Serviços de Alimentação … Turismo de Base Comunitária / Outro); obrigatória apenas se Q11 = "Sim" |
| `avalProfissFaixaRenda` | 13 | Qual a sua faixa de renda mensal | sel-única, 7 faixas: Sem renda → Acima de 10 salários mínimos |

> Q12 era texto livre no dicionário derivado; no papel é uma lista fechada.

### Parte 1 — Experiência (Q14–Q16, 3 chaves, 1 condicional)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalExperienciaTrabalhoPrevio` | 14 | Já trabalhou no setor de Turismo? | sel-única: Sim / Não |
| `avalExperienciaCursoAnterior` | 15 | Já realizou cursos na área de Turismo antes? | sel-única: Sim / Não |
| `avalExperienciaTipoCursoAnterior` | 16 | *(condicional)* Se sim, qual? | sel-única, 7 opções: Atualização profissional / Técnico / Tecnológico-Superior / Graduação / Especialização-MBA / Mestrado-Doutorado / Outro; obrigatória apenas se Q15 = "Sim" |

### Parte 1 — Motivação (Q17–Q18, 2 itens)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalMotivMotivosParticipacao` | 17 | Quais os três (03) principais motivos para participar do Curso? | sel-múltipla, **1 a 3 opções**, 6 alternativas |
| `avalMotivFormaConhecimento` | 18 | Como você ficou sabendo do curso? | sel-única, 8 opções: Prefeitura / Redes Sociais / comunidade / indicação de amigo(s) / rádio-tv local / carro de som / panfletos-outdoors / Outro |

### Parte 1 — Expectativas (Q19–Q21, 3 itens)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalExpectAtendimento` | 19 | Você considera que a sua expectativa no Curso será atendida? | sel-única: Sim / Parcialmente / Não |
| `avalExpectEmprego` | 20 | Você acredita que conseguirá um trabalho ou uma ascensão de carreira após o Curso? | sel-única: Sim / Talvez / Não |
| `avalExpectRenda` | 21 | Qual a sua expectativa de melhoria de renda após o Curso? | sel-única: Nenhuma / Baixa / Média / Alta |

**Parte 1: 7+4+3+2+3 = 19 chaves** (as mesmas 19 de `CHAVES_PARTE_1`).

---

### Parte 2 — Participação (Q22, Q22.1, Q23, 3 chaves, 1 condicional)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalParticipConcluiuCurso` | 22 | Você concluiu o Curso? | sel-única: Sim / Não |
| `avalParticipMotivoNaoConclusao` | 22.1 | *(condicional)* Se não concluiu, qual(ais) o(os) motivo(s) principal(ais)? | **sel-múltipla** (≥1), 10 opções idênticas às de Q16 do questionário do Gestor; obrigatória apenas se Q22 = "Não" |
| `avalParticipPercentualFrequencia` | 23 | Percentual de aulas frequentadas | sel-única: Até 25% / 26% a 50% / 51% a 75% / 76% a 100% |

> **Q23 é exigida de todo aluno**, tenha concluído ou não: está no bloco "Participação", e o cabeçalho "Avaliação do curso (apenas para quem concluiu)" só começa em Q24. Isso corrige o gate anterior, que a bloqueava junto do resto da Parte 2.
> Q22.1 é **múltipla** (marcada MÚLTIPLA ESCOLHA no papel), superando o AD-025 — ver AD-036. Q23 era número livre 0–100 no dicionário derivado; no papel são 4 faixas.

### Parte 2 — Avaliação do curso, apenas para quem concluiu (Q24, 8 linhas em escala)

Enunciado: *"Como você avalia os seguintes aspectos do curso:"*

| Chave | Aspecto |
|---|---|
| `avalCursoDinamicasInclusao` | Dinâmicas de inclusão e de participação do aluno nas aulas |
| `avalCursoMaterialDidatico` | Qualidade do material didático (vídeos, leituras, visitas técnicas, aulas práticas etc.) |
| `avalCursoConteudo` | Qualidade do conteúdo apresentado |
| `avalCursoClareza` | Clareza na exposição das aulas |
| `avalCursoConhecimentoInstrutores` | Conhecimento dos instrutores/professores |
| `avalCursoOrganizacao` | Organização do Curso (horário, local, comunicação) |
| `avalCursoInfraestruturaBasica` | Infraestrutura Básica de Atendimento (banheiros, bebedouros, limpeza, acessibilidade etc.) |
| `avalCursoInfraestruturaSalaAula` | Infraestrutura da Sala de Aula (climatização, equipamentos, mesas e cadeiras etc.) |

**Escala de Q24 (AD-020):** 1 = Péssimo · 2 = Ruim · 3 = Regular · 4 = Bom · 5 = Ótimo. Não há o `0` ("não há disponibilidade") da escala do Pré-Curso. O papel lista as colunas de ÓTIMO a PÉSSIMO; o valor armazenado é crescente e é a UI que apresenta na ordem do papel.

### Parte 2 — Aprendizado (Q25–Q27, 3 itens)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalAprendizAmpliacaoConhecimento` | 25 | O seu conhecimento após a conclusão do Curso | sel-única: Ampliou / Melhorou · Não ampliou / Não Melhorou · Indiferente |
| `avalAprendizAtendimentoExpectativas` | 26 | O Curso atendeu as suas expectativas | sel-única: Sim / Parcialmente / Não |
| `avalAprendizSensacaoPreparo` | 27 | Você se sente preparado para trabalhar na área da formação | sel-única: Sim / Parcialmente / Não |

### Parte 2 — Continuidade nos Estudos (Q28, 1 item)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalContinuidadeRetomadaEstudos` | 28 | Após a conclusão do Curso, você retomou os estudos? | sel-única, 7 opções: Sim, a educação básica / ao ensino fundamental / ao ensino médio / ao ensino técnico / ao ensino superior / a outras formações profissionais / Não |

### Parte 2 — Motivações após o Curso (Q29, 1 item)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalMotivacoesPosPercepcoes` | 29 | Após a conclusão do Curso, você sente que: | sel-múltipla (≥1), 6 opções: condições de atuar no Turismo / novas percepções de mundo / motivado a retomar os estudos / motivado a melhorar condições de vida / motivado a combater práticas de violência / percepções sobre mudanças climáticas |

### Parte 2 — Oportunidades Reais de Trabalho e Emprego (Q30, Q30.j, Q31, 3 chaves, 1 condicional)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalOportunSituacaoTrabalho` | 30 | Após a conclusão do Curso: | sel-única, 10 opções: 4 combinações emprego × (com/sem carteira) × (dentro/fora do Turismo) / autônomo / MEI / mesma posição de antes / desempregado / estudando / **Outra (Quais?)** |
| `avalOportunSituacaoTrabalhoOutra` | 30 | *(condicional)* Outra. Quais? | texto, obrigatório apenas se Q30 = "Outra" |
| `avalOportunIntencaoAtuarTurismo` | 31 | Caso não esteja trabalhando no Turismo, você pretende trabalhar no setor? | sel-única: Sim / Não |

> `avalOportunSituacaoTrabalhoOutra` é chave **nova**: é o único campo "Quais?" da Parte 2 e não existia no dicionário derivado. É ele que fecha a contagem em 45.

### Parte 2 — Efetivação no Emprego e Aumento da Renda (Q32–Q34, 3 itens)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalEfetivEmprego` | 32 | Caso não esteja efetivado no emprego, após a conclusão do Curso você foi efetivado? | sel-única: Sim / Não |
| `avalEfetivAumentoRenda` | 33 | Após a conclusão do Curso sua renda aumentou? | sel-única: Sim / Não |
| `avalEfetivMelhoriaPadraoVida` | 34 | Após a conclusão do Curso, o seu padrão de vida melhorou? | sel-única: Sim, totalmente / Sim, parcialmente / Não |

### Parte 2 — Avaliação geral (Q35–Q38, 4 itens)

| Chave | Q | Rótulo | Tipo |
|---|---|---|---|
| `avalGeralNota` | 35 | Qual nota você dá para o Curso (0 a 10)? | inteiro 0–10 |
| `avalGeralMelhoriasComunidade` | 36 | Como você avalia as melhorias em sua comunidade após a conclusão do Curso? | **texto livre** (marcado ABERTA no papel) |
| `avalGeralRecomendaCurso` | 37 | Você recomendaria este Curso para outra pessoa da comunidade? | sel-única: Sim / Não |
| `avalGeralComentariosFinais` | 38 | Comentário, crítica, elogio ou sugestão para a próxima edição | texto livre, **opcional** (não bloqueia o encerramento) |

**Parte 2: 3+8+3+1+1+3+3+4 = 26 chaves.**

**Contagem total: 19 + 26 = 45 chaves**, batendo exatamente com os "45 itens de dado" declarados na seção 6 do documento de especificação. O dicionário derivado que este anexo substituiu somava 44 e nunca reconciliava essa diferença de 1: a chave que faltava era `avalOportunSituacaoTrabalhoOutra` (o "Quais?" de Q30).

**Gate interno de Q22 (AVAL-12/13):** com `avalParticipConcluiuCurso = "Não"`, exigem-se apenas Q22.1 e Q23. Com `"Sim"`, exigem-se Q23 e as 21 chaves de Q24 a Q37 — Q38 é opcional em qualquer caso.

**Condicionais (4 chaves):** `avalProfissAtividadeEspecifica` (Q12), `avalExperienciaTipoCursoAnterior` (Q16), `avalParticipMotivoNaoConclusao` (Q22.1), `avalOportunSituacaoTrabalhoOutra` (Q30.j).

---

## User Stories

### P1: Matrícula do Aluno num curso ⭐ MVP

**User Story**: Como Gestor Ofertante, quero vincular um Aluno já cadastrado a um dos meus cursos, para abrir a avaliação que ele vai preencher.

**Why P1**: Sem matrícula não existe o registro `AvaliacaoAluno` para o aluno preencher — é o ponto de entrada de toda a feature.

**Acceptance Criteria**:

1. WHEN um GO autenticado cria uma matrícula informando o CPF de um Aluno (`TP_Usuario=AL`) já cadastrado e o `cdCurso` de um Pré-Curso do próprio Ofertante, the system SHALL criar `AvaliacaoAluno` com `status=EM_ANDAMENTO`, `parte1Completa=false`, `respostas=null`. (AVAL-01)
2. IF o CPF informado não pertencer a um usuário do tipo `AL` THEN the system SHALL rejeitar com HTTP 400. (AVAL-02)
3. IF já existir `AvaliacaoAluno` para o par (CPF, cdCurso) informado THEN the system SHALL rejeitar com HTTP 409, sem alterar o registro existente. (AVAL-03)
4. IF o Aluno já possuir outra `AvaliacaoAluno` com `status=EM_ANDAMENTO` (em qualquer curso, RN-12) THEN the system SHALL rejeitar a nova matrícula com HTTP 409, sem alterar a avaliação em andamento existente. (AVAL-04)
5. IF o `cdCurso` informado não existir ou pertencer a um Ofertante diferente do Ofertante do GO autenticado THEN the system SHALL rejeitar com HTTP 403 (fora de escopo) ou 404 (inexistente), sem vazar a existência de um curso de outro Ofertante através do código de erro. (AVAL-05)
6. IF um usuário que não é GO, ou é GO de um Ofertante diferente do dono do curso, tentar criar uma matrícula THEN the system SHALL rejeitar com HTTP 403. (AVAL-06)

**Independent Test**: Com um Aluno e um Pré-Curso já cadastrados no mesmo Ofertante, criar a matrícula (aceito); tentar matricular o mesmo par de novo (409); tentar matricular o mesmo Aluno num segundo curso enquanto a primeira avaliação segue `EM_ANDAMENTO` (409); tentar matricular usando o CPF de um usuário não-AL (400).

---

### P1: Preenchimento incremental da Parte 1 ⭐ MVP

**User Story**: Como Aluno, quero preencher meus dados pessoais e de motivação aos poucos, para não perder o que já respondi se eu precisar interromper.

**Why P1**: A Parte 1 é obrigatória antes de a Parte 2 abrir (AD-023/RN-13) — sem gravação parcial, o aluno seria forçado a responder 19 perguntas de uma vez só.

**Acceptance Criteria**:

1. WHILE `status=EM_ANDAMENTO`, the system SHALL aceitar do próprio Aluno autenticado (CPF da sessão = CPF da avaliação) gravações parciais das 19 chaves da Parte 1 via PATCH (merge raso), validando a FORMA de cada campo enviado via o schema Zod compartilhado (400 em caso de forma inválida). (AVAL-07)
2. WHEN uma gravação altera qualquer chave da Parte 1, the system SHALL recalcular `parte1Completa` comparando o estado mesclado (existente + patch) contra as 19 chaves da Parte 1 (incluindo os 2 condicionais aplicáveis: `avalProfissAtividadeEspecifica`, `avalExperienciaTipoCursoAnterior`) e persistir o novo valor do flag na mesma gravação. (AVAL-08)
3. IF um usuário diferente do próprio Aluno da avaliação (incluindo o GO que fez a matrícula) tentar gravar qualquer chave de `respostas` THEN the system SHALL rejeitar com HTTP 403. (AVAL-09)

**Independent Test**: Matricular um Aluno, gravar só o bloco Dados Pessoais (PATCH parcial), confirmar que `parte1Completa` permanece `false`; completar as 19 chaves da Parte 1 e confirmar que `parte1Completa` vira `true` na mesma resposta da gravação; tentar gravar como o GO da matrícula e confirmar 403.

---

### P1: Gate Parte 1 → Parte 2 ⭐ MVP

**User Story**: Como sistema, preciso impedir que o Aluno responda a avaliação do curso (Parte 2) antes de completar seus dados pessoais e de motivação (Parte 1).

**Why P1**: Fecha AD-023/RN-13 — sem esse gate, o "libera" da seção 6.1 do documento fonte não é aplicado.

**Acceptance Criteria**:

1. IF uma gravação incluir qualquer chave da Parte 2 enquanto `parte1Completa=false` no estado resultante (considerando o próprio patch) THEN the system SHALL rejeitar a gravação inteira com HTTP 400, sem persistir nenhuma chave da requisição — inclusive as chaves da Parte 1 enviadas no mesmo PATCH. (AVAL-10)
2. WHILE `parte1Completa=true`, the system SHALL aceitar gravações parciais de chaves da Parte 2. (AVAL-11)

**Independent Test**: Com uma avaliação recém-matriculada (`parte1Completa=false`), tentar gravar `avalParticipConcluiuCurso` isoladamente (rejeitado com 400, nada persistido); completar a Parte 1 e repetir a mesma gravação (aceita).

---

### P1: Regra condicional "Concluiu o curso?" como gate interno da Parte 2 ⭐ MVP

**User Story**: Como Aluno, quero que o sistema só me exija as perguntas de avaliação do curso quando eu de fato o concluí, mas quero informar o motivo se eu não concluí.

**Why P1**: Seção 6.3 do documento fonte define essa regra como central da Parte 2; sem ela, um aluno que não concluiu o curso ficaria bloqueado de encerrar por causa de 22 perguntas que não fazem sentido para o caso dele.

**Acceptance Criteria**:

1. WHEN `avalParticipConcluiuCurso="Não"` no estado mesclado, the system SHALL exigir `avalParticipMotivoNaoConclusao` preenchido (≥1 opção) como condição de completude, e SHALL tratar as demais 22 chaves da Parte 2 (frequência, as 8 de Avaliação do Curso, as 3 de Aprendizado, Continuidade, Motivações, as 2 de Oportunidades, as 3 de Efetivação e Renda, e `avalGeralNota`/`avalGeralMelhoriasComunidade`/`avalGeralRecomendaCurso`) como não-obrigatórias (inaplicáveis) para fins de completude no encerramento. (AVAL-12)
2. WHEN `avalParticipConcluiuCurso="Sim"` no estado mesclado, the system SHALL exigir as 22 chaves listadas em AVAL-12 preenchidas como condição de completude no encerramento (`avalGeralComentariosFinais` continua sempre opcional, ver Dicionário de Campos). (AVAL-13)
3. The system SHALL sempre aceitar gravação parcial de qualquer chave da Parte 2 enquanto `status=EM_ANDAMENTO` e `parte1Completa=true` — a obrigatoriedade condicional (AVAL-12/13) só é avaliada no momento do encerramento, nunca bloqueia um PATCH intermediário. (AVAL-14)

**Independent Test**: Gravar `avalParticipConcluiuCurso="Não"` com `avalParticipMotivoNaoConclusao` preenchido e nenhuma das 22 chaves restantes preenchida — confirmar que o encerramento é aceito; noutra avaliação, gravar `avalParticipConcluiuCurso="Sim"` sem as 22 chaves — confirmar que o encerramento é rejeitado listando as pendências; preencher as 22 e confirmar que o encerramento passa a ser aceito.

---

### P1: Encerramento irreversível da avaliação ⭐ MVP

**User Story**: Como Aluno, quero encerrar minha avaliação quando terminar de preenchê-la, sabendo que essa ação é definitiva.

**Why P1**: Fecha AD-018/RN-09 (transição irreversível) e RN-12 (libera o aluno para uma nova avaliação em outro curso) — sem isso o dado nunca fica auditável/estável e o aluno fica travado para sempre numa única avaliação.

**Acceptance Criteria**:

1. WHEN o próprio Aluno aciona o encerramento e a Parte 1 (19 chaves) e a Parte 2 aplicável (regra de AVAL-12/13) estão completas, the system SHALL alterar `status` para `ENCERRADO` e gravar `dataEncerramento=now()`, de forma irreversível. (AVAL-15)
2. IF o encerramento for acionado com qualquer chave obrigatória pendente (Parte 1 ou a Parte 2 aplicável) THEN the system SHALL rejeitar com HTTP 400 listando as chaves do Dicionário de Campos pendentes, sem alterar `status`. (AVAL-16)
3. IF `status` já é `ENCERRADO` THEN qualquer nova tentativa de gravação de `respostas` ou de encerramento SHALL ser rejeitada com HTTP 409, preservando os dados atuais inalterados (somente leitura). (AVAL-17)
4. IF um usuário diferente do próprio Aluno da avaliação tentar encerrar THEN the system SHALL rejeitar com HTTP 403. (AVAL-18)
5. The system SHALL nunca permitir a transição `ENCERRADO` → `EM_ANDAMENTO` por nenhuma rota (AD-018 — sem exceção de reabertura administrativa). (AVAL-19)

**Independent Test**: Completar todos os campos aplicáveis de uma avaliação e encerrar (aceito, libera RN-12 para nova matrícula do mesmo Aluno noutro curso); tentar gravar um campo após o encerramento (rejeitado, dado inalterado); tentar encerrar com um campo obrigatório faltando (rejeitado, lista o campo); tentar encerrar como o GO (403).

---

### P1: Consulta e listagem escopadas ⭐ MVP

**User Story**: Como usuário do sistema, quero consultar e listar avaliações respeitando meu escopo de acesso, para nunca ver dado de outro Aluno ou de um Ofertante que não é o meu.

**Why P1**: Fecha, para este recurso, o mesmo padrão de reforço de escopo no servidor que `formulario-pre-curso`/`formulario-pos-curso` fecharam para seus recursos (AD-012/AD-013/AD-033).

**Acceptance Criteria**:

1. WHERE o próprio Aluno consulta uma avaliação, the system SHALL retornar os dados apenas se o CPF da sessão coincidir com o CPF da avaliação. (AVAL-20)
2. WHERE um GO/VO consulta uma avaliação específica, the system SHALL retornar os dados apenas se o `cdOfertante` do Pré-Curso vinculado estiver no escopo do usuário (reuso de `podeAcessarOfertante`); AM/GT/VT SHALL poder consultar qualquer avaliação. (AVAL-21)
3. WHERE um GO/VO lista avaliações, the system SHALL retornar apenas as vinculadas a cursos do próprio Ofertante; AM/GT/VT SHALL receber todas; o Aluno SHALL receber apenas a(s) própria(s). (AVAL-22)
4. IF qualquer usuário forjar uma requisição direta a uma avaliação fora do próprio escopo (Aluno de outro CPF; GO/VO de outro Ofertante) THEN the system SHALL reavaliar a autorização no servidor a cada request e retornar HTTP 403, independentemente do que a interface exibe. (AVAL-23)

**Independent Test**: Com dois Alunos (X e Y) e dois Ofertantes (A e B), confirmar que o Aluno X só vê a própria avaliação (403 na avaliação de Y); confirmar que um GO do Ofertante A recebe 403 ao consultar/listar avaliações de cursos do Ofertante B; confirmar que o mesmo GO opera normalmente sobre avaliações de cursos do Ofertante A.

---

## Edge Cases

- IF um campo obrigatório de seleção múltipla for enviado como lista vazia `[]` THEN the system SHALL rejeitá-lo como campo não preenchido (não como lista válida de zero itens) — mesmo padrão do Pré-Curso/Pós-Curso.
- IF `avalMotivMotivosParticipacao` receber mais de 3 itens THEN the system SHALL rejeitar a gravação com HTTP 400 (limite explícito do documento fonte, seção 6.1).
- IF `avalGeralNota` estiver fora do intervalo 0–10 THEN the system SHALL rejeitar a gravação com HTTP 400.
- IF `avalParticipPercentualFrequencia` estiver fora do intervalo 0–100 THEN the system SHALL rejeitar a gravação com HTTP 400.
- IF o CPF informado na matrícula não corresponder a nenhum usuário cadastrado THEN the system SHALL rejeitar com HTTP 404 (distinto do HTTP 400 usado quando o CPF existe mas não é do tipo `AL`, AVAL-02).
- WHEN `avalParticipConcluiuCurso` for alterado de "Sim" para "Não" numa gravação posterior, após as 22 chaves condicionais já terem sido preenchidas, the system SHALL aceitar a gravação e preservar os valores já salvos dessas chaves — eles só deixam de ser exigidos para completude, nunca são apagados automaticamente.
- WHEN o encerramento for solicitado com respostas que a própria avaliação tornou inaplicáveis (condicionais órfãs de Q12/Q16/Q22.1/Q30.j, ou as chaves de "apenas para quem concluiu" com `avalParticipConcluiuCurso="Não"`), the system SHALL descartá-las antes de validar a completude e gravar a avaliação encerrada sem elas — a preservação acima vale para as GRAVAÇÕES, o descarte só no encerramento (AD-038).
- IF o `cdCurso` de uma matrícula pertencer a um Ofertante diferente do Ofertante do GO autenticado THEN the system SHALL retornar HTTP 403 mesmo que o `cdCurso` exista de fato no banco (não vazar existência de dado fora de escopo via 404/400).

---

## Requirement Traceability

| Requirement ID | Story | Tasks | Status |
|---|---|---|---|
| AVAL-01 | P1: Matrícula | T4 | ✅ Verified |
| AVAL-02 | P1: Matrícula | T4 | ✅ Verified |
| AVAL-03 | P1: Matrícula | T4 | ✅ Verified |
| AVAL-04 | P1: Matrícula | T4 | ✅ Verified |
| AVAL-05 | P1: Matrícula | T4 | ✅ Verified |
| AVAL-06 | P1: Matrícula | T2, T4 | ✅ Verified |
| AVAL-07 | P1: Preenchimento Parte 1 | T5 | ✅ Verified |
| AVAL-08 | P1: Preenchimento Parte 1 | T3, T5 | ✅ Verified |
| AVAL-09 | P1: Preenchimento Parte 1 | T2, T5 | ✅ Verified |
| AVAL-10 | P1: Gate Parte 1 → Parte 2 | T1, T5 | ✅ Verified |
| AVAL-11 | P1: Gate Parte 1 → Parte 2 | T5 | ✅ Verified |
| AVAL-12 | P1: Regra condicional Concluiu | T3, T6 | ✅ Verified |
| AVAL-13 | P1: Regra condicional Concluiu | T3, T6 | ✅ Verified |
| AVAL-14 | P1: Regra condicional Concluiu | T5 | ✅ Verified |
| AVAL-15 | P1: Encerramento | T3, T6 | ✅ Verified |
| AVAL-16 | P1: Encerramento | T3, T6 | ✅ Verified |
| AVAL-17 | P1: Encerramento | T5, T6 | ✅ Verified |
| AVAL-18 | P1: Encerramento | T2, T6 | ✅ Verified |
| AVAL-19 | P1: Encerramento | T6 | ✅ Verified |
| AVAL-20 | P1: Consulta/listagem | T2, T5 | ✅ Verified |
| AVAL-21 | P1: Consulta/listagem | T2, T5 | ✅ Verified |
| AVAL-22 | P1: Consulta/listagem | T4 | ✅ Verified |
| AVAL-23 | P1: Consulta/listagem | T2, T5 | ✅ Verified |

**ID format:** `AVAL-NN` (Avaliação do Aluno).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 23 total, 23 mapped to tasks (T1-T9), 0 unmapped.

---

## Success Criteria

- [ ] Um GO consegue matricular um Aluno próprio num curso próprio; o Aluno preenche a Parte 1, é liberado para a Parte 2, preenche conforme a resposta de "Concluiu o curso?", e encerra a avaliação sem erro inesperado.
- [ ] Uma avaliação encerrada é comprovadamente somente leitura: nenhuma rota aceita alteração de `respostas` ou `status` após `ENCERRADO`.
- [ ] RN-12 é reforçada de ponta a ponta: nenhum Aluno consegue ter duas avaliações `EM_ANDAMENTO` simultâneas, comprovado por teste de integração/e2e.
- [ ] Nenhuma requisição de leitura ou escrita cruza o escopo do Aluno (CPF) ou do Ofertante — confirmado por teste simulando acesso forjado (espelha CA-SEC-14/REQ-PO-13 de features anteriores).
- [ ] O Dicionário de Campos vira, 1:1, o schema Zod de `respostas` (44 chaves, tipos, escala 1–5 e as 4 condicionais batendo com este documento).
