#!/usr/bin/env bash
# Sao lưu database và ảnh người dùng tải lên. Giữ lại các bản trong KEEP_DAYS ngày gần nhất.
# Dùng: ./deploy/backup.sh            (chạy tay)
#       crontab: 0 3 * * * cd /home/azureuser/exhitibtion-diary-platform && ./deploy/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

# Database: định dạng custom của pg_dump, khôi phục bằng pg_restore
$COMPOSE exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_DIR/db-$STAMP.dump"

# Ảnh tải lên: đọc thẳng volume uploads qua container backend
$COMPOSE exec -T backend tar -czf - -C /app uploads > "$BACKUP_DIR/uploads-$STAMP.tar.gz"

find "$BACKUP_DIR" -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Is)] Backup xong: db-$STAMP.dump, uploads-$STAMP.tar.gz"
