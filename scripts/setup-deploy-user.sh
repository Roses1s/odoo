#!/bin/bash
# Один раз под root:
#   bash /opt/crm/scripts/setup-deploy-user.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/crm}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запускайте от root"
  exit 1
fi

if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd --system --create-home --shell /bin/bash "$DEPLOY_USER"
  echo "создан пользователь $DEPLOY_USER"
else
  echo "пользователь $DEPLOY_USER уже есть"
fi

if getent group docker >/dev/null; then
  usermod -aG docker "$DEPLOY_USER"
fi

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
chmod +x "$APP_DIR/deploy.sh"

echo
echo "Готово. Дальше выкат:"
echo "  sudo -iu $DEPLOY_USER $APP_DIR/deploy.sh"
echo "  sudo -iu $DEPLOY_USER $APP_DIR/deploy.sh arena/01a0d6dd-odoo"
