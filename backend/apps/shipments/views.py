from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shipments.models import Carrier, Shipment
from apps.shipments.serializers import (
    CarrierSerializer,
    ShipmentSerializer,
    ShipmentStatusSerializer,
)
from apps.users.permissions import IsLeadOwnerOrManager, IsManagerOrReadOnly


class CarrierViewSet(viewsets.ModelViewSet):
    serializer_class = CarrierSerializer
    permission_classes = [IsManagerOrReadOnly]
    queryset = Carrier.objects.all()
    filterset_fields = ("is_active",)
    search_fields = ("name", "inn")


class ShipmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated, IsLeadOwnerOrManager]
    queryset = Shipment.objects.select_related("lead", "carrier", "created_by")
    filterset_fields = ("status", "carrier", "lead")
    ordering_fields = ("created_at", "status")

    def get_queryset(self):
        qs = Shipment.objects.select_related("lead", "carrier", "created_by")
        user = self.request.user
        if user.role in ("admin", "manager") and self.request.query_params.get("all") == "true":
            return qs
        return qs.filter(created_by=user)

    def perform_create(self, serializer):
        lead = serializer.validated_data["lead"]
        user = self.request.user
        if user.role == "operator" and lead.assigned_to_id != user.id:
            raise serializers.ValidationError({"lead": "Можно создавать заявки только по своим лидам"})
        contact = lead.logist_contact or ""
        extra = {}
        if not serializer.validated_data.get("contact_loading_phone") and contact:
            extra["contact_loading_phone"] = contact
        if not serializer.validated_data.get("contact_loading_name"):
            extra["contact_loading_name"] = lead.name
        serializer.save(created_by=user, **extra)

    @action(detail=True, methods=["patch"], url_path="status")
    def set_status(self, request, pk=None):
        shipment = self.get_object()
        ser = ShipmentStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        old = shipment.status
        shipment.status = ser.validated_data["status"]
        shipment.save(update_fields=["status", "updated_at"])
        data = ShipmentSerializer(shipment, context={"request": request}).data
        data["status_from"] = old
        return Response(data)


class LeadShipmentsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        lead_id = self.kwargs["lead_pk"]
        qs = Shipment.objects.filter(lead_id=lead_id).select_related("lead", "carrier", "created_by")
        user = self.request.user
        if user.role == "operator":
            qs = qs.filter(created_by=user)
        return qs
