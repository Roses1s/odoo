from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Case, IntegerField, Value, When
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.tasks import daily_backup
from apps.crm.models import Lead, Stage
from apps.shipments.models import Shipment
from apps.users.permissions import IsAdmin, IsManagerOrAbove

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_staff",
            "password",
        )

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "Укажите пароль"})
        user = User.objects.create_user(password=password, **validated_data)
        if user.role == User.Role.ADMIN:
            user.is_staff = True
            user.save(update_fields=["is_staff"])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = (
        User.objects.annotate(
            role_order=Case(
                When(role="admin", then=Value(0)),
                When(role="manager", then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        ).order_by("role_order", "id")
    )
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    search_fields = ("email", "first_name", "last_name")
    filterset_fields = ("role", "is_active")

    def perform_update(self, serializer):
        role = serializer.validated_data.get("role", serializer.instance.role)
        extra = {}
        if role == User.Role.ADMIN:
            extra["is_staff"] = True
        serializer.save(**extra)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {"detail": "Нельзя удалить собственный аккаунт"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.role == User.Role.ADMIN:
            admins = User.objects.filter(role=User.Role.ADMIN, is_active=True).count()
            if admins <= 1:
                return Response(
                    {"detail": "Нельзя удалить последнего администратора"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().destroy(request, *args, **kwargs)


class StatsView(APIView):
    permission_classes = [IsManagerOrAbove]

    def get(self, request):
        funnel = []
        for stage in Stage.objects.all():
            qs = Lead.objects.filter(stage=stage, is_archived=False)
            funnel.append(
                {
                    "id": stage.id,
                    "name": stage.name,
                    "color": stage.color,
                    "count": qs.count(),
                    "revenue": float(sum(qs.values_list("expected_revenue", flat=True))),
                }
            )
        return Response(
            {
                "leads_total": Lead.objects.filter(is_archived=False).count(),
                "leads_archived": Lead.objects.filter(is_archived=True).count(),
                "shipments_total": Shipment.objects.count(),
                "users_total": User.objects.count(),
                "funnel": funnel,
            }
        )


class LoginAttemptsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            from axes.models import AccessAttempt
        except Exception:
            return Response({"results": []})
        qs = AccessAttempt.objects.all().order_by("-attempt_time")
        ip = request.query_params.get("ip")
        username = request.query_params.get("username")
        if ip:
            qs = qs.filter(ip_address=ip)
        if username:
            qs = qs.filter(username__icontains=username)
        data = [
            {
                "id": a.id,
                "username": a.username,
                "ip_address": str(a.ip_address),
                "attempt_time": a.attempt_time,
                "failures": a.failures_since_start,
            }
            for a in qs[:200]
        ]
        return Response({"results": data})


class BackupRunView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        result = daily_backup.delay()
        return Response({"task_id": result.id}, status=status.HTTP_202_ACCEPTED)


class BackupListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        directory = Path(getattr(settings, "BACKUP_DIR", "/backups"))
        if not directory.exists():
            return Response({"results": []})
        files = sorted(directory.glob("crm_db_*.sql.gz"), reverse=True)
        results = [
            {
                "name": f.name,
                "size": f.stat().st_size,
                "mtime": f.stat().st_mtime,
            }
            for f in files
        ]
        return Response({"results": results})
