# CRM (Django + React), визуальный стиль Odoo 19

Монорепозиторий: воронка лидов, заявки на перевозку, launcher, админка.

**Прод (позже):** IP `77.222.38.191`, сайт [crmdetroid.ru](http://crmdetroid.ru) — см. `DEPLOY.md`.

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Python 3.12 · Django 5.2 · DRF · Celery · SimpleJWT |
| DB | PostgreSQL 16 · Redis 7 |
| Frontend | React 19 · Vite · Tailwind · Zustand · TanStack Query |
| Infra | Docker Compose · Gunicorn · Nginx |

## Быстрый старт

```bash
cp .env.example .env
docker compose up --build
```

- UI: http://localhost/
- API docs: http://localhost/api/docs/
- Django admin: http://localhost/django-admin/

Миграции и seed выполняются в `backend/entrypoint.sh`.

### Демо-пользователи

| Email | Пароль | Роль |
|--------|--------|------|
| admin@crm.local | Admin123! | admin |
| manager@crm.local | Manager123! | manager |
| operator@crm.local | Operator123! | operator |

Локально без Docker:

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py seed_all
python manage.py runserver 0.0.0.0:8000

# frontend
cd frontend
npm install
npm run dev
```

## API (кратко)

- `POST /api/auth/login/` — JWT, refresh в httpOnly cookie
- `GET /api/launcher/apps/`
- `GET/POST /api/crm/stages/`, `PATCH /api/crm/stages/reorder/`
- `GET/POST /api/crm/leads/` — фильтры, FTS, маскирование для operator
- `GET /api/crm/leads/{id}/timeline/`, `POST .../notes/`
- `GET/POST /api/shipments/`, `PATCH /api/shipments/{id}/status/`
- `GET /api/notifications/`
- `GET /api/admin/stats/`, `GET /api/admin/login-attempts/`, `POST /api/admin/backup/`

## Тесты

```bash
cd backend && pytest
cd frontend && npm test
cd e2e && npx playwright test
```

## Структура

```
backend/apps/{users,core,launcher,crm,shipments,notifications}
frontend/src/{app,features,shared}
nginx/default.conf
docker-compose.yml
```
