# Context — Onboarding Organizacional do GO

Registro das decisões do usuário nesta sessão (2026-10-12), na ordem em que foram tomadas. O pedido original e cada escolha de área cinzenta estão aqui para que `spec.md` não precise narrar o diálogo.

## Pedido original

> "quero alterar um fluxo, no ato de primeiro login do Ofertante, aparecerá obrigatoriamente um formulário para preencher as seguintes infos: Nome; poderá ser alterado, mas terá placeholder do nome que foi criado; Responsável; Email; deixará de ser preenchido na criação pelo ADM; Telefone; UF; Município."

## Estado encontrado antes de decidir (Knowledge Verification Chain, passo 1)

O formulário já existe (`src/app/(onboarding)/cadastro-ofertante/page.tsx`, os 6 campos, consumindo `PATCH /api/usuarios/me/organizacao`) e já é um bloqueio de onboarding. O que não funciona é o **critério de completude**: `requireOfertanteVinculado` (`src/lib/auth/guards.ts:63`) mede por `nome === null || uf === null`, e `POST /api/usuarios` exige `nome` e `uf` do criador — logo, um GO criado por AM/GT já nasce "completo" e nunca cai na tela. Com o nome pré-preenchido pedido acima, `nome` também nunca é null. O critério tinha que mudar de forma; o resto da feature é consequência.

## Decisões do usuário

| # | Área cinzenta | Decisão | Palavras / escolha do usuário |
| --- | --- | --- | --- |
| 1 | Como medir "já preencheu" | Coluna booleana nova `dadosOrganizacionaisCompletos` em `TB_Usuario`, no padrão de `dadosPessoaisCompletos` (AD-042) | "Nova flag no banco" |
| 2 | Quais dos 6 campos são obrigatórios | **Todos os 6** — nome, responsável, email, telefone, UF e município | "Todos os 6 obrigatórios" |
| 3 | O que o AM/GT preenche ao criar um GO | Só CNPJ, nome e a verba | "O Adm tem que preencher apenas nome, cnpj, e verba, fora isso, nada deverá ser preenchido" |
| 4 | GOs que já existem no banco | Todos passam pela tela no próximo login, mesmo com nome/UF preenchidos | "Sim, todos passam pela tela" |
| 5 | GO edita os próprios dados depois? | **Não.** O `409` de `PATCH /api/usuarios/me/organizacao` após a conclusão fica como está | "o GO não precisará editar as suas infos posteriormente" |
| 6 | `PATCH /api/usuarios/[documento]/organizacao` (AM/GT editam um GO, rota de API sem tela) | Mantida como está — é a única válvula de correção que sobra | "Manter como está" |
| 7 | Como executar | Feature no `.specs/`, fluxo spec-driven, com AD nova em `STATE.md` | "Feature no .specs" |

## Consequências apresentadas ao usuário antes das decisões

1. **Sem edição por ninguém a não ser AM/GT.** Com a decisão 5, um email digitado errado pelo GO só se corrige por `PATCH /api/usuarios/[documento]/organizacao` (AM/GT) — foi o argumento para a decisão 6.
2. **Os 6 obrigatórios valem também para o AM/GT editando um GO**, porque os dois endpoints compartilham `organizacaoSchema` e o contrato é tudo-ou-nada (campo ausente *limpa* o valor). Mantido compartilhado de propósito: dois conceitos de "dados organizacionais válidos" é pior que um contrato rígido.
3. **"Placeholder" do nome virou valor editável, não `placeholder` HTML.** Com o campo obrigatório, um placeholder cinza forçaria o GO a redigitar o nome só para avançar. O efeito descrito pelo usuário (vê o nome criado, pode alterar) é o mesmo. Decisão do agente, apresentada e não contestada.
