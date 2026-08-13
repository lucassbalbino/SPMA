# Feature: seguranca-transversal

**Tipo:** Feature transversal (aplica-se a todas as demais features).
**Escopo:** Large.
**Fonte de decisões:** STATE.md AD-005, AD-010, AD-011, AD-013, AD-028 a AD-033.

Requisitos de proteção que não pertencem a uma única tela, mas condicionam todo o sistema: autenticação, sessão, autorização, tratamento de dados sensíveis e resiliência a abuso. Cada requisito abaixo é verificável de forma independente.

---

## Requisitos (EARS)

### Grupo 1 — Proteção de autenticação

**REQ-SEC-01 — Limite de tentativas por conta.**
Quando um mesmo CPF acumula 5 tentativas de login malsucedidas consecutivas, o sistema deve bloquear novas tentativas para esse CPF por 15 minutos, respondendo com a mesma mensagem genérica de credencial inválida.

**REQ-SEC-02 — Reset do contador.**
Quando um login é bem-sucedido, o sistema deve zerar o contador de tentativas falhas daquele CPF.

**REQ-SEC-03 — Limite por origem (IP).**
Enquanto um mesmo endereço de origem acumula tentativas de login malsucedidas acima do limite configurado (independente do CPF), o sistema deve aplicar cooldown a essa origem, para mitigar varredura distribuída.

**REQ-SEC-04 — Mensagem de erro não-enumerável.**
Onde o login falha por CPF inexistente ou por senha incorreta, o sistema deve responder com uma mensagem idêntica e genérica, nunca indicando qual dos dois falhou nem se o CPF existe.

**REQ-SEC-05 — Armazenamento de senha irreversível.**
O sistema deve armazenar senhas apenas como hash argon2id (ou bcrypt com custo ≥ 12) e nunca deve retornar, registrar ou trafegar a senha — em texto ou hash — por qualquer endpoint, log ou mensagem.

**REQ-SEC-06 — Política mínima de senha.**
Quando o usuário cadastra a senha no primeiro acesso, o sistema deve exigir comprimento mínimo de 8 caracteres e rejeitar senhas que não atendam à política, com mensagem de orientação (sem vazar a regra completa de forma explorável).

### Grupo 2 — Sessão

**REQ-SEC-07 — Cookie de sessão protegido.**
O sistema deve emitir o identificador de sessão em cookie com atributos httpOnly, secure e sameSite=lax, de modo que não seja acessível por JavaScript nem trafegue fora de HTTPS.

**REQ-SEC-08 — Rotação de sessão no login.**
Quando a autenticação é bem-sucedida, o sistema deve gerar um novo identificador de sessão, invalidando qualquer identificador anterior (prevenção de session fixation).

**REQ-SEC-09 — Expiração por inatividade.**
Enquanto uma sessão permanece sem atividade além do tempo configurado, o sistema deve expirá-la e exigir novo login.

### Grupo 3 — Não-vazamento de dados

**REQ-SEC-10 — Ausência de dados sensíveis no cliente.**
O sistema não deve emitir, para o console do navegador, respostas de rede ou HTML entregue, nenhum dado sensível: senha ou hash, token de sessão, CPF de terceiros fora do escopo do solicitante, ou stack trace de servidor.

**REQ-SEC-11 — Erros genéricos ao cliente em produção.**
Onde ocorre uma exceção de servidor, o sistema deve responder ao cliente com erro genérico e identificador de correlação, mantendo o detalhe (com CPF mascarado) apenas no log de servidor.

**REQ-SEC-12 — Mascaramento de CPF em log.**
Onde o sistema registra um CPF em log, deve mascará-lo (ex.: expor apenas os dígitos necessários para suporte), nunca o CPF completo.

**REQ-SEC-13 — Dados sensíveis fora de URL.**
O sistema nunca deve colocar CPF, senha, token ou outro dado pessoal em query string ou path de URL; tais dados trafegam apenas no corpo de requisições sobre HTTPS.

### Grupo 4 — Autorização e superfície de ataque

**REQ-SEC-14 — Autorização reavaliada no servidor.**
Onde qualquer requisição tenta uma operação de escrita (cascata de criação de usuário) ou leitura de dados escopados, o sistema deve reavaliar a permissão no backend a cada request, independentemente do que o cliente exibe, retornando 403 quando fora de escopo.

**REQ-SEC-15 — Proteção CSRF em mutações.**
Onde uma requisição altera estado e a autenticação se dá por cookie de sessão, o sistema deve exigir e validar um token anti-CSRF.

**REQ-SEC-16 — Cabeçalhos de segurança.**
O sistema deve responder com os cabeçalhos de segurança padrão (Content-Security-Policy, X-Content-Type-Options=nosniff, Referrer-Policy, e equivalentes), em todas as respostas de documento.

**REQ-SEC-17 — Validação no servidor como autoridade.**
Onde há validação de entrada (campos de formulário, escalas, CPF módulo 11, campos condicionais), a validação do servidor é autoritativa; a validação do cliente é apenas conveniência e nunca substitui a do servidor.

---

## Assunções

- Deploy sobre HTTPS (secure cookies e headers pressupõem TLS terminado antes ou na aplicação).
- Rate limiting e contadores de tentativa persistem de forma que sobrevivam a múltiplas instâncias da aplicação (store compartilhado, ex.: tabela dedicada ou cache) — a implementação escolhe o mecanismo; o comportamento observável é o que estas ACs cobram.
- "Dado sensível" abrange, no mínimo: senha, hash de senha, token de sessão, CPF, e-mail e telefone de pessoas físicas, e dados de outro escopo (ofertante/curso) que não o do solicitante.

---

## Critérios de Aceitação

**CA-SEC-01 — Bloqueio após 5 falhas.**
Dado um CPF válido, quando são enviadas 5 senhas incorretas consecutivas, então a 6ª tentativa (mesmo com senha correta) é rejeitada com mensagem genérica e o acesso só é liberado após 15 minutos.

**CA-SEC-02 — Contador zera no sucesso.**
Dado um CPF com 3 falhas registradas, quando um login bem-sucedido ocorre, então o contador volta a zero e novas tentativas partem do limite cheio.

**CA-SEC-03 — Cooldown por IP.**
Dado um mesmo IP gerando falhas acima do limite configurado contra CPFs distintos, quando o limite é atingido, então novas tentativas daquele IP recebem cooldown.

**CA-SEC-04 — Erro não enumerável.**
Dado um CPF inexistente e, separadamente, um CPF existente com senha errada, quando ambos tentam logar, então as respostas (corpo, código e tempo aproximado) são indistinguíveis entre si.

**CA-SEC-05 — Senha nunca retornada.**
Dado qualquer endpoint que retorne dados de usuário, quando a resposta é inspecionada, então ela não contém o campo de senha nem seu hash em nenhuma forma.

**CA-SEC-06 — Política de senha no 1º acesso.**
Dado um usuário no primeiro acesso, quando informa uma senha com menos de 8 caracteres, então o sistema rejeita e solicita correção; quando informa uma senha conforme a política, então o cadastro conclui.

**CA-SEC-07 — Atributos do cookie de sessão.**
Dado um login bem-sucedido, quando o cookie de sessão é emitido, então ele possui httpOnly, secure e sameSite, verificáveis no cabeçalho Set-Cookie.

**CA-SEC-08 — Rotação de sessão.**
Dado um identificador de sessão anterior ao login, quando o login conclui, então o identificador muda e o anterior deixa de ser aceito.

**CA-SEC-09 — Expiração por inatividade.**
Dada uma sessão inativa além do tempo configurado, quando uma nova requisição autenticada é feita, então ela é recusada e o novo login é exigido.

**CA-SEC-10 — Console limpo.**
Dado o fluxo completo de login e navegação por qualquer formulário, quando o console do navegador e as respostas de rede são inspecionados, então nenhum dado sensível (senha, hash, token, CPF de terceiros, stack trace) aparece.

**CA-SEC-11 — Erro genérico + correlação.**
Dada uma exceção forçada no servidor, quando o cliente recebe a resposta, então ela é genérica e traz um id de correlação, e o detalhe correspondente existe apenas no log de servidor.

**CA-SEC-12 — CPF mascarado em log.**
Dado um evento que registra CPF em log, quando o log é inspecionado, então o CPF aparece mascarado, nunca completo.

**CA-SEC-13 — Sem dados em URL.**
Dado o fluxo de autenticação e de submissão de formulários, quando as URLs são inspecionadas, então nenhuma contém CPF, senha ou token.

**CA-SEC-14 — 403 reavaliado no servidor.**
Dado um GO autenticado que forja uma requisição direta a um recurso de outro ofertante (sem passar pela UI), quando a requisição chega ao backend, então recebe 403, provando que a checagem não depende do cliente.

**CA-SEC-15 — CSRF exigido.**
Dada uma requisição de escrita sem token anti-CSRF válido, quando chega ao servidor, então é rejeitada.

**CA-SEC-16 — Headers presentes.**
Dada uma resposta de documento, quando os cabeçalhos são inspecionados, então CSP, X-Content-Type-Options e Referrer-Policy estão presentes.

**CA-SEC-17 — Servidor valida mesmo com cliente burlado.**
Dado um payload que viola uma regra condicional (ex.: P9='Sim' sem P9.Qual) enviado diretamente à API, quando chega ao servidor, então é rejeitado, provando que a validação de servidor é autoritativa.
