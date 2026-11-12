# Revisão de Usabilidade 1 Context

**Gathered:** 2026-11-11
**Spec:** `.specs/features/revisao-usabilidade-1/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Aplicar o documento `Verificacao_SPMA_07.11.26` (15 itens + 2 comentários) na camada de apresentação e validação, mais duas exclusões e a edição do próprio perfil. Nenhuma tabela, rota existente, enum ou chave JSON muda de nome.

---

## Implementation Decisions

### Nome da formação

- Vem da P8 do Cadastro de Formação (o "nome do curso que o formulário está ligado").
- Obrigatório na criação ("Nova Formação"), gravado na P8 na mesma transação, e não pode ser apagado depois.
- `Formação sem nome (nº <cdCurso>)` só para formação antiga sem P8.
- Recurso: o nome já é obrigatório; só o rótulo vira "Nome do recurso". Nome repetido não ganha nenhuma informação extra.

### Excluir formação

- Só enquanto o Cadastro de Formação está em andamento e sem aluno.

### Excluir aluno

- Bloqueia se o aluno "respondeu algo": dados pessoais gravados, ou avaliação concluída ou com resposta. A matrícula vazia não conta e é apagada junto.

### Editar Perfil

- Nome, e-mail e telefone, para todos os perfis.
- Senha: a tela informa que a troca deve ser pedida ao gestor do curso. Sem troca pelo próprio usuário.

### Status

- O botão passa a "Concluir"; o status continua "Encerrado".

### Concluir com alteração não salva

- Bloqueado com "Salve antes de concluir.". Não grava sozinho.

### Datas

- Conferidas só quando o `PATCH` traz uma das 4 datas, e sempre na conclusão.

### Agent's Discretion
- Telefone dos demais perfis reaproveita `Usuario.telefone`.

### Declined / Undiscussed Gray Areas → Assumptions

Todos registrados em `spec.md`, Assumptions & Open Questions, com `Confirmed? n`.

---

## Specific References

- Textos de confirmação e de aviso: literais do documento, com "automático" corrigido para "automaticamente".
- Painel no formato do item 1 do documento ("Olá, Lucas / Está em um perfil de ... / Portanto está apto a realizar: ...").

---

## Deferred Ideas

- Renomear a coluna `Tel_Organizacao` para um nome neutro (exige migration e mexe no Power BI).
- Troca de senha pelo próprio usuário.
