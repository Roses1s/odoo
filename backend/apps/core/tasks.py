import os
import subprocess
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import now


@shared_task
def daily_backup() -> str:
    script = settings.BASE_DIR / "scripts" / "backup.sh"
    env = os.environ.copy()
    env.setdefault("BACKUP_DIR", getattr(settings, "BACKUP_DIR", "/backups"))
    env.setdefault("BACKUP_RETENTION_DAYS", str(getattr(settings, "BACKUP_RETENTION_DAYS", 30)))
    env.setdefault("MEDIA_DIR", str(getattr(settings, "MEDIA_ROOT", "/app/media")))
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
            notify(admin, "Ошибка бэкапа", "Резервная копия не создана. Проверьте журнал Celery.")
        # Celery monitoring and retries must see a failed task, not a successful
        # result containing an error string. Keep stderr in worker logs only.
        raise RuntimeError(f"backup failed: {result.stderr.strip() or 'unknown error'}")
    return result.stdout.strip() or "ok"


@shared_task
def prune_lead_history() -> str:
    """Drop lead revisions older than the retention window.

    simple_history writes a full copy of a lead on every save, so the history
    table outgrows the data it describes. The chatter only ever shows the
    recent entries, and the creation record is kept so a lead never looks like
    it appeared out of nowhere.
    """
    from apps.crm.models import Lead

    days = int(getattr(settings, "HISTORY_RETENTION_DAYS", 365))
    cutoff = now() - timedelta(days=days)
    stale = Lead.history.filter(history_date__lt=cutoff).exclude(history_type="+")
    removed, _ = stale.delete()
    return f"removed {removed} lead history rows older than {days} days"
