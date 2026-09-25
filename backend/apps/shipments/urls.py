from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.shipments.views import CarrierViewSet, LeadShipmentsViewSet, ShipmentViewSet

router = DefaultRouter()
router.register("shipments", ShipmentViewSet, basename="shipments")
router.register("carriers", CarrierViewSet, basename="carriers")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "leads/<int:lead_pk>/shipments/",
        LeadShipmentsViewSet.as_view({"get": "list"}),
        name="lead-shipments",
    ),
]
