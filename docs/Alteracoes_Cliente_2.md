# Alterações solicitadas pelo cliente (Documento 2)

Pedido recebido em 2026-10-26. Decisão registrada em `.specs/STATE.md`, AD-050.

## Pedido

| # | Tela | Pedido |
|---|------|--------|
| 2.1 | Login | Escolher CPF ou CNPJ pelo número de caracteres: até 11 é CPF; com mais, a máscara passa a ser de CNPJ e o login é feito com CNPJ. Excluir o switch "Entrar com CNPJ". |
| 2.2 | Criação de usuário | Nome e e-mail pedidos apenas na criação do Administrador Master. Os demais perfis os preenchem no primeiro login. |
| 2.3 | Pré-Curso | A pergunta 7d se repete: o campo "Qual?" passa a ser "7e. Quais?". |
| 2.4 | Pré-Curso | Perguntas de nota em formato de planilha, com cada item alinhado às notas, em vez de uma lista suspensa por item. |
| 2.5 | Pós-Curso | Disponível apenas depois que o Pré-Curso estiver terminado e encerrado. |
| 2.6 | Navegação | O botão "Avaliações" passa a "Avaliações Aluno". |
| 2.7 | Formulário do Aluno | Nome do Aluno como primeira pergunta. |
| 2.8 | Formulário do Aluno | Na pergunta "Município e Estado", deixar só "Município". |
| 2.9 | Formulário do Aluno | Nota ao curso também em formato de planilha. |

## Respostas às dúvidas

- **"AD" em 2.2** é o Administrador Master criado: só ele nasce com nome e e-mail.
- **Onde os demais preenchem (2.2):** GT, VT e VO numa tela "Seus dados" logo depois de definir a senha. O Gestor Ofertante já informava nome e e-mail no cadastro da organização e segue por lá. O Aluno informa nome (primeira pergunta, 2.7) e e-mail nos dados pessoais.
- **Pós-Curso (2.5):** basta o Pré-Curso estar encerrado. O Pós-Curso continua na lista e, ao abri-lo, a página avisa que é preciso encerrar o Pré-Curso antes de avançar.

## Como foi aplicado

- **2.1:** o campo do login se chama "CPF ou CNPJ". A máscara de CNPJ entra no 12º caractere ou na primeira letra (CNPJ alfanumérico), e volta para CPF ao apagar até 11.
- **2.2:** enviar nome ou e-mail na criação de outro perfil é recusado. O e-mail do Administrador Master continua opcional.
- **2.4 e 2.9:** valem para as perguntas 23 e 24 do Pré-Curso, a pergunta 24 do Aluno e a nota de 0 a 10 (pergunta 35), que vira uma linha com as notas de 0 a 10.
- **2.8:** "Estado de residência" continua como pergunta própria, logo antes de "Município".
- **2.6:** o Aluno continua vendo "Minha avaliação".
