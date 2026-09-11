# Contexto — dados-pessoais-separados

## Pedido do usuário (literal)

> "uma outra alteração, separe os dados pessoais do aluno do questionário do curso, na base de dados devem estar separados"

## Clarificação oferecida e dispensada

Ofereci duas perguntas antes de desenhar — escopo (o que conta como dado
pessoal) e cardinalidade (um registro por aluno ou por aluno+curso). O usuário
recusou a pergunta e repetiu o pedido, então desenhei com o meu julgamento e
declarei as duas escolhas para poderem ser revertidas barato.

**O escopo foi depois decidido pelo usuário**, ao ver a lista de perguntas com
o texto real: "apenas as 9 primeiras entram" — a seção DADOS PESSOAIS do
questionário. Isso reduziu D1 de 14 chaves para 7, e o recorte dele é melhor
que o meu (ver D1). A cardinalidade (D2) segue sendo decisão do agente.

## O achado que motiva o recorte

A "Parte 1" do questionário do aluno tem 19 chaves, e elas **não são um bloco
homogêneo**. Lendo uma a uma, há três naturezas distintas:

| Grupo | Chaves | De quem é o dado |
| --- | --- | --- |
| Perfil — **seção DADOS PESSOAIS (Q3–Q9)** | `avalPessoalEstado`, `avalPessoalMunicipio`, `avalPessoalGenero`, `avalPessoalFaixaEtaria`, `avalPessoalEscolaridade`, `avalPessoalRacaEtnia`, `avalPessoalCondicaoPcd` | do **aluno** — **ESTAS ENTRAM** |
| Socioeconômico — seções SITUAÇÃO PROFISSIONAL e EXPERIÊNCIA (Q10–Q16) | `avalProfissCondicaoTrabalho`, `avalProfissAtuaTurismo`, `avalProfissAtividadeEspecifica`, `avalProfissFaixaRenda`, `avalExperienciaTrabalhoPrevio`, `avalExperienciaCursoAnterior`, `avalExperienciaTipoCursoAnterior` | do aluno, no momento daquele curso — ficam no questionário (decisão do usuário) |
| Motivação e expectativa — seções 5 e 6 (Q17–Q21) | `avalMotivMotivosParticipacao`, `avalMotivFormaConhecimento`, `avalExpectAtendimento`, `avalExpectEmprego`, `avalExpectRenda` | deste **curso** — ficam |

Tratar "Parte 1" como sinônimo de "dados pessoais" seria cômodo, mas erra: o
terceiro grupo pergunta por que o aluno se inscreveu NESTE curso e o que espera
DELE. Isso é questionário do curso, exatamente o lado de que o usuário quer
separar.

`TB_Usuario` guarda só identidade e autenticação (CPF, nome, e-mail, senha) —
nenhum dado demográfico. Então hoje esses dados existem unicamente como
resposta de questionário.

## Decisões do agente

**D1 — Escopo: as 7 chaves da seção DADOS PESSOAIS do cliente (Q3–Q9).**

DECIDIDO PELO USUÁRIO ("apenas as 9 primeiras entram"), substituindo a minha
proposta inicial de 14 chaves. As 9 primeiras são a seção **DADOS PESSOAIS**
do `docs/Questionario_do_Aluno_1.md`; Q1 (nome) e Q2 (CPF) já vivem em
`TB_Usuario` e não são resposta de questionário, então o que muda de lugar são
as 7 de Q3 a Q9 — que coincidem exatamente com o prefixo `avalPessoal*`.

Eu havia proposto incluir também Situação Profissional (Q10–Q13) e Experiência
(Q14–Q16), por serem atributos da pessoa e dado sensível sob a LGPD (renda
sobretudo). O usuário optou pela letra das seções do cliente, e o recorte dele
é mais defensável que o meu: a fronteira passa a ser a que o próprio cliente
desenhou no questionário, não uma inferência do agente sobre o que conta como
dado pessoal. Condição de trabalho, renda e experiência prévia permanecem no
questionário do curso.

**D2 — Cardinalidade: continua `(CPF, curso)`.**
A separação é FÍSICA, não semântica. A alternativa — um cadastro único por CPF,
reaproveitado entre cursos — é atraente (o aluno não redigita) mas tem um custo
que não é meu para aceitar: faixa etária e escolaridade mudam com o tempo, e uma
avaliação de 2023 passaria a exibir os valores de hoje. Para um programa público
que reporta resultado por coorte, isso destrói a fidelidade do histórico. Mantendo
a chave composta, cada avaliação preserva a foto do momento e nenhuma regra de
produto muda.

**D3 — Mesma forma de linha da AD-041.**
A tabela nova repete `(pai, Chave, Ordem, Valor)`, não colunas tipadas. Reusa
`forma.ts` e o repositório inteiros, mantém o Zod como autoridade de forma
(AD-004) e evita migration a cada ajuste de questionário. Uma tabela própria
também é o que permite, depois, política de acesso ou retenção diferente para
dado pessoal — sem isso o pedido seria só cosmético.

**D4 — Contrato de domínio e HTTP inalterados.**
`lerRespostas` continua devolvendo UM objeto `{ chave: valor }` com as duas
metades juntas, e a API continua devolvendo `respostas` como hoje. Completude,
condicionais, gate da Parte 2, formulário React e todas as asserções de teste
seguem vendo o que sempre viram. É o mesmo princípio que conteve o raio de
destruição na AD-041: a separação vive na borda de persistência.

## Ligação com decisões existentes

- **AD-041** normalizou as respostas em linha; esta feature herda a estrutura e
  o repositório.
- **AD-023/RN-13** define o gate Parte 1 → Parte 2 (`parte1Completa`). O gate
  passa a ser avaliado sobre as duas fontes unidas — o conceito de Parte 1 não
  muda, só o lugar de onde metade dele é lida.
- **AD-022** já permite ao mesmo aluno ter avaliações em cursos diferentes ao
  longo do tempo, que é justamente o cenário que D2 protege.


---

## Pedidos posteriores do usuário (que reabriram o desenho)

Registrados na ordem em que chegaram, porque cada um mudou o escopo.

**P2 — coleta no primeiro acesso.** "esse questionário deve aparecer logo após
o primeiro registro do Usuário, assim que ele criar sua senha, apareçam as
perguntas que devem ser obrigatórias antes de poder prosseguir em qualquer
coisa na plataforma."

Consequência que o usuário não precisou declarar, porque é forçada: se a
coleta acontece antes de existir curso, **a chave não pode ser `(CPF, curso)`**.
Isso inverteu a decisão D2, que eu havia tomado e commitado. O custo que D2
evitava volta: avaliação antiga passa a exibir o dado atual do Aluno. Ofereci a
alternativa (foto dos 7 valores no encerramento, preservando o histórico) e o
usuário escolheu explicitamente a opção sem foto.

Decidido junto, em resposta a perguntas: **só o perfil AL** responde; as 7
perguntas **saem** do questionário do curso; a tela é a **principal**
(`/painel`), logo após o login.

**P3 — edição posterior e descarte do antigo.** "os dados do questionário de
dados pessoais posteriormente poderão ser alterados através do perfil. Os
alunos já existentes pode excluir e reiniciar a table alunos."

A primeira metade virou a história "Edição posterior pelo perfil". A segunda foi
implementada mais estreita do que a autorização concedida, deliberadamente:
**a migração não apaga conta de Aluno nem avaliação de curso**, só as 7
respostas pessoais. O efeito pedido é o mesmo — todo Aluno existente cai no
gate e responde de novo — sem o risco de uma migration que apaga Alunos rodar
um dia em produção. Limpeza de dados de demonstração em dev, se desejada, é
script à parte, executado deliberadamente.

Efeito colateral bom: o descarte elimina o problema de "qual conjunto vence
quando o Aluno respondeu em dois cursos", que a minha regra do "mais recente"
resolveria com perda de dado real.

## Estado no momento do handoff

`spec.md` está atualizado e validado (27 requisitos, `validate_spec.py` = 0).
**`design.md` e `tasks.md` estão DESATUALIZADOS** e marcados como tal no topo —
descrevem o plano anterior e contradizem o `spec.md`. Os validadores não pegam
essa contradição: `validate_tasks.py` passa neles mesmo assim. Refazer os dois
a partir do `spec.md` antes de executar qualquer coisa.
