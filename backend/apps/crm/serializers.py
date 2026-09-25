from rest_framework import serializers

from apps.core.fields import MaskedEmailField, MaskedINNField, MaskedPhoneField
from apps.core.validators import normalize_phone, validate_inn
from apps.crm.models import Lead, Stage, Tag


class StageSerializer(serializers.ModelSerializer):
    leads_count = serializers.IntegerField(read_only=True, required=False)
    revenue_sum = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, required=False
    )

    class Meta:
        model = Stage
        fields = (
            "id",
            "name",
            "sequence",
            "is_closed",
            "color",
            "leads_count",
            "revenue_sum",
        )


class StageReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "color")


class LeadSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        source="tags",
        many=True,
        queryset=Tag.objects.all(),
        required=False,
        write_only=True,
    )
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True)

    class Meta:
        model = Lead
        fields = (
            "id",
            "name",
            "inn",
            "logist_email",
            "logist_contact",
            "priority",
            "expected_revenue",
            "stage",
            "stage_name",
            "tags",
            "tag_ids",
            "assigned_to",
            "assigned_to_email",
            "created_by",
            "is_archived",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "is_archived", "created_by")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and getattr(request.user, "role", None) == "operator":
            self.fields["assigned_to"].read_only = True

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or request.user.role in ("admin", "manager"):
            return data
        if instance.assigned_to_id == request.user.id:
            return data
        data["inn"] = MaskedINNField().to_representation(instance.inn)
        data["logist_email"] = MaskedEmailField().to_representation(instance.logist_email or "")
        data["logist_contact"] = MaskedPhoneField().to_representation(instance.logist_contact or "")
        return data

    def validate_inn(self, value: str) -> str:
        return validate_inn(value)

    def validate_logist_contact(self, value: str) -> str:
        if not value:
            return value
        return normalize_phone(value)
