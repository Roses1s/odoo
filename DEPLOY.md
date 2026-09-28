# Как залить CRM на сервер (по шагам)

Сервер: **77.222.38.191**  
Сайт: **http://crmdetroid.ru**

Нужно: компьютер, логин/пароль (или ключ) от Ubuntu на этом IP.  
Я не могу зайти на сервер сам — у меня нет вашего пароля. Вы выполняете команды **у себя в терминале**.

---

## Шаг А. DNS (домен)

В панели, где куплен домен `crmdetroid.ru`, создайте **A-запись**:

| Имя | Тип | Значение |
|-----|-----|----------|
| `@` | A | `77.222.38.191` |
| `www` | A | `77.222.38.191` |

Подождите 5–30 минут. Проверка: `ping crmdetroid.ru`

---

## Шаг Б. Зайти на сервер

С вашего компьютера (Mac/Linux):

```bash
ssh root@77.222.38.191
```

Windows: программа **PuTTY** → Host `77.222.38.191` → Open.

Если пользователь не `root`, замените: `ssh ubuntu@77.222.38.191`

---

## Шаг В. Установить Docker (один раз)

На сервере скопируйте и выполните:

```bash
apt-get update
apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version
```

Откройте порт 80 (если есть файрвол):

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable || true
```

---

## Шаг Г. Положить проект на сервер

**Вариант 1 — GitHub** (удобнее). С компьютера, где лежит код:

```bash
git add -A
git commit -m "CRM ready for deploy"
git push origin arena/01a0d6dd-odoo
```

На сервере:

```bash
cd /opt
git clone -b arena/01a0d6dd-odoo https://github.com/Roses1s/odoo.git crm
cd /opt/crm
```

**Вариант 2 — без Git.** С вашего ПК (не с сервера), из папки проекта:

```bash
scp -r . root@77.222.38.191:/opt/crm
```

Потом на сервере: `cd /opt/crm`

---

## Шаг Д. Файл `.env` на сервере

```bash
cd /opt/crm
cp .env.example .env
nano .env
```

Проверьте и поправьте (пароль БД лучше сменить):

```env
SECRET_KEY=придумайте-длинный-случайный-ключ-минимум-50-символов
DEBUG=False
ALLOWED_HOSTS=crmdetroid.ru,www.crmdetroid.ru,77.222.38.191,localhost,backend
POSTGRES_PASSWORD=свой_сложный_пароль
DATABASE_URL=postgres://crm_user:свой_сложный_пароль@db:5432/crm_db
CORS_ALLOWED_ORIGINS=http://crmdetroid.ru,http://www.crmdetroid.ru,http://77.222.38.191
CSRF_TRUSTED_ORIGINS=http://crmdetroid.ru,http://www.crmdetroid.ru,http://77.222.38.191
USE_HTTPS=False
DJANGO_SETTINGS_MODULE=config.settings.prod
```

Сохранить в nano: `Ctrl+O`, Enter, `Ctrl+X`.

---

## Шаг Е. Запуск

```bash
cd /opt/crm
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps
docker compose logs -f backend
```

Подождите, пока в логах не будет `Listening at: http://0.0.0.0:8000`. Выход из логов: `Ctrl+C` (контейнеры продолжат работать).

---

## Шаг Ж. Проверка

В браузере:

- http://crmdetroid.ru/login  
- или http://77.222.38.191/login  

Войти под заранее созданным production-администратором. Пароль не хранится в Git
и не должен передаваться в командной строке без безопасного quoting.

Demo seed (`SEED=1`) в production не включать.

---

## Если не открывается

```bash
docker compose ps
docker compose logs nginx
docker compose logs backend
ss -tlnp | grep ':80'
```

Частые причины:

1. DNS ещё не указывает на IP.  
2. Облачный файрвол провайдера не открыл порт **80**.  
3. На сервере уже занят порт 80 другим nginx — остановите: `systemctl stop nginx`.

Перезапуск после правок:

```bash
cd /opt/crm
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## HTTPS (позже, когда будете готовы)

1. Поставить certbot / Caddy на 443.  
2. В `.env`: `USE_HTTPS=True` и `https://` в CORS/CSRF.  
3. Перезапустить compose.

---

## Обновление одной командой

На сервере от root (после настройки пользователя `deploy`):

```bash
sudo -iu deploy /opt/crm/deploy.sh
sudo -iu deploy /opt/crm/deploy.sh arena/01a0d6dd-odoo
```

Скрипт: fetch + `reset --hard` на ветку, **`.env` сохраняет**, `docker compose up -d --build`, ждёт backend, поднимает nginx.

**Один раз** (root):

```bash
bash /opt/crm/scripts/setup-deploy-user.sh
```

Правило: код только через GitHub. На сервере не править файлы руками.

---

## Обновление кода позже

```bash
cd /opt/crm
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```


## Подкачка (обязательно на машине с 2 ГБ)

Один раз под root:

```bash
bash /opt/crm/scripts/setup-swap.sh
```

Скрипт создаёт файл подкачки на 2 ГБ, прописывает его в `/etc/fstab`, чтобы он
пережил перезагрузку, и снижает `vm.swappiness` до 10 — подкачка на SSD
медленная, и обращаться к ней система должна только под настоящим давлением.
Размер меняется переменной: `SWAP_SIZE=4G bash /opt/crm/scripts/setup-swap.sh`.

Запускать повторно безопасно: если подкачка уже включена, скрипт ничего
не трогает. Перезапуск контейнеров не нужен.

Зачем это нужно при заданных лимитах памяти: лимиты защищают от утечки
в одном сервисе, но не от пика. При деплое на той же машине собирается образ
фронтенда и берёт сотни мегабайт поверх работающих контейнеров. Без подкачки
ядро в такой момент убивает процесс, и обычно самый крупный — PostgreSQL.

## Восстановление из резервной копии

Копия, которую ни разу не восстанавливали, — это надежда, а не резервная копия.
Репетицию стоит провести один раз сейчас и повторять после серьёзных изменений схемы.

**Репетиция на отдельной базе — прод не затрагивается:**

```bash
cd /opt/crm
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend \
  /app/scripts/restore.sh --into crm_restore_test crm_db_20260928_030000.sql.gz
```

Скрипт проверит контрольную сумму и целостность архива, создаст базу
`crm_restore_test` и зальёт дамп. Сверить результат:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend \
  psql -h db -U crm_user -d crm_restore_test -c "select count(*) from crm_lead;"
```

**Настоящее восстановление** (по той же команде без `--into`) потребует ввести имя
базы вручную — защита от случайного запуска. Вложения восстанавливаются флагом
`--with-media`: скрипт возьмёт архив с тем же временем в имени.

## Внешний мониторинг

Изнутри системы нельзя сообщить, что система лежит. Нужен наблюдатель снаружи —
подойдёт любой бесплатный сервис проверки доступности (UptimeRobot, Better Stack,
StatusCake и подобные).

### Два адреса, две разные тревоги

| Что проверяем | Адрес | Период | Что значит отказ |
|---|---|---|---|
| Сайт живой | `https://crmdetroid.ru/api/health/` | 1–5 минут | приложение или база недоступны — чинить немедленно |
| Бэкапы идут | `https://crmdetroid.ru/api/health/?deep=1&token=ТОКЕН` | 30–60 минут | последней копии больше 25 часов — ночная задача не отработала |

Разделение важно: если повесить один монитор, письмо «сайт недоступен» будет
приходить и когда сайт работает, но просто устарел бэкап. Реагировать на такие
письма перестают через неделю.

Ответ первого адреса — `{"status": "ok", "db": "ok"}`, код 200.
Второй добавляет `backup_age_hours` и `backup_ok`, а при устаревшей копии
отвечает **503**, что для монитора и есть сигнал.

### Токен

Подробный ответ показывает, как часто снимаются копии, поэтому его стоит
закрыть. В `.env` на сервере:

```
HEALTH_TOKEN=придумайте-длинную-строку
```

После перезапуска backend адрес без токена начнёт отвечать 403, а проверка
живости останется открытой — она нужна healthcheck самого контейнера, где
токена нет. Если переменную не задавать, подробный ответ остаётся публичным.

### Настройка монитора

1. Тип проверки — HTTP(S), метод GET.
2. Условие тревоги — код ответа отличается от 200.
3. Если сервис умеет искать текст в ответе, добавьте проверку на `"backup_ok": true`
   — сработает, даже если код ответа однажды перестанет меняться.
4. Канал уведомлений — почта или мессенджер, но не тот, что крутится на этом же
   сервере.
