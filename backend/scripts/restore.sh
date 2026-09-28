#!/bin/bash
# Restores a database dump and, if asked, the attachments archive.
#
# A backup nobody has restored is a hope, not a copy. Run this against a spare
# database at least once so the procedure is known to work before it is needed
# in anger.
#
#   docker compose exec -T backend /app/scripts/restore.sh crm_db_20260928_030000.sql.gz
#   docker compose exec -T backend /app/scripts/restore.sh --into crm_restore_test crm_db_...sql.gz
#   docker compose exec -T backend /app/scripts/restore.sh --with-media crm_db_...sql.gz
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
MEDIA_DIR="${MEDIA_DIR:-/app/media}"
TARGET_DB="${POSTGRES_DB:-crm_db}"
WITH_MEDIA=0

usage() {
  cat <<USAGE
Использование: restore.sh [--into БАЗА] [--with-media] ФАЙЛ.sql.gz

  --into БАЗА     восстановить в другую базу (безопасная репетиция)
  --with-media    также распаковать архив вложений с тем же временем в имени
USAGE
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --into) TARGET_DB="$2"; shift 2 ;;
    --with-media) WITH_MEDIA=1; shift ;;
    -h|--help) usage ;;
    *) DUMP="$1"; shift ;;
  esac
done

[[ -n "${DUMP:-}" ]] || usage
[[ "$DUMP" = /* ]] || DUMP="${BACKUP_DIR}/${DUMP}"
[[ -f "$DUMP" ]] || { echo "Нет файла: $DUMP" >&2; exit 1; }

if [[ -f "${DUMP}.sha256" ]]; then
  echo "==> проверка контрольной суммы"
  (cd "$(dirname "$DUMP")" && sha256sum -c "$(basename "$DUMP").sha256")
else
  echo "!! контрольной суммы рядом нет, продолжаю без проверки" >&2
fi

echo "==> проверка целостности архива"
gzip -t "$DUMP"

export PGPASSWORD="${POSTGRES_PASSWORD:-}"
PSQL=(psql -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-crm_user}" -v ON_ERROR_STOP=1)

if [[ "$TARGET_DB" == "${POSTGRES_DB:-crm_db}" ]]; then
  echo
  echo "ВНИМАНИЕ: данные базы «$TARGET_DB» будут заменены содержимым дампа."
  read -r -p "Введите имя базы для подтверждения: " confirm
  [[ "$confirm" == "$TARGET_DB" ]] || { echo "Отменено."; exit 1; }
else
  echo "==> создаю базу для репетиции: $TARGET_DB"
  "${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";"
  "${PSQL[@]}" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";"
fi

echo "==> восстановление в $TARGET_DB"
gunzip -c "$DUMP" | "${PSQL[@]}" -d "$TARGET_DB" >/dev/null

if [[ "$WITH_MEDIA" -eq 1 ]]; then
  stamp="$(basename "$DUMP" | sed -E 's/^crm_db_(.*)\.sql\.gz$/\1/')"
  archive="${BACKUP_DIR}/crm_media_${stamp}.tar.gz"
  if [[ -f "$archive" ]]; then
    echo "==> распаковка вложений из $(basename "$archive")"
    mkdir -p "$MEDIA_DIR"
    tar -xzf "$archive" -C "$MEDIA_DIR"
  else
    echo "!! архива вложений за $stamp нет" >&2
  fi
fi

echo "Готово. Восстановлено в базу «$TARGET_DB»."
echo "Проверьте: docker compose exec -T backend python manage.py shell -c \\"
echo "  \"from apps.crm.models import Lead; print(Lead.objects.count())\""
