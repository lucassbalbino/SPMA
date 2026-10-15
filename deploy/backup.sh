#!/usr/bin/env bash
# Backup diário do banco. Roda como root pelo cron (ver
# docs/DEPLOY_PRODUCAO.md); credenciais em /root/.my.cnf (chmod 600).
# Mantém 14 dias LOCAIS - copie para fora da VPS também: backup que mora no
# mesmo disco do banco morre junto com ele.
set -euo pipefail

DESTINO=/opt/spma/backups
ARQUIVO="$DESTINO/spma-$(date +%F_%H%M).sql.gz"

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
mysqldump --single-transaction --routines --triggers spma | gzip > "$ARQUIVO"
find "$DESTINO" -name 'spma-*.sql.gz' -mtime +14 -delete
