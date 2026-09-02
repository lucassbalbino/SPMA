# Deploy de teste (ambiente para o cliente validar)

Objetivo: publicar o SPMA numa URL HTTPS que o cliente abre no navegador dele,
sem instalar nada. **Não é produção** — é ambiente de homologação/UAT.

Host recomendado: **Railway** — sobe a aplicação Next e um MySQL gerenciado no
mesmo projeto, com rede privada entre eles. É o único provedor da lista que
resolve app + MySQL sem um segundo serviço.

---

## Pré-requisitos

- Repositório no GitHub em dia (`git push origin main`).
- Conta em <https://railway.com> (login com GitHub).
- Plano Hobby (~US$ 5/mês, com crédito de trial). **Derrube o projeto quando a
  validação terminar** — a cobrança é por uso contínuo.

---

## 1. Criar o projeto e o banco

1. Railway → **New Project** → **Deploy from GitHub repo** → `lucassbalbino/SPMA`.
2. Dentro do projeto: **+ Create** → **Database** → **Add MySQL**.

O serviço MySQL passa a expor `MYSQL_URL` (rede interna do projeto) e as partes
soltas (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`).

3. Ainda no serviço MySQL: **Settings** → **Networking** → **Public Networking**
   → habilite o **TCP Proxy / Public Access**. Só então aparece a variável
   `MYSQL_PUBLIC_URL`, que é a única alcançável da sua máquina — sem ela o seed
   do passo 5 não roda.

## 2. Variáveis de ambiente da aplicação

No serviço da aplicação → aba **Variables**:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}?allowPublicKeyRetrieval=true` |
| `NODE_ENV` | `production` |
| `SEED_AM_CPF` | CPF do Administrador Master (11 dígitos, válido no módulo 11) |
| `SEED_AM_NOME` | Nome do Administrador Master |

`SESSION_SECRET` **não** é necessário: a sessão é persistida em `TB_Sessao`, não
assinada por segredo (ver `src/lib/auth/session.ts`).

O `allowPublicKeyRetrieval=true` é obrigatório: o MySQL 8 do Railway usa
`caching_sha2_password` e a conexão do driver não é TLS na rede interna — sem
esse parâmetro a conexão trava num timeout de pool.

> Se o deploy acusar erro de conexão com o banco, troque `MYSQL_URL` por
> `MYSQL_PUBLIC_URL` na `DATABASE_URL` (a rede privada do Railway é IPv6-only e
> alguns runtimes não a resolvem).

## 3. Comandos de build e start

No serviço da aplicação → **Settings**:

- **Build Command:** `npm run build`
  (já inclui `prisma generate` — `src/generated/` não é versionado, então sem
  isso o build em nuvem falha)
- **Start Command:** `npm run start:prod`
  (`prisma migrate deploy && next start` — aplica as migrations a cada deploy)

## 4. Gerar a URL pública

Serviço da aplicação → **Settings** → **Networking** → **Generate Domain**.
Sai algo como `https://spma-production.up.railway.app`.

**Tem de ser HTTPS.** O cookie de sessão é emitido com `secure` (REQ-SEC-07);
por `http://` puro o login não persiste.

## 5. Semear o Administrador Master (uma vez)

O primeiro AM não é criado pela interface. Rode da sua máquina, apontando para a
URL **pública** do banco (copie de MySQL → Variables → `MYSQL_PUBLIC_URL`):

```powershell
$env:DATABASE_URL = "mysql://root:SENHA@ROTA.proxy.rlwy.net:PORTA/railway?allowPublicKeyRetrieval=true"
npm run db:seed
```

A variável do shell tem precedência sobre o `.env` local (o `dotenv` não
sobrescreve o que já está no ambiente), então isso não toca no seu banco de dev.

Encerrada a validação, desligue o Public Access do MySQL: com ele ligado o banco
fica exposto na internet, protegido só pela senha.

Opcional — cenário de demonstração navegável (1 ofertante, 1 verba, 2 cursos,
1 avaliação e um usuário GT/GO/AL com senha `SenhaDemo123`):

```powershell
npm run dev:seed-demo
```

Use o seed de demo só se o cliente quiser ver telas já preenchidas. Para uma
validação limpa, deixe só o AM e peça que ele cadastre tudo pela interface.

Se `prisma migrate deploy` não rodar no start (CLI podada do runtime), aplique as
migrations pela mesma via, antes do seed:

```powershell
npx prisma migrate deploy
```

## 6. O que entregar ao cliente

- A URL `https://....up.railway.app`.
- O CPF do Administrador Master e o aviso de que o **primeiro acesso pede o
  cadastro da senha** (mínimo 8 caracteres).
- Aviso: **5 tentativas de login erradas bloqueiam o CPF por 15 minutos**
  (REQ-SEC-01) — é comportamento esperado, não defeito.

---

## Regras deste ambiente

- **Não inserir dados pessoais reais** (CPF, e-mail, telefone de pessoas de
  verdade). É ambiente de teste, sem backup nem plano de retenção — LGPD vale
  igual. Use dados fictícios.
- O banco é descartável: `docker`/`docker-compose.yml` continuam sendo o
  ambiente de desenvolvimento local; este deploy não substitui nenhum dos dois.
- Ao encerrar a validação, delete o projeto no Railway para parar a cobrança.

## Alternativa (se preferir Vercel)

Vercel hospeda o Next sem esforço, mas **não tem MySQL** — exigiria um banco
externo (TiDB Cloud Serverless, Aiven ou PlanetScale) e o pool de conexões
passaria a ser um problema em ambiente serverless, com um `DATABASE_URL` apontando
para fora. Para um ambiente de teste, não compensa a complexidade extra.
