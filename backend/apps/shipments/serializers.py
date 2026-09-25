from rest_framework import serializers

from apps.core.fields import MaskedINNField, MaskedPhoneField
from apps.core.validators import normalize_phone
from apps.shipments.models import Carrier, Shipment


class CarrierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrier
        fields = (
            "id",
            "name",
            "inn",
            "contact_name",
            "contact_phone",
            "contact_email",
            "is_active",
            "created_at",
        )
        read_only_fields = ("created_at",)


class ShipmentSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source="lead.name", read_only=True)
    carrier_name = serializers.CharField(source="carrier.name", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    route = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = (
            "id",
            "lead",
            "lead_name",
            "created_by",
            "created_by_email",
            "carrier",
            "carrier_name",
            "status",
            "city_loading",
            "city_unloading",
            "address_loading",
            "address_unloading",
            "contact_loading_name",
            "contact_loading_phone",
            "contact_unloading_name",
            "contact_unloading_phone",
            "transport_type",
            "cargo_weight",
            "cargo_volume",
            "comment",
            "route",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "created_at", "updated_at")

    def get_route(self, obj) -> str:
        return f"{obj.city_loading} → {obj.city_unloading}"

    def validate_contact_loading_phone(self, value: str) -> str:
        return normalize_phone(value) if value else value

    def validate_contact_unloading_phone(self, value: str) -> str:
        return normalize_phone(value) if value else value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or request.user.role in ("admin", "manager"):
            return data
        if instance.created_by_id == request.user.id:
            return data
        data["contact_loading_phone"] = MaskedPhoneField().to_representation(
            instance.contact_loading_phone or ""
        )
        data["contact_unloading_phone"] = MaskedPhoneField().to_representation(
            instance.contact_unloading_phone or ""
        )
        if instance.carrier_id:
            data["carrier_inn"] = MaskedINNField().to_representation(instance.carrier.inn)
        return data


class ShipmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Shipment.Status.choices)
