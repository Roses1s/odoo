#!/bin/bash
# Выкат:  sudo -iu deploy /opt/crm/deploy.sh
#         sudo -iu deploy /opt/crm/deploy.sh arena/01a0d6dd-odoo
set -euo pipefail

ROOT="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$ROOT"

BRANCH="${1:-${DEPLOY_BRANCH:-arena/01a0d6dd-odoo}}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

echo "==> $(whoami) @ $ROOT"
echo "==> ветка: $BRANCH"

if [[ ! -f .env ]]; then
  echo "Нет $ROOT/.env — секреты не трогаем, файл должен существовать."
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "Нет git-репозитория в $ROOT"
  exit 1
fi

ENV_BAK="$(mktemp /tmp/crm.env.XXXXXX)"
cp -a .env "$ENV_BAK"
trap 'cp -a "$ENV_BAK" "$ROOT/.env"; rm -f "$ENV_BAK"' EXIT

echo "==> git fetch + reset --hard origin/$BRANCH"
git fetch origin
git reset --hard "origin/${BRANCH}"
git checkout -B "$BRANCH" "origin/${BRANCH}" >/dev/null

cp -a "$ENV_BAK" .env

echo "==> docker compose up --build"
"${COMPOSE[@]}" up -d --build

echo "==> ждём backend (до ~90 с)"
for i in $(seq 1 18); do
  if "${COMPOSE[@]}" exec -T backend python -c "import socket; socket.create_connection(('127.0.0.1', 8000), 2).close()" 2>/dev/null; then
    echo "    backend отвечает"
    break
  fi
  sleep 5
  if [[ "$i" -eq 18 ]]; then
    echo "    backend не ответил, перезапуск nginx всё равно"
  fi
done

"${COMPOSE[@]}" up -d --no-deps nginx || true
"${COMPOSE[@]}" ps

echo
echo "Готово: https://crmdetroid.ru"
echo "Логи: ${COMPOSE[*]} logs --tail 40 backend"
