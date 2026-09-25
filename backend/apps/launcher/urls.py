from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.launcher.views import AppViewSet

router = DefaultRouter()
router.register("apps", AppViewSet, basename="launcher-apps")

urlpatterns = [
    path("", include(router.urls)),
]
