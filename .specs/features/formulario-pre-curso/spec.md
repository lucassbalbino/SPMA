# Feature: formulario-pre-curso

**Escopo:** Complex (ambiguidade real de domínio — o documento fonte descreve os 54 itens de dado só por bloco/categoria, sem lista nominal; ver Assunções).
**Dependências:** `auth-e-usuarios` (sessão, cascata, escopo), `seguranca-transversal` (CSRF, erro genérico, `podeAcessarOfertante`), `cadastro-ofertante-verba` (`validarAlocacao` em `src/lib/verba/saldo.ts`, model `Verba`/`Ofertante`).
**Fonte de decisões:** STATE.md AD-004, AD-012, AD-013, AD-015 a AD-019, AD-025 a AD-027, AD-033.
**Fonte funcional:** `docs/SPMA_Especificacao_Cliente_v2.md` seção 4 (Formulário de Pré-Curso), seção 3.5 (`TB_Pre_Curso`), seção 8 (RN-04, RN-05, RN-09, RN-10), seção 9 (CA-03 a CA-05, CA-11 a CA-13, CA-16).

---

## Problem Statement

O Gestor Ofertante (GO) precisa registrar, antes do início de cada curso, um diagnóstico estruturado de 54 itens (identificação, planejamento, público-alvo, infraestrutura, corpo docente, divulgação, parcerias e suporte ao aluno) vinculado a uma verba do seu Ofertante. Hoje o model `PreCurso` existe no schema (usado só para leitura agregada por `cadastro-ofertante-verba`), mas não há rota nem UI para criar, preencher incrementalmente, validar as regras condicionais e encerrar esse formulário de forma irreversível. Sem isso, o pipeline de dados que alimenta o Pós-Curso e o dashboard futuro (AD-024) não tem ponto de entrada.

## Goals

- [ ] GO autenticado cria um pré-curso vinculado a uma Verba do próprio Ofertante, com validação de teto reaproveitando `validarAlocacao`.
- [ ] GO preenche o questionário de 54 perguntas do documento fonte (56 chaves no schema Zod, contando as 2 condicionais "Outro" à parte — ver Dicionário de Campos) em múltiplas gravações parciais, com validação de forma (Zod) a cada gravação.
- [ ] Sistema aplica as regras condicionais (instituição executora, equipamentos específicos, 5 campos "Outro/Qual") só como gate de encerramento, não de gravação parcial.
- [ ] GO encerra o pré-curso de forma irreversível somente quando todos os campos obrigatórios (incluindo condicionais aplicáveis) estão completos; a partir daí o formulário é somente leitura.
- [ ] Toda leitura/escrita reforça o escopo por Ofertante no servidor (fecha, para este recurso, o padrão já estabelecido por `cadastro-ofertante-verba`/CA-SEC-14).

## Out of Scope

| Feature | Motivo |
|---|---|
| Formulário de Pós-Curso (`TB_Pos_Curso`) | Feature futura própria — seção 5 do documento fonte, campos e regras diferentes. |
| Formulário de Avaliação do Aluno (`TB_Avaliacao_Aluno`) | Feature futura própria — seção 6, inclui o gate Parte 1 → Parte 2 (AD-023). |
| Edição do valor total da Verba | Já entregue por `cadastro-ofertante-verba` (REQ-OV-09). |
| Exclusão/cancelamento de pré-curso | Não existe no domínio; a única transição de status é encerrar (AD-018). |
| Reabertura de pré-curso encerrado | Proibido por AD-018/RN-09 em qualquer feature. |
| Indicadores/dashboard agregando dados de pré-curso | Feature adiada, AD-024. |
| Exportação/relatórios do pré-curso | Não mencionado no documento fonte para esta feature. |
| Emissão de certificado | AD-021 — fora do sistema. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Lista nominal dos 54 itens de dado (o documento fonte só descreve por bloco/categoria) | Deriva-se o dicionário completo de campos (seção "Dicionário de Campos" abaixo) a partir das descrições de bloco (4.1), dos exemplos citados, e dos ADs já travados (AD-019, AD-025 a AD-027); soma bate com os 54 itens declarados quando as 2 condicionais "Outro" do Bloco 2 são contadas junto da pergunta-mãe (17 de infraestrutura com contagem explícita no doc + 37 dos demais blocos) — o schema Zod usa 56 chaves porque cada condicional precisa da própria validação | Decisão explícita do usuário nesta sessão: "Eu derivo e você revisa" — evita bloquear a feature por falta de planilha/anexo, mas mantém o dicionário revisável antes de Design/Tasks | y |
| Nomes dos 9 itens de Infraestrutura Básica e dos 8 de Infraestrutura Complementar (doc cita só exemplos parciais) | Ver Dicionário de Campos, blocos 6 e 7 | O doc ancora a CONTAGEM (9 e 8, seção 4.1) mas não o nome de cada item; completados com itens plausíveis de checklist de infraestrutura de curso presencial no contexto brasileiro | n — revisar com o cliente antes do encerramento real da feature em produção |
| Opções das perguntas de seleção única/múltipla sem lista explícita no doc (vínculo a plano/programa, características do curso, público-alvo, critérios de seleção docente, políticas de reparação, canais de divulgação, parcerias, suporte ao aluno) | Ver Dicionário de Campos | Mesma decisão acima — derivação com base no domínio (qualificação profissional em Turismo, financiado por programa público) e nos 5 campos "Outro/Qual" já ancorados em 4.2, que cobrem o risco de lista incompleta (usuário sempre pode escrever texto livre quando a opção não existir) | n — revisar com o cliente |
| Estratégia de armazenamento das respostas do questionário (`Json?` vs coluna por pergunta) | JSON validado por Zod (opção B da nota em `prisma/schema.prisma`, linha 237) | Já adotada no schema físico; esta feature formaliza a AD correspondente no Design (pendência registrada em STATE.md) | y |
| "Região" (bloco Dados da Qualificação) | Seleção única entre as 5 macrorregiões do Brasil (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) | O doc não define; UF já é capturada separadamente, então "Região" é tratada como a macrorregião do curso, dado mais agregado útil para relatórios futuros | n — revisar |
| Quem pode criar pré-curso | Apenas GO (Gestor Ofertante) do próprio Ofertante | Seção 4 do doc: "Preenchido pelo Gestor Ofertante"; AM/GT não aparecem como criadores em nenhuma seção — diferente de Ofertante/Verba (AD-014/RN-01), que são cadastro administrativo | y |
| Quem pode consultar (não editar) pré-curso fora do GO criador | AM/GT/VT (qualquer um, sem escopo) e VO do mesmo Ofertante (somente leitura) | Espelha o padrão de escopo já definido em AD-012/REQ-OV-05/06 para Ofertante/Verba — VO é "Visualizador Ofertante", perfil de leitura por definição (AD-008) | y |
| Formato de gravação parcial | `PATCH` idempotente que faz merge raso (shallow merge) do JSON de respostas — envia só os campos alterados, sobrescreve só essas chaves | Evita que o cliente precise reenviar os 56 campos a cada auto-save; alinhado com o padrão "salvar parcial" de REQ-PC-04 | y |
| Unicidade de pré-curso "em andamento" por Ofertante | Sem limite — um Ofertante pode ter vários pré-cursos EM_ANDAMENTO simultâneos (um por curso) | O doc não menciona restrição de concorrência aqui; a única regra de "um por vez" no domínio é a do Aluno (AD-022), que é uma tabela e regra diferentes | y |

**Open questions:** none - all resolved or logged above (as assumptions, alguns marcados como pendentes de confirmação do cliente antes de produção — ver coluna "Confirmed?").

---

## Dicionário de Campos (Anexo — base para o Zod schema de `respostas`)

Chaves em camelCase, para uso direto como propriedades do JSON `PreCurso.respostas`. `sel-única` / `sel-múltipla` = seleção; `Outro?` = tem opção "Outra/Outro" com campo condicional de texto livre (RN-04, seção 4.2).

### Bloco 1 — Identificação (6 itens, todos obrigatórios)

| Chave | Rótulo | Tipo |
|---|---|---|
| `identifUf` | UF | sel-única (27 UFs) |
| `identifMunicipio` | Município | texto |
| `identifEntidadeResponsavel` | Entidade responsável | texto |
| `identifCoordenador` | Coordenador do curso | texto |
| `identifEmail` | E-mail de contato | texto (formato e-mail) |
| `identifTelefone` | Telefone de contato | texto |

### Bloco 2 — Dados da Qualificação (8 chaves: 6 diretas + 2 condicionais "Outro", todos obrigatórios quando aplicável)

| Chave | Rótulo | Tipo |
|---|---|---|
| `qualifEndereco` | Endereço do local do curso | texto |
| `qualifNomeCurso` | Nome do curso | texto |
| `qualifVinculoPrograma` | Vínculo a plano/programa de qualificação | sel-única: Plano Nacional de Turismo / Programa Estadual de Qualificação / Programa Municipal de Qualificação / Outro **(Outro?)** |
| `qualifCaracteristicas` | Características do curso contempladas | sel-múltipla: Sustentabilidade / Empreendedorismo / Turismo de base comunitária / Turismo rural / Turismo cultural / Acessibilidade e turismo inclusivo / Outra **(Outro?)** |
| `qualifModalidade` | Modalidade | sel-única: Presencial / EAD / Híbrida |
| `qualifRegiao` | Região | sel-única: Norte / Nordeste / Centro-Oeste / Sudeste / Sul |
| *(condicionais)* | `qualifVinculoProgramaOutro`, `qualifCaracteristicasOutra` | texto, obrigatório apenas se a opção "Outro/Outra" correspondente foi selecionada |

### Bloco 3 — Planejamento (7 itens, todos obrigatórios)

| Chave | Rótulo | Tipo |
|---|---|---|
| `planejDataInicioPrevista` | Data prevista de início | data |
| `planejDataTerminoPrevista` | Data prevista de término | data |
| `planejCargaHoraria` | Carga horária prevista (horas) | número inteiro > 0 |
| `planejNumTurmas` | Número de turmas previstas | número inteiro > 0 |
| `planejNumAlunosPrevistos` | Número de alunos previstos | número inteiro > 0 |
| `planejTaxaEvasaoEsperada` | Taxa de evasão esperada (%) | número 0–100 |
| `planejObjetivo` | Objetivo do curso | texto livre |

### Bloco 4 — Público-Alvo (3 itens, 1 condicional)

| Chave | Rótulo | Tipo |
|---|---|---|
| `publicoPerfil` | Perfil do público-alvo | sel-múltipla, obrigatório (≥1): Jovens / Mulheres / Pessoas em situação de vulnerabilidade social / Trabalhadores do setor de turismo / Empreendedores locais / Comunidade em geral |
| `publicoInstituicaoExecutora` | Instituição executora | sel-única, obrigatório: Entidade responsável / Empresa contratada / Parceria entre Entidade Responsável e Entidade Executora |
| `publicoInstituicaoExecutoraNome` | Nome da instituição contratada/parceira | texto, obrigatório **somente se** `publicoInstituicaoExecutora` ∈ {Empresa contratada, Parceria...} (4.2, CA-04) |

### Bloco 5 — Diagnóstico Pré-Curso (1 item, obrigatório)

| Chave | Rótulo | Tipo |
|---|---|---|
| `diagnosticoConsultas` | Consultas realizadas com atores territoriais | sel-múltipla, obrigatório (≥1): Poder público municipal / Poder público estadual / Sociedade civil organizada / Empresários locais do setor de turismo / Comunidade local / Instituições de ensino / Nenhuma consulta realizada |

### Bloco 6 — Infraestrutura Básica (9 itens, escala 0–5, todos obrigatórios — AD-019, AD-027)

Enunciado: "Avalie a disponibilidade e o estado de conservação dos seguintes itens:"

| Chave | Rótulo |
|---|---|
| `infraBasicaBanheiros` | Banheiros |
| `infraBasicaEnergia` | Fornecimento de energia elétrica |
| `infraBasicaSalaAula` | Sala de aula |
| `infraBasicaBiblioteca` | Biblioteca / espaço de leitura |
| `infraBasicaAcessibilidade` | Acessibilidade (rampas, sinalização, banheiro adaptado) |
| `infraBasicaLaboratorio` | Laboratório de informática |
| `infraBasicaAguaPotavel` | Água potável |
| `infraBasicaIluminacao` | Iluminação dos ambientes |
| `infraBasicaConectividade` | Conectividade / acesso à internet |

Cada chave acima armazena um inteiro 0–5 (0=Não há disponibilidade, 1=Péssimo, 2=Ruim, 3=Regular, 4=Bom, 5=Ótimo — seção 4.3/AD-019).

### Bloco 7 — Infraestrutura Complementar (8 itens, escala 0–5, todos obrigatórios — AD-027)

Mesmo enunciado e mesma escala do Bloco 6.

| Chave | Rótulo |
|---|---|
| `infraComplSalaProfessores` | Sala de professores |
| `infraComplCopa` | Copa / cozinha |
| `infraComplAuditorio` | Auditório / espaço para eventos |
| `infraComplAudiovisual` | Equipamentos audiovisuais (projetor, som) |
| `infraComplTecnologicos` | Equipamentos tecnológicos (computadores, tablets) |
| `infraComplConvivencia` | Área de convivência / lazer |
| `infraComplEstacionamento` | Estacionamento |
| `infraComplAlimentacao` | Espaço para alimentação (refeitório/cantina) |

### Bloco 8 — Infraestrutura Específica (4 itens, 3 condicionais — 4.2)

| Chave | Rótulo | Tipo |
|---|---|---|
| `infraEspecificaNecessidade` | Necessidade de equipamentos específicos ao curso | sel-única, obrigatório: Sim / Não |
| `infraEspecificaDisponibilidade` | Disponibilidade dos equipamentos específicos | sel-única, obrigatório **somente se** `infraEspecificaNecessidade` = "Sim": Disponível / Parcialmente disponível / Indisponível |
| `infraEspecificaSuficiencia` | Suficiência dos equipamentos específicos | sel-única, obrigatório **somente se Sim**: Suficiente / Insuficiente |
| `infraEspecificaManutencao` | Situação de manutenção dos equipamentos específicos | sel-única, obrigatório **somente se Sim**: Em bom estado / Necessita manutenção / Não aplicável |

### Bloco 9 — Corpo Docente (5 itens, 1 condicional — AD-025, AD-026)

| Chave | Rótulo | Tipo |
|---|---|---|
| `docenteCriteriosSelecao` | Critérios de seleção de professores | sel-múltipla, obrigatório (≥1): Formação acadêmica / Experiência prática no setor de turismo / Experiência em docência / Vínculo com a comunidade local / Indicação de parceiros / Processo seletivo público |
| `docenteFormaContratacao` | Forma de contratação de professores | sel-única, obrigatório: CLT / Prestação de serviço (RPA/autônomo) / Servidor público cedido / Voluntariado / Outra **(Outro?)** |
| `docenteFormaContratacaoOutra` | *(condicional)* especificação da forma de contratação | texto, obrigatório apenas se `docenteFormaContratacao` = "Outra" |
| `docenteNivelFormacao` | Nível de formação dos professores | sel-única (AD-025), obrigatório: Ensino médio / Graduação / Pós-graduação (lato sensu) / Mestrado / Doutorado |
| `docentePoliticasReparacao` | Políticas de reparação/inclusão docente | sel-múltipla, obrigatório (≥1): Cotas para docentes negros / Cotas para docentes indígenas / Cotas para docentes com deficiência / Equidade de gênero na seleção / Nenhuma política aplicada |

### Bloco 10 — Divulgação (2 itens, 1 condicional)

| Chave | Rótulo | Tipo |
|---|---|---|
| `divulgacaoEstrategias` | Estratégias de divulgação | sel-múltipla, obrigatório (≥1): Redes sociais / Rádio local / Cartazes e panfletos impressos / Divulgação em escolas / Parcerias com associações locais / Carro de som / Outra **(Outro?)** |
| `divulgacaoEstrategiasOutra` | *(condicional)* especificação de outro canal | texto, obrigatório apenas se "Outra" ∈ `divulgacaoEstrategias` |

### Bloco 11 — Parcerias (1 item, obrigatório)

| Chave | Rótulo | Tipo |
|---|---|---|
| `parceriasEstabelecidas` | Parcerias locais estabelecidas | sel-múltipla, obrigatório (≥1): Prefeitura municipal / Governo estadual / SEBRAE / Instituições de ensino / Associações e cooperativas locais / Empresas privadas do setor de turismo / ONGs / Nenhuma parceria estabelecida |

### Bloco 12 — Suporte ao Aluno (2 itens, 1 condicional)

| Chave | Rótulo | Tipo |
|---|---|---|
| `suporteEstrategias` | Estratégias de apoio logístico, financeiro e político | sel-múltipla, obrigatório (≥1): Auxílio transporte / Auxílio alimentação / Material didático gratuito / Apoio para documentação e deslocamento / Articulação política para permanência do aluno / Outra **(Outro?)** |
| `suporteEstrategiasOutra` | *(condicional)* especificação de outro apoio | texto, obrigatório apenas se "Outra" ∈ `suporteEstrategias` |

**Contagem:** 6+8+7+3+1+9+8+4+5+2+1+2 = **56 chaves**. O documento fonte declara "54 itens de dado" (seção 4) contando cada pergunta com sua condicional "Outro" como **um** item (ex.: A-28 + A-28.1 = 1 item na numeração do cliente, AD-026); esta correção soma os 2 campos condicionais do Bloco 2 (`qualifVinculoProgramaOutro`, `qualifCaracteristicasOutra`) como chaves distintas do JSON, porque cada um precisa da própria validação Zod e da própria checagem de completude — 56 é a contagem correta de **chaves no schema**, 54 é a contagem de **perguntas** do documento fonte; não há divergência de conteúdo, só de unidade de contagem.

---

## User Stories

### P1: Criação do pré-curso com validação de teto de verba ⭐ MVP

**User Story**: Como Gestor Ofertante, quero iniciar um novo pré-curso vinculado a uma verba do meu Ofertante, para começar a registrar o diagnóstico antes do curso começar.

**Why P1**: Sem criação não há registro para preencher — é o ponto de entrada de toda a feature.

**Acceptance Criteria**:

1. QUANDO um GO autenticado cria um pré-curso informando `cdVerba` (de uma Verba do próprio Ofertante) e `vlCursoAlocado`, o sistema SHALL validar a alocação via `validarAlocacao` (reuso de `src/lib/verba/saldo.ts`) e, se aprovada, criar o registro com `status=EM_ANDAMENTO`, `respostas=null`, `criadoPor=CPF do GO`. (REQ-PC-01)
2. SE o `vlCursoAlocado` proposto exceder o saldo disponível da Verba, ENTÃO o sistema SHALL rejeitar a criação com HTTP 400 e informar o saldo disponível no corpo da resposta, sem criar o registro. (REQ-PC-02)
3. SE a Verba informada não pertencer ao Ofertante do GO autenticado (ou não existir), ENTÃO o sistema SHALL rejeitar com HTTP 403 (fora de escopo) ou 400 (inexistente), sem criar o registro. (REQ-PC-03)
4. O sistema SHALL aceitar `vlCursoAlocado` igual ao saldo disponível (uso de até 100%, AD-016), gerando saldo resultante zero.

**Independent Test**: Criar uma Verba com saldo disponível, criar um pré-curso alocando um valor dentro do saldo (aceito) e um valor acima do saldo (rejeitado com o saldo informado).

---

### P1: Preenchimento incremental do questionário ⭐ MVP

**User Story**: Como Gestor Ofertante, quero salvar as respostas do questionário aos poucos, em várias sessões, para não perder o preenchimento se eu precisar interromper.

**Why P1**: O questionário tem 56 chaves — exigir tudo de uma vez numa única gravação é inviável na prática e não é o que a seção 4.4 do documento descreve (completude é exigida só no encerramento).

**Acceptance Criteria**:

1. ENQUANTO o pré-curso está `EM_ANDAMENTO`, o sistema SHALL aceitar gravações parciais de `respostas` (PATCH com merge raso — só as chaves enviadas são alteradas), sem exigir que todos os 56 campos estejam preenchidos. (REQ-PC-04)
2. QUANDO uma gravação (parcial ou completa) é submetida, o sistema SHALL validar a FORMA de cada campo enviado (tipo, opções válidas dentre as do Dicionário de Campos) via o schema Zod compartilhado, rejeitando com HTTP 400 e identificação do campo qualquer valor fora de forma. (REQ-PC-05)
3. QUANDO um item de infraestrutura (Blocos 6 ou 7) é gravado, o sistema SHALL aceitar exclusivamente um inteiro entre 0 e 5, armazenando o valor conforme a tabela da seção 4.3 (0=Não há disponibilidade … 5=Ótimo). (REQ-PC-06)
4. SE o GO tentar gravar `respostas` num pré-curso com `status=ENCERRADO`, ENTÃO o sistema SHALL rejeitar com HTTP 409 (ou 403, conforme convenção do projeto) sem alterar nenhum dado. (REQ-PC-12, parte gravação)

**Independent Test**: Criar um pré-curso, gravar só o Bloco 1 (PATCH parcial), confirmar que os demais blocos continuam nulos e a gravação foi aceita; gravar um item de infraestrutura com valor 6 e confirmar rejeição.

---

### P1: Regras condicionais como gate de encerramento ⭐ MVP

**User Story**: Como Gestor Ofertante, quero que o sistema só exija os campos condicionais quando eles realmente se aplicam ao meu curso, mas quero ser impedido de encerrar se esquecer de preenchê-los.

**Why P1**: RN-04/seção 4.2 do documento fonte definem essas regras como parte central do formulário; sem elas o pré-curso pode ser encerrado incompleto.

**Acceptance Criteria**:

1. QUANDO `publicoInstituicaoExecutora` = "Empresa contratada" ou "Parceria entre Entidade Responsável e Entidade Executora", o sistema SHALL exigir `publicoInstituicaoExecutoraNome` preenchido como condição para o encerramento (CA-04 do documento fonte). (REQ-PC-07)
2. QUANDO `infraEspecificaNecessidade` = "Sim", o sistema SHALL exigir as três perguntas condicionais (`infraEspecificaDisponibilidade`, `infraEspecificaSuficiencia`, `infraEspecificaManutencao`) preenchidas como condição para o encerramento. (REQ-PC-08)
3. QUANDO a opção "Outro/Outra" é selecionada em qualquer um dos 5 campos que a possuem (`qualifVinculoPrograma`, `qualifCaracteristicas`, `docenteFormaContratacao`, `divulgacaoEstrategias`, `suporteEstrategias`), o sistema SHALL exigir o respectivo campo de texto livre preenchido (não vazio, não só espaços) como condição para o encerramento. (REQ-PC-09)
4. O sistema SHALL permitir gravação parcial sem esses campos condicionais preenchidos enquanto o pré-curso está `EM_ANDAMENTO` — a exigência vale só no momento do encerramento (não bloqueia PATCH intermediário).

**Independent Test**: Gravar `publicoInstituicaoExecutora`="Empresa contratada" sem `publicoInstituicaoExecutoraNome`, confirmar que a gravação parcial é aceita mas uma tentativa de encerramento nesse estado é rejeitada; preencher o nome e confirmar que o encerramento passa a ser aceito (mantendo os demais campos obrigatórios completos).

---

### P1: Encerramento irreversível do pré-curso ⭐ MVP

**User Story**: Como Gestor Ofertante, quero encerrar o pré-curso quando terminar de preenchê-lo, sabendo que essa ação é definitiva, para travar o diagnóstico antes do curso começar.

**Why P1**: Fecha RN-09/AD-018/CA-05/CA-11 do documento fonte — sem isso o dado nunca fica auditável/estável.

**Acceptance Criteria**:

1. QUANDO o GO aciona o encerramento e todos os 56 campos obrigatórios do Dicionário de Campos (incluindo os condicionais aplicáveis, REQ-PC-07/08/09) estão preenchidos, o sistema SHALL alterar `status` para `ENCERRADO`, gravar `dataEncerramento=now()`, de forma irreversível. (REQ-PC-11)
2. SE o GO aciona o encerramento com qualquer campo obrigatório (incluindo condicional aplicável) ausente, ENTÃO o sistema SHALL rejeitar com HTTP 400 listando as chaves do Dicionário de Campos pendentes, sem alterar `status`. (REQ-PC-10)
3. SE o pré-curso já está `ENCERRADO`, ENTÃO qualquer nova tentativa de gravação de `respostas` ou de encerramento SHALL ser rejeitada, preservando os dados atuais inalterados (somente leitura, RN-09). (REQ-PC-12)
4. O sistema SHALL nunca permitir a transição `ENCERRADO` → `EM_ANDAMENTO` por nenhuma rota (AD-018 — sem exceção de reabertura administrativa).

**Independent Test**: Preencher todos os 56 campos de um pré-curso e encerrar (aceito); tentar gravar um campo após o encerramento (rejeitado, dado inalterado); tentar encerrar com um campo faltando (rejeitado, lista o campo).

---

### P1: Consulta e listagem escopadas por Ofertante ⭐ MVP

**User Story**: Como usuário do sistema, quero consultar e listar pré-cursos respeitando meu escopo de acesso, para nunca ver ou alterar dados de um Ofertante que não é o meu.

**Why P1**: Fecha, para este recurso, o mesmo padrão de reforço de escopo no servidor que `cadastro-ofertante-verba` fechou para Ofertante/Verba (CA-12 do documento fonte, AD-012/AD-013/AD-033).

**Acceptance Criteria**:

1. ONDE um GO/VO consulta um pré-curso específico, o sistema SHALL retornar os dados apenas se `cdOfertante` do curso estiver no escopo do usuário (reuso de `podeAcessarOfertante`); AM/GT/VT SHALL poder consultar qualquer pré-curso. (REQ-PC-13)
2. ONDE um GO/VO lista pré-cursos, o sistema SHALL retornar apenas os do próprio Ofertante; AM/GT/VT SHALL receber todos (com filtro opcional por Ofertante). (REQ-PC-14)
3. SE um GO autenticado forjar uma requisição direta a um pré-curso de outro Ofertante (sem passar pela UI), ENTÃO o sistema SHALL reavaliar a autorização no servidor a cada request e retornar HTTP 403, independentemente do que a interface exibe. (REQ-PC-15)
4. Apenas o GO vinculado ao Ofertante do pré-curso SHALL poder gravar respostas ou encerrar; VO (perfil de leitura, AD-008) SHALL receber HTTP 403 em qualquer tentativa de escrita.

**Independent Test**: Com um GO vinculado ao Ofertante A e um pré-curso do Ofertante B, tentar consultar/listar/gravar no pré-curso do Ofertante B e confirmar HTTP 403 em todos os casos; confirmar que o mesmo GO opera normalmente sobre pré-cursos do Ofertante A.

---

## Edge Cases

- SE nenhuma Verba com saldo disponível existir para o Ofertante do GO, ENTÃO a criação de pré-curso SHALL ser rejeitada com HTTP 400 informando ausência de saldo (não uma exceção não tratada).
- QUANDO um item de infraestrutura recebe o valor `0` (Não há disponibilidade), o sistema SHALL tratá-lo como resposta válida preenchida — `0` não é equivalente a "campo vazio" na checagem de completude do encerramento.
- SE um campo obrigatório de seleção múltipla for enviado como lista vazia `[]`, ENTÃO o sistema SHALL rejeitá-lo como campo não preenchido (não como lista válida de zero itens).
- SE `qualifCaracteristicas` incluir "Outra" junto de outras opções válidas, ENTÃO o sistema SHALL ainda exigir `qualifCaracteristicasOutra` preenchido — a presença de outras opções não dispensa a condicional.
- QUANDO `planejDataTerminoPrevista` é anterior a `planejDataInicioPrevista`, o sistema SHALL rejeitar a gravação desses dois campos com HTTP 400.
- SE o `cdVerba` de uma requisição de criação pertencer a um Ofertante diferente do Ofertante do GO autenticado, ENTÃO o sistema SHALL retornar HTTP 403 mesmo que o `cdVerba` exista de fato no banco (não vazar existência de dado fora de escopo via 404/400).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PC-01 | P1: Criação | Tasks T1, T5, T9 | Implementing (T1, T5 done) |
| PC-02 | P1: Criação | Tasks T5, T9 | Implementing (T5 done) |
| PC-03 | P1: Criação | Tasks T5, T9 | Implementing (T5 done) |
| PC-04 | P1: Preenchimento incremental | Tasks T6, T10 | In Tasks |
| PC-05 | P1: Preenchimento incremental | Tasks T1, T6, T10 | Implementing (T1 done) |
| PC-06 | P1: Preenchimento incremental | Tasks T1, T6, T10 | Implementing (T1 done) |
| PC-07 | P1: Regras condicionais | Tasks T3, T7, T10 | Implementing (T3 done) |
| PC-08 | P1: Regras condicionais | Tasks T3, T7, T10 | Implementing (T3 done) |
| PC-09 | P1: Regras condicionais | Tasks T3, T7, T10 | Implementing (T3 done) |
| PC-10 | P1: Encerramento | Tasks T3, T7, T10 | Implementing (T3 done) |
| PC-11 | P1: Encerramento | Tasks T7, T10 | In Tasks |
| PC-12 | P1: Encerramento | Tasks T6, T7, T10 | In Tasks |
| PC-13 | P1: Consulta e listagem escopadas | Tasks T6, T10 | In Tasks |
| PC-14 | P1: Consulta e listagem escopadas | Tasks T5, T8 | Implementing (T5 done) |
| PC-15 | P1: Consulta e listagem escopadas | Tasks T2, T5, T6, T7, T10 | Implementing (T2, T5 done) |

**ID format:** `PC-NN` (Pré-Curso).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 15 total, 15 mapped to tasks (T1–T10), 0 unmapped. Todos ainda "In Tasks"/"Implementing" — nenhum "Verified" até o Verifier rodar ao final do Execute.

---

## Success Criteria

- [ ] Um GO consegue criar, preencher (com múltiplas gravações parciais) e encerrar um pré-curso completo das 56 chaves, respeitando todas as regras condicionais e o teto de verba, sem erro inesperado.
- [ ] Um pré-curso encerrado é comprovadamente somente-leitura: nenhuma rota aceita alteração de `respostas` ou `status` após `ENCERRADO`.
- [ ] Nenhuma requisição de leitura ou escrita cruza o escopo de Ofertante — confirmado por teste de integração/e2e simulando acesso forjado (espelha CA-OV-15 de `cadastro-ofertante-verba`).
- [ ] O Dicionário de Campos vira, 1:1, o schema Zod de `respostas` (56 chaves, tipos e condicionais batendo com este documento).
