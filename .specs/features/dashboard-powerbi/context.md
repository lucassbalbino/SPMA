# dashboard-powerbi Context

**Gathered:** 2026-11-25
**Spec:** `.specs/features/dashboard-powerbi/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Acoplar a rotina "SPMA Embedded 2.0" do cliente (Power BI Embedded, *App owns data*) ao SPMA: uma rota de API que emite o embed token a partir da sessão, uma página `/relatorios` que monta e renova o relatório, e o link no menu. Tudo com o mínimo de alteração no que já existe.

---

## Implementation Decisions

### Quem acessa

- AM, GT, VT, GO e VO acessam; o Aluno é o único sem acesso.
- "Acesso limitado" = o escopo que o perfil já tem no sistema; quem filtra as linhas é o RLS do Power BI.

### Organização dos relatórios

- O cliente ainda não decidiu entre um relatório único e um por grupo de perfil.
- O código sai com um catálogo de dois painéis (`nacional`, `ofertante`), os dois apontando para o relatório padrão. Separar vira configuração.

### Sessão

- A renovação automática do token passa pela sessão normal e a mantém viva enquanto a página estiver aberta (escolha do usuário: dashboard em TV/monitor é aceitável).

### Homologação

- O usuário tem as credenciais reais (segredo já trocado) e testa no `.env` local.

### Agent's Discretion

- Estrutura dos módulos em `src/lib/powerbi/`, nomes, limite de pedidos (20/60 s), timeouts (10 s) e a única nova tentativa em 429/503.
- Identidade enviada para o VO: o CNPJ do GO vinculado (`resolverEscopoOfertante`).
- Visual da página: título + contêiner 16:9 dentro do `<main>` atual da casca, sem tela de referência (não há print de relatórios no design system).

### Declined / Undiscussed Gray Areas → Assumptions

- Dataset único compartilhado pelos relatórios → spec, Assumptions.
- "VM" do manual ignorado → spec, Assumptions.
- Nomes das variáveis de ambiente → spec, Assumptions.

---

## Specific References

- Rotina do cliente: `powerbi.service.mjs`, `dashboard.mjs`, `powerbi.routes.example.mjs`, Manual Técnico SPMA V2 (25/11/2026).
- Teste de concorrência feito em 2026-11-25 contra a Microsoft simulada (200 e 2000 pedidos simultâneos, 1 chamada ao Entra, nenhum token trocado) - os cenários viram testes do serviço.

---

## Deferred Ideas

- Seletor de mais de um dashboard por perfil (`?painel=`).
- Dashboard do Aluno.
- Detecção de troca de usuário em outra aba.
- Auditoria em tabela.
