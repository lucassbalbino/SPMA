# Feature: auth-e-usuarios

**Escopo:** Large.
**Dependências:** nenhuma (feature fundação).
**Fonte de decisões:** STATE.md AD-005, AD-007 a AD-013, AD-028 a AD-033.

Autenticação por CPF e senha, definição de senha no primeiro acesso, e cadastro de usuários em cascata conforme a hierarquia de perfis. É a base sobre a qual todas as demais features apoiam autorização e escopo.

---

## Requisitos (EARS)

### Grupo 1 — Login e senha

**REQ-AU-01 — Login por CPF e senha.**
Quando um usuário submete CPF e senha válidos de uma conta que já definiu senha, o sistema deve autenticá-lo e criar uma sessão.

**REQ-AU-02 — Definição de senha no 1º acesso.**
Quando um usuário cujo indicador de primeiro acesso está ativo se autentica pela primeira vez, o sistema deve exigir a definição de uma nova senha antes de liberar qualquer módulo, e ao concluir deve desativar o indicador de primeiro acesso.

**REQ-AU-03 — Validação de CPF.**
Onde um CPF é informado (login ou cadastro), o sistema deve validá-lo pelo algoritmo módulo 11 e rejeitar CPFs com dígito verificador inválido.

**REQ-AU-04 — Credencial inválida não-enumerável.**
Onde o login falha por CPF inexistente ou senha incorreta, o sistema deve responder com mensagem genérica idêntica nos dois casos.

### Grupo 2 — Cadastro em cascata

**REQ-AU-05 — Autorização de criação por perfil.**
Onde um usuário tenta criar outro usuário, o sistema deve permitir apenas os tipos autorizados ao perfil do criador: AM cria qualquer tipo; GT cria GT, VT, GO; GO cria GO, VO, AL; VT, VO e AL não criam ninguém.

**REQ-AU-06 — Validação de cascata no servidor.**
Onde uma requisição de criação de usuário chega ao backend, o sistema deve reavaliar a permissão do criador no servidor, retornando 403 quando o tipo solicitado não é autorizado, independentemente do que a interface exibe.

**REQ-AU-07 — Registro de autoria.**
Quando um usuário é criado, o sistema deve registrar quem o criou e a data de criação.

### Grupo 3 — Escopo e roteamento

**REQ-AU-08 — Herança de escopo do Ofertante.**
Quando um GO ou VO é criado, o sistema deve associá-lo ao Ofertante correspondente; quando um AL é criado, seu escopo é definido pelo curso em que se inscreve, não pelo Ofertante.

**REQ-AU-09 — GO sem Ofertante cadastra no 1º acesso.**
Enquanto um GO autenticado não possui Ofertante vinculado, o sistema deve exigir o cadastro do Ofertante antes de liberar as demais funcionalidades.

**REQ-AU-10 — Roteamento por perfil.**
Quando a autenticação conclui, o sistema deve rotear o usuário para as funcionalidades permitidas ao seu perfil.

### Grupo 4 — Proteção (herda de seguranca-transversal)

**REQ-AU-11 — Limite de tentativas.**
Quando um mesmo CPF acumula 5 falhas consecutivas de senha, o sistema deve bloquear novas tentativas por 15 minutos e zerar o contador em login bem-sucedido. (Refina REQ-SEC-01/02 no contexto do login.)

**REQ-AU-12 — Sessão protegida.**
Quando uma sessão é criada, o sistema deve emiti-la em cookie httpOnly, secure e sameSite, regenerando o identificador de sessão no login. (Refina REQ-SEC-07/08.)

---

## Assunções

- O primeiro usuário AM é semeado por processo administrativo (seed/migration), não pela interface — não há "auto-registro" de administrador.
- A senha obedece à política mínima definida em seguranca-transversal (REQ-SEC-06).
- Deploy sobre HTTPS (pré-condição dos cookies secure).

---

## Critérios de Aceitação

**CA-AU-01 — Login válido cria sessão.**
Dado um usuário com senha já definida, quando informa CPF e senha corretos, então é autenticado e uma sessão é criada com cookie httpOnly/secure/sameSite.

**CA-AU-02 — Primeiro acesso força nova senha.**
Dado um usuário com primeiro acesso ativo, quando se autentica, então é levado à definição de senha antes de qualquer módulo, e após definir, o indicador é desativado.

**CA-AU-03 — CPF inválido rejeitado.**
Dado um CPF com dígito verificador inválido, quando é submetido em login ou cadastro, então é rejeitado com indicação de CPF inválido.

**CA-AU-04 — Erro de login não-enumerável.**
Dado um CPF inexistente e, à parte, um CPF existente com senha errada, quando ambos tentam logar, então as respostas são indistinguíveis.

**CA-AU-05 — Cascata permitida.**
Dado um GO autenticado, quando cria um usuário AL, então a criação é aceita e a autoria é registrada.

**CA-AU-06 — Cascata negada no servidor.**
Dado um GO autenticado que forja uma requisição para criar um GT (não autorizado ao seu perfil), quando a requisição chega ao backend, então recebe 403 mesmo que a interface não oferecesse essa opção.

**CA-AU-07 — GO sem ofertante é barrado.**
Dado um GO recém-criado sem Ofertante, quando faz login, então é obrigado a cadastrar o Ofertante antes de acessar cursos.

**CA-AU-08 — Bloqueio após 5 falhas.**
Dado um CPF válido, quando recebe 5 senhas incorretas consecutivas, então a tentativa seguinte é bloqueada por 15 minutos, e um login correto após o bloqueio zera o contador.

**CA-AU-09 — Rotação de sessão no login.**
Dado um identificador de sessão anterior ao login, quando o login conclui, então o identificador muda e o anterior deixa de ser aceito.

**CA-AU-10 — Senha nunca exposta.**
Dado qualquer endpoint que retorne dados de usuário, quando a resposta é inspecionada, então não contém senha nem hash.
