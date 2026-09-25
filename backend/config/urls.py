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


def health(_request):
    from django.db import connection

    try:
        connection.ensure_connection()
        db = "ok"
    except Exception as exc:  # noqa: BLE001
        return JsonResponse({"status": "degraded", "db": str(exc)}, status=503)
    return JsonResponse({"status": "ok", "db": db})


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
        path("api/schema/", SpectacularAPIView.as_view(permission_classes=[IsAdmin]), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAdmin]), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema", permission_classes=[IsAdmin]), name="redoc"),
    ]
