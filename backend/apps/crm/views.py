from django.db import transaction
from django.db.models import Count, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from apps.crm.filters import LeadFilter
from apps.crm.models import Lead, Note, Stage, Tag
from apps.crm.notes import NoteSerializer
from apps.crm.serializers import (
    LeadSerializer,
    StageReorderSerializer,
    StageSerializer,
    TagSerializer,
)
from apps.users.permissions import IsLeadOwnerOrManager, IsManagerOrAbove, IsManagerOrReadOnly


class StageViewSet(viewsets.ModelViewSet):
    serializer_class = StageSerializer
    queryset = Stage.objects.all()

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsManagerOrAbove()]

    def get_queryset(self):
        return Stage.objects.annotate(
            leads_count=Count("leads"),
            revenue_sum=Sum("leads__expected_revenue"),
        ).order_by("sequence", "id")

    def destroy(self, request, *args, **kwargs):
        stage = self.get_object()
        fallback_id = request.query_params.get("fallback_stage_id")
        leads_count = stage.leads.count()
        if leads_count and not fallback_id:
            return Response(
                {
                    "detail": "Укажите fallback_stage_id для переноса лидов",
                    "leads_count": leads_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            if fallback_id:
                if str(stage.pk) == str(fallback_id):
                    return Response(
                        {"detail": "Нельзя перенести на тот же этап"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    fallback = Stage.objects.get(pk=fallback_id)
                except Stage.DoesNotExist:
                    return Response(
                        {"detail": "Этап для переноса не найден"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                stage.leads.update(stage=fallback)
            stage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["patch"], url_path="reorder")
    def reorder(self, request):
        ser = StageReorderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["ids"]
        with transaction.atomic():
            for index, pk in enumerate(ids, start=1):
                Stage.objects.filter(pk=pk).update(sequence=index * 10)
        return Response(StageSerializer(self.get_queryset(), many=True).data)


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    queryset = Tag.objects.all()
    permission_classes = [IsManagerOrReadOnly]


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    filterset_class = LeadFilter
    permission_classes = [IsAuthenticated, IsLeadOwnerOrManager]
    ordering_fields = ("created_at", "priority", "expected_revenue", "name")
    queryset = Lead.objects.select_related("stage", "assigned_to").prefetch_related("tags")

    def get_queryset(self):
        qs = Lead.objects.select_related("stage", "assigned_to", "created_by").prefetch_related("tags")
        user = self.request.user
        if user.role == "operator":
            # Assignment is the source of truth for current access. created_by is
            # audit metadata and must not retain access after reassignment.
            qs = qs.filter(assigned_to=user)
        if self.request.query_params.get("is_archived") is None:
            qs = qs.filter(is_archived=False)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(inn__icontains=search)
                | Q(logist_email__icontains=search)
                | Q(logist_contact__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        assigned = serializer.validated_data.get("assigned_to") or user
        serializer.save(assigned_to=assigned, created_by=user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ("admin", "manager"):
            return Response(status=status.HTTP_403_FORBIDDEN)
        lead = self.get_object()
        lead.is_archived = True
        lead.save(update_fields=["is_archived"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        lead = self.get_object()
        entries: list[dict] = []
        for note in lead.notes.select_related("author").all():
            entries.append(
                {
                    "id": f"note-{note.id}",
                    "type": "note",
                    "author_name": NoteSerializer().get_author_name(note),
                    "author_initials": NoteSerializer().get_author_initials(note),
                    "body": note.body,
                    "created_at": note.created_at,
                }
            )
        stage_names = dict(Stage.objects.values_list("id", "name"))
        for hist in lead.history.all()[:100]:
            body = "Запись создана" if hist.history_type == "+" else "Изменение лида"
            if hist.history_type == "~":
                prev = getattr(hist, "prev_record", None)
                if prev and prev.stage_id != hist.stage_id:
                    a = stage_names.get(prev.stage_id, str(prev.stage_id))
                    b = stage_names.get(hist.stage_id, str(hist.stage_id))
                    body = f"Сменил этап: {a} → {b}"
            user = hist.history_user
            name = ""
            initials = "SY"
            if user:
                name = f"{user.first_name} {user.last_name}".strip() or user.email
                initials = (user.first_name[:1] + user.last_name[:1]).upper() or user.email[:2].upper()
            entries.append(
                {
                    "id": f"hist-{hist.history_id}",
                    "type": "history",
                    "author_name": name or "Система",
                    "author_initials": initials,
                    "body": body,
                    "created_at": hist.history_date,
                }
            )
        entries.sort(key=lambda e: e["created_at"], reverse=True)
        return Response(entries)

    @action(detail=True, methods=["post"], url_path="notes")
    def add_note(self, request, pk=None):
        lead = self.get_object()
        ser = NoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        note = Note.objects.create(lead=lead, author=request.user, body=ser.validated_data["body"])
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)
