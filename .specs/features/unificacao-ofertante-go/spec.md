# Feature: unificacao-ofertante-go

**Escopo:** Complex.
**Dependências:** `auth-e-usuarios` (cascata, sessão, escopo), `cadastro-ofertante-verba` (CRUD de Ofertante/Verba, hoje superado por esta feature), `seguranca-transversal` (CSRF, erro genérico, `podeAcessarOfertante`).
**Fonte de decisão:** pedido explícito do usuário nesta sessão — Ofertante e Gestor Ofertante (GO) são o mesmo ente; decisão de negócio já tomada, não é para reabrir. Vai gerar AD-043 em `.specs/STATE.md`, superando explicitamente AD-012, AD-014 e AD-015.

Remove a incoerência hoje modelada entre `model Ofertante` (entidade autônoma, PK própria `cdOfertante`) e `model Usuario` tipo GO (vinculado por FK ao Ofertante): o GO passa a SER o Ofertante, identificado por CNPJ em vez de CPF, e o VO passa a se vincular diretamente ao GO específico em vez de a um Ofertante independente. As duas decisões arquiteturais mais profundas — (a) `Usuario` ganha uma PK homogênea de "documento" de tamanho variável ou uma coluna `cnpj` própria e heterogênea; (b) a regra de migração para Ofertantes/GOs pré-existentes, incluindo o caso de mais de um GO sob o mesmo Ofertante hoje — ficam para a fase de Design (AD-043), por pedido explícito do usuário, informadas pela cardinalidade real dos dados existentes. Esta especificação descreve o comportamento observável, sem pré-julgar essas duas decisões.

---

## Problem Statement

Hoje o schema modela Ofertante e Gestor Ofertante como dois registros independentes que sempre deveriam representar a mesma organização, sem nenhuma restrição que garanta isso — nada impede um Ofertante sem GO, um GO reatribuído a outro Ofertante, ou (no desenho atual) mais de um GO sob o mesmo Ofertante. O GO se identifica por CPF (documento de pessoa física), mesmo sendo o representante de uma pessoa jurídica, e o VO se vincula ao Ofertante em vez de ao GO que efetivamente gere os cursos. Isso é a mesma classe de risco que a AD-017/018 do projeto já documentou para PreCurso/PosCurso: mudar uma peça sem as outras quebra a garantia. O usuário decidiu remover a entidade Ofertante separada e unificá-la no próprio GO, identificado por CNPJ.

## Goals

- [ ] `cdOfertante` deixa de identificar uma terceira entidade e passa a identificar diretamente o Usuario GO (fusão de dados ou tabela 1:1 pela mesma chave — decisão de Design).
- [ ] GO se identifica por CNPJ (14 dígitos); AM/GT/VT/AL continuam por CPF (11 dígitos), sem regressão nas rotas/guardas que hoje dependem de CPF para esses tipos.
- [ ] VO se vincula diretamente ao GO específico; o escopo do VO passa a ser "os cursos do GO ao qual está vinculado".
- [ ] Nenhuma superfície listada no pedido (schema, guards, cascata, auto-cadastro, listagem/edição, specs/ADs, doc do cliente, e2e) fica desatualizada em relação às outras.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature                                                              | Motivo                                                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Dashboard/indicadores agregados                                       | Feature adiada por AD-024, sem indicadores definidos pelo cliente — inalterada por esta unificação.        |
| Suporte a mais de um GO simultâneo para a mesma organização daqui pra frente | A unicidade do documento identificador (CNPJ) já impede isso por construção — não é regra nova a codificar, só consequência da PK. |
| Suporte a múltiplos CNPJs por grupo econômico (matriz/filial)          | Fora do escopo do pedido: 1 CNPJ = 1 GO = 1 organização, sem hierarquia de grupo.                          |
| Revisão do conjunto de campos organizacionais coletados                | Esta feature funde o modelo; não revisa quais dos 6 campos hoje em `Ofertante` continuam fazendo sentido.  |
| Reescrita de terminologia/copy de UI fora das telas citadas no pedido  | Blast radius controlado às superfícies explicitamente listadas (cadastro-ofertante, ofertantes/[id], usuarios/novo); rótulos em outras telas não são tocados por esta feature. |
| Editar/mesclar o CNPJ de um GO já existente para outro CNPJ            | Não pedido; o CNPJ é o identificador do GO, trocá-lo é efetivamente trocar de entidade — fora de escopo.   |

---

## Assumptions & Open Questions

Toda ambiguidade é resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| PK de `Usuario`: campo único "documento" de tamanho variável (11 ou 14) vs. GO ganha coluna própria (`cnpj`) heterogênea | Decidir formalmente na fase de Design (AD-043), com trade-off explícito entre as duas | Pedido explícito do usuário: "decidir qual das duas na fase de Design, com trade-off explícito" — não é uma ambiguidade de comportamento observável, é uma decisão de forma física de schema | y |
| Regra de migração para Ofertante/GO pré-existentes, incluindo o caso de >1 GO sob o mesmo Ofertante hoje | Decidir formalmente na fase de Design (AD-043), a partir da cardinalidade real dos dados hoje existentes (consulta ao banco/fixtures antes de decidir) | Pedido explícito do usuário: "precisa de regra de migração... definir" — depende de dado que só se conhece inspecionando o estado atual, não de uma preferência de produto | y |
| Fusão de nomes: `Usuario.nome` do GO passa a representar o nome da organização (o que hoje é `Ofertante.nome`); o campo `responsavel` (contato) é novo em `Usuario`, só preenchido para GO | Adotar esta convenção | CNPJ identifica pessoa jurídica — manter `nome` como "nome da pessoa física que loga" deixa de fazer sentido quando o próprio login É a organização; evita duplicar um segundo campo "nome" com semântica ambígua | n |
| Máscara de CNPJ em log/erro (paralelo à máscara de CPF, AD-029) | CNPJ NÃO é mascarado | CNPJ é registro público de pessoa jurídica no Brasil (Receita Federal o publica), diferente de CPF, dado pessoal sob LGPD — AD-029 mira especificamente dado de pessoa física | n |
| Título/copy da tela `/cadastro-ofertante` e do formulário em `usuarios/novo` | Atualizar apenas o texto estritamente necessário para não confundir (ex.: pedir CNPJ em vez de nome+UF isolados de uma "entidade"), sem redesenho visual | Fora do pedido do usuário ir além da mudança funcional; AD-039 (camada visual em arquivo único) não é tocada | n |
| `AvaliacaoAluno.cpf`, `RespostaAvaliacao.cpf`, `DadoPessoalAluno.cpf`, `Sessao.cpfUsuario` para usuários AL | Inalterados — continuam `VarChar(11)`, sem relação com esta feature | Só o documento do GO muda; AL nunca teve `cdOfertante` (AD-012) e seu CPF não é afetado pela fusão Ofertante/GO | y |

**Open questions:** none — todas resolvidas ou registradas acima (as duas decisões de forma física ficam formalmente para o Design, por pedido explícito do usuário; o comportamento observável desta spec não depende de qual das duas for escolhida).

---

## User Stories

### P1: GO passa a ser o próprio Ofertante ⭐ MVP

**User Story**: Como AM/GT que cadastra ou opera um Gestor Ofertante, quero que os dados organizacionais (nome, responsável, email, telefone, UF, município) vivam diretamente no registro do GO, sem uma entidade Ofertante separada, para que não exista mais divergência possível entre "o GO" e "a organização que ele representa".

**Why P1**: É a mudança estrutural da qual as outras duas dependem — sem fundir o modelo, CNPJ-como-documento e VO-vinculado-ao-GO não têm uma âncora única para apontar.

**Acceptance Criteria**:

1. WHEN um AM ou GT cadastra um novo usuário do tipo GO THEN o sistema SHALL persistir, associados a esse mesmo GO (mesma chave), o nome da organização e a UF como obrigatórios, e responsável/email/telefone/município como opcionais — sem criar nenhum registro numa tabela Ofertante autônoma e independente.
2. WHEN o auto-cadastro do GO no primeiro acesso é concluído (fluxo hoje em `/cadastro-ofertante`) THEN o sistema SHALL gravar os mesmos campos organizacionais associados ao próprio GO autenticado, nunca a um novo registro de terceiro desvinculável.
3. The system SHALL garantir que todo GO tenha exatamente um conjunto de dados organizacionais — nunca zero (após o auto-cadastro ou pré-cadastro concluídos) nem mais de um.
4. IF um GO que já tem dados organizacionais completos (auto-cadastro concluído ou pré-cadastrado por AM/GT) tenta se auto-cadastrar novamente THEN o sistema SHALL rejeitar com HTTP 409, preservando os dados já existentes inalterados.
5. WHEN um AM, um GT, ou o próprio GO edita os dados organizacionais desse GO THEN o sistema SHALL validar os mesmos campos do item 1 e persistir a alteração diretamente no registro do GO.
6. IF um GO tenta editar os dados organizacionais de outro GO THEN o sistema SHALL rejeitar com HTTP 403 e os dados do outro GO permanecem inalterados.

**Independent Test**: Cadastrar um GO via AM/GT informando os 6 campos organizacionais, consultar o próprio GO em seguida e confirmar que os dados retornam do mesmo registro — sem nenhuma consulta a uma segunda tabela Ofertante.

---

### P2: GO se identifica por CNPJ, não CPF

**User Story**: Como AM/GT que cadastra um Gestor Ofertante, quero informar o CNPJ da organização em vez de um CPF, para que a identidade do GO no sistema corresponda ao documento real da pessoa jurídica que ele representa — e como qualquer usuário fazendo login, quero que o sistema aceite o documento correto para o meu tipo de perfil.

**Why P2**: É o pedido de negócio explícito ("GO passa a se identificar por CNPJ") e afeta login, sessão, cascata e toda validação hoje escrita assumindo CPF de 11 dígitos.

**Acceptance Criteria**:

1. The system SHALL identificar todo usuário do tipo GO por um CNPJ de 14 dígitos, validado pelo algoritmo padrão de dígito verificador módulo 11 do CNPJ, tanto no cliente quanto no servidor (mesmo padrão de AD-011 para CPF).
2. The system SHALL continuar identificando usuários dos tipos AM, GT, VT, VO e AL por CPF de 11 dígitos, validado pelo algoritmo já existente — inalterado por esta feature.
3. WHEN um AM ou GT submete o cadastro de um GO THEN o sistema SHALL exigir um CNPJ e rejeitar com HTTP 400 um CNPJ com formato ou dígito verificador inválido, incluindo sequências de dígitos repetidos (mesmo padrão hoje aplicado a CPF em `validarCPF`).
4. IF o CNPJ informado no cadastro de um GO já pertence a outro GO existente THEN o sistema SHALL rejeitar a criação com um erro claro de duplicidade.
5. WHEN um usuário submete o formulário de login THEN o sistema SHALL aceitar tanto um CPF de 11 dígitos quanto um CNPJ de 14 dígitos como documento de identificação, validando cada um com seu próprio algoritmo antes de checar a senha, e rejeitando com a mesma mensagem genérica ("CPF ou senha inválidos"-equivalente) um documento de tamanho diferente de 11 ou 14.
6. The system SHALL manter, para GO, a mesma cascata de criação (AD-009: GT cria GO, GO cria GO/VO/AL) e a mesma regra de senha no primeiro acesso (AD-010), agora chaveadas pelo CNPJ em vez do CPF.
7. The system SHALL continuar mascarando o CPF em log/erro (AD-029) e NÃO SHALL aplicar a mesma máscara ao CNPJ do GO, por este identificar pessoa jurídica, não pessoa física.

**Independent Test**: Cadastrar um GO com um CNPJ válido, fazer login com esse CNPJ + senha, e confirmar sessão criada; tentar cadastrar um segundo GO com o mesmo CNPJ e confirmar rejeição por duplicidade.

---

### P3: VO se vincula diretamente ao GO específico

**User Story**: Como AM/GT/GO que cadastra um Visualizador Ofertante, quero vinculá-lo diretamente ao GO responsável (não a uma entidade Ofertante intermediária), para que o escopo de leitura do VO acompanhe exatamente os cursos geridos por aquele GO.

**Why P3**: Fecha a unificação — sem isso o VO ainda apontaria para um conceito de "Ofertante" que deixou de existir como entidade separada.

**Acceptance Criteria**:

1. WHEN um AM, GT ou o próprio GO cadastra um usuário do tipo VO THEN o sistema SHALL vincular o VO diretamente ao CNPJ do GO informado (ou herdado do criador, quando o criador for o próprio GO, mesma regra de `resolverOfertante`/REQ-AU-08) — nunca a um identificador de Ofertante independente do GO.
2. The system SHALL escopar toda consulta de curso, verba e avaliação feita por um VO aos recursos do GO ao qual ele está vinculado — "os cursos do GO", não mais "os cursos do Ofertante".
3. IF um GO tenta vincular um VO a um CNPJ de GO diferente do seu próprio THEN o sistema SHALL rejeitar com HTTP 403.
4. IF um AM ou GT informa, ao criar um VO, um CNPJ que não corresponde a nenhum GO cadastrado THEN o sistema SHALL rejeitar com um erro claro identificando o GO inexistente, não um erro genérico de restrição de banco (mesmo padrão de REQ-OV-04).
5. The system SHALL remover `GO` da lista de tipos que um GO pode criar em cascata (`TIPOS_PERMITIDOS`, AD-009) — um GO continua criando VO e AL, mas não outro GO. Achado durante a investigação de código (Tasks): hoje `GO cria GO` herda o mesmo `cdOfertante` do criador (`e2e/usuarios.spec.ts:201`, `cascata.test.ts:36`), produzindo exatamente o cenário "dois GOs para a mesma organização" que a unificação 1 GO = 1 CNPJ elimina por construção.

**Independent Test**: GO com CNPJ X cadastra um VO informando o próprio CNPJ; o VO criado, ao consultar cursos, recebe exatamente os cursos cujo GO é o CNPJ X — e recebe HTTP 403 ao tentar consultar cursos de outro GO.

---

## Edge Cases

- IF um AM ou GT tenta cadastrar um GO sem CNPJ ou sem UF THEN o sistema SHALL rejeitar com HTTP 400 indicando o campo faltante (mesma semântica de CA-OV-02 hoje, adaptada ao GO).
- IF o CNPJ informado tem 14 dígitos mas todos iguais (ex.: "11111111111111") THEN o sistema SHALL rejeitar como inválido (mesma regra hoje aplicada a CPF em `validarCPF`).
- WHEN um GO edita os próprios dados organizacionais mudando o município/UF THEN o sistema SHALL persistir a alteração sem exigir novo CNPJ (o CNPJ não muda numa edição de dados de contato).
- IF uma requisição de leitura ou escrita por um GO ou VO referenciar um recurso (Verba, PreCurso, Ofertante/GO) de um GO diferente THEN o sistema SHALL retornar HTTP 403, preservando a garantia hoje provada por CA-SEC-14/CA-OV-15, agora medida pelo CNPJ do GO em vez de um `cdOfertante` de terceiro.
- WHEN a migração do modelo antigo roda sobre os dados hoje existentes THEN o sistema SHALL terminar com todo GO tendo exatamente um conjunto de dados organizacionais, nenhum registro Ofertante autônomo remanescente, e nenhuma FK de Verba/PreCurso apontando para um identificador que deixou de existir — a regra exata para o caso de mais de um GO pré-existente sob o mesmo Ofertante é definida em Design (AD-043).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UGO-01 | P1: GO passa a ser o próprio Ofertante | Design | Pending |
| UGO-02 | P1: GO passa a ser o próprio Ofertante | Design | Pending |
| UGO-03 | P1: GO passa a ser o próprio Ofertante | Design | Pending |
| UGO-04 | P1: GO passa a ser o próprio Ofertante | Design | Pending |
| UGO-05 | P1: GO passa a ser o próprio Ofertante | Design | Pending |
| UGO-06 | P1: GO passa a ser o próprio Ofertante | Design | Pending |
| UGO-07 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-08 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-09 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-10 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-11 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-12 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-13 | P2: GO se identifica por CNPJ | Design | Pending |
| UGO-14 | P3: VO se vincula diretamente ao GO específico | Design | Pending |
| UGO-15 | P3: VO se vincula diretamente ao GO específico | Design | Pending |
| UGO-16 | P3: VO se vincula diretamente ao GO específico | Design | Pending |
| UGO-17 | P3: VO se vincula diretamente ao GO específico | Design | Pending |
| UGO-18 | P3: VO se vincula diretamente ao GO específico | Tasks | Pending |

**ID format:** `UGO-NN` (Unificação Gestor Ofertante).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 18 total, 0 mapped a tasks ainda, 18 unmapped ⚠️ (mapeamento acontece na fase de Tasks).

---

## Success Criteria

- [ ] Todo GO no sistema é identificado por um CNPJ válido (14 dígitos) — nenhum GO com CPF de 11 dígitos remanescente.
- [ ] Nenhuma tabela/registro "Ofertante" autônomo e independente do GO existe após a migração.
- [ ] Todo VO está vinculado a um GO específico existente — nenhum VO vinculado a um identificador que não corresponda a nenhum GO.
- [ ] Toda rota que hoje aplica `podeAcessarOfertante`/`podeEditarOfertante`/`podeGerenciarPreCurso`/`podeGerenciarPosCurso`/`podeMatricularAluno`/`podeAcessarAvaliacao` continua retornando 403 para acesso fora de escopo, agora medido pelo CNPJ do GO.
- [ ] AD-043 registrada em `.specs/STATE.md`, superando explicitamente AD-012, AD-014 e AD-015.
- [ ] `docs/SPMA_Especificacao_Cliente_v2.md` seções 2.2/2.3/3.3 anotadas com o desvio deliberado (mesmo padrão SPEC_DEVIATION já usado no código).
- [ ] Gate completo verde (`lint && build && typecheck && test:unit && test:integration && test:e2e`), incluindo os specs e2e que hoje criam Ofertante + GO como fixtures separadas.
