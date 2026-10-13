# Primeiro Acesso com Senha em Branco Specification

**Escopo:** Medium (schema de login, rota de login, formulário de login, fixtures de teste e um doc de entrega; sem migração, sem rota nova).

**Fonte funcional:** pedido do usuário nesta sessão (2026-10-13) e as 4 decisões tomadas com ele (ver Assumptions).

**Decisões que esta feature herda:** REQ-AU-02 / CA-AU-02 (gate de primeiro acesso - muda só o gatilho), REQ-AU-04 / CA-AU-04 (erro de login não-enumerável), REQ-SEC-01 / REQ-AU-11 (bloqueio por tentativas no CPF), REQ-SEC-03 (cooldown por IP), REQ-SEC-04 (`verifyPassword` roda em todo caminho), AD-004 (Zod como autoridade de forma).

## Problem Statement

Hoje a conta sem senha (`senhaHash = null`) entra no 1º acesso com qualquer texto no campo de senha: o servidor ignora o valor, e o formulário exige pelo menos 1 caractere. O usuário novo precisa "inventar" uma senha que não serve para nada, o que é confuso e não tem como ser explicado na tela sem soar estranho. A regra passa a ser explícita: no 1º acesso, deixa-se a senha em branco.

## Goals

- [ ] Conta sem senha abre o 1º acesso enviando a senha em branco, e só assim.
- [ ] Conta com senha nunca entra com a senha em branco, e a tentativa conta para o bloqueio.
- [ ] Nenhuma resposta nova permite distinguir conta com senha, conta sem senha e documento inexistente.
- [ ] A tela de login avisa como fazer o 1º acesso.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Prova de posse da conta no 1º acesso (código por e-mail, senha provisória) | Risco pré-existente: quem sabe o documento de uma conta sem senha define a senha dela. Esta feature não piora nem resolve; fica para uma decisão própria. |
| `/primeiro-acesso` e `POST /api/auth/primeiro-acesso` | O fluxo depois do login não muda: mesma sessão pendente, mesmo formulário, mesma política de senha. |
| Contas criadas por AM/GT/GO | Continuam nascendo com `senhaHash = null`; nada muda na criação. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Conta sem senha envia senha não vazia | 401 "CPF ou senha inválidos", registra falha no CPF e no IP, nenhuma sessão | Decisão 1 do usuário. Mesma resposta e mesmo efeito de senha errada: não abre oráculo novo. | y |
| Conta com senha envia senha vazia | 401 "CPF ou senha inválidos", registra falha no CPF e no IP | Decisão 2 do usuário. Tratar como senha errada mantém CA-AU-04 e impede descobrir quais contas já têm senha. | y |
| Dica na tela de login | Texto fixo "Primeiro acesso? Deixe a senha em branco." abaixo do campo de senha | Decisão 3 do usuário. | y |
| O que é "senha em branco" | String vazia exata (`""`). Só espaços conta como senha digitada | O campo de senha não é aparado em nenhum outro lugar do sistema; aparar só aqui criaria duas definições de "vazio". | n |
| Campo `senha` ausente do corpo | 400 de validação, como hoje | Ausência é corpo malformado, não pedido de 1º acesso. O formulário sempre envia o campo. | n |
| Contador de falhas no 1º acesso bem-sucedido | Zera (`resetarTentativas`), como num login com senha correta | Credencial certa zera o contador em qualquer caminho. Hoje o 1º acesso não zerava; falhas anteriores ficariam pesando sobre a senha recém-criada. | n |
| Conta sem senha bloqueada enviando senha vazia | 401 genérico, sem sessão | Já é o comportamento de toda conta bloqueada (CA-AU-08). | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Entrar no 1º acesso com a senha em branco ⭐ MVP

**User Story**: Como usuário recém-cadastrado, quero entrar pela primeira vez informando só meu CPF/CNPJ, para chegar à tela de definir minha senha sem inventar uma senha provisória.

**Why P1**: É a mudança pedida.

**Acceptance Criteria**:

1. **PASB-01** - WHEN uma conta com `senhaHash = null` e não bloqueada envia `POST /api/auth/login` com documento válido e `senha: ""` THEN o sistema SHALL responder 200 com `primeiroAcesso: true` e `proximaRota: "/primeiro-acesso"`, emitir o cookie de sessão vinculado a esse documento e zerar `tentativasFalhas` da conta.
2. **PASB-02** - IF uma conta com `senhaHash = null` envia `POST /api/auth/login` com senha não vazia THEN o sistema SHALL responder 401 com `{ "erro": "CPF ou senha inválidos" }`, não emitir cookie de sessão e incrementar `tentativasFalhas` da conta em 1.
3. **PASB-03** - IF uma conta com senha definida envia `POST /api/auth/login` com `senha: ""` THEN o sistema SHALL responder 401 com `{ "erro": "CPF ou senha inválidos" }`, não emitir cookie de sessão e incrementar `tentativasFalhas` da conta em 1.
4. **PASB-04** - IF um documento sem conta envia `POST /api/auth/login` com `senha: ""` THEN o sistema SHALL responder 401 com `{ "erro": "CPF ou senha inválidos" }`.
5. **PASB-05** - The system SHALL chamar `verifyPassword` antes de decidir o veredito em todo login com senha vazia, contra o `senhaHash` real quando existe e contra `DUMMY_HASH` quando não existe.

**Independent Test**: Criar uma conta com `senhaHash = null`, logar com `senha: ""` e cair em `/primeiro-acesso`; repetir com `senha: "x"` e receber 401.

---

### P1: Tela de login orienta o 1º acesso ⭐ MVP

**User Story**: Como usuário recém-cadastrado, quero que a tela de login diga o que fazer no primeiro acesso, para não precisar de instrução externa.

**Why P1**: Sem a dica, a regra nova é invisível.

**Acceptance Criteria**:

1. **PASB-06** - The system SHALL exibir em `/login` o texto "Primeiro acesso? Deixe a senha em branco." junto ao campo de senha.
2. **PASB-07** - WHEN o usuário envia o formulário de `/login` com documento válido e senha em branco THEN o sistema SHALL enviar a requisição a `POST /api/auth/login` em vez de bloquear no cliente com "Senha é obrigatória".

**Independent Test**: Abrir `/login` com uma conta sem senha, preencher só o CPF, clicar "Entrar" e chegar a `/primeiro-acesso`.

---

## Edge Cases

- IF a senha enviada é só espaços (`"   "`) THEN o sistema SHALL tratá-la como senha digitada (PASB-02 / PASB-03 se aplicam).
- IF o corpo não tem o campo `senha` THEN o sistema SHALL responder 400 de validação, como hoje.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PASB-01 | P1: Entrar com a senha em branco | Execute | Implementing |
| PASB-02 | P1: Entrar com a senha em branco | Execute | Implementing |
| PASB-03 | P1: Entrar com a senha em branco | Execute | Implementing |
| PASB-04 | P1: Entrar com a senha em branco | Execute | Implementing |
| PASB-05 | P1: Entrar com a senha em branco | Execute | Implementing |
| PASB-06 | P1: Tela de login orienta o 1º acesso | Execute | Pending |
| PASB-07 | P1: Tela de login orienta o 1º acesso | Execute | Implementing |

**Coverage:** 7 total, 7 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Um usuário recém-cadastrado chega a `/primeiro-acesso` preenchendo apenas o CPF/CNPJ.
- [ ] Nenhuma combinação de documento + senha vazia ou não vazia produz resposta de erro distinguível entre conta com senha, conta sem senha e documento inexistente.
