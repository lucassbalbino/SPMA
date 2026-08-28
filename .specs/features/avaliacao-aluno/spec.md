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
| Papel de "Concluiu o curso?" como gate interno da Parte 2 | Quando `avalParticipConcluiuCurso="Não"`, só `avalParticipMotivoNaoConclusao` é exigido; as 22 chaves restantes da Parte 2 (frequência + avaliação em escala + aprendizado + continuidade + motivações + oportunidades + efetivação + geral) ficam não-obrigatórias (inaplicáveis) para fins de completude/encerramento. Quando `="Sim"`, essas 22 chaves passam a ser exigidas | Leitura literal da seção 6.3: "Concluiu o curso? = Sim → Libera toda a Parte 2 de avaliação (frequência, escala de avaliação, aprendizado, continuidade, motivações, oportunidades)" — o verbo "libera" implica que, sem o "Sim", esses blocos permanecem bloqueados/inaplicáveis, não apenas opcionais | y — decorre da leitura literal do texto-fonte, não é uma escolha livre |
| Nome e CPF do bloco "Dados Pessoais" (seção 6.1) não são chaves próprias do JSON `respostas` | Vêm do cadastro do próprio Usuário (`TB_Usuario.NM_Usuario`) e da própria chave primária da avaliação (`TB_Avaliacao_Aluno.CPF`) — não duplicados na Parte 1 | Evita duplicar dado já modelado noutra tabela/coluna; a UI exibe os dois como somente-leitura a partir da sessão, sem reperguntar | y |
| Contagem de chaves derivadas (19 Parte 1 + 25 Parte 2 = 44) vs "45 itens de dado" do documento fonte | Aceita a diferença de 1, sem forçar um 45º campo artificial | Mesma tolerância já usada em `formulario-pre-curso` (54 chaves derivadas vs "56 itens" do documento fonte, nunca reconciliado à força) — a contagem de blocos do documento é descritiva, não uma lista nominal exaustiva | y — tolerado, não é uma AC |
| `avalOportunSituacaoTrabalho` e `avalOportunIntencaoAtuarTurismo` (bloco "Oportunidades de Trabalho") tratados como dois campos diretos, sem condicional entre si | Ambos exigidos diretamente (quando `avalParticipConcluiuCurso="Sim"`), sem um revelar o outro | A seção 6.3 (Campos Condicionais) só lista 4 regras condicionais explícitas, e nenhuma delas liga esses dois campos entre si — inventar uma condicional não listada violaria o limite do gate de fechamento | y — evita escopo não pedido pelo documento |
| `avalGeralComentariosFinais` é opcional (não bloqueia encerramento) | Não entra na lista de chaves exigidas no encerramento | Comentário final de texto livre é, por natureza, opcional em formulários de avaliação; o documento não marca esse item como obrigatório distintamente dos demais | n — revisar com o cliente antes de produção |
| Opções de seleção sem lista explícita no documento fonte (faixa etária, escolaridade, raça/etnia, faixa de renda, condição de trabalho, motivos de participação, forma de conhecimento do curso quando não travada por AD-025, expectativas, aprendizado, situação de trabalho pós-curso quando não travada por AD-025, efetivação, avaliação geral) | Ver Dicionário de Campos abaixo | Mesma decisão já aplicada em `formulario-pre-curso`/`formulario-pos-curso` nesta base: "derive e o cliente revisa depois" — evita bloquear a feature por falta de planilha/anexo; onde AD-025 já travou o tipo (seleção única), a decisão de FORMA já está tomada, só as opções em si são derivadas | y (decisão de derivar); n nos conjuntos de opções individuais — revisar com o cliente antes de produção |

**Open questions:** none - all resolved or logged above (vários marcados como pendentes de confirmação do cliente antes de produção — ver coluna "Confirmed?").

---

## Dicionário de Campos (Anexo — base para o Zod schema de `respostas`)

Chaves em camelCase, prefixo `aval` + bloco, para uso direto como propriedades do JSON `AvaliacaoAluno.respostas`. Nenhum campo desta feature tem opção "Outro/Outra" (o documento fonte não menciona isso na seção 6, diferente do Pré-Curso).

### Parte 1 — Dados Pessoais e Motivação (19 chaves)

#### Bloco Dados Pessoais (7 chaves — Nome e CPF não são chaves do JSON, ver Assunções)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalPessoalEstado` | Estado (UF) | sel-única: reuso de `OPCOES_UF` (`pre-curso.schema.ts`) |
| `avalPessoalMunicipio` | Município | texto livre |
| `avalPessoalGenero` | Gênero | sel-única: Feminino / Masculino / Não binário / Prefiro não informar |
| `avalPessoalFaixaEtaria` | Faixa etária | sel-única: 16 a 17 anos / 18 a 24 anos / 25 a 34 anos / 35 a 44 anos / 45 a 59 anos / 60 anos ou mais |
| `avalPessoalEscolaridade` | Escolaridade | sel-única: Fundamental incompleto / Fundamental completo / Médio incompleto / Médio completo / Superior incompleto / Superior completo / Pós-graduação |
| `avalPessoalRacaEtnia` | Raça/etnia | sel-única: Branca / Preta / Parda / Amarela / Indígena / Prefiro não informar |
| `avalPessoalCondicaoPcd` | Condição de PCD | sel-única: Sim / Não |

#### Bloco Situação Profissional (4 chaves: 3 diretas + 1 condicional)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalProfissCondicaoTrabalho` | Condição atual de trabalho | sel-única: Empregado(a) com carteira assinada / Empregado(a) sem carteira assinada / Autônomo(a) / Desempregado(a) / Estudante sem trabalho / Aposentado(a) |
| `avalProfissAtuaTurismo` | Atualmente trabalha em Turismo? | sel-única: Sim / Não (**condicionante**, seção 6.3) |
| *(condicional)* `avalProfissAtividadeEspecifica` | Atividade específica em que atua | texto livre, obrigatório apenas se `avalProfissAtuaTurismo="Sim"` |
| `avalProfissFaixaRenda` | Faixa de renda | sel-única: Sem renda / Até 1 salário mínimo / De 1 a 2 salários mínimos / De 2 a 3 salários mínimos / Acima de 3 salários mínimos |

#### Bloco Experiência (3 chaves: 2 diretas + 1 condicional)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalExperienciaTrabalhoPrevio` | Trabalho prévio em Turismo | sel-única: Sim / Não |
| `avalExperienciaCursoAnterior` | Já realizou cursos de Turismo? | sel-única: Sim / Não (**condicionante**, seção 6.3) |
| *(condicional)* `avalExperienciaTipoCursoAnterior` | Tipo de curso de Turismo já realizado | sel-única (**AD-025**, resolvida): Curso livre / Curso técnico / Graduação / Pós-graduação / Curso de extensão — obrigatório apenas se `avalExperienciaCursoAnterior="Sim"` |

#### Bloco Motivação (2 chaves)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalMotivMotivosParticipacao` | Motivos para participar do curso | sel-múltipla, obrigatório (1 a **3** opções, limite explícito do documento): Geração de renda / Qualificação profissional / Interesse pessoal no setor de Turismo / Exigência do mercado de trabalho / Empreender no setor / Indicação de terceiros / Outro motivo |
| `avalMotivFormaConhecimento` | Como ficou sabendo do curso | sel-única (**AD-025**, resolvida): Redes sociais / Indicação de conhecidos / Divulgação da Entidade Responsável / Rádio ou TV local / Cartazes ou panfletos / Escola ou instituição de ensino / Outra forma |

#### Bloco Expectativas (3 chaves)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalExpectAtendimento` | Expectativa de atendimento | sel-única: Superou minhas expectativas / Atendeu totalmente / Atendeu parcialmente / Não atendeu |
| `avalExpectEmprego` | Expectativa de emprego | sel-única: mesma escala de `avalExpectAtendimento` |
| `avalExpectRenda` | Expectativa de melhoria de renda | sel-única: mesma escala de `avalExpectAtendimento` |

### Parte 2 — Avaliação Pós-Curso (25 chaves — todas as chaves além de `avalParticipConcluiuCurso`/`avalParticipMotivoNaoConclusao` são condicionadas por `avalParticipConcluiuCurso="Sim"`, ver Assunções)

#### Bloco Participação (3 chaves)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalParticipConcluiuCurso` | Concluiu o curso? | sel-única: Sim / Não (**gate principal da Parte 2**, seção 6.3) |
| *(condicional)* `avalParticipMotivoNaoConclusao` | Motivo(s) de não conclusão | sel-múltipla, obrigatório (≥1) apenas se `avalParticipConcluiuCurso="Não"`: Dificuldades financeiras / Conflito com trabalho / Mudança de endereço / Problemas de saúde / Falta de tempo / Não se identificou com o curso / Outro motivo |
| *(condicional por Concluiu=Sim)* `avalParticipPercentualFrequencia` | Percentual de frequência | número, 0 a 100 |

#### Bloco Avaliação do Curso (8 chaves, escala 1–5 crescente — **AD-020**, sem "não há disponibilidade", condicionais por Concluiu=Sim)

| Chave | Rótulo |
|---|---|
| `avalCursoDinamicasInclusao` | Dinâmicas de inclusão |
| `avalCursoMaterialDidatico` | Material didático |
| `avalCursoConteudo` | Conteúdo |
| `avalCursoClareza` | Clareza |
| `avalCursoConhecimentoInstrutores` | Conhecimento dos instrutores |
| `avalCursoOrganizacao` | Organização |
| `avalCursoInfraestruturaBasica` | Infraestrutura básica |
| `avalCursoInfraestruturaSalaAula` | Infraestrutura de sala de aula |

#### Bloco Aprendizado (3 chaves, condicionais por Concluiu=Sim)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalAprendizAmpliacaoConhecimento` | Ampliação de conhecimento | sel-única: Sim, totalmente / Sim, parcialmente / Não |
| `avalAprendizAtendimentoExpectativas` | Atendimento de expectativas | sel-única: mesma escala de `avalExpectAtendimento` |
| `avalAprendizSensacaoPreparo` | Sensação de preparo | sel-única: Sim, me sinto totalmente preparado(a) / Parcialmente preparado(a) / Não me sinto preparado(a) |

#### Bloco Continuidade nos Estudos (1 chave, condicional por Concluiu=Sim)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalContinuidadeRetomadaEstudos` | Retomada de estudos após o curso | sel-única (**AD-025**, resolvida — simplificação, sem múltipla retomada): Sim, já retomei / Pretendo retomar em breve / Não pretendo retomar / Ainda não decidi |

#### Bloco Motivações Pós-Curso (1 chave, condicional por Concluiu=Sim)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalMotivacoesPosPercepcoes` | Percepções e motivações desenvolvidas após o curso | sel-múltipla, obrigatório (≥1): Maior autoconfiança / Vontade de empreender / Interesse em continuar estudando / Desejo de atuar no setor de Turismo / Melhoria na renda familiar / Nenhuma mudança percebida |

#### Bloco Oportunidades de Trabalho (2 chaves, condicionais por Concluiu=Sim, sem condicional entre si — ver Assunções)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalOportunSituacaoTrabalho` | Situação de trabalho após o curso | sel-única (**AD-025**, resolvida): Empregado(a) na área de Turismo / Empregado(a) fora da área de Turismo / Autônomo(a) na área de Turismo / Desempregado(a) buscando emprego / Estudante sem trabalho |
| `avalOportunIntencaoAtuarTurismo` | Intenção de atuar em Turismo | sel-única: Sim / Não / Ainda não decidi |

#### Bloco Efetivação e Renda (3 chaves, condicionais por Concluiu=Sim)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalEfetivEmprego` | Efetivação no emprego | sel-única: Sim / Não / Não se aplica |
| `avalEfetivAumentoRenda` | Aumento de renda | sel-única: Sim / Não / Não se aplica |
| `avalEfetivMelhoriaPadraoVida` | Melhoria de padrão de vida | sel-única: Sim / Não / Não se aplica |

#### Bloco Avaliação Geral (4 chaves; 3 condicionais por Concluiu=Sim, 1 sempre opcional)

| Chave | Rótulo | Tipo |
|---|---|---|
| `avalGeralNota` | Nota geral do curso | número inteiro, 0 a 10 |
| `avalGeralMelhoriasComunidade` | Percepção de melhorias na comunidade | sel-única: Sim / Não / Não sei avaliar |
| `avalGeralRecomendaCurso` | Recomendaria o curso? | sel-única: Sim / Não / Talvez |
| `avalGeralComentariosFinais` | Comentários finais | texto livre, **sempre opcional** (ver Assunções) — nunca exigido no encerramento |

**Contagem:** 19 (Parte 1) + 25 (Parte 2) = **44 chaves**, próximo de "45 itens de dado" da seção 6 (diferença de 1 tolerada — ver Assunções, mesmo padrão do Pré-Curso).

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
- IF o `cdCurso` de uma matrícula pertencer a um Ofertante diferente do Ofertante do GO autenticado THEN the system SHALL retornar HTTP 403 mesmo que o `cdCurso` exista de fato no banco (não vazar existência de dado fora de escopo via 404/400).

---

## Requirement Traceability

| Requirement ID | Story | Tasks | Status |
|---|---|---|---|
| AVAL-01 | P1: Matrícula | T4 | Implementing |
| AVAL-02 | P1: Matrícula | T4 | Implementing |
| AVAL-03 | P1: Matrícula | T4 | Implementing |
| AVAL-04 | P1: Matrícula | T4 | Implementing |
| AVAL-05 | P1: Matrícula | T4 | Implementing |
| AVAL-06 | P1: Matrícula | T2, T4 | Implementing |
| AVAL-07 | P1: Preenchimento Parte 1 | T5 | Implementing |
| AVAL-08 | P1: Preenchimento Parte 1 | T3, T5 | Implementing |
| AVAL-09 | P1: Preenchimento Parte 1 | T2, T5 | Implementing |
| AVAL-10 | P1: Gate Parte 1 → Parte 2 | T1, T5 | Implementing |
| AVAL-11 | P1: Gate Parte 1 → Parte 2 | T5 | Implementing |
| AVAL-12 | P1: Regra condicional Concluiu | T3, T6 | Implementing |
| AVAL-13 | P1: Regra condicional Concluiu | T3, T6 | Implementing |
| AVAL-14 | P1: Regra condicional Concluiu | T5 | Implementing |
| AVAL-15 | P1: Encerramento | T3, T6 | Implementing |
| AVAL-16 | P1: Encerramento | T3, T6 | Implementing |
| AVAL-17 | P1: Encerramento | T5, T6 | Implementing |
| AVAL-18 | P1: Encerramento | T2, T6 | Implementing |
| AVAL-19 | P1: Encerramento | T6 | Implementing |
| AVAL-20 | P1: Consulta/listagem | T2, T5 | Implementing |
| AVAL-21 | P1: Consulta/listagem | T2, T5 | Implementing |
| AVAL-22 | P1: Consulta/listagem | T4 | Implementing |
| AVAL-23 | P1: Consulta/listagem | T2, T5 | Implementing |

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
