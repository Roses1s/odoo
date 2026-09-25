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

echo "==> ждём readiness backend (до ~90 с)"
BACKEND_READY=0
for i in $(seq 1 18); do
  if "${COMPOSE[@]}" exec -T backend python -c \
    "import json, urllib.request; req=urllib.request.Request('http://127.0.0.1:8000/api/health/', headers={'X-Forwarded-Proto': 'https'}); r=urllib.request.urlopen(req, timeout=3); data=json.load(r); raise SystemExit(0 if r.status == 200 and data.get('status') == 'ok' else 1)" \
    2>/dev/null; then
    echo "    backend и БД готовы"
    BACKEND_READY=1
    break
  fi
  sleep 5
done

if [[ "$BACKEND_READY" -ne 1 ]]; then
  echo "ОШИБКА: backend не прошёл readiness. Релиз не завершён." >&2
  "${COMPOSE[@]}" ps >&2 || true
  "${COMPOSE[@]}" logs --tail 40 backend >&2 || true
  exit 1
fi

# Nginx resolves Docker upstream addresses only at startup. Recreate it after a
# successful backend readiness check to avoid a stale upstream and false 502.
"${COMPOSE[@]}" up -d --no-deps --force-recreate nginx
"${COMPOSE[@]}" ps

echo
echo "Готово: https://crmdetroid.ru"
echo "Логи: ${COMPOSE[*]} logs --tail 40 backend"
