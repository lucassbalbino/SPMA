# Contexto — dados-pessoais-separados

## Pedido do usuário (literal)

> "uma outra alteração, separe os dados pessoais do aluno do questionário do curso, na base de dados devem estar separados"

## Clarificação oferecida e dispensada

Ofereci duas perguntas antes de desenhar — escopo (o que conta como dado
pessoal) e cardinalidade (um registro por aluno ou por aluno+curso). O usuário
**recusou a pergunta e repetiu o pedido**, o que é decisão dele: seguir com o
julgamento do agente. As duas escolhas abaixo são minhas, declaradas para
poderem ser revertidas barato.

## O achado que motiva o recorte

A "Parte 1" do questionário do aluno tem 19 chaves, e elas **não são um bloco
homogêneo**. Lendo uma a uma, há três naturezas distintas:

| Grupo | Chaves | De quem é o dado |
| --- | --- | --- |
| Perfil | `avalPessoalEstado`, `avalPessoalMunicipio`, `avalPessoalGenero`, `avalPessoalFaixaEtaria`, `avalPessoalEscolaridade`, `avalPessoalRacaEtnia`, `avalPessoalCondicaoPcd` | do **aluno** |
| Socioeconômico | `avalProfissCondicaoTrabalho`, `avalProfissAtuaTurismo`, `avalProfissAtividadeEspecifica`, `avalProfissFaixaRenda`, `avalExperienciaTrabalhoPrevio`, `avalExperienciaCursoAnterior`, `avalExperienciaTipoCursoAnterior` | do aluno, **no momento daquele curso** |
| Motivação e expectativa | `avalMotivMotivosParticipacao`, `avalMotivFormaConhecimento`, `avalExpectAtendimento`, `avalExpectEmprego`, `avalExpectRenda` | deste **curso** |

Tratar "Parte 1" como sinônimo de "dados pessoais" seria cômodo, mas erra: o
terceiro grupo pergunta por que o aluno se inscreveu NESTE curso e o que espera
DELE. Isso é questionário do curso, exatamente o lado de que o usuário quer
separar.

`TB_Usuario` guarda só identidade e autenticação (CPF, nome, e-mail, senha) —
nenhum dado demográfico. Então hoje esses dados existem unicamente como
resposta de questionário.

## Decisões do agente

**D1 — Escopo: as 14 chaves de Perfil + Socioeconômico.**
Motivação e expectativa (5 chaves) permanecem no questionário do curso, porque
são sobre o curso. As 14 restantes descrevem a pessoa e, sob a LGPD, têm o
mesmo tratamento de dado pessoal sensível (raça/etnia, condição PCD, faixa de
renda) — segregá-las é o que dá sentido prático ao pedido.

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
