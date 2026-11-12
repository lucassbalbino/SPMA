# Revisão de Usabilidade 1 Specification

Fonte: `Verificacao_SPMA_07.11.26` (revisão de usabilidade do cliente, com os 2 comentários de Rayane Ruas de 2026-11-09). Os itens do documento aparecem entre colchetes, `[doc 12]`.

## Problem Statement

O sistema vai ser usado por pessoas leigas no país inteiro, e a revisão do cliente mostrou cinco tipos de atrito: códigos no lugar de nomes (`#4`, `Perfil: AM`), termos que o cliente quer trocar (Verba, Curso, Pré-Curso, Pós-Curso, Encerrar), mensagens em inglês ou sem contexto, ações que faltam (excluir formação, excluir aluno, editar o próprio perfil) e um bug: a lista de "Campos pendentes" não some depois que a pessoa preenche e salva. Tudo isso é camada de apresentação, validação e duas exclusões. Nenhuma tabela muda.

## Goals

- [ ] Nenhuma tela de lista, seleção ou título mostra `#<número>` como identificador de formação ou de recurso.
- [ ] Toda mensagem de validação que chega à tela está em português e nomeia a pergunta.
- [ ] Os termos do cliente (Recurso, Formação, Cadastro de Formação, Avaliação de Formação, Concluir) aparecem em todo texto visível, e rotas, tabelas, enums, chaves de API e `data-testid` não mudam.
- [ ] Formação sem aluno e aluno sem dados podem ser excluídos, com confirmação. Com "filho", a exclusão é recusada e nada é apagado.
- [ ] Os seis perfis editam nome, e-mail e telefone do próprio cadastro.
- [ ] Nenhuma migration.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Renomear rotas (`/pre-cursos`, `/verbas`...), tabelas, colunas, enums ou chaves JSON | O pedido é de texto visível. Trocar contrato e banco quebra o Power BI e os testes sem ganho para o usuário (AD-051, AD-052). |
| Validar o telefone da pergunta 6 do Cadastro de Formação | É pergunta do questionário em papel, não cadastro. Fica como está. |
| Troca de senha pelo próprio usuário | Decisão do usuário: a tela informa que a troca é pedida ao gestor. O "Resetar senha" da gestão continua. |
| Editar responsável, UF e município do GO pelo Editar Perfil | O usuário limitou o perfil a nome, e-mail e telefone. AM/GT seguem editando esses campos. |
| Excluir usuário de outro tipo (GO, VO, GT...) | O documento pede só "excluir aluno". |
| Excluir formação com o Cadastro de Formação concluído | Decisão do usuário: só em andamento. |
| Tela de Ofertantes e de Relatórios | Continuam sem tela; só o rótulo muda. |
| Salvamento automático | O documento pede o aviso de que ele não existe. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| De onde vem o nome da formação | Resposta P8 do Cadastro de Formação (`TB_Pre_Curso.P8`), sem espaços nas pontas. Vazia: `Formação sem nome (nº <cdCurso>)` | Resposta do usuário: "deve conter o nome do curso que o formulário está ligado". AD-052.2: o nome do curso é só a P8 | y |
| Nome na criação | "Nova Formação" exige o nome e o grava na P8 na mesma transação. `Formação sem nome (nº X)` só aparece para formação antiga criada sem P8 | Decisão do usuário (2026-11-11): "toda Formação precisa de um nome ao ser criada" | y |
| Nome do recurso | Já é obrigatório (`dsVerba`, `verba.schema.ts:28`, coluna `NOT NULL`). Só o rótulo do campo muda de "Identificação" para "Nome do recurso" | Decisão do usuário: "o mesmo acontece com as verbas"; a regra já existe | y |
| Escopo das renomeações | Só texto visível: menu, títulos, botões, mensagens de erro da API, estados. `data-testid`, rotas, enums e chaves ficam | Pedido do cliente é de nomenclatura para o usuário; mudar contrato é alteração desnecessária | y |
| Rótulo do status | Continua "Encerrado". Só o botão passa a "Concluir" | Decisão do usuário (2026-11-11) | y |
| "Avaliações Aluno" e "Minha avaliação" | Ficam com o nome de hoje | O documento não pede troca; "Avaliação de Formação" já é o nome do pós-curso | n |
| Título da lista de recursos para AM/GT | "Recursos" (o pedido "Recursos Recebidos" vale para GO/VO) | O documento pede "Recursos Recebidos" no perfil ofertante; AM/GT não recebem recurso | n |
| Recurso com nome repetido | Seletor e lista mostram só o nome, sem nenhuma informação extra, mesmo quando o nome repete. Supera IDV-12/13 | Decisão do usuário (2026-11-11) | y |
| Telefone dos perfis que não são GO | Grava na coluna `Usuario.telefone` (`Tel_Organizacao`), que já existe e é opcional | Evita migration. A coluna fica com nome de organização; renomear é pedido separado | n |
| Formato gravado do telefone novo | Só dígitos (10 ou 11, com DDD). Valores antigos ficam como estão e são exibidos como foram gravados | Não reescreve dado existente | n |
| Telefone antigo no Editar Perfil | Aparece como foi gravado (com máscara só se já segue a regra) e só é enviado, e revalidado pela RU-45, quando a pessoa o altera | Corrigido na verificação (Fix 2, 2026-11-12): a tela reescrevia o telefone antigo de quem só trocava o nome. Segue o edge case de telefone antigo desta spec | n |
| Telefone obrigatório | Obrigatório para GO (como hoje); opcional para os demais | Hoje só o GO tem telefone | n |
| Aviso de senha | "A troca de senha deve ser pedida ao gestor do seu curso." para todos menos AM | Texto do usuário. O AM não tem gestor acima | n |
| Concluir com alteração não salva | Concluir é bloqueado com "Salve antes de concluir." | Decisão do usuário (2026-11-11). É a causa do [doc 12]: o botão concluía o que estava no servidor, sem o que estava na tela | y |
| Excluir formação: o que some | `TB_Curso` + `TB_Pre_Curso` + `TB_Pos_Curso` da formação, numa transação. O saldo do recurso volta sozinho (é calculado dos cursos) | FKs de pré e pós já têm `ON DELETE CASCADE` (AD-052.3) | y |
| Excluir aluno: o que conta como "dados" | Linha em `TB_Dado_Pessoal_Aluno`, ou qualquer avaliação dele concluída ou com alguma resposta gravada | Resposta do usuário ("ter respondido algo"). A matrícula vazia nasce com o aluno e não conta | y |
| Excluir aluno: o que some | O usuário, as matrículas vazias e as sessões | Sem isso o FK de `TB_Avaliacao_Aluno` barra o `DELETE` | y |
| Quem exclui aluno | Quem pode editá-lo hoje (`exigirAlvoEditavel`: consulta escopada + `podeEditarUsuario`) | Mesma autoridade da edição e do reset de senha; nenhuma regra nova de permissão | n |
| Rota do excluir aluno | `POST /api/usuarios/excluir` com `{ documento }` no corpo, e não `DELETE /api/usuarios/<documento>` | Corrigido na execução (2026-11-11): CPF na URL fere a AD-029, e o reset de senha já segue a regra de documento no corpo (GU-48). Fora do escopo vira 403, não 404, para não revelar quem existe (GU-28/GU-43) | n |
| Regra nova de datas | Início da inscrição estritamente anterior ao início do curso. Nada mais cruza inscrição com curso | Texto do documento: "deve ser anterior". A regra término ≥ início já existe para os dois pares (AD-049.4) | y |
| Quando as regras de data rodam | No `PATCH` só quando o corpo traz uma das 4 datas (13, 14, 17b, 17c), conferindo contra o estado mesclado; e sempre na conclusão. Supera o AD-049.4, que conferia a cada `PATCH` | Decisão do usuário (2026-11-11): cadastro antigo com datas fora de ordem não pode travar a gravação de outras perguntas | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Salvar e concluir sem pendência fantasma ⭐ MVP

**User Story**: Como gestor, quero que a lista de pendências reflita o que eu já preenchi, para não ficar preso num erro que já corrigi. [doc 12]

**Why P1**: É bug. Hoje a pessoa preenche, salva e continua vendo "Campos pendentes".

**Acceptance Criteria**:

1. WHEN a gravação de "Salvar" responde 2xx THEN o sistema SHALL esvaziar a lista "Campos pendentes" e mostrar "Alterações salvas." (RU-01)
2. IF a pessoa clica em "Concluir" com campos alterados e não salvos THEN o sistema SHALL mostrar "Salve antes de concluir." e não SHALL abrir a confirmação nem pedir a conclusão. (RU-02)
3. WHEN a pessoa salva as alterações pendentes THEN o "Concluir" SHALL voltar a abrir a confirmação. (RU-03)

**Independent Test**: No pós-curso, concluir com a pergunta 26 vazia, marcar uma opção da 26 e clicar em Concluir: aparece "Salve antes de concluir.". Salvar esvazia a lista de pendências e o Concluir passa.

---

### P1: Mensagens de validação em português e com a pergunta ⭐ MVP

**User Story**: Como aluno ou gestor, quero entender qual resposta está errada e por quê. [doc 14, doc 15]

**Why P1**: Hoje aparece "Too big: expected array to have <=3 items", sem dizer a pergunta.

**Acceptance Criteria**:

1. The system SHALL configurar o Zod com o idioma português nos schemas lidos pelo navegador e pelo servidor. (RU-04)
2. IF o corpo de um `PATCH` de questionário falha na validação THEN a API SHALL responder 400 com `erro` (mensagem em português) e `campo` (a chave da primeira issue). (RU-05)
3. WHEN a resposta 400 traz `campo` THEN o formulário SHALL mostrar `<rótulo da pergunta>: <erro>`. (RU-06)
4. IF a pergunta 17 da avaliação chega com mais de 3 motivos THEN a API SHALL responder 400 com `erro` "Selecione no máximo 3 motivos". (RU-07)
5. WHILE a pergunta 17 tem 3 motivos marcados o formulário SHALL desabilitar as opções não marcadas. (RU-08)
6. WHILE a Parte 1 da avaliação está incompleta o formulário SHALL mostrar, no lugar da Parte 2, "Para liberar a Parte 2, responda todas as perguntas da Parte 1 e clique em Salvar." (RU-09)

**Independent Test**: Marcar 3 motivos na 17 deixa as outras 3 opções desabilitadas; um `PATCH` com 4 responde 400 com a mensagem em português e `campo: "avalMotivMotivosParticipacao"`.

---

### P1: Nome da formação no lugar do código ⭐ MVP

**User Story**: Como usuário, quero ver o nome da formação e do recurso, não um número, para achar o que procuro entre milhares. [doc 5, 6, 7, 8, 15]

**Why P1**: Com o país inteiro usando, a numeração sequencial vira caos.

**Acceptance Criteria**:

1. The system SHALL exibir o nome de uma formação como a P8 do Cadastro de Formação sem espaços nas pontas, ou `Formação sem nome (nº <cdCurso>)` quando a P8 está vazia ou nula. (RU-10)
2. WHEN as listas de Cadastro de Formação, Avaliação de Formação e Avaliações Aluno são exibidas THEN cada linha SHALL mostrar o nome da formação (RU-10) e nenhuma SHALL mostrar `#<cdCurso>`. (RU-11)
3. WHEN o Cadastro de Formação é aberto THEN o título SHALL ser `Cadastro de Formação - <nome>`. (RU-12)
4. WHEN a Avaliação de Formação é aberta, liberada ou não, THEN o título SHALL ser `Avaliação de Formação - <nome>`. (RU-13)
5. WHEN a avaliação de um aluno é aberta THEN o título SHALL ser `<nome> - CPF <cpf formatado>`. (RU-14)
6. WHEN um recurso é escolhido no seletor de "Nova Formação" THEN o campo fechado SHALL mostrar o mesmo texto da opção, não o número. (RU-15)
7. The system SHALL identificar cada recurso, no seletor e na lista de recursos, só pelo nome (`dsVerba`), sem `#<cdVerba>` nem outro identificador, mesmo quando o nome repete; o seletor de "Nova Formação" acrescenta ao nome o saldo (`<nome> — saldo R$ x`) e, para o AM, o nome do ofertante na frente (`<ofertante> — <nome> — saldo R$ x`). (RU-16)
8. IF o nome da formação em "Nova Formação" está vazio ou só com espaços THEN o sistema SHALL recusar com "Nome da formação é obrigatório" e não SHALL criar a formação. (RU-57)
9. WHEN uma formação é criada THEN `POST /api/cursos` SHALL gravar o nome, sem espaços nas pontas, na P8 do Cadastro de Formação, na mesma transação que cria curso, pré e pós. (RU-58)
10. IF um `PATCH` do Cadastro de Formação envia a pergunta 8 vazia ou só com espaços THEN a API SHALL responder 400 com `erro` "Nome da formação é obrigatório" e `campo` `qualifNomeCurso`. (RU-59)
11. The system SHALL rotular o campo `dsVerba` do cadastro e da edição de recurso como "Nome do recurso". (RU-60)

**Independent Test**: Criar "Mecânica Básica" sem preencher mais nada: o nome aparece nas três listas e nos títulos. Criar sem nome é recusado.

---

### P1: Concluir com confirmação e aviso de salvamento ⭐ MVP

**User Story**: Como gestor ou aluno, quero saber que preciso salvar e que concluir é definitivo. [doc 10]

**Why P1**: A conclusão é irreversível (AD-018) e hoje acontece num clique, com um rótulo que não diz isso.

**Acceptance Criteria**:

1. The system SHALL rotular o botão de conclusão dos três questionários como "Concluir" e SHALL manter o status `ENCERRADO` exibido como "Encerrado". (RU-17)
2. WHEN a pessoa clica em "Concluir" THEN o sistema SHALL abrir uma confirmação com o texto "Após a conclusão não será possível alterar os dados, tem certeza que deseja concluir?" e os botões "Sim" e "Não". (RU-18)
3. WHEN a pessoa escolhe "Não" THEN o sistema SHALL fechar a confirmação sem gravar nem concluir. (RU-19)
4. WHILE o questionário está editável o sistema SHALL mostrar, logo abaixo do status, o aviso fixo "O sistema não salva automaticamente. Salve o progresso do cadastramento." (RU-20)

**Independent Test**: Clicar em Concluir abre a confirmação; "Não" mantém o status "Em andamento"; "Sim" leva a "Encerrado".

---

### P1: Excluir formação ⭐ MVP

**User Story**: Como gestor, quero excluir uma formação que não vou mais oferecer. [doc 10, observação final]

**Why P1**: Hoje uma formação criada por engano fica para sempre e segura o saldo do recurso.

**Acceptance Criteria**:

1. WHILE o Cadastro de Formação está em andamento e a pessoa pode gerenciá-lo (`podeGerenciarPreCurso`) o formulário SHALL mostrar o botão "Excluir". (RU-21)
2. WHEN a pessoa clica em "Excluir" THEN o sistema SHALL pedir confirmação com o texto "Tem certeza que deseja excluir o cadastro? Após a exclusão não será possível recuperar os dados." e os botões "Sim" e "Não". (RU-22)
3. WHEN a exclusão é confirmada e a formação não tem aluno THEN `DELETE /api/cursos/<cdCurso>` SHALL apagar, numa transação, a linha de `TB_Curso` e as de `TB_Pre_Curso` e `TB_Pos_Curso`, responder 200 e a tela SHALL ir para `/pre-cursos`. (RU-23)
4. WHEN uma formação é excluída THEN o saldo disponível do recurso SHALL voltar a incluir o valor que ela tinha alocado. (RU-24)
5. IF a formação tem ao menos uma avaliação de aluno THEN a API SHALL responder 409 "Esta formação tem aluno cadastrado e não pode ser excluída." e não SHALL apagar nada. (RU-25)
6. IF o Cadastro de Formação está concluído THEN a API SHALL responder 409 "Cadastro de Formação concluído não pode ser excluído." e não SHALL apagar nada. (RU-26)
7. IF quem pede não pode gerenciar a formação THEN a API SHALL responder 403, e IF a formação não existe THEN SHALL responder 404. (RU-27)

**Independent Test**: Criar formação, excluir: some das listas e o saldo volta. Matricular um aluno: excluir responde 409.

---

### P1: Excluir aluno ⭐ MVP

**User Story**: Como gestor, quero excluir um aluno cadastrado por engano. [doc 13, observação final]

**Why P1**: Um CPF digitado errado hoje não tem conserto.

**Acceptance Criteria**:

1. WHILE a linha de um Aluno está aberta para edição e a pessoa pode editá-lo o sistema SHALL mostrar o botão "Excluir". (RU-28)
2. WHEN a pessoa clica em "Excluir" THEN o sistema SHALL pedir a mesma confirmação de RU-22. (RU-29)
3. WHEN a exclusão é confirmada e o aluno não tem dados THEN `POST /api/usuarios/excluir`, com o documento no corpo e nunca na URL (AD-029, GU-48), SHALL apagar, numa transação, o usuário, as matrículas e as sessões dele, e responder 200. (RU-30)
4. IF o aluno tem linha em `TB_Dado_Pessoal_Aluno`, ou uma avaliação concluída ou com alguma resposta gravada THEN a API SHALL responder 409 "Este aluno já tem dados preenchidos e não pode ser excluído." e não SHALL apagar nada. (RU-31)
5. IF o alvo não é Aluno THEN a API SHALL responder 400 "Só é possível excluir aluno." (RU-32)
6. IF o alvo está fora do escopo de quem pede, ou a pessoa não pode editá-lo, THEN a API SHALL responder 403 "Você não tem permissão para editar este usuário"; só para o AM um alvo inexistente SHALL responder 404 (mesma guarda do reset de senha, `exigirAlvoEditavel`, GU-28/GU-43). (RU-33)

**Independent Test**: Criar aluno e excluí-lo: some da lista. Aluno com dados pessoais: 409 e continua na lista.

---

### P2: Nomes por extenso e termos do cliente

**User Story**: Como usuário leigo, quero menus e títulos escritos por extenso. [doc 1, 3, 4, comentário 1]

**Why P2**: Melhora a leitura; nada quebra sem isso.

**Acceptance Criteria**:

1. WHEN o painel abre THEN o sistema SHALL mostrar "Olá, <nome>", "Você está no perfil de <nome do perfil por extenso>", "Portanto, está apto a realizar:" e a lista de módulos do perfil. (RU-34)
2. The system SHALL nomear os módulos como "Gestão de Usuários", "Gestão de Ofertante", "Gestão de Recursos", "Gestão de Formações" (GO/VO: "Minhas Formações"), "Visualização de Relatórios" e "Editar Perfil". (RU-35)
3. The system SHALL nomear os itens do menu como "Gestão de Usuários", "Gestão de Recursos", "Nova Formação", "Cadastro de Formação", "Avaliação de Formação", "Avaliações Aluno" e "Editar Perfil". (RU-36)
4. WHILE o perfil é GO ou VO o título da lista de recursos SHALL ser "Recursos Recebidos"; para AM e GT SHALL ser "Recursos". (RU-37)
5. The system SHALL intitular a lista da gestão de usuários "Usuários Cadastrados". (RU-38)
6. The system SHALL usar "recurso" no lugar de "verba", "formação" no lugar de "curso", "Cadastro de Formação" no lugar de "pré-curso", "Avaliação de Formação" no lugar de "pós-curso" nos menus, títulos de tela, botões, rótulos de campo de cadastro, avisos e mensagens de erro da API; ficam fora o texto das perguntas, das opções e dos cabeçalhos de parte dos questionários em papel (ex.: "Parte 2 — Avaliação Pós-Curso", AD-035) e os nomes de tabela e coluna do Power BI. (RU-39)

**Independent Test**: Logar como AM e conferir os textos do painel e do menu; como GO, ver "Recursos Recebidos".

---

### P2: Datas do planejamento

**User Story**: Como gestor, quero ser avisado quando as datas não fazem sentido. [doc 9]

**Acceptance Criteria**:

1. IF um `PATCH` traz uma das datas 13, 14, 17b ou 17c e, no estado mesclado, a data de início da inscrição (17b) é igual ou posterior à data de início (13) THEN a API SHALL responder 400 "A data de início da inscrição deve ser anterior à data de início da formação." (RU-40)
2. IF um `PATCH` traz uma das 4 datas e a data de término (14) é anterior à de início (13) THEN a API SHALL responder 400 "A data de término da formação não pode ser anterior à data de início." (RU-41)
3. IF a data de término da inscrição (17c) é anterior à de início (17b) THEN a API SHALL responder 400 "A data de término da inscrição não pode ser anterior à data de início." (RU-42)
4. IF um `PATCH` não traz nenhuma das datas 13, 14, 17b e 17c THEN a API SHALL gravar sem conferir a ordem das datas. (RU-61)
5. IF a conclusão é pedida com as datas fora de ordem THEN a API SHALL responder 400 com a mensagem da regra violada (RU-40 a RU-42) e não SHALL concluir. (RU-62)

**Independent Test**: Gravar 13 = 14/10/2026 e 17b = 20/10/2026 responde 400 com a mensagem de RU-40.

---

### P2: Telefone/WhatsApp com DDD

**User Story**: Como cadastrante, quero ser orientado a informar DDD + número, porque o contato será por WhatsApp. [doc 2]

**Acceptance Criteria**:

1. The system SHALL rotular o campo de telefone do cadastro do ofertante e do Editar Perfil como "Telefone/WhatsApp (com DDD)". (RU-43)
2. WHEN a pessoa digita no campo de telefone THEN o sistema SHALL formatar o valor como `(DD) NNNN-NNNN` ou `(DD) NNNNN-NNNN`. (RU-44)
3. IF o telefone informado não tem 10 ou 11 dígitos, ou o DDD está fora de 11 a 99 THEN o sistema SHALL recusar com "Informe o telefone com DDD, ex.: (61) 99999-9999". (RU-45)
4. WHEN um telefone válido é gravado THEN o sistema SHALL gravar só os dígitos. (RU-46)

---

### P2: Editar Perfil

**User Story**: Como usuário de qualquer perfil, quero corrigir meu nome, e-mail e telefone. [comentário 2]

**Acceptance Criteria**:

1. The system SHALL oferecer o item "Editar Perfil" (`/meus-dados`) no menu dos seis perfis. (RU-47)
2. WHEN AM, GT, VT, GO ou VO abre o Editar Perfil THEN o sistema SHALL mostrar nome, e-mail e telefone atuais em campos editáveis. (RU-48)
3. WHEN o formulário válido é enviado THEN `PATCH /api/usuarios/me/perfil` SHALL gravar nome, e-mail e telefone no próprio usuário da sessão e responder 200. (RU-49)
4. IF o nome está vazio ou o e-mail é inválido THEN a API SHALL responder 400 e não SHALL gravar nada. (RU-50)
5. IF quem chama é GO e o telefone está vazio THEN a API SHALL responder 400 "Telefone é obrigatório". (RU-51)
6. IF o perfil é Aluno THEN `PATCH /api/usuarios/me/perfil` SHALL responder 403; o Aluno edita pelo formulário de dados pessoais, que SHALL ganhar o campo de telefone opcional. (RU-52)
7. WHILE o perfil não é AM a tela SHALL mostrar "A troca de senha deve ser pedida ao gestor do seu curso." (RU-53)
8. The system SHALL não aceitar documento na URL nem no corpo de `PATCH /api/usuarios/me/perfil`. (RU-54)

---

### P2: Valor previsto na Avaliação de Formação

**User Story**: Como gestor, quero lembrar o valor previsto ao informar o valor total realizado. [doc 11]

**Acceptance Criteria**:

1. WHEN a Avaliação de Formação é exibida THEN o sistema SHALL mostrar, abaixo da pergunta 19, "Estava previsto inicialmente R$ <valor alocado>" no formato `R$ 60.000,00`. (RU-55)
2. The system SHALL não exigir que o valor da pergunta 19 seja igual ao previsto. (RU-56)

---

## Edge Cases

- IF a P8 tem só espaços THEN o nome SHALL ser `Formação sem nome (nº <cdCurso>)` (RU-10).
- IF duas pessoas excluem a mesma formação ao mesmo tempo THEN a segunda SHALL receber 404 (RU-27).
- IF um aluno é matriculado entre a abertura da tela e o "Sim" da exclusão THEN a API SHALL responder 409 (RU-25); a checagem roda dentro da transação.
- IF um telefone antigo, gravado com máscara ou texto livre, é exibido THEN o sistema SHALL mostrá-lo como foi gravado.
- WHEN a pergunta 13 ou a 17b está vazia THEN a regra de RU-40 SHALL não se aplicar.

---

## Implicit-requirement dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | RU-05 a RU-09, RU-40 a RU-46, RU-50, RU-51 |
| Failure / partial-failure states | RU-03; exclusões em transação (RU-23, RU-30) |
| Idempotency / retry / duplicate | Exclusão repetida cai em 404 (edge case); salvar repetido já é idempotente |
| Auth boundaries & rate limits | RU-27, RU-33, RU-52, RU-54; CSRF via `exigirMutacao` em toda rota nova |
| Concurrency / ordering | Checagem de "filho" dentro da transação (edge case) |
| Data lifecycle / expiry | Exclusão definitiva, sem lixeira, conforme texto de confirmação |
| Observability | N/A because as rotas novas seguem `comTratamentoDeErro`, sem log de dado sensível (AD-029) |
| External-dependency failure | N/A because nenhuma dependência externa nova |
| State-transition integrity | RU-26 (só exclui em andamento); conclusão segue irreversível (AD-018) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RU-01 | P1: Salvar e concluir | T1 | Implementing |
| RU-02 | P1: Salvar e concluir | T1 | Implementing |
| RU-03 | P1: Salvar e concluir | T1 | Implementing |
| RU-04 | P1: Mensagens | T2 | Implementing |
| RU-05 | P1: Mensagens | T2 | Implementing |
| RU-06 | P1: Mensagens | T3 | Implementing |
| RU-07 | P1: Mensagens | T4 | Implementing |
| RU-08 | P1: Mensagens | T5 | Implementing |
| RU-09 | P1: Mensagens | T5 | Implementing |
| RU-10 | P1: Nome da formação | T6 | Implementing |
| RU-11 | P1: Nome da formação | T7 | Implementing |
| RU-12 | P1: Nome da formação | T8 | Implementing |
| RU-13 | P1: Nome da formação | T8 | Implementing |
| RU-14 | P1: Nome da formação | T8 | Implementing |
| RU-15 | P1: Nome da formação | T9 | Implementing |
| RU-16 | P1: Nome da formação | T9 | Implementing |
| RU-17 | P1: Concluir | T12 | Implementing |
| RU-18 | P1: Concluir | T12 | Implementing |
| RU-19 | P1: Concluir | T12 | Implementing |
| RU-20 | P1: Concluir | T12 | Implementing |
| RU-21 | P1: Excluir formação | T15 | Implementing |
| RU-22 | P1: Excluir formação | T15 | Implementing |
| RU-23 | P1: Excluir formação | T13 | Implementing |
| RU-24 | P1: Excluir formação | T13 | Implementing |
| RU-25 | P1: Excluir formação | T13 | Implementing |
| RU-26 | P1: Excluir formação | T13 | Implementing |
| RU-27 | P1: Excluir formação | T13 | Implementing |
| RU-28 | P1: Excluir aluno | T18 | Implementing |
| RU-29 | P1: Excluir aluno | T18 | Implementing |
| RU-30 | P1: Excluir aluno | T17 | Implementing |
| RU-31 | P1: Excluir aluno | T16 | Implementing |
| RU-32 | P1: Excluir aluno | T16 | Implementing |
| RU-33 | P1: Excluir aluno | T17 | Implementing |
| RU-34 | P2: Nomes | T20 | Implementing |
| RU-35 | P2: Nomes | T19 | Implementing |
| RU-36 | P2: Nomes | T19 | Implementing |
| RU-37 | P2: Nomes | T21 | Implementing |
| RU-38 | P2: Nomes | T21 | Implementing |
| RU-39 | P2: Nomes | T22 | Implementing |
| RU-40 | P2: Datas | T23 | Implementing |
| RU-41 | P2: Datas | T23 | Implementing |
| RU-42 | P2: Datas | T23 | Implementing |
| RU-43 | P2: Telefone | T25 | Implementing |
| RU-44 | P2: Telefone | T24 | Implementing |
| RU-45 | P2: Telefone | T24 | Implementing |
| RU-46 | P2: Telefone | T24 | Implementing |
| RU-47 | P2: Editar Perfil | T30 | Implementing |
| RU-48 | P2: Editar Perfil | T29 | Implementing |
| RU-49 | P2: Editar Perfil | T27 | Implementing |
| RU-50 | P2: Editar Perfil | T27 | Implementing |
| RU-51 | P2: Editar Perfil | T27 | Implementing |
| RU-52 | P2: Editar Perfil | T29 | Implementing |
| RU-53 | P2: Editar Perfil | T29 | Implementing |
| RU-54 | P2: Editar Perfil | T27 | Implementing |
| RU-55 | P2: Valor previsto | T26 | Implementing |
| RU-56 | P2: Valor previsto | T26 | Implementing |
| RU-57 | P1: Nome da formação | T32 | Implementing |
| RU-58 | P1: Nome da formação | T32 | Implementing |
| RU-59 | P1: Nome da formação | T32 | Implementing |
| RU-60 | P1: Nome da formação | T21 | Implementing |
| RU-61 | P2: Datas | T23 | Implementing |
| RU-62 | P2: Datas | T23 | Implementing |

**Coverage:** 62 total, 62 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] Os 15 itens e os 2 comentários do documento têm requisito ou linha em Out of Scope.
- [ ] Nenhuma migration nova em `prisma/migrations`.
- [ ] Suítes unit, integration e e2e verdes no fim, com os textos atualizados.
