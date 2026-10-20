# Alterações MTur (Documento 1) Specification

**Escopo:** Large (atravessa três formulários já DONE - `formulario-pre-curso`, `dados-pessoais-separados`, `avaliacao-aluno` - em schema Zod, completude, condicionais, tela e testes, e traz uma migration de dados que roda sozinha no próximo deploy, AD-047 §2).

**Fonte funcional:** `docs/Alteracoes_MTur_1.md` (pedido do MTur, 20 itens: 14 "Executar", 6 "Pendentes"), mais as decisões do usuário nesta sessão, registradas em Assumptions.

## Problem Statement

O MTur revisou os questionários. No pré-curso, mudou o enunciado de duas perguntas e o texto de cinco opções de "características contempladas". No aluno, trocou a nomenclatura de cor/raça para a do IBGE, reduziu a pergunta de PCD a Sim/Não e retirou quatro blocos de perguntas que o aluno não sabe responder antes de obter o certificado. As respostas já gravadas usam os textos antigos e precisam acompanhar a troca.

## Goals

- [ ] Os 13 itens aprovados e aplicáveis (todos os "Executar" menos o 1.1) aparecem na tela e no schema exatamente com o texto decidido.
- [ ] Nenhuma resposta já gravada fica com texto de opção que o schema novo rejeita.
- [ ] As respostas das 11 perguntas removidas do aluno deixam de existir no banco.
- [ ] Os 6 itens "Pendentes" não são tocados.

## Out of Scope

| Item | Motivo |
| --- | --- |
| 1.1 Campo "CNPJ" na identificação do ofertante | Decisão do usuário: já está implementado no sistema (`PreCurso.cdOfertante` é o CNPJ do GO). Nada a alterar. |
| 1.3 Município/UF na Seção de Qualificação | ⏸️ Pendente no documento do MTur. |
| 1.4 Pergunta "Outros municípios contemplados?" | ⏸️ Pendente no documento do MTur. |
| 1.9 Área "Idiomas" | ⏸️ Pendente no documento do MTur. |
| 1.11 / 1.12 Datas previstas de início/término de inscrição | ⏸️ Pendente no documento do MTur. |
| 1.13 Número de vagas | ⏸️ Pendente no documento do MTur. |
| Formulário 2 (Avaliação Formação Ofertante = pós-curso) | Sem alterações no documento. |
| Renumerar as perguntas do aluno | Decisão do usuário: manter os números originais (a tela pula de Q27 para Q29 e de Q29 para Q35). |
| Outras ocorrências de "Alojamento" (ex.: Q12 do aluno, "Alojamento (meios de hospedagem)") | O item 1.5 é da Seção de Qualificação do pré-curso. A Q12 do aluno sai inteira com o bloco Situação Profissional (3.3). |
| Push, deploy, aplicação da migration em produção | Fora do que a aprovação da spec autoriza (blast radius). Requer go-ahead explícito. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Forma exata após remover "outros" (1.6-1.8) | Tira só "/ outros" do fim do parêntese: "Hospedagem (recepcionista / camareiro(a) / copeiro(a))", "Serviços de Alimentação (bartender / auxiliar de cozinha)", "Cultura e Lazer (produtor(a) / recreacionista / artesã(o))" | Decisão do usuário | y |
| 1.5 + 1.6 aplicam-se à mesma opção | "Alojamento (… / outros)" vira "Hospedagem (recepcionista / camareiro(a) / copeiro(a))" | O documento lista "Hospedagem (outros)" como a forma pós-1.5 | y |
| Texto de 3.1 | "Preto" (sem "(IBGE)") | Decisão do usuário: "(IBGE)" indica a fonte da nomenclatura | y |
| Forma de 3.2 | Q9 passa a ter 2 opções: "Não sou uma Pessoa com Deficiência." e "Sim." - o tipo da deficiência deixa de ser perguntado | Decisão do usuário | y |
| Blocos de 3.4 e 3.5 | "Impacto do Curso no Trabalho" = Q30, Q30.j, Q31, Q32; "Evolução de Renda" = Q33, Q34. Somem inteiros os blocos "Oportunidades Reais de Trabalho e Emprego" e "Efetivação no Emprego e Aumento da Renda" | Nenhuma pergunta tem esses nomes; o usuário escolheu o mapeamento após a verificação | y |
| Respostas gravadas com texto antigo | Migration SQL faz `UPDATE` do texto antigo para o novo (pré-curso Q10, aluno Q8 e Q9) | Decisão do usuário. As 4 opções "Sim, tenho deficiência …" colapsam em "Sim." - o tipo se perde, consequência aceita da decisão de 3.2 | y |
| Respostas das perguntas removidas | Migration SQL faz `DELETE` das linhas das 11 chaves em `TB_Resposta_Avaliacao` | Decisão do usuário. Irreversível | y |
| Numeração das perguntas do aluno | Mantém os números originais nos rótulos | Decisão do usuário | y |
| Questionários-fonte em `docs/` | Atualizados com as mesmas mudanças; `docs/Alteracoes_MTur_1.md` salvo como fonte | Decisão do usuário | y |
| `parte1Completa` gravado fica desatualizado | A mesma migration recalcula `Parte1_Completa = true` nas avaliações em que as 7 chaves sempre-obrigatórias restantes da Parte 1 estão respondidas e Q16 está respondida quando Q15="Sim". Só pode virar `false → true`: a Parte 1 perdeu exigências, não ganhou | Sem isso, um aluno que respondeu tudo menos Situação Profissional continua com a Parte 2 bloqueada até regravar algum campo da Parte 1, sem nada pendente na tela. A presença da linha basta porque os valores das chaves restantes passaram pelo Zod ao gravar e suas opções não mudaram | n (decisão do agente) |
| Chave removida enviada numa gravação | Descartada em silêncio (200, nada gravado), sem 400 explícito como o de PESSOAL-13 | É o comportamento padrão do schema para qualquer chave desconhecida; um 400 só quebraria a aba que o aluno deixou aberta durante o deploy, sem proteger nada | n (decisão do agente) |
| Título da Parte 1 do aluno | "Parte 1 — Situação Profissional e Motivação" vira "Parte 1 — Experiência e Motivação" | O bloco que dava nome ao título sai | n (decisão do agente, baixo risco) |
| Dicionários dos specs antigos | `formulario-pre-curso/spec.md`, `avaliacao-aluno/spec.md` e `dados-pessoais-separados` não são reescritos; a AD-048 em `STATE.md` registra que esta feature os supera nos itens tocados | Mesma solução da AD-040/AD-035 para não reabrir specs DONE | n (decisão do agente) |

**Open questions:** none - todas resolvidas com o usuário ou registradas acima.

---

## User Stories

### P1: Pré-curso com os textos revisados ⭐ MVP

**User Story**: Como GO, quero ver as perguntas e opções do pré-curso com a redação do MTur, para responder ao questionário vigente.

**Why P1**: É metade do pedido e não depende do resto.

**Acceptance Criteria**:

1. The system SHALL exibir o rótulo da Q7 do pré-curso como "7. Endereço onde a ação de qualificação é realizada". (MTUR-01)
2. The system SHALL exibir o rótulo da Q30 do pré-curso como "30. Quais estratégias foram adotadas para a divulgação do Curso?". (MTUR-02)
3. The system SHALL aceitar em `qualifCaracteristicas` exatamente as 11 opções: "Hospedagem (recepcionista / camareiro(a) / copeiro(a))", "Agenciamento e Operação", "Serviços de Alimentação (bartender / auxiliar de cozinha)", "Transporte (Terrestre, Aquaviário ou Aéreo)", "Aluguel de Transportes", "Guiamento de Turismo / Condução de Turismo", "Ecoturismo / Turismo de Natureza", "Turismo de Base Comunitária", "Cultura e Lazer (produtor(a) / recreacionista / artesã(o))", "Eventos (cerimonialista / organizador(a) de eventos)", "Outro". (MTUR-03)
4. IF uma gravação de pré-curso envia em `qualifCaracteristicas` um dos 4 textos antigos ("Alojamento (recepcionista / camareiro(a) / copeiro(a) / outros)", "Serviços de Alimentação (bartender / auxiliar de cozinha / outros)", "Cultura e Lazer (produtor(a) / recreacionista / artesã(o) / outros)", "Eventos") THEN the system SHALL rejeitar a gravação na validação de forma. (MTUR-04)

**Independent Test**: abrir um pré-curso e ler os rótulos de Q7 e Q30 e as opções de Q10.

---

### P1: Dados pessoais com a nomenclatura nova ⭐ MVP

**User Story**: Como aluno, quero responder cor/raça e PCD com as opções do MTur.

**Why P1**: Item aprovado; dado pessoal alimenta todos os cursos do aluno.

**Acceptance Criteria**:

1. The system SHALL aceitar em `avalPessoalRacaEtnia` exatamente "Branco", "Preto", "Pardo", "Amarelo", "Indígena", nessa ordem. (MTUR-05)
2. The system SHALL aceitar em `avalPessoalCondicaoPcd` exatamente "Não sou uma Pessoa com Deficiência." e "Sim.", nessa ordem. (MTUR-06)
3. IF uma gravação envia "Negro" em `avalPessoalRacaEtnia` ou um dos 4 textos "Sim, tenho deficiência …" em `avalPessoalCondicaoPcd` THEN the system SHALL rejeitar a gravação na validação de forma. (MTUR-07)

**Independent Test**: abrir "Meus dados" e ler as opções de Q8 e Q9; salvar "Preto" e "Sim.".

---

### P1: Questionário do aluno sem os blocos pós-certificado ⭐ MVP

**User Story**: Como aluno, quero que o questionário não me peça o que eu só saberia depois do certificado.

**Why P1**: 4 dos 14 itens aprovados; é a mudança de regra (completude), não só de texto.

**Acceptance Criteria**:

1. The system SHALL omitir do formulário do aluno os blocos "Situação Profissional", "Continuidade nos Estudos", "Oportunidades Reais de Trabalho e Emprego" e "Efetivação no Emprego e Aumento da Renda". (MTUR-08)
2. IF uma gravação de avaliação envia qualquer das 11 chaves removidas THEN the system SHALL não gravar nenhuma linha dessa chave em `TB_Resposta_Avaliacao` (descarte silencioso, a mesma política de `z.object` para qualquer chave desconhecida). As 11 chaves: `avalProfissCondicaoTrabalho`, `avalProfissAtuaTurismo`, `avalProfissAtividadeEspecifica`, `avalProfissFaixaRenda`, `avalContinuidadeRetomadaEstudos`, `avalOportunSituacaoTrabalho`, `avalOportunSituacaoTrabalhoOutra`, `avalOportunIntencaoAtuarTurismo`, `avalEfetivEmprego`, `avalEfetivAumentoRenda`, `avalEfetivMelhoriaPadraoVida`. (MTUR-09)
3. WHEN as 7 chaves `avalExperienciaTrabalhoPrevio`, `avalExperienciaCursoAnterior`, `avalMotivMotivosParticipacao`, `avalMotivFormaConhecimento`, `avalExpectAtendimento`, `avalExpectEmprego`, `avalExpectRenda` estão respondidas e Q16 está respondida ou Q15 ≠ "Sim" THEN the system SHALL considerar a Parte 1 completa. (MTUR-10)
4. WHILE `avalParticipConcluiuCurso` = "Sim" the system SHALL exigir para encerrar exatamente as 15 chaves de Q24-Q27, Q29 e Q35-Q37 (8 de Q24, 3 de Q25-27, `avalMotivacoesPosPercepcoes`, `avalGeralNota`, `avalGeralMelhoriasComunidade`, `avalGeralRecomendaCurso`), além de Q22 e Q23. (MTUR-11)
5. The system SHALL manter nos rótulos restantes do aluno a numeração original (Q14 a Q27, Q29, Q35 a Q38). (MTUR-12)

**Independent Test**: abrir uma avaliação, contar os blocos e encerrar com Q22="Sim" sem nenhuma das 11 chaves.

---

### P1: Dados gravados acompanham a troca ⭐ MVP

**User Story**: Como responsável pelo dado do programa, quero que as respostas já gravadas sigam válidas depois da troca, e que as removidas sumam.

**Why P1**: Sem isso, formulários já preenchidos mostram campo vazio onde havia resposta, e o encerramento falha por valor inválido.

**Acceptance Criteria**:

1. WHEN a migration roda THEN the system SHALL ter trocado em `TB_Resposta_Pre_Curso` (chave `qualifCaracteristicas`) cada um dos 4 textos antigos pelo texto novo correspondente, sem alterar `Ordem`. (MTUR-13)
2. WHEN a migration roda THEN the system SHALL ter trocado em `TB_Dado_Pessoal_Aluno` "Negro" por "Preto" (chave `avalPessoalRacaEtnia`) e cada um dos 4 textos "Sim, tenho deficiência …" por "Sim." (chave `avalPessoalCondicaoPcd`). (MTUR-14)
3. WHEN a migration roda THEN the system SHALL ter removido de `TB_Resposta_Avaliacao` todas as linhas das 11 chaves removidas e nenhuma linha de outra chave. (MTUR-15)
4. WHEN a migration roda THEN the system SHALL ter gravado `Parte1_Completa = true` em toda `TB_Avaliacao_Aluno` que satisfaz MTUR-10 pelas linhas existentes, e não SHALL ter alterado `Parte1_Completa` de nenhuma outra. (MTUR-16)
5. IF uma linha já tem o texto novo (ou outro texto qualquer) THEN the system SHALL deixá-la intacta. (MTUR-17)

**Independent Test**: semear o banco de teste com valores antigos, rodar o SQL da migration e conferir as linhas.

---

### P2: Fontes em `docs/` atualizadas

**User Story**: Como mantenedor, quero os questionários-fonte iguais ao sistema, para que a próxima transcrição não reintroduza o texto antigo.

**Acceptance Criteria**:

1. The system SHALL ter `docs/Questionario_do_Gestor_Pre_Curso.md` e `docs/Questionario_do_Aluno_1.md` com os mesmos textos e remoções de MTUR-01 a MTUR-09, e `docs/Alteracoes_MTur_1.md` com o pedido do MTur. (MTUR-18)

**Independent Test**: grep nos três arquivos.

---

## Edge Cases

- IF a mesma opção antiga aparece em duas linhas do mesmo pré-curso (impossível hoje pelo Zod, que valida enum, mas não por constraint) THEN the system SHALL trocar as duas sem violar `@@unique([cdCurso, chave, ordem])` - a troca não altera `Ordem`. (coberto por MTUR-13)
- WHEN uma avaliação já está ENCERRADA THEN the system SHALL apagar suas linhas das 11 chaves da mesma forma (MTUR-15 não filtra por status).
- WHEN uma avaliação tem as chaves de Parte 1 restantes respondidas mas já está com `Parte1_Completa = true` THEN the system SHALL mantê-la `true` (MTUR-16).

Dimensões implícitas: estado (`parte1Completa`) coberto por MTUR-16; ciclo de vida do dado (exclusão) coberto por MTUR-15; idempotência da migration coberta por MTUR-17. Auth, concorrência, dependências externas, observabilidade: N/A - nenhuma rota, guarda ou chamada externa muda.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MTUR-01 | P1: Pré-curso | T1 | Implementing |
| MTUR-02 | P1: Pré-curso | T1 | Implementing |
| MTUR-03 | P1: Pré-curso | T1 | Implementing |
| MTUR-04 | P1: Pré-curso | T1 | Implementing |
| MTUR-05 | P1: Dados pessoais | T2 | Implementing |
| MTUR-06 | P1: Dados pessoais | T2 | Implementing |
| MTUR-07 | P1: Dados pessoais | T2 | Implementing |
| MTUR-08 | P1: Aluno sem blocos | T3 | Implementing |
| MTUR-09 | P1: Aluno sem blocos | T3 | Implementing |
| MTUR-10 | P1: Aluno sem blocos | T3 | Implementing |
| MTUR-11 | P1: Aluno sem blocos | T3 | Implementing |
| MTUR-12 | P1: Aluno sem blocos | T3 | Implementing |
| MTUR-13 | P1: Dados gravados | T4 | Implementing |
| MTUR-14 | P1: Dados gravados | T4 | Implementing |
| MTUR-15 | P1: Dados gravados | T4 | Implementing |
| MTUR-16 | P1: Dados gravados | T4 | Implementing |
| MTUR-17 | P1: Dados gravados | T4 | Implementing |
| MTUR-18 | P2: docs/ | T5 | Implementing |

**Coverage:** 18 total, 18 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Gate completo verde (`lint && build && typecheck && test:unit && test:integration && test:e2e`).
- [ ] `grep` por qualquer texto antigo (Alojamento/Negro/"Sim, tenho deficiência"/"Endereço da Sede"/"quais ações fundamentais") em `src/` e `e2e/` retorna zero.
- [ ] Os 6 pendentes intocados: nenhuma chave nova no schema do pré-curso.
