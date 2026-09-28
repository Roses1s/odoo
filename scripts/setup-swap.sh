#!/bin/bash
# Один раз под root:
#   bash /opt/crm/scripts/setup-swap.sh
#   SWAP_SIZE=4G bash /opt/crm/scripts/setup-swap.sh
#
# Зачем: на машине 2 ГБ памяти и нет подкачки. Лимиты контейнеров спасают от
# утечки в одном сервисе, но не от пика — при деплое на этой же машине
# собирается образ фронтенда и берёт сотни мегабайт поверх работающих
# контейнеров. Без подкачки ядро в такой момент просто убивает процесс,
# и чаще всего самый крупный, то есть PostgreSQL.
#
# Скрипт можно запускать повторно: если подкачка уже включена, он ничего
# не трогает. Перезапуск сервисов не требуется.
set -euo pipefail

SWAP_FILE="${SWAP_FILE:-/swapfile}"
SWAP_SIZE="${SWAP_SIZE:-2G}"
SWAPPINESS="${SWAPPINESS:-10}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запускайте от root" >&2
  exit 1
fi

if swapon --show --noheadings | grep -q .; then
  echo "Подкачка уже включена:"
  swapon --show
  echo
  echo "Ничего не меняю. Чтобы пересоздать, сначала: swapoff -a"
  exit 0
fi

# Подкачка должна поместиться на диск, иначе файл останется обрезанным.
need_mb=$(numfmt --from=iec "$SWAP_SIZE" | awk '{print int($1/1024/1024)}')
free_mb=$(df -Pm "$(dirname "$SWAP_FILE")" | awk 'NR==2 {print $4}')
if (( free_mb < need_mb + 512 )); then
  echo "Мало места: свободно ${free_mb} МБ, нужно ${need_mb} МБ плюс запас" >&2
  exit 1
fi

if [[ -e "$SWAP_FILE" ]]; then
  echo "Файл $SWAP_FILE уже существует, но не подключён — удаляю и создаю заново"
  rm -f "$SWAP_FILE"
fi

echo "==> создаю $SWAP_FILE на $SWAP_SIZE"
# fallocate мгновенный, но на некоторых файловых системах для подкачки
# не годится; dd медленнее, зато работает везде.
if ! fallocate -l "$SWAP_SIZE" "$SWAP_FILE" 2>/dev/null; then
  echo "    fallocate недоступен, заполняю через dd (займёт минуту)"
  dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$need_mb" status=none
fi

chmod 600 "$SWAP_FILE"
mkswap "$SWAP_FILE" >/dev/null
swapon "$SWAP_FILE"

if ! grep -qs "^${SWAP_FILE}[[:space:]]" /etc/fstab; then
  echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
  echo "==> запись в /etc/fstab добавлена, подкачка переживёт перезагрузку"
fi

# Подкачка на SSD медленная: пусть система обращается к ней только под
# настоящим давлением, а не ради освобождения кеша.
sysctl -q -w "vm.swappiness=${SWAPPINESS}"
if ! grep -qs "^vm.swappiness" /etc/sysctl.d/99-crm-swap.conf 2>/dev/null; then
  echo "vm.swappiness=${SWAPPINESS}" > /etc/sysctl.d/99-crm-swap.conf
fi

echo
echo "Готово."
swapon --show
free -m
