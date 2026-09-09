# Criação de curso pelo AM Specification

**Escopo:** Medium (regra de autorização já tem padrão idêntico no código - `podeMatricularAluno` - e telas/testes já seguem convenção estabelecida; sem componente novo de arquitetura).

**Fonte funcional:** `src/lib/auth/guards.ts` (`podeGerenciarPreCurso`/`podeGerenciarPosCurso`), `.specs/features/formulario-pre-curso/spec.md` (regra anterior, seção 4 do documento fonte), decisão do usuário nesta sessão (product owner autorizou retificar a regra).

## Problem Statement

Hoje só o GO do próprio Ofertante pode criar curso (Pré-Curso, que por sua vez habilita o Pós-Curso do mesmo curso). O AM - autoridade nacional (AD-012), que já cria Usuário, Ofertante, Verba e matrícula em qualquer Ofertante - não consegue criar curso, o que o bloqueia quando precisa cadastrar um curso antes de (ou sem depender de) um GO. O usuário (product owner) pediu explicitamente que a navbar ganhe um atalho "Novo curso" para todo perfil com essa permissão, incluindo o AM - o que exige primeiro abrir a permissão em si.

## Goals

- [ ] AM cria Pré-Curso (= "curso") para qualquer Ofertante, escolhendo entre as Verbas existentes desse Ofertante.
- [ ] AM inicia Pós-Curso para qualquer Pré-Curso elegível de qualquer Ofertante (decorre da guarda compartilhada, `podeGerenciarPosCurso` é alias de `podeGerenciarPreCurso`).
- [ ] Navbar exibe "Novo curso" → `/pre-cursos/novo`, apenas para quem tem permissão de criar curso (AM, GO) - GT/VT/VO/AL não veem o atalho.
- [ ] Documentação (`.specs/features/formulario-pre-curso/spec.md`, `.specs/STATE.md`) deixa de contradizer o código: a regra "apenas GO cria pré-curso" é substituída, registrada como AD-040.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Pós-Curso como "curso" separado, com o próprio atalho de navbar | Rejeitado explicitamente pelo usuário: Pré-Curso e Pós-Curso são o mesmo curso (`PosCurso.CD_Curso` é PK e FK 1:1 para `PreCurso.CD_Curso`, sem identidade própria); "criar um curso" é só `/pre-cursos/novo`. |
| GT ganhar permissão de criar curso | Não pedido; GT continua restrito a gerir Verba (`podeGerenciarVerba`), sem exceção administrativa para Curso. |
| Mudar quem pode LISTAR/LER Pré-Curso e Pós-Curso | `GET /api/pre-cursos` e `GET /api/pos-cursos` já não filtram por Ofertante para AM/GT/VT (comportamento anterior, inalterado). |
| Dashboard/indicadores de curso por Ofertante para o AM | Fora do pedido original; feature de dashboard já adiada por AD-024. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| "Criar curso" = criar Pré-Curso, não Pós-Curso | Atalho de navbar e a liberação de regra tratam só `/pre-cursos/novo` como criação de curso | Usuário confirmou que os dois questionários pertencem ao mesmo curso; o PreCurso é o registro com `CD_Curso` próprio | y |
| AM deve poder criar curso para qualquer Ofertante, não só um fixo | `podeGerenciarPreCurso` retorna `true` para qualquer `cdOfertanteAlvo` quando `usuario.tipo === "AM"` | Mesmo padrão já usado em `podeMatricularAluno` (AM cria Aluno/matrícula em qualquer Ofertante, AD-012); pedido original citava "incluindo AM" sem restringir a um Ofertante | y |
| Seletor de Verba mostra o nome do Ofertante quando quem cria é o AM | `NovoPreCursoForm` exibe `"{nomeOfertante} — Verba #N — saldo R$ X"` só quando `nomeOfertante` está presente (GO continua vendo só "Verba #N", já que só vê as do próprio Ofertante) | Sem o nome, a lista de Verbas de Ofertantes distintos fica ambígua para quem escolhe entre vários; GO não precisa porque a lista já é só do próprio Ofertante | n (decisão de UI do agente, não levada ao usuário - risco baixo, reversível) |
| GT continua sem poder criar curso | Nenhuma mudança em `podeGerenciarVerba` nem novo caminho para GT | Fora do pedido; a regra "GT só verba" nunca foi questionada nesta sessão | y |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: AM cria curso para qualquer Ofertante ⭐ MVP

**User Story**: Como AM, quero criar um curso (Pré-Curso) para qualquer Ofertante, escolhendo entre as Verbas existentes desse Ofertante, para poder cadastrar cursos mesmo quando o GO ainda não o fez.

**Why P1**: É o pedido central desta sessão - sem isso o botão de navbar não teria nada de novo para o AM.

**Acceptance Criteria**:

1. WHEN um AM autenticado envia `POST /api/pre-cursos` com `cdVerba` de qualquer Ofertante e `vlCursoAlocado` dentro do saldo disponível da Verba THEN o sistema SHALL criar o PreCurso com `status=EM_ANDAMENTO`, `criadoPor=CPF do AM` e responder HTTP 201. (CURSO-01)
2. WHEN a tela `/pre-cursos/novo` é aberta por um AM THEN o sistema SHALL listar as Verbas de TODOS os Ofertantes, cada opção mostrando nome do Ofertante, número da Verba e saldo disponível. (CURSO-02)
3. IF um GO autenticado tenta criar curso usando uma Verba de um Ofertante diferente do seu (`cdVerba` forjado) THEN o sistema SHALL responder HTTP 403 e não criar o PreCurso. (CURSO-03)

**Independent Test**: login como AM, abrir `/pre-cursos/novo`, escolher uma Verba de um Ofertante ao qual o AM não está vinculado (AM nunca está - `cdOfertante=null`), enviar o formulário e confirmar o PreCurso criado com o `cdOfertante` da Verba escolhida.

---

### P1: AM inicia Pós-Curso para qualquer Ofertante

**User Story**: Como AM, quero iniciar o Pós-Curso de qualquer Pré-Curso elegível, de qualquer Ofertante, para dar continuidade ao mesmo curso sem depender do GO.

**Why P1**: Decorre diretamente de CURSO-01 via guarda compartilhada (`podeGerenciarPosCurso` é o mesmo `podeGerenciarPreCurso`) - não implementar o mesmo alcance aqui recriaria a "diferenciação entre pré e pós" que o usuário explicitamente rejeitou.

**Acceptance Criteria**:

1. WHEN um AM autenticado envia `POST /api/pos-cursos` com `cdCurso` de um PreCurso de qualquer Ofertante que ainda não tem PosCurso THEN o sistema SHALL criar o PosCurso e responder HTTP 201. (CURSO-04)
2. WHEN a tela `/pos-cursos/novo` é aberta por um AM THEN o sistema SHALL listar todos os Pré-Cursos elegíveis (`posCurso: null`) de qualquer Ofertante. (CURSO-05)

**Independent Test**: login como AM, abrir `/pos-cursos/novo`, ver Pré-Cursos de Ofertantes distintos na lista, criar um Pós-Curso e confirmar HTTP 201.

---

### P1: Atalho "Novo curso" na navbar

**User Story**: Como AM ou GO, quero um atalho "Novo curso" na navbar, para chegar direto à criação do curso sem passar pela listagem.

**Why P1**: Pedido literal do usuário ("adicione um botão na navbar que redirecione para a criação de um novo curso... incluindo AM").

**Acceptance Criteria**:

1. WHEN um usuário AM ou GO autenticado carrega qualquer rota protegida THEN a navbar SHALL exibir o item "Novo curso" apontando para `/pre-cursos/novo`. (CURSO-06)
2. WHILE o usuário autenticado é GT, VT, VO ou AL, a navbar SHALL NOT exibir o item "Novo curso". (CURSO-07)
3. WHEN o pathname atual é `/pre-cursos/novo` THEN o item ativo da navbar SHALL ser "Novo curso" (href mais longo vence sobre "Pré-cursos"). (CURSO-08)

**Independent Test**: `navegacaoDoPerfil("AM")` e `navegacaoDoPerfil("GO")` contêm `/pre-cursos/novo`; os outros 4 perfis não contêm; `hrefAtivo("/pre-cursos/novo", itens)` resolve para `/pre-cursos/novo`.

---

## Edge Cases

- IF não há nenhuma Verba com saldo disponível (para AM, em nenhum Ofertante; para GO, no próprio) THEN a tela `/pre-cursos/novo` SHALL exibir "Nenhuma verba disponível para criar um curso." sem erro. (CURSO-09)
- IF um usuário sem permissão (GT, VT, VO, AL) acessa `/pre-cursos/novo` ou `/pos-cursos/novo` diretamente pela URL THEN o sistema SHALL exibir a mensagem de acesso negado da própria tela, sem listar Verbas/Pré-Cursos. (CURSO-10)
- IF um AM tenta criar Pós-Curso para um `cdCurso` que já tem Pós-Curso THEN o sistema SHALL responder HTTP 409 (comportamento já existente, preservado). (CURSO-11)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CURSO-01 | P1: AM cria curso | Execute | Verified |
| CURSO-02 | P1: AM cria curso | Execute | Verified |
| CURSO-03 | P1: AM cria curso | Execute | Verified (regressão pré-existente) |
| CURSO-04 | P1: AM inicia Pós-Curso | Execute | Verified |
| CURSO-05 | P1: AM inicia Pós-Curso | Execute | Verified |
| CURSO-06 | P1: Atalho navbar | Execute | Verified |
| CURSO-07 | P1: Atalho navbar | Execute | Verified |
| CURSO-08 | P1: Atalho navbar | Execute | Verified |
| CURSO-09 | Edge case | Execute | Verified |
| CURSO-10 | Edge case | Execute | Verified |
| CURSO-11 | Edge case | Execute | Pending |

**Coverage:** 11 total, 11 mapped to Execute (Tasks phase skipped - Medium scope, <10 implicit steps), 0 unmapped.

---

## Success Criteria

- [ ] AM cria Pré-Curso e Pós-Curso para qualquer Ofertante via UI e API (CURSO-01/02/04/05).
- [ ] GO mantém o comportamento anterior - só o próprio Ofertante (CURSO-03).
- [ ] GT/VT/VO/AL não ganham o atalho de navbar nem a permissão de criar curso (CURSO-07).
- [ ] `.specs/features/formulario-pre-curso/spec.md` e `.specs/STATE.md` (AD-040) refletem a regra nova, sem contradizer o código.
- [ ] Gate completo verde: `lint && build && typecheck && test:unit && test:integration && test:e2e`.
