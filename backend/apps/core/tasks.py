import os
import subprocess

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model


@shared_task
def daily_backup() -> str:
    script = settings.BASE_DIR / "scripts" / "backup.sh"
    env = os.environ.copy()
    env.setdefault("BACKUP_DIR", getattr(settings, "BACKUP_DIR", "/backups"))
    env.setdefault("BACKUP_RETENTION_DAYS", str(getattr(settings, "BACKUP_RETENTION_DAYS", 30)))
    for key in ("POSTGRES_HOST", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"):
        val = os.environ.get(key) or env.get(key)
        if val:
            env[key] = val
    result = subprocess.run(
        [str(script)],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    if result.returncode != 0:
        User = get_user_model()
        from apps.notifications.services import notify

        for admin in User.objects.filter(role="admin", is_active=True):
            notify(admin, "Ошибка бэкапа", result.stderr or "backup failed")
        return f"backup failed: {result.stderr}"
    return result.stdout.strip() or "ok"
