# SPMA — Sistema de Planejamento, Monitoramento e Avaliação de Cursos de Turismo

Plataforma de avaliação de cursos de qualificação em Turismo, oferecidos por entidades ("Ofertantes") em todo o Brasil.

## Stack

- **Next.js (App Router) + TypeScript** — front-end e API no mesmo projeto
- **MySQL** — banco de dados (exigência do cliente)
- **Prisma** — ORM e migrations
- **Zod** — validação compartilhada cliente/servidor
- Sessão própria (CPF + senha), hash com argon2/bcrypt

As decisões de arquitetura e domínio estão registradas em [`.specs/STATE.md`](.specs/STATE.md).
A especificação funcional aprovada pelo cliente está em [`docs/SPMA_Especificacao_Cliente_v2.md`](docs/SPMA_Especificacao_Cliente_v2.md).

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose (para o MySQL local)
- Git

## Setup passo a passo

### 1. Instalar dependências

Se o projeto Next.js ainda não foi inicializado neste diretório, o agente/dev fará o scaffolding (`create-next-app`) e então:

```bash
npm install
npm install prisma @prisma/client zod
npm install argon2            # ou bcrypt
npm install -D prisma
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# gerar um SESSION_SECRET forte:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# colar o valor em SESSION_SECRET no .env
```

### 3. Subir o banco de dados (Docker)

```bash
docker compose up -d
```

Isso sobe um MySQL 8.4 em `localhost:3306`, banco `spma`, já com o usuário
configurado para o shadow database do Prisma. Para conferir se está de pé:

```bash
docker compose ps
```

Comandos úteis:
- Parar: `docker compose down`
- **Resetar o banco do zero** (apaga tudo): `docker compose down -v && docker compose up -d`

### 4. Aplicar o schema ao banco

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Para inspecionar o banco visualmente a qualquer momento:

```bash
npx prisma studio
```

### 5. Semear o primeiro Administrador Master

O primeiro usuário AM não é criado pela interface (não há auto-registro de admin).
Crie um script de seed (`prisma/seed.ts`) que insira um AM inicial com senha em
primeiro acesso. O agente cuidará disso na feature `auth-e-usuarios`.

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

## Deploy de teste (homologação com o cliente)

Para publicar uma instância que o cliente valida pelo navegador, sem instalar
nada na máquina dele, siga [`docs/DEPLOY_TESTE.md`](docs/DEPLOY_TESTE.md).

## Fluxo de desenvolvimento (spec-driven)

Este projeto usa a skill **tlc-spec-driven**. O ciclo por feature é:

```
SPECIFY → DESIGN → TASKS → EXECUTE
```

As specs vivem em `.specs/features/<feature>/spec.md`. Ordem sugerida de implementação:

1. **auth-e-usuarios** — fundação (spec pronta)
2. **seguranca-transversal** — proteções aplicáveis a tudo (spec pronta)
3. **cadastro-ofertante-verba**
4. **formulario-pre-curso**
5. **formulario-pos-curso**
6. **avaliacao-aluno**
7. **dashboard** — adiada (indicadores a definir; ver AD-024)

Cada feature: um commit atômico por task, testes derivados dos critérios de
aceitação, e verificação independente ao final.

> **Nota:** operações remotas ou destrutivas (`git push`, deploy, mudanças em
> banco de produção) exigem autorização explícita — não são feitas automaticamente.

## Estrutura

```
.
├── .specs/
│   ├── STATE.md                     # decisões (AD-001 a AD-033)
│   └── features/
│       ├── auth-e-usuarios/spec.md
│       └── seguranca-transversal/spec.md
├── docs/
│   └── SPMA_Especificacao_Cliente_v2.md
├── prisma/
│   └── schema.prisma                # modelo das 6 tabelas + sessão
├── docker/
│   └── mysql-init/01-grants.sql
├── docker-compose.yml
├── .env.example
└── README.md
```
