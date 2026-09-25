from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.crm.views import LeadViewSet, StageViewSet, TagViewSet

router = DefaultRouter()
router.register("stages", StageViewSet, basename="crm-stages")
router.register("tags", TagViewSet, basename="crm-tags")
router.register("leads", LeadViewSet, basename="crm-leads")

urlpatterns = [
    path("", include(router.urls)),
]
