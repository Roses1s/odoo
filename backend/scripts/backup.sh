#!/bin/bash
set -euo pipefail
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
FILENAME="crm_db_${TIMESTAMP}.sql.gz"
TMP_FILENAME=".${FILENAME}.tmp"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"
trap 'rm -f "$BACKUP_DIR/$TMP_FILENAME"' EXIT

# Write atomically: an interrupted pg_dump must never look like a valid backup.
pg_dump -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-crm_user}" -d "${POSTGRES_DB:-crm_db}" \
  | gzip > "${BACKUP_DIR}/${TMP_FILENAME}"

gzip -t "${BACKUP_DIR}/${TMP_FILENAME}"
mv "${BACKUP_DIR}/${TMP_FILENAME}" "${BACKUP_DIR}/${FILENAME}"
sha256sum "${BACKUP_DIR}/${FILENAME}" > "${BACKUP_DIR}/${FILENAME}.sha256"

find "$BACKUP_DIR" -name "crm_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "crm_db_*.sql.gz.sha256" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created and verified: ${FILENAME}"
