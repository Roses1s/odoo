import logging

from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.users.permissions import IsAdmin

logger = logging.getLogger(__name__)


def health(request):
    """Liveness probe, and with ?deep=1 something an external monitor can poll.

    The deep variant reports how old the newest database dump is. A monitor
    that only checks whether the site answers will never notice that backups
    stopped a week ago — and nothing inside a dead container can report on
    itself either.
    """
    from django.db import connection

    try:
        connection.ensure_connection()
        db = "ok"
    except Exception:  # noqa: BLE001
        logger.exception("Health check database probe failed")
        return JsonResponse({"status": "degraded", "db": "unavailable"}, status=503)

    if request.GET.get("deep") != "1":
        return JsonResponse({"status": "ok", "db": db})

    from datetime import UTC, datetime
    from pathlib import Path

    directory = Path(getattr(settings, "BACKUP_DIR", "/backups"))
    dumps = sorted(directory.glob("crm_db_*.sql.gz")) if directory.exists() else []
    newest = max((f.stat().st_mtime for f in dumps), default=None)
    age_hours = (
        (datetime.now(tz=UTC) - datetime.fromtimestamp(newest, tz=UTC)).total_seconds() / 3600
        if newest
        else None
    )
    backup_ok = age_hours is not None and age_hours <= 25

    payload = {
        "status": "ok" if backup_ok else "degraded",
        "db": db,
        "backup_age_hours": round(age_hours, 1) if age_hours is not None else None,
        "backup_ok": backup_ok,
    }
    return JsonResponse(payload, status=200 if backup_ok else 503)


urlpatterns = [
    path("api/health/", health),
    path("api/auth/", include("apps.users.urls")),
    path("api/launcher/", include("apps.launcher.urls")),
    path("api/crm/", include("apps.crm.urls")),
    path("api/", include("apps.shipments.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/admin/", include("apps.users.admin_urls")),
]

if getattr(settings, "EXPOSE_DJANGO_ADMIN", settings.DEBUG):
    urlpatterns = [path("django-admin/", admin.site.urls), *urlpatterns]

if getattr(settings, "EXPOSE_API_DOCS", settings.DEBUG):
    urlpatterns += [
        path(
            "api/schema/",
            SpectacularAPIView.as_view(permission_classes=[IsAdmin]),
            name="schema",
        ),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAdmin]),
            name="swagger-ui",
        ),
        path(
            "api/redoc/",
            SpectacularRedocView.as_view(url_name="schema", permission_classes=[IsAdmin]),
            name="redoc",
        ),
    ]
