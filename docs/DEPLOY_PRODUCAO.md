# Deploy de produção (VPS)

Produção do SPMA: uma VPS HostGator (2 GB de RAM, Ubuntu 22.04) com nginx,
Node 22 e MySQL 8.4 na mesma máquina. Decisão registrada em
[`.specs/STATE.md`](../.specs/STATE.md) (AD-047).

```
navegador ──HTTPS──▶ nginx :443 ──▶ node server.js 127.0.0.1:3000 ──▶ MySQL 127.0.0.1:3306
                        │
                        └─ /_next/static/ servido direto do disco
```

**Quem faz o build é o GitHub Actions**, não a VPS. A cada push na `main`,
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) roda typecheck, lint
e testes unitários, gera o build `standalone`, envia o pacote por SSH e chama
[`deploy/deploy.sh`](../deploy/deploy.sh) no servidor, que:

1. extrai o pacote em `/opt/spma/releases/<sha>/`;
2. roda `prisma migrate deploy` (o CLI fica em `/opt/spma/migrator`, instalado
   e atualizado sozinho na versão do `package.json`);
3. aponta `/opt/spma/current` para a versão nova e reinicia o serviço;
4. confere se `/login` responde e apaga as versões além das 5 mais recentes.

Se as migrations falham, o passo 3 não acontece e a versão anterior segue no ar.

## Layout no servidor

| Caminho | Conteúdo |
|---|---|
| `/opt/spma/current` | link para a versão no ar |
| `/opt/spma/releases/<sha>/` | últimas 5 versões (rollback) |
| `/opt/spma/shared/.env.production` | variáveis do app (`chmod 600`) |
| `/opt/spma/migrator/` | CLI do Prisma para as migrations |
| `/opt/spma/deploy.sh` | sobrescrito pelo CI a cada deploy |
| `/opt/spma/backups/` | dumps diários (14 dias) |

Os modelos de configuração estão em [`deploy/`](../deploy/).

---

## Instalação do servidor (uma vez)

Comandos marcados **[PC]** rodam no PowerShell da sua máquina; **[VPS]**, na
VPS como root. `PORTA` é a porta SSH da VPS (22022 ou 22 na HostGator, ver
e-mail de boas-vindas).

### 1. Acesso e segurança

**[PC]** Chave SSH (pule o `ssh-keygen` se `~/.ssh/id_ed25519.pub` já existir):

```powershell
ssh-keygen -t ed25519 -C "lucas-spma"
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh -p PORTA root@IP_DA_VPS "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**[VPS]** Sistema, usuário `spma`, SSH só por chave, firewall e swap:

```bash
apt update && apt upgrade -y
timedatectl set-timezone America/Sao_Paulo
apt install -y ufw fail2ban unattended-upgrades curl git

adduser --disabled-password --gecos "" spma
mkdir -p /home/spma/.ssh && cp /root/.ssh/authorized_keys /home/spma/.ssh/
chown -R spma:spma /home/spma/.ssh
chmod 700 /home/spma/.ssh && chmod 600 /home/spma/.ssh/authorized_keys

cat > /etc/ssh/sshd_config.d/00-spma.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl restart ssh
```

> Antes de fechar a sessão, teste `ssh -p PORTA spma@IP_DA_VPS` em **outra**
> janela. Se não entrar: `rm /etc/ssh/sshd_config.d/00-spma.conf && systemctl restart ssh`
> na sessão que ainda está aberta.

```bash
ufw allow PORTA/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl --system
```

### 2. Node 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### 3. MySQL 8.4

O Ubuntu 22.04 traz o 8.0; o dev usa 8.4 (`docker-compose.yml`). Baixe o
`mysql-apt-config_*.deb` em <https://dev.mysql.com/downloads/repo/apt/> ("No
thanks, just start my download"):

```bash
cd /tmp && wget LINK_DO_DEB
dpkg -i mysql-apt-config_*.deb     # MySQL Server & Cluster → mysql-8.4-lts → Ok
apt update && apt install -y mysql-server
```

Copie [`deploy/mysql-spma.cnf`](../deploy/mysql-spma.cnf) para
`/etc/mysql/mysql.conf.d/zz-spma.cnf` e `systemctl restart mysql`.

Banco e usuário (senha com `openssl rand -hex 24`). O usuário é
`'spma'@'127.0.0.1'` porque o app conecta por TCP; `@'localhost'` só casa com
conexão por socket.

```sql
CREATE DATABASE spma CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'spma'@'127.0.0.1' IDENTIFIED BY 'SENHA';
GRANT ALL PRIVILEGES ON spma.* TO 'spma'@'127.0.0.1';
```

### 4. Pastas, variáveis e serviço

```bash
mkdir -p /opt/spma/{releases,shared,migrator,backups}
chown -R spma:spma /opt/spma

cat > /opt/spma/shared/.env.production <<'EOF'
DATABASE_URL="mysql://spma:SENHA@127.0.0.1:3306/spma?allowPublicKeyRetrieval=true"
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
TZ=America/Sao_Paulo
EOF
chown spma:spma /opt/spma/shared/.env.production
chmod 600 /opt/spma/shared/.env.production
```

`allowPublicKeyRetrieval`: mesma razão do `.env` de dev (caching_sha2_password
sem TLS trava o pool após restart do MySQL). Seguro aqui porque a conexão não
sai da máquina. `SESSION_SECRET` do `.env.example` não é lido pelo código.

Copie [`deploy/sudoers-spma`](../deploy/sudoers-spma) para `/etc/sudoers.d/spma`
(`chmod 440`, valide com `visudo -cf /etc/sudoers.d/spma`) e
[`deploy/spma.service`](../deploy/spma.service) para
`/etc/systemd/system/spma.service`, depois `systemctl daemon-reload && systemctl enable spma`.
Não dê `start`: `/opt/spma/current` só existe após o primeiro deploy.

### 5. DNS e HTTPS

No Zone Editor do cPanel da HostGator, registro **A** `spma` → IP da VPS, TTL
300. Não altere os registros existentes (raiz, MX). Confira com `nslookup`
antes de seguir: o certbot falha se o DNS ainda não aponta para a VPS.

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Copie [`deploy/nginx-spma.conf`](../deploy/nginx-spma.conf) para
`/etc/nginx/sites-available/spma`, trocando `SPMA_DOMINIO`:

```bash
sed -i 's/SPMA_DOMINIO/spma.seudominio.com.br/' /etc/nginx/sites-available/spma
ln -s /etc/nginx/sites-available/spma /etc/nginx/sites-enabled/spma
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d spma.seudominio.com.br --redirect -m SEU_EMAIL --agree-tos --no-eff-email
```

O cookie de sessão é `secure` (`src/lib/auth/session.ts`): sem HTTPS o login
não funciona — e acessar pelo IP puro (`http://IP`) não serve.

**Sem domínio ainda?** Use provisoriamente `143-95-171-171.sslip.io` (o
sslip.io resolve o IP escrito no próprio nome, e o Let's Encrypt emite
certificado para ele). Serve para validar a instalação com dados de teste; não
para dados reais: quem controla o DNS desse nome é um terceiro sem contrato.
Quando o domínio chegar, acrescente-o ao `server_name` em
`/etc/nginx/sites-available/spma` e rode o `certbot --nginx -d` para ele.

> **Não troque `proxy_set_header X-Forwarded-For $remote_addr`** por
> `$proxy_add_x_forwarded_for`: o rate limit por IP lê o primeiro IP do
> cabeçalho e ficaria forjável (AD-047).

### 6. GitHub Actions

**[PC]** Chave exclusiva do CI:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\spma_deploy -N '""' -C "github-actions-spma"
type $env:USERPROFILE\.ssh\spma_deploy.pub | ssh -p PORTA spma@IP_DA_VPS "cat >> ~/.ssh/authorized_keys"
ssh-keyscan -p PORTA IP_DA_VPS
```

Em **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP da VPS |
| `VPS_PORT` | porta SSH |
| `VPS_SSH_KEY` | conteúdo **inteiro** de `spma_deploy` (privada, com as linhas BEGIN/END) |
| `VPS_KNOWN_HOSTS` | saída inteira do `ssh-keyscan` |

### 7. Primeiro deploy

Merge na `main` ou **Actions → deploy-producao → Run workflow**. Na VPS:

```bash
systemctl status spma
journalctl -u spma -n 50
```

### 8. Admin Master

O seed roda da sua máquina por um túnel SSH (na VPS não há `tsx` nem código-fonte).

**[PC]** Terminal 1, deixe aberto:

```powershell
ssh -p PORTA -N -L 3307:127.0.0.1:3306 spma@IP_DA_VPS
```

**[PC]** Terminal 2, na raiz do projeto. As variáveis vão direto na sessão,
sem arquivo: um `dotenv -e arquivo` com o nome errado não dá erro, e o
`loadEnv()` do seed cai no `.env` de dev, que também tem `SEED_AM_*`. O
seed "dá certo" no banco local.

```powershell
Test-NetConnection 127.0.0.1 -Port 3307 | Select-Object TcpTestSucceeded   # True = túnel ok
$s = Read-Host "Senha do banco" -AsSecureString
$env:DATABASE_URL = "mysql://spma:" + [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) + "@127.0.0.1:3307/spma?allowPublicKeyRetrieval=true"
$env:SEED_AM_CPF = Read-Host "CPF do Admin (so numeros)"
$env:SEED_AM_NOME = Read-Host "Nome do Admin"
npx tsx prisma/seed.ts
Remove-Item Env:DATABASE_URL, Env:SEED_AM_CPF, Env:SEED_AM_NOME; $s = $null
```

A saída precisa mostrar `Banco de destino: 127.0.0.1:3307/spma`. Com `3306`,
o seed gravou no MySQL local.

**Faça o primeiro acesso do AM imediatamente**: conta sem senha entra com a
senha em branco (`src/app/api/auth/login/route.ts`) e quem chegar primeiro com
o CPF define a senha.

### 9. Backup

O backup usa o usuário `spma` do app, não o root do MySQL: só precisa ler o
banco do sistema. **[VPS]** como root (a senha é pedida sem eco, para não
precisar editar o arquivo à mão):

```bash
read -rsp "Senha do banco (usuário spma): " P; echo
printf '[client]\nhost=127.0.0.1\nuser=spma\npassword=%s\n' "$P" > /root/.my.cnf
chmod 600 /root/.my.cnf
mysql -e "SELECT 'backup ok';" spma
```

Copie [`deploy/backup.sh`](../deploy/backup.sh) para `/opt/spma/backup.sh`
(`chmod 700`, dono root), teste com `/opt/spma/backup.sh && ls -lh /opt/spma/backups`
e agende com `crontab -e`:

```
0 3 * * * /opt/spma/backup.sh
```

O backup local não sobrevive à perda da VPS. Mantenha uma cópia fora dela:

```powershell
scp -P PORTA "root@IP_DA_VPS:/opt/spma/backups/*.sql.gz" D:\Backups\SPMA\
```

---

## Operação

| Tarefa | Como |
|---|---|
| Publicar | push/merge na `main` |
| Logs do app | `journalctl -u spma -f` |
| Reiniciar | `sudo systemctl restart spma` |
| Memória | `free -h` (esperado: Node 150-300 MB, MySQL 350-450 MB) |
| Versões disponíveis | `ls -lt /opt/spma/releases` |

### Rollback

```bash
ln -sfn /opt/spma/releases/<sha_anterior> /opt/spma/current
sudo systemctl restart spma
```

Rollback **não desfaz migrations**. Se a versão nova mudou o schema de forma
incompatível com a anterior, restaure o backup.

### Restaurar backup

```bash
systemctl stop spma
gunzip < /opt/spma/backups/spma-AAAA-MM-DD_HHMM.sql.gz | mysql spma
systemctl start spma
```

Teste uma restauração de verdade (num banco `spma_restore` descartável) pelo
menos uma vez, antes de precisar dela.

### Migração das respostas por coluna (AD-051)

A migration `20261027120000_respostas_por_coluna` converte as respostas já
gravadas em produção para o formato de uma coluna por pergunta. Ela confere o
próprio resultado antes de apagar as tabelas antigas: se algo não bater,
aborta e nada se perde.

**Antes do merge na `main`**, faça um backup na hora e copie para fora da VPS
(o diário pode ter até 24h):

```bash
sudo /opt/spma/backup.sh && ls -lh /opt/spma/backups | tail -1
```

**Se o deploy parar em "Aplicando migrations"**, a versão anterior segue no
ar e as respostas continuam nas tabelas antigas. O log do GitHub Actions diz o
motivo:

| Erro | Causa |
|---|---|
| `Check constraint 'respostas_<formulario>_divergentes' is violated` | Uma resposta gravada não corresponde a nenhuma opção do questionário atual, ou uma pergunta de resposta única tem mais de uma linha. O nome diz o formulário: `pre_curso`, `pos_curso`, `avaliacao` ou `dados_pessoais`. |
| `Incorrect ... value` / `Truncated incorrect ...` | Um número ou uma data gravados como texto não convertem. |

Para achar o valor problemático, liste o que está gravado no formulário
apontado e compare com as opções do schema dele
(`src/lib/validation/schemas/`):

```sql
SELECT Chave, Valor, COUNT(*) FROM TB_Resposta_Pre_Curso GROUP BY Chave, Valor ORDER BY Chave, Valor;
```

Depois **reverta a tentativa** e avise o Prisma que ela foi desfeita (sem
esse passo, todo deploy seguinte para com `P3009`):

```bash
mysql spma < /opt/spma/migrator/prisma/migrations/20261027120000_respostas_por_coluna/reversao.sql
cd /opt/spma/migrator && set -a && . /opt/spma/shared/.env.production && set +a \
  && npx --no-install prisma migrate resolve --rolled-back 20261027120000_respostas_por_coluna
```

O SQL de reversão só tira o que a tentativa acrescentou (as colunas `P*` e as
tabelas `_Novo`/`_Conferencia`). A primeira linha dele é uma trava: se a
migration já tinha terminado, ele para com erro sem apagar nada. Corrija o
dado (ou o código) e publique de novo.

### Sistema operacional

O suporte padrão do Ubuntu 22.04 termina em **abril de 2027**. Antes disso,
ative o Ubuntu Pro (gratuito até 5 máquinas, atualizações de segurança até
2032): token em <https://ubuntu.com/pro>, depois `pro attach TOKEN`.
