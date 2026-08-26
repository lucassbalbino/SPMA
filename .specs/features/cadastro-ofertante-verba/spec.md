# Feature: cadastro-ofertante-verba

**Escopo:** Large.
**Dependências:** `auth-e-usuarios` (cascata, escopo, sessão), `seguranca-transversal` (CSRF, erro genérico, `podeAcessarOfertante`).
**Fonte de decisões:** STATE.md AD-009, AD-012 a AD-016.

Fecha o cadastro e a gestão de Ofertantes e das verbas a eles vinculadas. O auto-cadastro do Gestor Ofertante (GO) no primeiro acesso já está implementado (`auth-e-usuarios`, AD-014 terceira forma) — esta feature cobre as duas formas que faltam (pré-cadastro administrativo, cadastro pelo Gestor Turismo), a edição e consulta escopada de Ofertante, e todo o CRUD de Verba, incluindo o cálculo de saldo e a validação de teto (RN-10/AD-016). A criação de cursos em si (`TB_Pre_Curso`) é escopo da feature futura `formulario-pre-curso`; esta feature entrega a validação de teto como função reutilizável, testada contra o model `PreCurso` já existente no schema.

---

## Requisitos (EARS)

### Grupo 1 — Cadastro e edição de Ofertante

**REQ-OV-01 — Pré-cadastro administrativo e por Gestor Turismo.**
Quando um AM ou GT cadastra um Ofertante, o sistema deve exigir nome e UF, aceitar responsável/email/telefone/município como opcionais, e não deve exigir vínculo prévio a nenhum usuário GO.

**REQ-OV-02 — Edição de Ofertante.**
Onde um AM, GT, ou o GO vinculado a um Ofertante edita os dados desse Ofertante, o sistema deve validar os mesmos campos de REQ-OV-01 e persistir a alteração.

**REQ-OV-03 — Edição fora de escopo negada.**
Onde um GO tenta editar um Ofertante ao qual não está vinculado, o sistema deve rejeitar com HTTP 403.

### Grupo 2 — Vínculo de usuário a Ofertante

**REQ-OV-04 — Validação do vínculo na criação/edição de usuário.**
Quando um AM ou GT cria ou atualiza um usuário do tipo GO ou VO informando um `cdOfertante`, o sistema deve validar que o Ofertante existe e rejeitar com erro claro (não um erro genérico de restrição de banco) quando não existir.

### Grupo 3 — Consulta e escopo de Ofertante

**REQ-OV-05 — Consulta de Ofertante escopada.**
Onde um usuário consulta um Ofertante específico, o sistema deve retornar os dados apenas se o Ofertante estiver dentro do escopo do usuário: AM/GT/VT consultam qualquer um; GO/VO somente o próprio.

**REQ-OV-06 — Listagem de Ofertantes escopada.**
Onde AM/GT/VT listam Ofertantes, o sistema deve retornar todos; onde GO/VO consultam a listagem, o sistema deve retornar apenas o próprio.

**REQ-OV-07 — Reforço de escopo no servidor.**
Onde uma requisição de leitura ou escrita de Ofertante ou Verba chega ao backend, o sistema deve reavaliar `podeAcessarOfertante` a cada request, retornando 403 quando fora de escopo, independentemente do que a interface exibe. (Fecha CA-SEC-14, deixado como fundação por `seguranca-transversal`.)

### Grupo 4 — Verba

**REQ-OV-08 — Criação de Verba.**
Quando um AM ou GT cria uma Verba, o sistema deve vinculá-la a exatamente um Ofertante existente (nunca mais de um), exigir um valor total (`vlVerba`) positivo, e rejeitar a criação se o Ofertante informado não existir.

**REQ-OV-09 — Edição do valor total da Verba.**
Onde um AM ou GT edita o valor total de uma Verba, o sistema deve rejeitar a alteração se o novo valor total for menor que a soma já alocada aos cursos dessa Verba (REQ-OV-11).

**REQ-OV-10 — Consulta e listagem de Verba escopada.**
Onde um usuário consulta Verbas de um Ofertante, o sistema deve aplicar o mesmo escopo de REQ-OV-05/06.

### Grupo 5 — Saldo e teto da Verba (RN-10, AD-015, AD-016)

**REQ-OV-11 — Cálculo de saldo disponível.**
Onde o saldo disponível de uma Verba é consultado, o sistema deve calculá-lo como o valor total da Verba menos a soma dos valores (`vlCursoAlocado`) já alocados aos cursos vinculados a essa Verba. Não há limite de quantidade de cursos que uma Verba pode custear (AD-015: relação 1 Verba para N Cursos) - o único teto é o de **valor** (REQ-OV-12), nunca um teto de quantidade de projetos.

**REQ-OV-12 — Validação de teto de valor na alocação a um curso.**
Quando um valor é proposto para alocação a um curso a partir de uma Verba, o sistema deve rejeitar a alocação se o valor exceder o saldo disponível (REQ-OV-11), permitindo que a alocação iguale o saldo disponível a zero (AD-016 - uso de até 100% do valor total). Este teto é exclusivamente financeiro: uma Verba pode custear quantos cursos couberem dentro do seu valor total, sem limite de quantidade.

---

## Assunções

- `TB_Ofertante` e `TB_Verba` já existem no `schema.prisma` (schema físico desenhado antecipadamente, antes de qualquer feature de negócio) - esta feature usa os models existentes sem alterar sua forma.
- O auto-cadastro do GO no primeiro acesso (`POST /api/ofertantes`, AD-014 terceira forma) já está implementado em `auth-e-usuarios` - não é reimplementado aqui; o Grupo 1 cobre apenas as duas formas que faltam (pré-cadastro administrativo, cadastro por GT).
- Verba pode ser criada e editada por AM ou GT. O documento fonte (seção 3.4) cita apenas "cadastrada pelo Gestor Turismo"; assume-se que o AM, autoridade global acima do GT na cascata (AD-009), herda a mesma capacidade, por não haver indicação em contrário e por AM já ter poder de criar/editar qualquer coisa que GT cria.
- Edição de Ofertante é permitida a AM, GT e ao próprio GO vinculado (não a VT/VO/AL). Não há exclusão nem desativação de Ofertante ou Verba nesta feature - mesma filosofia de retenção indefinida já aplicada a dados de usuário (seção 7 do documento fonte: "dados pessoais são retidos indefinidamente"). Se uma necessidade de desativação surgir, é uma feature própria futura.
- REQ-OV-12 (teto de alocação) é entregue como função de serviço reutilizável, testada diretamente contra o model `PreCurso` via Prisma (já existe no schema, mesmo sem rota de criação de curso ainda). A rota que efetivamente cria um curso e chama essa função é escopo de `formulario-pre-curso` (ainda não implementada) - esta feature fecha RN-10/CA-16 no nível de serviço/dado, não de ponta a ponta pela UI de criação de curso.
- Deploy sobre HTTPS, cascata (AD-009) e escopo por Ofertante (AD-012/AD-013) herdados de `auth-e-usuarios`; CSRF (REQ-SEC-15) e erro genérico (REQ-SEC-11) herdados de `seguranca-transversal` e aplicados a toda rota mutante desta feature.

---

## Critérios de Aceitação

**CA-OV-01 — Pré-cadastro administrativo.**
Dado um AM ou GT autenticado, quando cadastra um Ofertante com nome e UF válidos, então o Ofertante é criado e pode ser consultado em seguida.

**CA-OV-02 — Campo obrigatório ausente rejeitado.**
Dado um cadastro de Ofertante sem nome ou sem UF, quando submetido, então é rejeitado com HTTP 400 indicando o campo faltante.

**CA-OV-03 — Edição por GO vinculado.**
Dado um GO vinculado ao Ofertante A, quando edita os dados do Ofertante A, então a alteração é persistida.

**CA-OV-04 — Edição fora de escopo negada.**
Dado um GO vinculado ao Ofertante A, quando tenta editar o Ofertante B, então recebe HTTP 403 e o Ofertante B permanece inalterado.

**CA-OV-05 — Vínculo a Ofertante inexistente rejeitado.**
Dado um AM criando ou editando um usuário GO com um `cdOfertante` que não existe, quando a requisição é enviada, então é rejeitada com um erro claro identificando o Ofertante inexistente, não um erro genérico de restrição de banco.

**CA-OV-06 — Consulta escopada de Ofertante.**
Dado um GO vinculado ao Ofertante A, quando consulta o Ofertante A, então recebe os dados; quando consulta o Ofertante B, então recebe HTTP 403.

**CA-OV-07 — Listagem escopada de Ofertantes.**
Dado um GT autenticado, quando lista Ofertantes, então recebe todos os cadastrados; dado um GO vinculado ao Ofertante A, quando consulta sua listagem, então recebe apenas o Ofertante A.

**CA-OV-08 — Criação de Verba.**
Dado um GT autenticado, quando cria uma Verba com valor total positivo para um Ofertante existente, então a Verba é criada vinculada a esse Ofertante.

**CA-OV-09 — Verba com Ofertante inexistente rejeitada.**
Dado um cadastro de Verba apontando para um `cdOfertante` inexistente, quando submetido, então é rejeitado com um erro claro.

**CA-OV-10 — Saldo inicial igual ao total.**
Dado uma Verba recém-criada sem nenhum curso vinculado, quando o saldo disponível é consultado, então é igual ao valor total da Verba.

**CA-OV-11 — Saldo reduzido pela alocação existente.**
Dado uma Verba com um curso vinculado com valor alocado X, quando o saldo disponível é consultado, então é igual ao valor total menos X.

**CA-OV-12 — Teto respeitado com igualdade permitida.**
Dado uma Verba com saldo disponível Y, quando uma alocação de exatamente Y é validada, então é aceita e o saldo resultante é zero (AD-016).

**CA-OV-13 — Teto violado rejeitado.**
Dado uma Verba com saldo disponível Y, quando uma alocação maior que Y é validada, então é rejeitada e o saldo disponível é informado no retorno (RN-10, CA-16 do documento fonte).

**CA-OV-14 — Redução de Verba abaixo do já alocado rejeitada.**
Dado uma Verba com soma já alocada X aos seus cursos, quando uma edição tenta reduzir o valor total para menos que X, então é rejeitada e o valor total permanece inalterado.

**CA-OV-15 — Escopo reforçado no servidor (fecha CA-SEC-14).**
Dado um GO autenticado que forja uma requisição direta a um Ofertante ou Verba de outro Ofertante (sem passar pela UI), quando a requisição chega ao backend, então recebe HTTP 403, provando que a checagem de escopo não depende do cliente.
