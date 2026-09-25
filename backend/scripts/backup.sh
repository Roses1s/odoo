#!/bin/bash
set -euo pipefail
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
FILENAME="crm_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

pg_dump -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-crm_user}" -d "${POSTGRES_DB:-crm_db}" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

find "$BACKUP_DIR" -name "crm_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Backup created: ${FILENAME}"
