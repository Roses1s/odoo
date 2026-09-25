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
