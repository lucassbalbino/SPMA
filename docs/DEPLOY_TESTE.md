# Deploy de teste (ambiente para o cliente validar)

Objetivo: publicar o SPMA numa URL HTTPS que o cliente abre no navegador dele,
sem instalar nada. **Não é produção** — é ambiente de homologação/UAT.

Arranjo atual: a aplicação roda **na sua máquina** (build de produção, banco
`spma_uat` no MySQL do `docker-compose`) e um **túnel Cloudflare** publica essa
porta local numa URL `https://*.trycloudflare.com`. Custo zero, sem conta, sem
cartão e sem provedor de nuvem no meio.

Por que não Railway: o passo-a-passo anterior dependia do crédito de trial, que
não existe mais — ver "Alternativas" no fim.

---

## Pré-requisitos

- Docker Desktop rodando (`docker compose ps` mostra `spma-mysql` como
  `healthy`).
- `cloudflared` instalado: `winget install --id Cloudflare.cloudflared`.
  Abra um terminal **novo** depois de instalar — o PATH só vale para shells
  criados após a instalação.
- Nada de conta no Cloudflare: o `--url` usa um quick tunnel anônimo.

A porta é a **3100**, não a 3000, para a homologação conviver com o
`npm run dev`. Quem define isso é o `PORT` do `.env.uat`.

## 1. Subir o banco

```powershell
docker compose up -d
```

O banco `spma_uat` não precisa ser criado à mão: o `prisma migrate deploy` do
passo 3 o cria (o usuário `spma` tem `ALL PRIVILEGES`, ver
`docker/mysql-init/01-grants.sql`).

Ele é **separado de propósito** do `spma` (dev) e do `spma_test` (truncado a
cada rodada e2e): o que o cliente digitar na validação não se mistura com
nenhum dos dois, e rodar a suíte de testes no meio da homologação não apaga os
dados dele.

## 2. Build de produção

```powershell
npm run build
```

Inclui `prisma generate` (o `src/generated/` não é versionado). Refaça o build
a cada mudança de código que o cliente precise ver — `next start` serve o
build, não recompila.

## 3. Subir a aplicação

```powershell
npm run uat:start
```

É `dotenv -e .env.uat -- prisma migrate deploy && next start`: aplica as
migrations em `spma_uat` e serve em `http://localhost:3100`. Deixe rodando
neste terminal.

## 4. Semear o Administrador Master (uma vez)

Em outro terminal:

```powershell
npm run uat:seed
```

CPF e nome vêm de `SEED_AM_CPF`/`SEED_AM_NOME` no `.env.uat`. O seed é
idempotente — só cria o AM se nenhum existir.

`SESSION_SECRET` não é necessário: a sessão é persistida em `TB_Sessao`, não
assinada por segredo (ver `src/lib/auth/session.ts`).

Opcional — cenário de demonstração navegável (1 ofertante, 1 verba, 1 curso com
pré e pós-curso, 1 aluno matriculado e um usuário de cada perfil —
AM/GT/VT/GO/VO/AL — com senha `SenhaDemo123`):

```powershell
npm run uat:seed-demo
```

Use só se o cliente quiser ver telas já preenchidas. Para uma validação limpa,
deixe só o AM e peça que ele cadastre tudo pela interface.

## 5. Abrir o túnel

Em um terceiro terminal:

```powershell
npm run uat:tunnel
```

O `cloudflared` imprime a URL no meio do log, em um quadro:

```
+---------------------------------------------------------------------------+
|  https://palavra-palavra-palavra-palavra.trycloudflare.com                 |
+---------------------------------------------------------------------------+
```

É essa URL que vai para o cliente. **Tem de ser a HTTPS do túnel**: os cookies
de sessão e de CSRF são emitidos com `secure` (REQ-SEC-07), então por
`http://` puro o login não persiste. Como o túnel termina TLS na borda da
Cloudflare, o navegador vê HTTPS e os cookies colam — não há nada a configurar
no Next para isso.

## 6. O que entregar ao cliente

- A URL `https://....trycloudflare.com` (válida só enquanto o túnel estiver no
  ar).
- O CPF do Administrador Master e o aviso de que o **primeiro acesso pede o
  cadastro da senha** (mínimo 8 caracteres).
- Aviso: **5 tentativas de login erradas bloqueiam o CPF por 15 minutos**
  (REQ-SEC-01) — é comportamento esperado, não defeito.
- A janela combinada: a URL morre quando você fecha o túnel.

## 7. Encerrar a sessão de validação

`Ctrl+C` no terminal do túnel (a URL deixa de existir na hora) e `Ctrl+C` no da
aplicação. O banco `spma_uat` continua no volume do Docker — na próxima sessão
é só repetir os passos 1, 3 e 5, e os dados da validação anterior estarão lá.
Para começar do zero: `docker compose exec mysql mysql -uspma -pspma_dev_only -e "DROP DATABASE spma_uat"`.

---

## Limites deste arranjo

- **Só está no ar enquanto sua máquina e o túnel estiverem.** Serve para
  sessões de validação combinadas, não para "deixa no ar que eu vejo quando
  der".
- **A URL muda a cada `uat:tunnel`.** Quick tunnel é anônimo e efêmero. URL
  fixa exige conta Cloudflare + domínio próprio (~R$40/ano) e um named tunnel.
- Sem backup, sem retenção, sem SLA. É homologação.

## Regras deste ambiente

- **Não inserir dados pessoais reais** (CPF, e-mail, telefone de pessoas de
  verdade). LGPD vale igual aqui. Use dados fictícios.
- O `docker-compose.yml` continua sendo o ambiente de desenvolvimento local;
  esta homologação não substitui nem o dev nem os testes — só reaproveita o
  mesmo servidor MySQL, em outro banco.

## Alternativas

Se o cliente precisar de uma URL no ar **24/7**, independente da sua máquina, o
substituto gratuito mais direto do Railway é o **Northflank** (plano Sandbox:
2 serviços + 1 banco + 2 crons grátis, sempre ligados, MySQL entre os bancos
gerenciados). Ressalva: o compute grátis é da faixa 0.2 vCPU / 512 MB, onde
`next build` provavelmente estoura memória — o caminho é buildar a imagem
localmente (com `output: "standalone"`) e dar deploy a partir de um registry
como o GHCR.

Descartados e por quê:

- **Vercel Hobby**: não tem MySQL (exigiria Aiven free ou TiDB Serverless por
  fora), o pool de conexões sofre em serverless, o argon2 pesa no tempo de
  função, e a cláusula de uso não-comercial do Hobby não combina com projeto
  de cliente.
- **Render free**: o banco gratuito deles é só PostgreSQL, e o web service
  dorme após 15 min de inatividade (cold start de ~1 min na frente do cliente).
- **Fly.io**: não tem mais allowance gratuita.
- **Oracle Cloud Always Free** (VM ARM, grátis para sempre, `docker compose` +
  `cloudflared` na VM): a opção gratuita mais robusta, mas é administrar
  servidor, e capacidade ARM no free tier costuma faltar na criação.
