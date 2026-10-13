# Gestão de Verbas Context

**Gathered:** 2026-10-13
**Spec:** `.specs/features/gestao-de-verbas/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A Verba deixa de nascer junto do GO e ganha uma tela própria, `/verbas`, na navbar: AM e GT criam verbas para qualquer GO (vínculo obrigatório), listam com saldo disponível e editam valor/data. GO e VO veem as próprias verbas em modo leitura. Um GO pode ter quantas verbas forem criadas para ele.

---

## Implementation Decisions

### Cardinalidade

- 1 GO : N verbas. Cada verba pertence a exatamente um GO. O schema atual já modela isso (`Verba.cdOfertante` → `Usuario.documento`), então não há migração.
- Verba compartilhada entre GOs (N:N) foi descartada.

### Quem cria e edita

- AM e GT, a regra atual de `podeGerenciarVerba`. Não restringir ao AM.

### Campos

- Sem campos novos: Valor (obrigatório), Data de liberação (opcional), GO (obrigatório).

### Escopo da tela `/verbas`

- Criar + listar (com saldo disponível) + editar, na mesma página, como em `/usuarios`.
- GO e VO acessam a mesma rota em modo leitura, cada um vendo só as verbas do próprio escopo.

### Criação do GO em `/usuarios`

- Remover os campos de verba. O GO nasce sem verba, e AM/GT vinculam verbas depois em `/verbas`.
- As verbas que já existem ficam intactas.

### VT

- O VT não vê verbas: sem item de menu, sem acesso à tela e 403 nas rotas GET de verba. A leitura nacional dele sobre cursos e relatórios não muda.

### Exclusão

- Sem exclusão de verba.

### Processo

- Fluxo spec-driven em `.specs/`, com a decisão registrada como AD em `STATE.md`. Ela supera a parte de REQ-OV-08 que cria a verba junto do GO.

### Agent's Discretion

- Layout da página, rótulos e mensagens de estado vazio seguem os padrões já usados em `/usuarios` e `/cursos/novo`.

### Declined / Undiscussed Gray Areas → Assumptions

- Payload de `POST /api/usuarios` que ainda envie `verba` → 400 → Assumptions.
- Teto de valor pela coluna `DECIMAL(10,2)` → Assumptions.
- Limpar a data de liberação na edição → fora de escopo → Assumptions.
- Rótulo do item de menu para todos os perfis → Assumptions.

---

## Specific References

- "Mesmo padrão de `/usuarios`": formulário e lista na mesma página (GU-01).
- O seletor de GO reaproveita a lista de GOs que `/usuarios` já carrega para AM/GT (nome, ou o CNPJ quando não há nome).

---

## Deferred Ideas

- Filtro da listagem por GO (a API já aceita `?cdOfertante=`).
- Paginação da listagem.
- Ativar o módulo "Ofertantes", que segue sem tela.
