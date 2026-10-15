#!/usr/bin/env bash
# Publica uma versão do SPMA na VPS. Chamado pelo GitHub Actions
# (.github/workflows/deploy.yml), que antes envia o pacote para
# /tmp/spma-<sha>.tgz. Roda como o usuário `spma`.
#
# Ordem pensada para falhar sem derrubar o site: as migrations rodam ANTES de
# trocar o link `current`. Se falharem, o `set -e` aborta e a versão anterior
# segue no ar.
set -euo pipefail

SHA="${1:-}"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "uso: deploy.sh <sha do commit, 40 hex>" >&2
  exit 1
fi

BASE=/opt/spma
RELEASE="$BASE/releases/$SHA"
PACOTE="/tmp/spma-$SHA.tgz"
MIGRATOR="$BASE/migrator"

echo "==> Extraindo $SHA"
rm -rf "$RELEASE"
mkdir -p "$RELEASE"
tar -xzf "$PACOTE" -C "$RELEASE"
rm -f "$PACOTE"

# O CLI do Prisma não entra no build standalone. Ele vive numa pasta própria,
# na mesma versão do package.json do projeto - reinstalado só quando ela muda.
PRISMA_VERSAO=$(node -p "require('$RELEASE/package.json').devDependencies.prisma")
DOTENV_VERSAO=$(node -p "require('$RELEASE/package.json').devDependencies.dotenv")
mkdir -p "$MIGRATOR"
if [[ "$(node -p "try{require('$MIGRATOR/node_modules/prisma/package.json').version}catch{''}")" != "$PRISMA_VERSAO" ]]; then
  echo "==> Instalando prisma@$PRISMA_VERSAO no migrator"
  (cd "$MIGRATOR" && { [[ -f package.json ]] || npm init -y >/dev/null; } \
    && npm install --no-audit --no-fund "prisma@$PRISMA_VERSAO" "dotenv@$DOTENV_VERSAO")
fi

echo "==> Aplicando migrations"
rm -rf "$MIGRATOR/prisma"
cp -r "$RELEASE/prisma" "$RELEASE/prisma.config.ts" "$MIGRATOR/"
set -a
# shellcheck disable=SC1091
. "$BASE/shared/.env.production"
set +a
(cd "$MIGRATOR" && npx --no-install prisma migrate deploy)

echo "==> Ativando a versão"
ln -sfn "$RELEASE" "$BASE/current"
sudo /usr/bin/systemctl restart spma

# Fumaça: o serviço precisa responder em até ~30s, senão o deploy falha
# (e o log do Actions mostra). O link já foi trocado - rollback é manual,
# ver docs/DEPLOY_PRODUCAO.md.
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORT:-3000}/login"; then
    echo "==> No ar: $SHA"
    # Mantém as 5 versões mais recentes para rollback.
    ls -1dt "$BASE"/releases/*/ | tail -n +6 | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done

echo "!! O app não respondeu em /login. Veja: journalctl -u spma -n 100" >&2
exit 1
