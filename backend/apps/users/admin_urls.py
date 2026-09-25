from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.admin_api import (
    AdminUserViewSet,
    BackupListView,
    BackupRunView,
    LoginAttemptsView,
    StatsView,
)

router = DefaultRouter()
router.register("users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    path("", include(router.urls)),
    path("stats/", StatsView.as_view(), name="admin-stats"),
    path("login-attempts/", LoginAttemptsView.as_view(), name="admin-login-attempts"),
    path("backup/", BackupRunView.as_view(), name="admin-backup-run"),
    path("backups/", BackupListView.as_view(), name="admin-backups"),
]
