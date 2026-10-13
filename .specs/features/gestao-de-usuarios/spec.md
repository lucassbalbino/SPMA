# Gestão de Usuários Specification

**Escopo:** Large (rota de tela renomeada, listagem escopada com filtro, duas rotas de mutação novas, migração de FKs para `ON UPDATE CASCADE`).

**Fonte funcional:** pedido do usuário nesta sessão (2026-10-13) e as 8 decisões tomadas com ele (ver Assumptions).

**Decisões que esta feature herda:** REQ-AU-05/06 e `TIPOS_PERMITIDOS` (matriz de cascata, reavaliada no servidor - AD-033), AD-012 (escopo por Ofertante), AD-043 (GO é o Ofertante, identificado pelo CNPJ), REQ-AU-03 / UGO-07 (CPF para AM/GT/VT/VO/AL, CNPJ para GO), UGO-10 (409 claro para documento duplicado), PASB-01 (conta sem senha entra no 1º acesso com a senha em branco), AD-039 (navegação em fonte única, tokens visuais).

## Problem Statement

Hoje `/usuarios/novo` só cria. Depois de criado, um usuário não pode ser consultado nem corrigido pela interface: um nome ou CPF digitado errado, ou uma senha esquecida, exige mexer direto no banco. A página passa a ser a "Gestão de usuários": cria, lista no escopo de quem está logado, e permite corrigir cadastro e resetar senha.

## Goals

- [ ] AM, GT e GO veem, na mesma página da criação, os usuários do seu escopo, filtráveis por tipo e por busca.
- [ ] Quem pode criar um tipo de usuário pode corrigir nome, e-mail e CPF/CNPJ desse usuário e resetar a senha dele, dentro do próprio escopo.
- [ ] Trocar o CPF/CNPJ preserva todo o histórico do usuário (cursos, verbas, avaliações, vínculos, autoria).
- [ ] Nenhum gestor passa a conhecer ou definir a senha de outro usuário.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Editar tipo (perfil) | Decisão do usuário. Trocar o tipo de um GO ou AL com cursos/avaliações quebra os vínculos. |
| Editar vínculos (GO do VO, curso do Aluno) | Decisão do usuário. Mantém fora também a checagem de REQ-OV-04 que uma edição de `cdOfertante` exigiria. |
| Editar dados organizacionais do GO e dados pessoais do Aluno | Decisão do usuário. Já têm telas próprias. |
| Gestor definir a senha de outro usuário | Decisão do usuário: só reset para o 1º acesso. |
| Excluir ou desativar usuário | Não pedido. |
| Editar a própria conta por esta tela | Ver Assumptions. |
| Paginação da lista | O volume esperado cabe numa página; filtro e busca resolvem a navegação. |
| Log de auditoria das edições | O projeto não tem trilha de auditoria de edição; `criadoPor`/`dataCriacao` seguem sendo a única autoria registrada. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Rota da página | `/usuarios`; `/usuarios/novo` redireciona para `/usuarios`. Item de menu "Gestão de usuários" | Decisão do usuário. | y |
| Quem vê quem | AM e GT: todos os usuários. GO: VOs com `cdOfertante` = seu CNPJ e Alunos com ao menos uma matrícula em curso seu. VT, VO e AL: nenhuma lista | Decisão do usuário. VT/VO/AL não têm o item no menu hoje. | y |
| Filtro | Chips "Todos" + um por tipo visível ao perfil, e busca por nome ou documento | Decisão do usuário. | y |
| Onde edita | O formulário de edição abre dentro da linha, na própria lista | Decisão do usuário. | y |
| Quem edita quem | `podeCriar(editor.tipo, alvo.tipo)` E alvo no escopo do editor. Linhas visíveis fora disso ficam só leitura | Decisão do usuário: mesma matriz da criação. | y |
| Troca de CPF/CNPJ | Propaga para toda referência ao documento numa operação atômica, para CPF e CNPJ | Decisão do usuário. | y |
| Senha | Só "resetar para o 1º acesso": senha em branco no próximo login | Decisão do usuário. O gestor nunca conhece a senha. | y |
| Campos editáveis | Nome, e-mail e documento, mais o reset de senha | Decisão do usuário. | y |
| E-mail do GO | Editável aqui como para os demais tipos | O GO declara o e-mail no 1º acesso, mas AM/GT já editam esse campo por `PATCH /api/usuarios/[documento]/organizacao`; vetar aqui seria só mais uma regra sem ganho. Editar o e-mail não liga `dadosOrganizacionaisCompletos`. | n |
| Editar a si mesmo | A linha do próprio usuário (visível só a AM/GT) é só leitura e a rota responde 403 | Trocar o próprio documento ou resetar a própria senha derrubaria a sessão em uso. Correção da própria conta fica para uma decisão própria. | n |
| Alvo inexistente | AM/GT recebem 404 "Usuário não encontrado". GO recebe 403, igual a alvo fora do escopo | Mesmo princípio de REQ-OV-05: o escopo é checado antes de revelar existência, e só AM/GT enxergam todos os documentos. | n |
| Reset de senha e bloqueio | O reset também zera `tentativasFalhas` e limpa `bloqueadoAte` | Quem pede reset quase sempre está bloqueado por errar a senha; sem isso, o reset não destrava a conta por 15 min. | n |
| Sessões após trocar documento | Todas as sessões do alvo são encerradas | Decisão do usuário ("derruba sessões"). O usuário volta a entrar com o documento novo. | y |
| Documento novo igual ao atual | Tratado como "sem troca": nada muda nas referências nem nas sessões | Reenviar o mesmo valor não é uma troca. | n |
| Busca | Sem diferenciar maiúsculas/minúsculas no nome; no documento, compara só os dígitos digitados | Usuário pode colar CPF com pontuação. | n |
| Escopo do GO sobre um Aluno | O GO só vê e edita o Aluno que tem ao menos uma matrícula (`AvaliacaoAluno`) em curso seu - sem essa matrícula, o Aluno é fora do escopo (403), mesmo que também curse com outro GO | Confirmado pelo usuário (2026-10-13). Não há dono único do Aluno (AD-012); a matrícula é o vínculo. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Página "Gestão de usuários" ⭐ MVP

**User Story**: Como AM, GT ou GO, quero criar e consultar usuários na mesma página, para não precisar ir ao banco ver quem já existe.

**Why P1**: É a base de onde a edição parte.

**Acceptance Criteria**:

1. **GU-01** - The system SHALL apresentar o item de navegação "Gestão de usuários" apontando para `/usuarios` aos perfis AM, GT e GO, e a nenhum outro.
2. **GU-02** - WHEN um usuário autenticado abre `/usuarios/novo` THEN o sistema SHALL redirecioná-lo para `/usuarios`.
3. **GU-03** - The system SHALL exibir em `/usuarios` o formulário de criação de usuário existente (mesmos campos e regras de hoje) acima da lista de usuários.
4. **GU-04** - WHILE o usuário logado é AM ou GT, the system SHALL listar em `/usuarios` todos os usuários cadastrados, de todos os tipos.
5. **GU-05** - WHILE o usuário logado é GO, the system SHALL listar em `/usuarios` exatamente os VOs com `cdOfertante` igual ao seu CNPJ e os Alunos com ao menos uma `AvaliacaoAluno` em curso cujo `cdOfertante` é o seu CNPJ.
6. **GU-06** - WHILE o usuário logado é VT, VO ou AL, the system SHALL não listar nenhum usuário em `/usuarios`.
7. **GU-07** - The system SHALL mostrar em cada linha da lista o nome, o documento, o tipo por extenso (`NOME_TIPO_USUARIO`) e o e-mail do usuário.
8. **GU-08** - WHEN um usuário é criado pelo formulário de `/usuarios` THEN o sistema SHALL exibi-lo na lista sem recarregar a página manualmente.

**Independent Test**: Logar como GO, abrir `/usuarios` e ver só o VO vinculado e o Aluno matriculado no seu curso; logar como GT e ver todos.

---

### P1: Filtrar a lista por tipo e por busca ⭐ MVP

**User Story**: Como gestor, quero filtrar a lista por tipo e buscar por nome ou documento, para achar um usuário rápido.

**Why P1**: Sem filtro, a lista do AM/GT fica inutilizável conforme cresce.

**Acceptance Criteria**:

1. **GU-09** - The system SHALL exibir acima da lista um chip "Todos" e um chip por tipo que o perfil enxerga: os seis tipos para AM e GT, e só "Visualizador Ofertante" e "Aluno" para GO.
2. **GU-10** - WHEN o usuário seleciona o chip de um tipo THEN o sistema SHALL mostrar só os usuários desse tipo; WHEN seleciona "Todos" THEN SHALL mostrar todos os do escopo.
3. **GU-11** - WHEN o usuário digita na busca THEN o sistema SHALL mostrar só os usuários cujo nome contém o texto (sem diferenciar maiúsculas de minúsculas) ou cujo documento contém os dígitos digitados, combinando com o chip selecionado.
4. **GU-12** - IF nenhum usuário atende ao filtro e à busca THEN o sistema SHALL exibir "Nenhum usuário encontrado.".

**Independent Test**: Como AM, selecionar "Aluno" e ver só alunos; digitar parte de um CPF com pontuação e ver só o usuário correspondente.

---

### P1: Corrigir nome e e-mail ⭐ MVP

**User Story**: Como gestor, quero corrigir o nome e o e-mail de um usuário que eu poderia criar, para manter o cadastro certo sem ir ao banco.

**Why P1**: É o caso de edição mais frequente.

**Acceptance Criteria**:

1. **GU-13** - The system SHALL considerar o alvo editável pelo editor se e somente se `podeCriar(editor.tipo, alvo.tipo)` é verdadeiro, o alvo está no escopo de leitura do editor (GU-04/GU-05) e o alvo não é o próprio editor.
2. **GU-14** - The system SHALL exibir o botão "Editar" só nas linhas cujo alvo é editável pelo usuário logado (GU-13).
3. **GU-15** - WHEN o usuário clica "Editar" THEN o sistema SHALL abrir, dentro da própria linha, um formulário com nome, e-mail e documento preenchidos com os valores atuais, os botões "Salvar" e "Cancelar", e o botão "Resetar senha".
4. **GU-16** - WHEN um editor autorizado envia `PATCH /api/usuarios/[documento]` com `nome` e `email` válidos THEN o sistema SHALL gravar os dois valores e responder 200 com o usuário atualizado (`documento`, `nome`, `email`, `tipo`).
5. **GU-17** - WHEN o editor envia `email` vazio THEN o sistema SHALL gravar `email` como `null`.
6. **GU-18** - IF o editor envia `nome` vazio, só com espaços ou com mais de 255 caracteres, ou `email` em formato inválido THEN o sistema SHALL responder 400 com a mensagem de validação e não alterar o usuário.
7. **GU-19** - IF o alvo existe mas não é editável pelo editor (GU-13) THEN `PATCH /api/usuarios/[documento]` SHALL responder 403 com `{ "erro": "Você não tem permissão para editar este usuário" }` e não alterar o usuário.
8. **GU-20** - IF o documento da URL não existe THEN `PATCH /api/usuarios/[documento]` SHALL responder 404 `{ "erro": "Usuário não encontrado" }` quando o editor é AM ou GT, e 403 com a mensagem de GU-19 quando o editor é GO.
9. **GU-21** - The system SHALL exigir sessão válida e o token CSRF em `PATCH /api/usuarios/[documento]`, como nas demais mutações (`exigirMutacao`).
10. **GU-22** - The system SHALL não alterar, nesta rota, nenhum campo além de `nome`, `email` e `documento`; outros campos no corpo SHALL ser rejeitados com 400.
11. **GU-23** - WHEN a edição salva com sucesso THEN o sistema SHALL fechar o formulário da linha e mostrar a lista com os valores novos; IF a rota responde erro THEN SHALL manter o formulário aberto e exibir a mensagem `erro` da resposta dentro da linha.

**Independent Test**: Como GO, editar o nome de um VO vinculado e ver o nome novo na lista; tentar via API editar um VO de outro GO e receber 403.

---

### P1: Corrigir o CPF/CNPJ ⭐ MVP

**User Story**: Como gestor, quero corrigir o documento de um usuário cadastrado com erro, sem perder cursos, verbas, avaliações e vínculos dele.

**Why P1**: Pedido explícito; o documento é a chave do usuário e não tem outro caminho de correção.

**Acceptance Criteria**:

1. **GU-24** - WHEN um editor autorizado envia `PATCH /api/usuarios/[documento]` com um `documento` novo válido e livre THEN o sistema SHALL trocar o documento do usuário e responder 200 com o documento novo.
2. **GU-25** - WHEN o documento é trocado THEN o sistema SHALL fazer toda referência ao documento antigo apontar para o novo, na mesma operação atômica: sessões, avaliações do Aluno, dados pessoais do Aluno, pré-cursos (ofertante e autor), pós-cursos (autor), verbas, VOs vinculados (`cdOfertante`) e usuários criados por ele (`criadoPor`).
3. **GU-26** - WHEN o documento é trocado THEN o sistema SHALL encerrar todas as sessões do usuário alvo.
4. **GU-27** - WHEN o documento é trocado THEN o sistema SHALL preservar `senhaHash`, `primeiraVez`, `tipo`, `criadoPor`, `dataCriacao` e os dados organizacionais/pessoais do usuário.
5. **GU-28** - IF o documento novo já pertence a outro usuário THEN o sistema SHALL responder 409 com `{ "erro": "Documento já cadastrado" }` e não alterar nada, inclusive quando a colisão só aparece na gravação (corrida entre dois pedidos).
6. **GU-29** - IF o alvo é GO e o documento novo não é um CNPJ válido (14 dígitos, `validarCNPJ`) THEN o sistema SHALL responder 400 e não alterar nada.
7. **GU-30** - IF o alvo não é GO e o documento novo não é um CPF válido (11 dígitos, `validarCPF`) THEN o sistema SHALL responder 400 e não alterar nada.
8. **GU-31** - WHEN o documento enviado é igual ao atual THEN o sistema SHALL tratar o pedido como edição só de nome e e-mail, sem encerrar sessões.
9. **GU-32** - The system SHALL limitar a digitação do campo documento no formulário da linha a dígitos, com 14 posições para GO e 11 para os demais tipos, e rotulá-lo "CNPJ" ou "CPF" conforme o tipo.

**Independent Test**: Trocar o CPF de um Aluno matriculado; logar com o CPF novo e encontrar a mesma avaliação; o CPF antigo deixa de existir.

---

### P1: Resetar a senha para o 1º acesso ⭐ MVP

**User Story**: Como gestor, quero resetar a senha de um usuário que a esqueceu, para ele voltar a entrar sem que eu saiba a senha dele.

**Why P1**: Pedido explícito; hoje senha esquecida não tem saída.

**Acceptance Criteria**:

1. **GU-33** - WHEN um editor autorizado envia `POST /api/usuarios/[documento]/resetar-senha` THEN o sistema SHALL gravar `senhaHash = null`, `primeiraVez = true`, `tentativasFalhas = 0` e `bloqueadoAte = null` no alvo e responder 200.
2. **GU-34** - WHEN a senha é resetada THEN o sistema SHALL encerrar todas as sessões do usuário alvo.
3. **GU-35** - IF o alvo não é editável pelo editor (GU-13) ou não existe THEN `POST /api/usuarios/[documento]/resetar-senha` SHALL responder como GU-19/GU-20 e não alterar o alvo.
4. **GU-36** - The system SHALL exigir sessão válida e o token CSRF em `POST /api/usuarios/[documento]/resetar-senha`.
5. **GU-37** - WHEN o usuário clica "Resetar senha" na linha em edição THEN o sistema SHALL pedir confirmação na própria linha ("Confirmar reset" / "Cancelar") antes de enviar o pedido.
6. **GU-38** - WHEN o reset conclui THEN o sistema SHALL exibir na linha "Senha resetada. No próximo acesso, o usuário entra com a senha em branco.".
7. **GU-39** - The system SHALL não aceitar, em nenhuma rota desta feature, uma senha escolhida pelo gestor.

**Independent Test**: Resetar a senha de um VT com senha definida; logar com o CPF dele e senha em branco e cair em `/primeiro-acesso`.

---

## Edge Cases

- IF o alvo é um GO com cursos, verbas e VOs vinculados e o CNPJ é trocado THEN o sistema SHALL manter cursos, verbas e VOs ligados ao CNPJ novo (GU-25).
- IF o usuário alvo está bloqueado por tentativas THEN o reset SHALL desbloqueá-lo (GU-33).
- IF o corpo do `PATCH` não traz nenhum dos campos `nome`, `email`, `documento` THEN o sistema SHALL responder 400.
- IF o documento novo vem com pontuação THEN o sistema SHALL responder 400 (o campo aceita só dígitos, como na criação).
- IF a lista do GO está vazia THEN o sistema SHALL exibir "Nenhum usuário encontrado.".

---

## Implicit-requirement sweep

| Dimensão | Cobertura |
| --- | --- |
| Input validation & bounds | GU-18, GU-22, GU-29, GU-30, GU-32 |
| Failure / partial-failure | GU-25 (atômico), GU-28 (nada muda em 409) |
| Idempotency / duplicates | GU-28 (documento duplicado), GU-31 (mesmo documento); reset repetido deixa o mesmo estado |
| Auth boundaries & rate limits | GU-13, GU-19, GU-20, GU-21, GU-35, GU-36. Rate limit: N/A, as mutações autenticadas do projeto não têm limite próprio |
| Concurrency / ordering | GU-28 (colisão na gravação vira 409) |
| Data lifecycle | N/A - nada é excluído; a troca de documento move, não apaga |
| Observability | N/A - fora de escopo (ver Out of Scope, log de auditoria) |
| External-dependency failure | N/A - sem dependência externa |
| State-transition integrity | GU-33 (volta ao estado de 1º acesso), GU-26/GU-34 (sessões encerradas) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| GU-01 | P1: Página | Design | Pending |
| GU-02 | P1: Página | Design | Pending |
| GU-03 | P1: Página | Design | Pending |
| GU-04 | P1: Página | Design | Pending |
| GU-05 | P1: Página | Design | Pending |
| GU-06 | P1: Página | Design | Pending |
| GU-07 | P1: Página | Design | Pending |
| GU-08 | P1: Página | Design | Pending |
| GU-09 | P1: Filtro | Design | Pending |
| GU-10 | P1: Filtro | Design | Pending |
| GU-11 | P1: Filtro | Design | Pending |
| GU-12 | P1: Filtro | Design | Pending |
| GU-13 | P1: Nome e e-mail | Design | Pending |
| GU-14 | P1: Nome e e-mail | Design | Pending |
| GU-15 | P1: Nome e e-mail | Design | Pending |
| GU-16 | P1: Nome e e-mail | Design | Pending |
| GU-17 | P1: Nome e e-mail | Design | Pending |
| GU-18 | P1: Nome e e-mail | Design | Pending |
| GU-19 | P1: Nome e e-mail | Design | Pending |
| GU-20 | P1: Nome e e-mail | Design | Pending |
| GU-21 | P1: Nome e e-mail | Design | Pending |
| GU-22 | P1: Nome e e-mail | Design | Pending |
| GU-23 | P1: Nome e e-mail | Design | Pending |
| GU-24 | P1: CPF/CNPJ | Design | Pending |
| GU-25 | P1: CPF/CNPJ | Design | Pending |
| GU-26 | P1: CPF/CNPJ | Design | Pending |
| GU-27 | P1: CPF/CNPJ | Design | Pending |
| GU-28 | P1: CPF/CNPJ | Design | Pending |
| GU-29 | P1: CPF/CNPJ | Design | Pending |
| GU-30 | P1: CPF/CNPJ | Design | Pending |
| GU-31 | P1: CPF/CNPJ | Design | Pending |
| GU-32 | P1: CPF/CNPJ | Design | Pending |
| GU-33 | P1: Senha | Design | Pending |
| GU-34 | P1: Senha | Design | Pending |
| GU-35 | P1: Senha | Design | Pending |
| GU-36 | P1: Senha | Design | Pending |
| GU-37 | P1: Senha | Design | Pending |
| GU-38 | P1: Senha | Design | Pending |
| GU-39 | P1: Senha | Design | Pending |

**Coverage:** 39 total, 0 mapped to tasks, 39 unmapped (Tasks ainda não criado).

---

## Success Criteria

- [ ] Um nome, e-mail ou CPF/CNPJ digitado errado é corrigido pela interface, sem acesso ao banco.
- [ ] Um usuário que esqueceu a senha volta a entrar depois do reset, com a senha em branco.
- [ ] Depois de trocar o documento, nenhum registro aponta para o documento antigo.
- [ ] Nenhum perfil consegue editar ou resetar, nem pela API, um usuário fora da sua matriz e escopo.
