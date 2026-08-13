# SPMA — Especificação Funcional e Técnica
## Sistema de Planejamento, Monitoramento e Avaliação de Cursos de Turismo

**Versão:** 1.0
**Data:** Agosto de 2026
**Contexto:** Programa de avaliação de cursos de qualificação profissional na área de Turismo, oferecidos por entidades ("Ofertantes") em todo o Brasil.

---

## Índice

1. Visão Geral
2. Perfis de Usuário e Permissões
3. Modelo de Dados
4. Formulário de Pré-Curso
5. Formulário de Pós-Curso
6. Formulário de Avaliação do Aluno
7. Autenticação e Segurança
8. Regras de Negócio
9. Critérios de Aceitação
10. Pontos em Aberto

---

## 1. Visão Geral

O SPMA gerencia o ciclo de vida de cursos de capacitação em Turismo oferecidos por Ofertantes externos, contemplando:

- Cadastro em cascata de usuários com controle de acesso hierárquico;
- Cadastro de Ofertantes e das verbas a eles vinculadas;
- Cadastro e execução de cursos, com coleta de dados em três momentos: pré-curso, pós-curso e avaliação do aluno;
- Visualização de indicadores consolidados via dashboard.

O núcleo de valor do sistema é a coleta estruturada de formulários extensos, com perguntas condicionais, associados a cada curso, permitindo monitoramento e avaliação da política de capacitação turística.

---

## 2. Perfis de Usuário e Permissões

### 2.1 Perfis (`TB_Usuario.TP_Usuario`)

| Código | Papel | Escopo |
|---|---|---|
| AM | Administrador Master | Global |
| GT | Gestor Turismo | Global |
| VT | Visualizador Turismo | Global, somente leitura |
| GO | Gestor Ofertante | Escopado a um Ofertante |
| VO | Visualizador Ofertante | Escopado a um Ofertante, somente leitura |
| AL | Aluno | Escopado a si mesmo e ao curso em que está inscrito |

O Aluno é tratado como um subtipo de Usuário (`TP_Usuario='AL'`), com autenticação própria via CPF e senha. Um aluno pode participar de vários cursos ao longo do tempo, porém de apenas um curso por vez — enquanto houver uma avaliação em andamento, não é possível iniciar outra. O vínculo do aluno é estabelecido com o curso em que se inscreve, e não com o Ofertante que o cadastrou.

### 2.2 Cadastro em Cascata

Regra de autorização de escrita, validada em toda operação de criação de usuário:

| Quem cadastra | Pode criar |
|---|---|
| AM | AM, GT, VT, GO, VO, AL |
| GT | GT, VT, GO |
| GO | GO, VO, AL |
| VT, VO, AL | Nenhum (somente leitura) |

### 2.3 Escopo Multi-Tenant por Ofertante

Usuários dos tipos GO e VO estão associados a um Ofertante específico. O Aluno (AL) associa-se ao curso em que se inscreve, não ao Ofertante. Toda consulta de dados feita por esses perfis é filtrada pelo escopo correspondente. Tentativas de acesso a dados fora do próprio escopo retornam erro de acesso negado (HTTP 403).

Quando um GO é criado sem Ofertante vinculado, o sistema exige o cadastro do Ofertante no primeiro acesso, antes de liberar as demais funcionalidades. O Ofertante é associado a uma verba, que o Gestor Ofertante distribui entre os cursos que cria — uma mesma verba pode ser dividida entre mais de um curso, respeitado o valor total disponível.

### 2.4 Autenticação

No primeiro acesso, o usuário é obrigado a cadastrar sua própria senha antes de acessar qualquer módulo do sistema. Após esse cadastro, ou em acessos subsequentes, o sistema roteia o usuário para as funcionalidades permitidas conforme seu perfil.

---

## 3. Modelo de Dados

### 3.1 Diagrama Conceitual

```
Ofertante (1) ──< Verba (N)
Verba (1) ──< Curso [Pré/Pós] (N)
Curso (1) ──< Avaliação do Aluno (N, uma por aluno inscrito)
Usuário — controla login e permissão; cria outros usuários em cascata.
          GO/VO vinculam-se a um Ofertante; AL vincula-se ao Curso via avaliação.
```

### 3.2 TB_Usuario

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `CPF_Usuario` | VARCHAR(11) | Sim | Chave primária; validação de dígito verificador (módulo 11) |
| `NM_Usuario` | VARCHAR | Não | — |
| `Email_Usuario` | VARCHAR | Não | — |
| `TP_Usuario` | VARCHAR(2) | Sim | Enum: AM, GT, VT, GO, VO, AL |
| `CD_Ofertante` | INT | Não | Chave estrangeira para Ofertante; nulo para AM/GT/VT e para AL (o Aluno vincula-se ao curso, não ao Ofertante) |
| `Primeira_Vez` | BOOL | Sim | Padrão verdadeiro; passa a falso após definição de senha |
| `Data_Criacao` | DATETIME | Sim | Auditoria |
| `Criado_Por` | VARCHAR(11) | Sim | CPF de quem criou o usuário |

### 3.3 TB_Ofertante

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `CD_Ofertante` | INT | Sim | Chave primária |
| `NM_Ofertante` | VARCHAR | Sim | — |
| `Resp_Ofertante` | VARCHAR | Não | Responsável legal/contato |
| `Email_Ofertante` | VARCHAR | Não | — |
| `Tel_Ofertante` | VARCHAR | Não | — |
| `UF_Ofertante` | VARCHAR(2) | Sim | — |
| `Municipio_Ofertante` | VARCHAR | Não | — |
| `Data_Criacao` | DATETIME | Sim | Auditoria |
| `Criado_Por` | VARCHAR(11) | Sim | — |

O cadastro do Ofertante pode ocorrer de três formas: pré-cadastro administrativo, cadastro realizado por um Gestor Turismo, ou cadastro realizado pelo próprio Gestor Ofertante em seu primeiro acesso, quando ainda não estiver vinculado a nenhum Ofertante.

### 3.4 TB_Verba

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `CD_Verba` | INT | Sim | Chave primária |
| `CD_Ofertante` | INT | Sim | Chave estrangeira; a verba pertence ao Ofertante |
| `DT_Verba` | DATE | Não | Data de liberação |
| `VL_Verba` | DECIMAL(10,2) | Sim | Valor total da verba, em reais |
| `Data_Criacao` | DATETIME | Sim | Auditoria |

A verba pertence ao Ofertante e pode ser distribuída entre vários cursos (relação de 1 para N com curso). Ao criar cada curso, o Gestor Ofertante define quanto da verba será alocado àquele curso. O somatório dos valores alocados aos cursos de uma mesma verba não pode ultrapassar o valor total da verba. Cadastrada pelo Gestor Turismo e associada ao Ofertante, que a utiliza para custear a criação dos cursos.

### 3.5 TB_Pre_Curso

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `CD_Curso` | INT | Sim | Chave primária, autoincremento |
| `CD_Ofertante` | INT | Sim | Herdado do Gestor Ofertante que cria o curso |
| `CD_Verba` | INT | Sim | Chave estrangeira; verba que custeia o curso |
| `VL_Curso_Alocado` | DECIMAL(10,2) | Sim | Valor da verba alocado a este curso |
| `Status` | CHAR(1) | Sim | Espaço (em andamento) ou "E" (encerrado); transição irreversível |
| *(campos do questionário)* | Variados | Ver seção 4 | — |
| `Data_Criacao` | DATETIME | Sim | Auditoria |
| `Criado_Por` | VARCHAR(11) | Sim | CPF do Gestor Ofertante |
| `Data_Encerramento` | DATETIME | Não | Preenchida quando Status='E' |

### 3.6 TB_Pos_Curso

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `CD_Curso` | INT | Sim | Chave primária e estrangeira, referenciando TB_Pre_Curso |
| `Status` | CHAR(1) | Sim | Espaço (em andamento) ou "E" (encerrado); transição irreversível, acionada pelo Gestor Ofertante |
| *(campos do questionário)* | Variados | Ver seção 5 | — |
| `Data_Criacao` | DATETIME | Sim | Auditoria |
| `Criado_Por` | VARCHAR(11) | Sim | CPF do Gestor Ofertante |
| `Data_Ultima_Atualizacao` | DATETIME | Sim | Atualizada a cada gravação |
| `Data_Encerramento` | DATETIME | Não | Preenchida quando Status='E' |

### 3.7 TB_Avaliacao_Aluno

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `CPF` | VARCHAR(11) | Sim | Compõe a chave primária junto com CD_Curso |
| `CD_Curso` | INT | Sim | Compõe a chave primária junto com CPF; chave estrangeira para o curso |
| `Status` | CHAR(1) | Sim | Espaço (em andamento) ou "E" (encerrado); transição irreversível, acionada pelo aluno |
| *(campos do questionário)* | Variados | Ver seção 6 | — |
| `Data_Criacao` | DATETIME | Sim | Auditoria |
A chave primária é composta por CPF e CD_Curso, permitindo que um mesmo aluno tenha avaliações de cursos distintos ao longo do tempo — porém apenas uma pode estar em andamento (Status em espaço) por vez.

---

## 4. Formulário de Pré-Curso

Preenchido pelo Gestor Ofertante antes do início do curso. Contém 54 itens de dado, organizados nos blocos abaixo.

### 4.1 Blocos do Formulário

| Bloco | Conteúdo | Tipo de resposta |
|---|---|---|
| Identificação | UF, município, entidade responsável, coordenador, e-mail, telefone | Texto |
| Dados da Qualificação | Endereço, nome do curso, vínculo a plano/programa, características do curso, modalidade, região | Texto, seleção única, seleção múltipla |
| Planejamento | Datas previstas, carga horária, turmas, alunos previstos, taxa de evasão, objetivo | Data, número, texto livre |
| Público-Alvo | Perfil do público, instituição executora | Seleção múltipla, seleção única |
| Diagnóstico Pré-Curso | Consultas realizadas com atores territoriais | Seleção múltipla |
| Infraestrutura Básica | Avaliação de 9 itens de infraestrutura (banheiros, energia, sala de aula, biblioteca, acessibilidade, laboratório, entre outros) | Escala de avaliação |
| Infraestrutura Complementar | Avaliação de 8 itens (sala de professores, copa, auditório, equipamentos audiovisuais e tecnológicos, entre outros) | Escala de avaliação |
| Infraestrutura Específica | Necessidade de equipamentos específicos ao curso e sua situação | Seleção única, condicional |
| Corpo Docente | Critérios de seleção, forma de contratação, formação, políticas de reparação | Seleção múltipla, seleção única |
| Divulgação | Estratégias de divulgação do curso | Seleção múltipla |
| Parcerias | Parcerias locais estabelecidas | Seleção múltipla |
| Suporte ao Aluno | Estratégias de apoio logístico, financeiro e político | Seleção múltipla |

### 4.2 Campos Condicionais

| Campo condicionante | Condição | Campo revelado |
|---|---|---|
| Instituição Executora | Igual a "Empresa contratada" ou "Parceria entre Entidade Responsável e Entidade Executora" | Nome da instituição contratada/parceira |
| Necessidade de equipamentos específicos | Igual a "Sim" | Situação de disponibilidade, suficiência e manutenção dos equipamentos (3 perguntas) |

Além disso, cinco perguntas trazem uma opção "Outro/Qual" que, quando selecionada, exige preenchimento de um campo de texto livre associado: vínculo a plano/programa de qualificação, características do curso contempladas, forma de contratação de professores, canais de divulgação e estratégias de suporte ao aluno.

### 4.3 Escala de Avaliação de Infraestrutura

As perguntas de infraestrutura utilizam a seguinte escala, com o valor armazenado no banco de dados conforme abaixo:

| Opção | Valor armazenado |
|---|---|
| Não há disponibilidade | 0 |
| Péssimo | 1 |
| Ruim | 2 |
| Regular | 3 |
| Bom | 4 |
| Ótimo | 5 |

### 4.4 Encerramento

O Gestor Ofertante encerra o pré-curso ao concluir o preenchimento de todos os campos obrigatórios, incluindo os condicionais aplicáveis. Após o encerramento, o status muda de forma irreversível e o formulário passa a ser somente leitura.

---

## 5. Formulário de Pós-Curso

Preenchido pelo Gestor Ofertante durante e após a execução do curso. Permanece disponível para edição enquanto estiver em andamento e pode ser encerrado pelo Gestor Ofertante ao final do preenchimento, de forma irreversível. Contém 26 itens de dado.

### 5.1 Blocos do Formulário

| Bloco | Conteúdo | Tipo de resposta |
|---|---|---|
| Acompanhamento Pedagógico | Definição de problemas de estudo, conceitos trabalhados, plano de ação, avaliação cognitiva, monitoramento | Seleção única, seleção múltipla |
| Execução | Datas reais, carga horária realizada, dificuldades enfrentadas, alterações no planejamento | Data, número, texto livre, condicional |
| Participação | Número de inscritos, matriculados e concluintes, motivos de abandono, relação entre demanda e oferta, intenção de nova oferta | Número, seleção |
| Financeiro | Valores totais e por categoria de despesa, devolução de recursos, necessidade de aditivos | Valor monetário, seleção |
| Continuidade | Estratégias de continuidade e ampliação da formação | Seleção múltipla |

### 5.2 Campo Condicional

| Campo condicionante | Condição | Campo revelado |
|---|---|---|
| Houve alteração no planejamento inicial? | Igual a "Sim" | Motivo e descrição da alteração |

---

## 6. Formulário de Avaliação do Aluno

Preenchido pelo próprio aluno. Contém 45 itens de dado, organizados em duas partes: os dados pessoais e de motivação (Parte 1) e a avaliação do curso (Parte 2). A Parte 1 deve estar completa antes de o aluno acessar a Parte 2.

### 6.1 Parte 1 — Dados Pessoais e Motivação

O preenchimento desta parte não é exigido no momento da criação do aluno, mas é obrigatório antes de responder a qualquer pergunta da avaliação do curso (Parte 2). O sistema só libera a Parte 2 após a Parte 1 estar completa.

| Bloco | Conteúdo | Tipo de resposta |
|---|---|---|
| Dados Pessoais | Nome, CPF, estado, município, gênero, faixa etária, escolaridade, raça/etnia, condição de PCD | Texto, CPF, seleção única |
| Situação Profissional | Condição atual de trabalho, atuação em Turismo, faixa de renda | Seleção única, condicional |
| Experiência | Trabalho prévio em Turismo, cursos anteriores na área | Seleção, condicional |
| Motivação | Motivos para participar do curso (até três opções), forma de conhecimento do curso | Seleção múltipla limitada, seleção |
| Expectativas | Expectativa de atendimento, de emprego e de melhoria de renda | Seleção única |

### 6.2 Parte 2 — Avaliação Pós-Curso

| Bloco | Conteúdo | Tipo de resposta |
|---|---|---|
| Participação | Conclusão do curso, motivo de não conclusão, percentual de frequência | Seleção única, condicional |
| Avaliação do Curso | 8 itens avaliados em escala (dinâmicas de inclusão, material didático, conteúdo, clareza, conhecimento dos instrutores, organização, infraestrutura básica e de sala de aula) | Escala de avaliação |
| Aprendizado | Ampliação de conhecimento, atendimento de expectativas, sensação de preparo | Seleção única |
| Continuidade nos Estudos | Retomada de estudos após o curso | Seleção |
| Motivações Pós-Curso | Percepções e motivações desenvolvidas após o curso | Seleção múltipla |
| Oportunidades de Trabalho | Situação de trabalho após o curso, intenção de atuar em Turismo | Seleção, condicional |
| Efetivação e Renda | Efetivação no emprego, aumento de renda, melhoria de padrão de vida | Seleção única |
| Avaliação Geral | Nota de 0 a 10, avaliação de melhorias na comunidade, recomendação do curso, comentários finais | Número, texto livre, seleção |

### 6.3 Campos Condicionais

| Campo condicionante | Condição | Campo revelado |
|---|---|---|
| Atualmente trabalha em Turismo? | Igual a "Sim" | Atividade específica em que atua |
| Já realizou cursos de Turismo? | Igual a "Sim" | Tipo de curso realizado |
| Concluiu o curso? | Igual a "Não" | Motivo(s) de não conclusão |
| Concluiu o curso? | Igual a "Sim" | Libera toda a Parte 2 de avaliação (frequência, escala de avaliação, aprendizado, continuidade, motivações, oportunidades) |

### 6.4 Escala de Avaliação do Curso

| Opção | Valor armazenado |
|---|---|
| Péssimo | 1 |
| Ruim | 2 |
| Regular | 3 |
| Bom | 4 |
| Ótimo | 5 |

Esta escala não possui opção "não há disponibilidade".

### 6.5 Encerramento

O aluno encerra sua avaliação por meio de um botão específico no formulário. Essa ação é irreversível: uma vez encerrada, a avaliação passa a ser somente leitura.

---

## 7. Autenticação e Segurança

- Autenticação por CPF e senha, com definição da senha pelo próprio usuário no primeiro acesso.
- Validação de CPF por dígito verificador, algoritmo padrão módulo 11.
- Todo endpoint que retorna dados de curso, verba ou avaliação é filtrado pelo Ofertante do usuário autenticado, quando aplicável.
- Tentativa de acesso a dado de outro Ofertante retorna erro de acesso negado (HTTP 403 Forbidden).
- Dados pessoais (CPF, e-mail, telefone) são retidos indefinidamente, sem anonimização, e permanecem visíveis nos relatórios.

---

## 8. Regras de Negócio

| Código | Regra |
|---|---|
| RN-01 | Cadastro em cascata de usuários conforme hierarquia de perfis |
| RN-02 | Escopo por Ofertante nas consultas de GO e VO; o Aluno tem escopo pelo curso em que está inscrito |
| RN-03 | Definição de senha obrigatória no primeiro acesso |
| RN-04 | Campos condicionais do formulário de pré-curso, conforme seção 4.2 |
| RN-05 | Codificação da escala de infraestrutura do pré-curso, conforme seção 4.3 |
| RN-06 | Campos condicionais do formulário de avaliação do aluno, conforme seção 6.3 |
| RN-07 | Codificação da escala de avaliação do curso, conforme seção 6.4 |
| RN-08 | Validação de dígito verificador de CPF (módulo 11) |
| RN-09 | Transições de status irreversíveis nos formulários de pré-curso, pós-curso e avaliação do aluno |
| RN-10 | Uma verba pertence ao Ofertante e pode custear vários cursos; o somatório dos valores alocados aos cursos não pode ultrapassar o valor total da verba |
| RN-11 | Gestor Ofertante cadastra seu Ofertante no primeiro acesso, quando ainda não vinculado |
| RN-12 | Um aluno pode participar de vários cursos ao longo do tempo, mas de apenas um por vez (uma avaliação em andamento por vez) |
| RN-13 | A Parte 1 da avaliação do aluno deve estar completa antes de o aluno responder à Parte 2 |
| RN-14 | Acesso a dados fora do próprio escopo retorna HTTP 403 Forbidden |

---

## 9. Critérios de Aceitação

**CA-01 — Definição de senha no primeiro acesso**
Dado um usuário autenticando-se pela primeira vez, quando insere CPF e credenciais, o sistema deve exigir a definição de uma nova senha antes de liberar qualquer módulo.

**CA-02 — Cadastro de Ofertante no primeiro acesso do Gestor**
Dado um Gestor Ofertante sem Ofertante vinculado, quando efetua login, o sistema deve exigir o cadastro do Ofertante antes de liberar o acesso aos cursos.

**CA-03 — Criação de pré-curso**
Dado um Gestor Ofertante autenticado, quando inicia um novo curso, o sistema deve criar o registro de pré-curso com status em andamento e todos os campos vazios.

**CA-04 — Validação de campo condicional no pré-curso**
Dado o preenchimento do campo de instituição executora com "Empresa contratada" ou "Parceria", o sistema deve exigir o nome da instituição antes de permitir o encerramento do pré-curso.

**CA-05 — Encerramento do pré-curso**
Dado o preenchimento completo dos campos obrigatórios do pré-curso, quando o Gestor Ofertante aciona o encerramento, o sistema deve alterar o status para encerrado de forma irreversível.

**CA-06 — Encerramento do pós-curso**
Dado o preenchimento do formulário de pós-curso, quando o Gestor Ofertante aciona o encerramento, o sistema deve alterar o status para encerrado de forma irreversível, tornando o formulário somente leitura.

**CA-07 — Parte 1 obrigatória antes da avaliação**
Dado um aluno autenticado, o sistema deve permitir salvar os dados pessoais e de motivação a qualquer momento, mas só deve liberar a Parte 2 da avaliação após a Parte 1 estar completamente preenchida.

**CA-08 — Liberação da Parte 2 mediante conclusão**
Dado que o aluno declara ter concluído o curso, o sistema deve exigir o preenchimento de todos os campos da Parte 2 (frequência, avaliação do curso, aprendizado, continuidade, motivações e oportunidades) antes de permitir o encerramento.

**CA-09 — Encerramento da avaliação com curso concluído**
Dado que todos os campos obrigatórios da Parte 2 estão preenchidos, quando o aluno encerra sua avaliação, o sistema deve alterar o status para encerrado de forma irreversível.

**CA-10 — Encerramento da avaliação com curso não concluído**
Dado que o aluno declara não ter concluído o curso e informa o motivo, quando encerra sua avaliação, o sistema deve alterar o status para encerrado de forma irreversível.

**CA-11 — Irreversibilidade de status**
Dado um formulário de pré-curso, pós-curso ou avaliação do aluno já encerrado, nenhum usuário deve conseguir reabri-lo para edição.

**CA-12 — Isolamento de escopo**
Dado um Gestor Ofertante autenticado, quando tenta acessar dados de um curso pertencente a outro Ofertante, o sistema deve retornar erro de acesso negado. O mesmo se aplica a um aluno que tente acessar dados de um curso em que não esteja inscrito.

**CA-13 — Codificação da escala de infraestrutura**
Dado o preenchimento de um item de infraestrutura com a opção "Ótimo", o valor armazenado deve ser 5; com "Não há disponibilidade", o valor armazenado deve ser 0.

**CA-14 — Codificação da escala de avaliação do curso**
Dado o preenchimento de um item de avaliação do curso com a opção "Ótimo", o valor armazenado deve ser 5; com "Péssimo", o valor armazenado deve ser 1.

**CA-15 — Validação de CPF**
Dado um CPF com dígito verificador inválido, o sistema deve rejeitar o cadastro e indicar o erro ao usuário.

**CA-16 — Controle de saldo da verba**
Dado que o Gestor Ofertante aloca valores a cursos de uma mesma verba, quando o somatório dos valores alocados ultrapassaria o valor total da verba, o sistema deve impedir a alocação e indicar o saldo disponível.

**CA-17 — Um curso ativo por vez para o aluno**
Dado um aluno com uma avaliação em andamento, quando tenta iniciar a avaliação de outro curso, o sistema deve impedir a ação até que a avaliação em andamento seja encerrada.

---

## 10. Pontos em Aberto

Os itens abaixo requerem definição do time de produto antes da etapa de implementação do respectivo campo, pois os documentos de referência não especificam se a resposta deve ser de seleção única ou múltipla:

1. Nível de formação dos professores/instrutores contratados (pré-curso)
2. Motivos de abandono do curso, no formulário de pós-curso
3. Tipo de curso de Turismo já realizado anteriormente, no formulário do aluno
4. Forma como o aluno ficou sabendo do curso
5. Retomada de estudos após o curso
6. Situação de trabalho do aluno após o curso, incluindo confirmação do campo de texto livre associado à opção "Outra"

Também está pendente de definição:

7. O texto exato do enunciado apresentado acima de cada uma das duas tabelas de avaliação de infraestrutura do pré-curso.
8. Os indicadores a serem exibidos no dashboard consolidado, que devem ser definidos em conjunto com o time de produto conforme as necessidades de acompanhamento da política pública.
9. Controle de saldo da verba: confirmar se o somatório dos valores alocados aos cursos deve ser estritamente inferior ao valor da verba ou se pode igualá-lo (utilização de 100% do valor). Esta especificação assume que a igualdade é permitida.
10. Encerramento do pós-curso: confirmar que o responsável pelo encerramento é o Gestor Ofertante e que a ação é irreversível, no mesmo padrão das demais tabelas.
11. Aluno com múltiplos cursos: confirmar que, ao encerrar a avaliação de um curso, o aluno fica liberado para se inscrever em um novo curso, mantendo o limite de um curso ativo por vez.

---

**Fim do documento.**
