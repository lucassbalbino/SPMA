# Gestão de Usuários Specification

**Escopo:** Large (rota de tela renomeada, listagem escopada e paginada no servidor, três rotas de API novas, troca da chave primária de `Usuario` com propagação). Sem migração: as FKs para `TB_Usuario` já são `ON UPDATE CASCADE` (ver design.md).

**Fonte funcional:** pedido do usuário nesta sessão (2026-10-13) e as decisões tomadas com ele (ver Assumptions). Revisão 2 (mesma data): o CPF sai de toda URL e a lista passa a ser paginada.

**Decisões que esta feature herda:** REQ-AU-05/06 e `TIPOS_PERMITIDOS` (matriz de cascata, reavaliada no servidor - AD-033), AD-012 (escopo por Ofertante), AD-043 (GO é o Ofertante, identificado pelo CNPJ), REQ-AU-03 / UGO-07 (CPF para AM/GT/VT/VO/AL, CNPJ para GO), UGO-10 (409 claro para documento duplicado), PASB-01 (conta sem senha entra no 1º acesso com a senha em branco), AD-029 (CPF nunca em URL), AD-039 (navegação em fonte única, tokens visuais), AD-045 (troca de documento).

## Problem Statement

Hoje `/usuarios/novo` só cria. Depois de criado, um usuário não pode ser consultado nem corrigido pela interface: um nome ou CPF digitado errado, ou uma senha esquecida, exige mexer direto no banco. A página passa a ser a "Gestão de usuários". Ela cria, lista no escopo de quem está logado (paginado, para aguentar o crescimento da base) e permite corrigir cadastro e resetar senha.

## Goals

- [ ] AM, GT e GO veem, na mesma página da criação, os usuários do seu escopo, filtráveis por tipo e por busca, em páginas de tamanho fixo.
- [ ] Quem pode criar um tipo de usuário pode corrigir nome, e-mail e CPF/CNPJ desse usuário e resetar a senha dele, dentro do próprio escopo.
- [ ] Trocar o CPF/CNPJ preserva todo o histórico do usuário (cursos, verbas, avaliações, vínculos, autoria).
- [ ] Nenhum gestor passa a conhecer ou definir a senha de outro usuário.
- [ ] Nenhum CPF/CNPJ aparece em URL (caminho ou query string) nesta feature.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Editar tipo (perfil) | Decisão do usuário. Trocar o tipo de um GO ou AL com cursos/avaliações quebra os vínculos. |
| Editar vínculos (GO do VO, curso do Aluno) | Decisão do usuário. Mantém fora também a checagem de REQ-OV-04 que uma edição de `cdOfertante` exigiria. |
| Editar dados organizacionais do GO e dados pessoais do Aluno | Decisão do usuário. Já têm telas próprias. |
| Gestor definir a senha de outro usuário | Decisão do usuário: só reset para o 1º acesso. |
| Excluir ou desativar usuário | Não pedido. |
| Editar a própria conta por esta tela | Ver Assumptions. |
| Tamanho de página escolhido pelo usuário | Fixo no servidor; ver Assumptions. |
| Retirar documento das URLs já existentes (`/avaliacoes/[cpf]/…`, `/api/usuarios/[documento]/organizacao`) | Fora do escopo desta feature; esta feature só não cria URLs novas com documento. |
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
| E-mail do GO | Editável aqui como para os demais tipos | O GO declara o e-mail no 1º acesso, mas AM/GT já editam esse campo por `PATCH /api/usuarios/[documento]/organizacao`; vetar aqui seria só mais uma regra sem ganho. Editar o e-mail não liga `dadosOrganizacionaisCompletos`. | y |
| Editar a si mesmo | A linha do próprio usuário (visível só a AM/GT) é só leitura e a rota responde 403 | Trocar o próprio documento ou resetar a própria senha derrubaria a sessão em uso. | y |
| Alvo inexistente | AM/GT recebem 404 "Usuário não encontrado". GO recebe 403, igual a alvo fora do escopo | Mesmo princípio de REQ-OV-05: o escopo é checado antes de revelar existência. | y |
| Reset de senha e bloqueio | O reset também zera `tentativasFalhas` e limpa `bloqueadoAte` | Sem isso, o reset não destrava uma conta bloqueada por 15 min. | y |
| Sessões após trocar documento | Todas as sessões do alvo são encerradas | Decisão do usuário. | y |
| Documento novo igual ao atual | Tratado como "sem troca" | Reenviar o mesmo valor não é uma troca. | y |
| Documento com pontuação | Normalizado para só dígitos, como em `POST /api/usuarios` | Consistência com a criação. | y |
| Escopo do GO sobre um Aluno | Só o Aluno com ao menos uma matrícula em curso do GO | Confirmado pelo usuário. | y |
| CPF fora da URL | Documento-alvo e busca trafegam só no corpo de requisições `POST`/`PATCH`; a página não usa query string | Decisão do usuário (revisão 2), alinhada a AD-029. | y |
| Paginação | No servidor, 20 itens por página, ordem nome ↑ e depois documento ↑; navegação "Anterior"/"Próxima" com "Página X de Y" | Decisão do usuário (revisão 2): escalar. Tamanho fixo impede pedir a base inteira de uma vez; ordem com desempate por documento (único) torna as páginas estáveis. | y |
| Busca | Nome contém o texto (sem diferenciar maiúsculas, conforme a collation do banco) OU documento contém os dígitos digitados; até 100 caracteres | Busca precisa ir ao servidor com a paginação. O limite barra entrada abusiva. | y |
| Busca por documento | Só quando a busca não tem letra: dígitos, pontos, traço, barra e espaços, com ao menos um dígito. Com qualquer letra, compara só o nome | Decisão do usuário (2026-10-13). Refina a linha "Busca": sem isso, um nome com dígito ("GU-T 4") trazia todo usuário cujo documento tem um 4. | y |
| Estado da lista na URL | Não guardado: recarregar a página volta à página 1, sem filtro | Guardar na URL exigiria a busca (que pode ser um CPF) na query string. | y |

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
4. **GU-04** - WHILE o usuário logado é AM ou GT, the system SHALL incluir no escopo da lista todos os usuários cadastrados, de todos os tipos.
5. **GU-05** - WHILE o usuário logado é GO, the system SHALL incluir no escopo da lista exatamente os VOs com `cdOfertante` igual ao seu CNPJ e os Alunos com ao menos uma `AvaliacaoAluno` em curso cujo `cdOfertante` é o seu CNPJ.
6. **GU-06** - WHILE o usuário logado é VT, VO ou AL, the system SHALL não exibir lista em `/usuarios`.
7. **GU-07** - The system SHALL mostrar em cada linha da lista o nome, o documento, o tipo por extenso (`NOME_TIPO_USUARIO`) e o e-mail do usuário.
8. **GU-08** - WHEN um usuário é criado pelo formulário de `/usuarios` THEN o sistema SHALL recarregar a lista (página atual e filtros mantidos) sem recarregar a página.

**Independent Test**: Logar como GO, abrir `/usuarios` e ver só o VO vinculado e o Aluno matriculado no seu curso; logar como GT e ver todos.

---

### P1: Paginar, filtrar e buscar ⭐ MVP

**User Story**: Como gestor, quero a lista em páginas, com filtro por tipo e busca por nome ou documento, para achar um usuário rápido mesmo com a base grande.

**Why P1**: Pedido explícito (escalabilidade); sem isso a lista do AM/GT cresce sem limite.

**Acceptance Criteria**:

1. **GU-09** - The system SHALL exibir acima da lista um chip "Todos" e um chip por tipo que o perfil enxerga: os seis tipos para AM e GT, e só "Visualizador Ofertante" e "Aluno" para GO.
2. **GU-10** - WHEN o usuário seleciona o chip de um tipo THEN o sistema SHALL listar só os usuários do escopo com esse tipo; WHEN seleciona "Todos" THEN SHALL listar todos os do escopo.
3. **GU-11** - WHEN o usuário digita na busca THEN o sistema SHALL listar só os usuários do escopo cujo nome contém o texto (sem diferenciar maiúsculas de minúsculas), combinando com o chip selecionado; IF o texto não contém nenhuma letra, contém ao menos um dígito e só tem dígitos, pontos, traço, barra e espaços THEN o sistema SHALL listar também os usuários do escopo cujo documento contém os dígitos digitados. Um texto com qualquer letra é comparado só com o nome.
4. **GU-12** - IF nenhum usuário atende ao filtro e à busca THEN o sistema SHALL exibir "Nenhum usuário encontrado.".
5. **GU-13** - The system SHALL entregar a lista em páginas de no máximo 20 usuários, ordenados por nome crescente e, no empate, por documento crescente.
6. **GU-14** - The system SHALL exibir abaixo da lista os botões "Anterior" e "Próxima" e o texto "Página X de Y", com "Anterior" desabilitado na página 1 e "Próxima" desabilitado na última página.
7. **GU-15** - WHEN o usuário troca o chip ou altera a busca THEN o sistema SHALL voltar para a página 1.
8. **GU-16** - WHEN um usuário AM, GT ou GO envia `POST /api/usuarios/consulta` com `{ pagina, tipo?, busca? }` válidos THEN o sistema SHALL responder 200 com `{ usuarios, total, pagina, totalPaginas }`, em que `usuarios` traz no máximo 20 itens `{ documento, nome, email, tipo, editavel }` do escopo filtrado, `total` é a contagem do escopo filtrado e `totalPaginas` é `max(1, ceil(total / 20))`.
9. **GU-17** - IF `pagina` não é inteiro ≥ 1, `tipo` não é um `TipoUsuario`, `busca` passa de 100 caracteres ou o corpo traz outra chave THEN `POST /api/usuarios/consulta` SHALL responder 400.
10. **GU-18** - WHEN `pagina` é maior que `totalPaginas` THEN `POST /api/usuarios/consulta` SHALL responder 200 com `usuarios: []` e os `total`/`totalPaginas` reais.
11. **GU-19** - IF o usuário logado é VT, VO ou AL THEN `POST /api/usuarios/consulta` SHALL responder 403 com `{ "erro": "Acesso negado" }`.
12. **GU-20** - The system SHALL exigir sessão válida e o token CSRF em `POST /api/usuarios/consulta` (`exigirMutacao`).

**Independent Test**: Com 25 usuários no escopo, a página 1 mostra 20, "Próxima" leva a 5, "Página 2 de 2"; buscar parte de um CPF com pontuação volta à página 1 com só o usuário correspondente.

---

### P1: Corrigir nome e e-mail ⭐ MVP

**User Story**: Como gestor, quero corrigir o nome e o e-mail de um usuário que eu poderia criar, para manter o cadastro certo sem ir ao banco.

**Why P1**: É o caso de edição mais frequente.

**Acceptance Criteria**:

1. **GU-21** - The system SHALL considerar o alvo editável pelo editor se e somente se `podeCriar(editor.tipo, alvo.tipo)` é verdadeiro, o alvo está no escopo do editor (GU-04/GU-05) e o alvo não é o próprio editor.
2. **GU-22** - The system SHALL exibir o botão "Editar" só nas linhas com `editavel: true` (GU-21).
3. **GU-23** - WHEN o usuário clica "Editar" THEN o sistema SHALL abrir, dentro da própria linha, um formulário com nome, e-mail e documento preenchidos com os valores atuais, os botões "Salvar" e "Cancelar", e o botão "Resetar senha".
4. **GU-24** - WHEN um editor autorizado envia `PATCH /api/usuarios` com `{ documentoAtual, nome, email }` válidos THEN o sistema SHALL gravar nome e e-mail do usuário `documentoAtual` e responder 200 com `{ usuario: { documento, nome, email, tipo } }`.
5. **GU-25** - WHEN o editor envia `email` vazio THEN o sistema SHALL gravar `email` como `null`.
6. **GU-26** - IF o editor envia `nome` vazio, só com espaços ou com mais de 255 caracteres, ou `email` em formato inválido THEN o sistema SHALL responder 400 com a mensagem de validação e não alterar o usuário.
7. **GU-27** - IF o alvo existe mas não é editável pelo editor (GU-21) THEN `PATCH /api/usuarios` SHALL responder 403 com `{ "erro": "Você não tem permissão para editar este usuário" }` e não alterar o usuário.
8. **GU-28** - IF `documentoAtual` não corresponde a nenhum usuário THEN `PATCH /api/usuarios` SHALL responder 404 `{ "erro": "Usuário não encontrado" }` quando o editor é AM ou GT, e 403 com a mensagem de GU-27 quando o editor é GO.
9. **GU-29** - The system SHALL exigir sessão válida e o token CSRF em `PATCH /api/usuarios` (`exigirMutacao`).
10. **GU-30** - IF o corpo de `PATCH /api/usuarios` não traz `documentoAtual`, não traz nenhum de `nome`/`email`/`documentoNovo`, ou traz qualquer outra chave THEN o sistema SHALL responder 400 e não alterar nada.
11. **GU-31** - WHEN a edição salva com sucesso THEN o sistema SHALL fechar o formulário da linha e recarregar a página atual da lista; IF a rota responde erro THEN SHALL manter o formulário aberto e exibir a mensagem `erro` da resposta dentro da linha.

**Independent Test**: Como GO, editar o nome de um VO vinculado e ver o nome novo na lista; tentar via API editar um VO de outro GO e receber 403.

---

### P1: Corrigir o CPF/CNPJ ⭐ MVP

**User Story**: Como gestor, quero corrigir o documento de um usuário cadastrado com erro, sem perder cursos, verbas, avaliações e vínculos dele.

**Why P1**: Pedido explícito; o documento é a chave do usuário e não tem outro caminho de correção.

**Acceptance Criteria**:

1. **GU-32** - WHEN um editor autorizado envia `PATCH /api/usuarios` com `documentoNovo` válido e livre THEN o sistema SHALL trocar o documento do usuário e responder 200 com o documento novo.
2. **GU-33** - WHEN o documento é trocado THEN o sistema SHALL fazer toda referência ao documento antigo apontar para o novo, na mesma operação atômica: sessões, avaliações do Aluno (e suas respostas), dados pessoais do Aluno, pré-cursos (ofertante e autor), pós-cursos (autor), verbas, VOs vinculados (`cdOfertante`) e usuários criados por ele (`criadoPor`).
3. **GU-34** - WHEN o documento é trocado THEN o sistema SHALL encerrar todas as sessões do usuário alvo.
4. **GU-35** - WHEN o documento é trocado THEN o sistema SHALL preservar `senhaHash`, `primeiraVez`, `tipo`, `criadoPor`, `dataCriacao` e os dados organizacionais/pessoais do usuário.
5. **GU-36** - IF o documento novo já pertence a outro usuário THEN o sistema SHALL responder 409 com `{ "erro": "Documento já cadastrado" }` e não alterar nada, inclusive quando a colisão só aparece na gravação (corrida entre dois pedidos).
6. **GU-37** - IF o alvo é GO e `documentoNovo` não é um CNPJ válido (`validarCNPJ`) THEN o sistema SHALL responder 400 `{ "erro": "CNPJ inválido" }` e não alterar nada.
7. **GU-38** - IF o alvo não é GO e `documentoNovo` não é um CPF válido (`validarCPF`) THEN o sistema SHALL responder 400 `{ "erro": "CPF inválido" }` e não alterar nada.
8. **GU-39** - WHEN `documentoNovo` é igual ao atual (depois de normalizado) THEN o sistema SHALL tratar o pedido como edição só de nome e e-mail, sem encerrar sessões.
9. **GU-40** - The system SHALL limitar a digitação do campo documento no formulário da linha a dígitos, com 14 posições para GO e 11 para os demais tipos, e rotulá-lo "CNPJ" ou "CPF" conforme o tipo.

**Independent Test**: Trocar o CPF de um Aluno matriculado; logar com o CPF novo e encontrar a mesma avaliação; o CPF antigo deixa de existir.

---

### P1: Resetar a senha para o 1º acesso ⭐ MVP

**User Story**: Como gestor, quero resetar a senha de um usuário que a esqueceu, para ele voltar a entrar sem que eu saiba a senha dele.

**Why P1**: Pedido explícito; hoje senha esquecida não tem saída.

**Acceptance Criteria**:

1. **GU-41** - WHEN um editor autorizado envia `POST /api/usuarios/resetar-senha` com `{ documento }` THEN o sistema SHALL gravar `senhaHash = null`, `primeiraVez = true`, `tentativasFalhas = 0` e `bloqueadoAte = null` no alvo e responder 200.
2. **GU-42** - WHEN a senha é resetada THEN o sistema SHALL encerrar todas as sessões do usuário alvo.
3. **GU-43** - IF o alvo não é editável pelo editor (GU-21) ou não existe THEN `POST /api/usuarios/resetar-senha` SHALL responder como GU-27/GU-28 e não alterar o alvo.
4. **GU-44** - The system SHALL exigir sessão válida e o token CSRF em `POST /api/usuarios/resetar-senha`, e responder 400 se o corpo não traz `documento` ou traz outra chave.
5. **GU-45** - WHEN o usuário clica "Resetar senha" na linha em edição THEN o sistema SHALL pedir confirmação na própria linha ("Confirmar reset" / "Cancelar") antes de enviar o pedido.
6. **GU-46** - WHEN o reset conclui THEN o sistema SHALL exibir na linha "Senha resetada. No próximo acesso, o usuário entra com a senha em branco.".
7. **GU-47** - The system SHALL não aceitar, em nenhuma rota desta feature, uma senha escolhida pelo gestor.

**Independent Test**: Resetar a senha de um VT com senha definida; logar com o CPF dele e senha em branco e cair em `/primeiro-acesso`.

---

### P1: Documento fora da URL ⭐ MVP

**User Story**: Como responsável pelos dados, quero que nenhum CPF/CNPJ apareça em endereço de página ou de API desta feature, para que não vaze em histórico de navegador, logs de servidor ou proxies.

**Why P1**: Pedido explícito (revisão 2); AD-029.

**Acceptance Criteria**:

1. **GU-48** - The system SHALL enviar o documento-alvo, o documento novo e o texto da busca somente no corpo das requisições, nunca no caminho nem na query string, em todas as rotas e telas desta feature.
2. **GU-49** - The system SHALL manter a URL de `/usuarios` sem query string ao filtrar, buscar, paginar, editar ou resetar.

**Independent Test**: Executar busca por CPF, troca de página, edição e reset com o painel de rede aberto: nenhuma URL contém dígitos de documento.

---

## Edge Cases

- IF o alvo é um GO com cursos, verbas e VOs vinculados e o CNPJ é trocado THEN o sistema SHALL manter cursos, verbas e VOs ligados ao CNPJ novo (GU-33).
- IF o usuário alvo está bloqueado por tentativas THEN o reset SHALL desbloqueá-lo (GU-41).
- WHEN `documentoAtual`, `documentoNovo` ou `documento` vêm com pontuação (`529.982.247-25`) THEN o sistema SHALL normalizá-los para só dígitos antes de validar e buscar.
- WHEN a edição ou o reset esvazia a última linha de uma página (ex.: o documento trocado sai da busca atual) THEN o sistema SHALL recarregar a página atual e, se ela passou a ser maior que `totalPaginas`, exibir "Nenhum usuário encontrado." com "Anterior" habilitado.
- IF a lista do GO está vazia THEN o sistema SHALL exibir "Nenhum usuário encontrado." e "Página 1 de 1".
- WHEN o editor altera só o e-mail de um usuário sem nome THEN o sistema SHALL gravar o e-mail sem exigir nome.

---

## Implicit-requirement sweep

| Dimensão | Cobertura |
| --- | --- |
| Input validation & bounds | GU-17, GU-26, GU-30, GU-37, GU-38, GU-40, GU-44; página limitada a 20 (GU-13) |
| Failure / partial-failure | GU-33 (atômico), GU-36 (nada muda em 409) |
| Idempotency / duplicates | GU-36 (documento duplicado), GU-39 (mesmo documento); reset repetido deixa o mesmo estado |
| Auth boundaries & rate limits | GU-19–21, GU-27–29, GU-43, GU-44. Rate limit: N/A, as mutações autenticadas do projeto não têm limite próprio |
| Concurrency / ordering | GU-36 (colisão na gravação vira 409); GU-13 (ordem estável entre páginas) |
| Data lifecycle | N/A - nada é excluído; a troca de documento move, não apaga |
| Observability / privacidade | GU-48, GU-49 (documento fora de URL, que é o que vai para logs de acesso). Log de auditoria: fora de escopo |
| External-dependency failure | N/A - sem dependência externa |
| State-transition integrity | GU-41 (volta ao estado de 1º acesso), GU-34/GU-42 (sessões encerradas) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| GU-01 | P1: Página | Execute | Implemented |
| GU-02 | P1: Página | Execute | Implemented |
| GU-03 | P1: Página | Execute | Implemented |
| GU-04 | P1: Página | Execute | Implemented |
| GU-05 | P1: Página | Execute | Implemented |
| GU-06 | P1: Página | Execute | Implemented |
| GU-07 | P1: Página | Execute | Implemented |
| GU-08 | P1: Página | Execute | Implemented |
| GU-09 | P1: Paginar/filtrar | Execute | Implemented |
| GU-10 | P1: Paginar/filtrar | Execute | Implemented |
| GU-11 | P1: Paginar/filtrar | Execute | Implemented |
| GU-12 | P1: Paginar/filtrar | Execute | Implemented |
| GU-13 | P1: Paginar/filtrar | Execute | Implemented |
| GU-14 | P1: Paginar/filtrar | Execute | Implemented |
| GU-15 | P1: Paginar/filtrar | Execute | Implemented |
| GU-16 | P1: Paginar/filtrar | Execute | Implemented |
| GU-17 | P1: Paginar/filtrar | Execute | Implemented |
| GU-18 | P1: Paginar/filtrar | Execute | Implemented |
| GU-19 | P1: Paginar/filtrar | Execute | Implemented |
| GU-20 | P1: Paginar/filtrar | Execute | Implemented |
| GU-21 | P1: Nome e e-mail | Execute | Implemented |
| GU-22 | P1: Nome e e-mail | Execute | Implemented |
| GU-23 | P1: Nome e e-mail | Execute | Implemented |
| GU-24 | P1: Nome e e-mail | Execute | Implemented |
| GU-25 | P1: Nome e e-mail | Execute | Implemented |
| GU-26 | P1: Nome e e-mail | Execute | Implemented |
| GU-27 | P1: Nome e e-mail | Execute | Implemented |
| GU-28 | P1: Nome e e-mail | Execute | Implemented |
| GU-29 | P1: Nome e e-mail | Execute | Implemented |
| GU-30 | P1: Nome e e-mail | Execute | Implemented |
| GU-31 | P1: Nome e e-mail | Execute | Implemented |
| GU-32 | P1: CPF/CNPJ | Execute | Implemented |
| GU-33 | P1: CPF/CNPJ | Execute | Implemented |
| GU-34 | P1: CPF/CNPJ | Execute | Implemented |
| GU-35 | P1: CPF/CNPJ | Execute | Implemented |
| GU-36 | P1: CPF/CNPJ | Execute | Implemented |
| GU-37 | P1: CPF/CNPJ | Execute | Implemented |
| GU-38 | P1: CPF/CNPJ | Execute | Implemented |
| GU-39 | P1: CPF/CNPJ | Execute | Implemented |
| GU-40 | P1: CPF/CNPJ | Execute | Implemented |
| GU-41 | P1: Senha | Execute | Implemented |
| GU-42 | P1: Senha | Execute | Implemented |
| GU-43 | P1: Senha | Execute | Implemented |
| GU-44 | P1: Senha | Execute | Implemented |
| GU-45 | P1: Senha | Execute | Implemented |
| GU-46 | P1: Senha | Execute | Implemented |
| GU-47 | P1: Senha | Execute | Implemented |
| GU-48 | P1: Documento fora da URL | Execute | Implemented |
| GU-49 | P1: Documento fora da URL | Execute | Implemented |

**Coverage:** 49 total, 49 mapped to tasks (T1–T13, ver `Requirement` de cada tarefa), 0 unmapped.

---

## Success Criteria

- [ ] Um nome, e-mail ou CPF/CNPJ digitado errado é corrigido pela interface, sem acesso ao banco.
- [ ] Um usuário que esqueceu a senha volta a entrar depois do reset, com a senha em branco.
- [ ] Depois de trocar o documento, nenhum registro aponta para o documento antigo.
- [ ] Nenhum perfil consegue editar ou resetar, nem pela API, um usuário fora da sua matriz e escopo.
- [ ] Nenhuma requisição da feature carrega documento na URL.
- [ ] Cada resposta da lista traz no máximo 20 usuários, qualquer que seja o tamanho da base.
