#!/bin/bash
set -euo pipefail
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
FILENAME="crm_db_${TIMESTAMP}.sql.gz"
TMP_FILENAME=".${FILENAME}.tmp"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MEDIA_DIR="${MEDIA_DIR:-/app/media}"
MEDIA_FILENAME="crm_media_${TIMESTAMP}.tar.gz"
MEDIA_TMP=".${MEDIA_FILENAME}.tmp"

mkdir -p "$BACKUP_DIR"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"
trap 'rm -f "$BACKUP_DIR/$TMP_FILENAME" "$BACKUP_DIR/$MEDIA_TMP"' EXIT

# Write atomically: an interrupted pg_dump must never look like a valid backup.
pg_dump -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-crm_user}" -d "${POSTGRES_DB:-crm_db}" \
  | gzip > "${BACKUP_DIR}/${TMP_FILENAME}"

gzip -t "${BACKUP_DIR}/${TMP_FILENAME}"
mv "${BACKUP_DIR}/${TMP_FILENAME}" "${BACKUP_DIR}/${FILENAME}"
sha256sum "${BACKUP_DIR}/${FILENAME}" > "${BACKUP_DIR}/${FILENAME}.sha256"

# Lead attachments live on a docker volume, not in the database, so the dump
# alone would not restore them. Archive them next to it, same retention.
if [[ -d "$MEDIA_DIR" ]] && [[ -n "$(find "$MEDIA_DIR" -type f -print -quit)" ]]; then
  tar -czf "${BACKUP_DIR}/${MEDIA_TMP}" -C "$MEDIA_DIR" .
  gzip -t "${BACKUP_DIR}/${MEDIA_TMP}"
  mv "${BACKUP_DIR}/${MEDIA_TMP}" "${BACKUP_DIR}/${MEDIA_FILENAME}"
  sha256sum "${BACKUP_DIR}/${MEDIA_FILENAME}" > "${BACKUP_DIR}/${MEDIA_FILENAME}.sha256"
  MEDIA_RESULT="${MEDIA_FILENAME}"
else
  MEDIA_RESULT="no attachments to archive"
fi

find "$BACKUP_DIR" -name "crm_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "crm_db_*.sql.gz.sha256" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "crm_media_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "crm_media_*.tar.gz.sha256" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created and verified: ${FILENAME}; attachments: ${MEDIA_RESULT}"
