#!/usr/bin/env bash
# Backup diário do banco. Roda como root pelo cron (ver
# docs/DEPLOY_PRODUCAO.md); credenciais em /root/.my.cnf (chmod 600), com o
# usuário `spma` do app - não o root do MySQL: o backup só precisa ler o banco
# do sistema. `--no-tablespaces` dispensa o privilégio global PROCESS, que esse
# usuário não tem (sem a flag o mysqldump aborta com "Access denied").
# Mantém 14 dias LOCAIS - copie para fora da VPS também: backup que mora no
# mesmo disco do banco morre junto com ele.
set -euo pipefail

DESTINO=/opt/spma/backups
ARQUIVO="$DESTINO/spma-$(date +%F_%H%M).sql.gz"

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
mysqldump --single-transaction --routines --triggers --no-tablespaces spma | gzip > "$ARQUIVO"
find "$DESTINO" -name 'spma-*.sql.gz' -mtime +14 -delete
