# Revisão de Usabilidade — Verificação SPMA 07.11.26

Alterações pedidas no documento `Verificacao_SPMA_07.11.26` (15 itens + 2 comentários de Rayane Ruas, 09/11/2026), com o que muda, onde muda no código e em que pé está cada uma.

- **Branch:** `feat/revisao-usabilidade-1`, só local (nada enviado, nada em produção).
- **Spec, design e tasks:** `.specs/features/revisao-usabilidade-1/` (requisitos `RU-01` a `RU-62`, tasks `T1` a `T32`).
- **Decisão de projeto:** será registrada como **AD-054** em `.specs/STATE.md` (a AD-053 é da feature `situacao-profissional`).
- **Banco:** nenhuma migration. Nenhuma tabela, coluna, rota, enum, chave de API ou `data-testid` muda de nome.

Situação em 12/11/2026: **32 de 32 tasks implementadas**, todas commitadas na branch. Último gate completo verde: lint sem erros, build, 933 testes unitários, 154 de integração e 347 e2e (2 falhas de banco lento repassaram ao repetir). Falta a verificação independente (Verifier).

---

## Princípios da implementação

1. **Renomear só o que o usuário lê.** Menus, títulos, botões e mensagens usam os termos do cliente. Rotas (`/pre-cursos`, `/verbas`), tabelas (`TB_Pre_Curso`, `TB_Verba`), enums (`ENCERRADO`) e chaves JSON continuam iguais. Mudar isso quebraria o Power BI e os testes sem ganho para quem usa o sistema.
2. **Mudar nos pontos centrais, não em cada tela.** Quase tudo cai em cinco lugares que já concentram o comportamento:

   | Ponto central | Arquivo | O que concentra |
   | --- | --- | --- |
   | Navegação | `src/lib/ui/navegacao.ts` | Menu e módulos do painel, de todos os perfis |
   | Moldura dos questionários | `src/components/formulario/CascaFormulario.tsx` | Título, status, erros, pendências e botões dos 3 questionários |
   | Estado dos questionários | `src/components/formulario/useFormularioRespostas.ts` | Salvar e concluir dos 3 questionários |
   | Validação das rotas | `src/lib/api/requisicao.ts` | Mensagem de erro de toda rota da API |
   | Nome da formação | `src/lib/cursos/nome.ts` (novo) | Regra única do nome exibido |

3. **Exclusão só sem "filho", conferida dentro da transação.** O banco também protege: a avaliação do aluno não tem cascata, então uma formação com aluno não pode ser apagada nem por engano.

---

## Termos do cliente (Comentário 1)

| Antes | Depois |
| --- | --- |
| Verba | Recurso |
| Curso | Formação |
| Pré-Curso | Cadastro de Formação |
| Pós-Curso | Avaliação de Formação |
| Encerrar (botão) | Concluir |
| Encerrado (status) | **continua "Encerrado"** (decisão do usuário) |
| Avaliações Aluno / Minha avaliação | continuam como estão |

---

## Item a item

Legenda: ✅ feito (commit)

### 1. Tela de entrada por extenso — ✅ `fb67203`, `0cc821c`

**Pedido:** trocar "Perfil: AM" e os nomes curtos por textos por extenso.

**O que muda:**
- Painel passa a mostrar "Olá, <nome>", "Você está no perfil de Administrador Master", "Portanto, está apto a realizar:" e a lista de módulos.
- Módulos: "Gestão de Usuários", "Gestão de Ofertante", "Gestão de Recursos", "Gestão de Formações" ("Minhas Formações" para GO/VO), "Visualização de Relatórios", "Editar Perfil".
- Menu: "Gestão de Usuários", "Gestão de Recursos", "Nova Formação", "Cadastro de Formação", "Avaliação de Formação", "Avaliações Aluno", "Editar Perfil".

**Onde:**
- `src/app/(protegido)/painel/page.tsx`: textos do painel. O nome do perfil por extenso já existe em `src/lib/ui/tipos-usuario.ts` (`NOME_TIPO_USUARIO`).
- `src/lib/ui/navegacao.ts`: rótulos de `MODULOS_POR_PERFIL` e dos itens do menu.

"Gestão de Ofertante" e "Visualização de Relatórios" continuam sem tela; só o rótulo muda.

### Comentário 2. Editar Perfil para todos os perfis — ✅ `d2ce9dc`, `5262ec9`, `e6b7892`, `dc1cb97`

**Pedido:** todo usuário gerencia o próprio cadastro.

**O que muda (decisão do usuário):**
- Todos editam **nome, e-mail e telefone**.
- A tela informa: "A troca de senha deve ser pedida ao gestor do seu curso." (não aparece para o AM, que não tem gestor acima).
- Telefone obrigatório para o GO (como hoje), opcional para os demais.

**Onde:**
- `src/app/api/usuarios/me/perfil/route.ts` (novo): `PATCH` que grava no próprio usuário da sessão; nunca recebe documento.
- `src/components/perfil/PerfilForm.tsx` (novo): formulário de AM, GT, VT, GO e VO.
- `src/app/(protegido)/meus-dados/page.tsx`: deixa de ser só do Aluno.
- `src/components/dados-pessoais/DadosPessoaisForm.tsx` e `src/app/api/usuarios/me/dados-pessoais/route.ts`: o Aluno ganha o campo telefone.
- `src/lib/ui/navegacao.ts`: item "Editar Perfil" no menu dos 6 perfis (o "Meus dados" do Aluno vira "Editar Perfil").

O telefone dos perfis que não são GO usa a coluna que já existe, `Usuario.telefone` (`Tel_Organizacao`). Isso evita migration.

### 2. Telefone/WhatsApp com DDD — ✅ `a5373bd`, `110c904`

**Pedido:** validar DDD + número e chamar o campo de "Telefone/WhatsApp".

**O que muda:**
- Rótulo "Telefone/WhatsApp (com DDD)" no cadastro do ofertante e no Editar Perfil.
- Máscara `(61) 99999-9999` durante a digitação.
- Recusa com "Informe o telefone com DDD, ex.: (61) 99999-9999" quando não há 10 ou 11 dígitos ou o DDD está fora de 11 a 99. O caso da imagem 2 (`999281374`, sem DDD) passa a ser recusado.
- Grava só os dígitos. Telefones antigos ficam como foram gravados.

**Onde:**
- `src/lib/validation/telefone.ts` (novo): validação, máscara e schema.
- `src/lib/validation/schemas/organizacao.schema.ts` e `src/components/organizacao/CadastroOrganizacaoForm.tsx`.

A pergunta 6 do Cadastro de Formação (telefone do coordenador) fica como está, porque é pergunta do questionário em papel.

### 3. "Recursos Recebidos" — ✅ `7bfdb4f`

**Onde:** `src/app/(protegido)/verbas/page.tsx`. GO e VO veem "Recursos Recebidos"; AM e GT, "Recursos".

### 4. "Usuários Cadastrados" — ✅ `7bfdb4f`

**Onde:** `src/app/(protegido)/usuarios/GestaoUsuarios.tsx` (título do cartão da lista).

### 5. Nome no lugar da numeração (recursos e formações) — ✅

| O que | Status | Onde |
| --- | --- | --- |
| Toda formação nasce com nome: "Nova Formação" exige o campo "Nome da formação", gravado na pergunta 8 na mesma transação. A pergunta 8 não aceita mais ficar em branco depois. | ✅ `55d9a11` | `src/lib/validation/schemas/pre-curso.schema.ts` (`criarCursoSchema`, `qualifNomeCurso`), `src/app/api/cursos/route.ts`, `src/app/(protegido)/cursos/novo/NovoCursoForm.tsx` |
| Seletor de recurso: depois de escolher, o campo mostrava só "3". Causa: o `Select` do Base UI não recebia `items` e exibia o valor cru. Agora mostra o mesmo texto da opção. | ✅ `9cddc3d` | `src/app/(protegido)/cursos/novo/NovoCursoForm.tsx` |
| Opções do seletor e lista de recursos sem `#3 ·`: só o nome, sem informação extra, mesmo quando o nome repete (decisão do usuário). | ✅ `9cddc3d`, `adf06ef` | `NovoCursoForm.tsx`, `src/app/(protegido)/verbas/ListaVerbas.tsx` |
| Recurso com nome obrigatório | já existia | `src/lib/validation/schemas/verba.schema.ts` recusa vazio; coluna `DS_Verba` é `NOT NULL`. Só o rótulo do campo mudou de "Identificação" para "Nome do recurso" (✅ `7bfdb4f`). |

### 6 e 7. Listas do Cadastro e da Avaliação de Formação mostram o nome — ✅ `94992b6`

**O que mudou:** as listas mostravam "Pré-curso #4" e "Pós-curso #4". Agora mostram o nome da formação (pergunta 8). A lista de Avaliações Aluno também: "<nome> - CPF <cpf>".

**Onde:**
- `src/lib/cursos/nome.ts` (✅ `f4b6259`): `nomeDaFormacao(p8, cdCurso)` tira os espaços das pontas; sem nome, mostra "Formação sem nome (nº 4)". Isso só acontece com formação antiga, criada antes do nome obrigatório.
- `src/app/(protegido)/pre-cursos/page.tsx`, `src/app/(protegido)/pos-cursos/page.tsx`, `src/app/(protegido)/avaliacoes/page.tsx`.

### 8. Títulos dos formulários com o nome — ✅ `1f6cd0b`

| Tela | Antes | Depois |
| --- | --- | --- |
| Cadastro de Formação | Pré-curso #4 | Cadastro de Formação - Mecânica Básica |
| Avaliação de Formação (inclusive o aviso de "aguardando") | Pós-curso #4 | Avaliação de Formação - Mecânica Básica |
| Avaliação do aluno | Avaliação #4 - CPF 009.608.231-31 | Mecânica Básica - CPF 009.608.231-31 |
| Link do aviso | Ir para o pré-curso #4 | Ir para o Cadastro de Formação |

**Onde:** as páginas leem a pergunta 8 e passam o nome ao formulário: `src/app/(protegido)/pre-cursos/[id]/page.tsx` e `PreCursoForm.tsx`; `src/app/(protegido)/pos-cursos/[cdCurso]/page.tsx` e `PosCursoForm.tsx`; `src/app/(protegido)/avaliacoes/[cpf]/[cdCurso]/page.tsx` e `AvaliacaoForm.tsx`.

### 9. Regras de datas — ✅ `8ff41a3`

**Situação atual:** a regra "término ≥ início" **já existe** para os dois pares (formação e inscrição), em `ordemDatasValida` (`src/lib/validation/schemas/pre-curso.schema.ts`).

**O que muda:**
- Regra nova: o início da inscrição (17b) deve ser **anterior** ao início da formação (13).
- Cada regra ganha mensagem própria, que diz qual par de datas está errado.
- **Quando a conferência roda (decisão do usuário):** no Salvar, só quando a pessoa envia uma das 4 datas (13, 14, 17b, 17c); e sempre na conclusão. Assim um cadastro antigo com datas fora de ordem continua salvando as outras perguntas e só não conclui até corrigir as datas.

**Onde:** `src/lib/validation/schemas/pre-curso.schema.ts` (`violacaoOrdemDatas`), `src/app/api/pre-cursos/[id]/route.ts` (Salvar) e `src/app/api/pre-cursos/[id]/encerrar/route.ts` (conclusão).

### 10. Aviso de salvamento, "Concluir" com confirmação e "Excluir" — ✅ `730b80d`, `83dd350`, `04b1c45`, `467a57e`, `9b86efc`

**O que muda:**
- Aviso fixo abaixo do status, enquanto o questionário está editável: "O sistema não salva automaticamente. Salve o progresso do cadastramento."
- Botão "Encerrar" passa a "Concluir", nos 3 questionários. Ao clicar, abre a confirmação "Após a conclusão não será possível alterar os dados, tem certeza que deseja concluir?" com "Sim" e "Não".
- Botão "Excluir" no Cadastro de Formação, com a confirmação "Tem certeza que deseja excluir o cadastro? Após a exclusão não será possível recuperar os dados."

**Regras da exclusão de formação (decisão do usuário):**
- Só aparece enquanto o Cadastro de Formação está em andamento e para quem pode gerenciá-lo (AM e o GO do ofertante).
- Apaga a formação, o Cadastro e a Avaliação de Formação numa transação só. O saldo do recurso volta automaticamente, porque é calculado a partir das formações.
- Recusa com "Esta formação tem aluno cadastrado e não pode ser excluída." quando há aluno.
- Recusa com "Cadastro de Formação concluído não pode ser excluído." quando já foi concluído.

**Onde:**
- `src/components/ui/alert-dialog.tsx` (novo) e `src/components/formulario/ConfirmarAcao.tsx` (novo): o diálogo Sim/Não, com os tokens visuais de `globals.css` (AD-039).
- `src/components/formulario/CascaFormulario.tsx`: Concluir, confirmação e aviso.
- `src/lib/cursos/exclusao.ts` (novo): regra da exclusão.
- `src/app/api/cursos/[cdCurso]/route.ts` (novo): `DELETE`.
- `src/app/(protegido)/pre-cursos/[id]/PreCursoForm.tsx`: botão Excluir.

### 11. Valor previsto na Avaliação de Formação — ✅ `597b2b2`

**O que muda:** abaixo da pergunta 19 aparece "Estava previsto inicialmente R$ 60.000,00", com o valor alocado à formação na criação. Não há exigência de que o valor informado seja igual.

**Onde:** `src/app/(protegido)/pos-cursos/[cdCurso]/page.tsx` (já lê a formação) e `PosCursoForm.tsx`.

### 12. Erro de salvamento que não sumia — ✅ `4cc8563`

**Causa (dois defeitos):**
1. "Salvar" limpava a mensagem de erro, mas nunca a lista "Campos pendentes".
2. "Encerrar" não enviava o que estava na tela: o servidor conclui o que está **gravado**. Quem marcava a pergunta 26 e encerrava sem salvar via a 26 pendente de novo.

**O que mudou:**
- Salvar com sucesso esvazia a lista de pendências e mostra "Alterações salvas.".
- Concluir com alteração não salva mostra "Salve antes de concluir." e não envia nada ao servidor (decisão do usuário).

**Onde:** `src/components/formulario/useFormularioRespostas.ts` e `src/components/formulario/CascaFormulario.tsx`. Vale para os 3 questionários.

### 13. Excluir aluno — ✅ `ff34ae8`, `5db1508`, `c94da16`

**Regras (decisão do usuário):**
- Botão "Excluir" na linha do aluno em edição, com a mesma confirmação da exclusão de formação, para quem pode editá-lo.
- Permitido enquanto o aluno não respondeu nada: sem dados pessoais e sem avaliação concluída ou com resposta. A matrícula vazia, que nasce junto com o aluno, é apagada com ele, junto das sessões.
- Recusa com "Este aluno já tem dados preenchidos e não pode ser excluído." quando há dados.
- Só vale para Aluno: outro tipo recebe "Só é possível excluir aluno.".

**Onde:**
- `src/lib/usuarios/gestao.ts`: `excluirAluno`.
- `src/app/api/usuarios/excluir/route.ts` (novo): `POST` com `{ documento }` no corpo. O CPF do aluno nunca vai na URL (AD-029), como no "Resetar senha"; quem está fora do escopo recebe 403.
- `src/app/(protegido)/usuarios/LinhaUsuario.tsx`: botão.

### 14. Mensagem em inglês e Parte 1 obrigatória sem explicação — ✅ `0d2e7d4`, `f945b76`, `b074b07`

**Causa:** a API devolvia a mensagem padrão do Zod, que vem em inglês ("Too big: expected array to have <=3 items") e não diz a pergunta.

**O que mudou:**
- Mensagens padrão do Zod em português, no navegador e no servidor (`src/lib/validation/zod-pt.ts`, importado por todos os schemas).
- Nos 3 questionários, o erro de validação chega com a pergunta que falhou e aparece como "<rótulo da pergunta>: <mensagem>". Ex.: "18. Taxa de evasão esperada (%): Muito grande: esperado que number fosse <=100". A informação vem no campo `campo` do erro 400, só nas rotas de questionário (`src/lib/api/requisicao.ts` e as 3 rotas `PATCH`).
- O aviso da Parte 2 passou de "Complete a Parte 1 para responder esta seção." para "Para liberar a Parte 2, responda todas as perguntas da Parte 1 e clique em Salvar." (`AvaliacaoForm.tsx`).

### 15. Limite de 3 motivos e título "#4 Avaliação" — ✅ `b1da0c1`, `b074b07`, `1f6cd0b`

**O que mudou:**
- Pergunta 17: com 3 motivos marcados, as outras opções ficam desabilitadas; desmarcar uma libera de novo. Vale para qualquer pergunta de múltipla escolha com teto (`maxSelecoes` em `src/components/formulario/tipos.ts` e `CampoResposta.tsx`).
- Se um 4º motivo chegar ao servidor, a recusa é "Selecione no máximo 3 motivos" (`src/lib/validation/schemas/avaliacao.schema.ts`).
- Título com o nome da formação: ver item 8.

### Observação final: exclusão só sem "filho"

Aplicada nas duas exclusões (itens 10 e 13). A conferência roda dentro da mesma transação da exclusão. Se um aluno for matriculado no meio, a exclusão é recusada (409) e nada é apagado.

---

## Textos e mensagens da API — ✅ `7bfdb4f`, `99c2295`

Além dos itens acima, todo texto visível passa a usar os termos do cliente, inclusive as mensagens de erro da API. Exemplos:
- "Valor alocado excede o saldo disponível da verba" → "... do recurso".
- "Encerre o pré-curso antes de preencher o pós-curso" → "Conclua o Cadastro de Formação antes de preencher a Avaliação de Formação".

**Onde:** títulos e botões em `src/app/(protegido)/verbas/*`, `usuarios/*`, `cursos/novo/*`; mensagens em `src/lib/pos-curso/liberacao.ts` e nas rotas de `src/app/api/`.

---

## Fora do escopo

| Item | Motivo |
| --- | --- |
| Renomear rotas, tabelas, colunas e enums | Só o texto visível foi pedido; mexer no contrato quebra Power BI e testes |
| Troca de senha pelo próprio usuário | Decisão do usuário: a tela orienta pedir ao gestor; o "Resetar senha" da gestão continua |
| Editar responsável, UF e município do GO pelo Editar Perfil | Decisão do usuário: só nome, e-mail e telefone |
| Excluir usuário que não é Aluno | O documento pede só "excluir aluno" |
| Excluir formação já concluída | Decisão do usuário |
| Validar o telefone da pergunta 6 do Cadastro de Formação | É pergunta do questionário em papel |
| Telas de Ofertantes e Relatórios | Continuam sem tela |
| Salvamento automático | O pedido é o aviso de que ele não existe |

---

## Testes alterados de propósito

Alguns testes antigos afirmavam o comportamento que o cliente pediu para mudar. Eles agora afirmam o comportamento novo; nenhum foi apagado ou enfraquecido.

| Teste | Antes | Agora |
| --- | --- | --- |
| Criação de formação (`e2e/pre-cursos.spec.ts`, `src/lib/cursos/curso.integration.test.ts`, `pre-curso.schema.test.ts`) | Formação criada sem nome; pré nascia sem nenhuma resposta | Nome obrigatório; pré nasce com a pergunta 8 preenchida. A guarda contra o GET devolver `{}` no lugar de `null` passou para o pós, que continua nascendo vazio |
| Seletor e lista de recursos (`e2e/cursos-novo.spec.ts`, `e2e/verbas-page.spec.ts`) | IDV-09/12/13: `#3 · Nome` | Só o nome (RU-16) |

---

## Deploy

- **Sem migration.** O deploy é só de código.
- **Datas:** cadastros em andamento que hoje têm a inscrição começando no mesmo dia ou depois do início da formação continuam salvando normalmente. Só não concluem até alguém corrigir as datas. A nota de deploy (T31) traz a consulta que conta quantos são.
- **Exclusões:** apagam dado de forma definitiva, sem lixeira, como diz o texto de confirmação.
- Push na `main` = deploy (AD-047). Nada é enviado sem ordem explícita.

---

## Commits

| Commit | Task | O que |
| --- | --- | --- |
| `95caecc` | — | Spec, contexto, design e tasks |
| `4cc8563` | T1 | Pendências somem ao salvar; Concluir bloqueado sem salvar |
| `0d2e7d4` | T2 | Zod em português e `campo` no erro 400 |
| `f945b76` | T3 | Erro com o rótulo da pergunta |
| `c2bc73e` | — | Decisão renumerada para AD-054 |
| `b1da0c1` | T4 | "Selecione no máximo 3 motivos" |
| `b074b07` | T5 | Teto de 3 na tela e aviso da Parte 2 |
| `f4b6259` | T6 | `nomeDaFormacao` |
| `55d9a11` | T32 | Nome obrigatório na criação |
| `94992b6` | T7 | Listas pelo nome |
| `1f6cd0b` | T8 | Títulos pelo nome |
| `9cddc3d` | T9 | Seletor mostra o recurso escolhido |
| `adf06ef` | T10 | Lista de recursos pelo nome |
| `730b80d` | T11 | Diálogo de confirmação |
| `83dd350` | T12 | Concluir com confirmação e aviso de salvamento |
| `04b1c45` | T13 | Regra de exclusão de formação |
| `467a57e` | T14 | `DELETE /api/cursos/[cdCurso]` |
| `9b86efc` | T15 | Botão Excluir no Cadastro de Formação |
| `28012a3` | — | Rota de excluir aluno sem CPF na URL |
| `ff34ae8` | T16 | Regra de exclusão de aluno |
| `5db1508` | T17 | `POST /api/usuarios/excluir` |
| `c94da16` | T18 | Botão Excluir na linha do aluno |
| `fb67203` | T19 | Menu e módulos com os termos do cliente |
| `0cc821c` | T20 | Painel por extenso |
| `7bfdb4f` | T21 | Títulos e botões das telas |
| `b3c91ab` | — | Teste unitário do formulário de recurso (esquecido na T21) |
| `99c2295` | T22 | Mensagens da API |
| `8ff41a3` | T23 | Inscrição antes da formação; datas só quando enviadas |
| `a5373bd` | T24 | Telefone com DDD |
| `110c904` | T25 | Telefone/WhatsApp no cadastro do ofertante |
| `597b2b2` | T26 | Valor previsto na pergunta 19 |
| `d2ce9dc` | T27 | `PATCH /api/usuarios/me/perfil` |
| `5262ec9` | T28 | Telefone nos dados pessoais do Aluno |
| `e6b7892` | T29 | Editar Perfil para todos os perfis |
| `dc1cb97` | T30 | Item Editar Perfil no menu |
| (este) | T31 | AD-054, nota de deploy e este documento |
