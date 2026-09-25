import django_filters

from apps.crm.models import Lead


class LeadFilter(django_filters.FilterSet):
    stage = django_filters.NumberFilter(field_name="stage_id")
    priority = django_filters.NumberFilter()
    tags = django_filters.NumberFilter(field_name="tags__id")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    created_after = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.IsoDateTimeFilter(field_name="created_at", lookup_expr="lte")
    is_archived = django_filters.BooleanFilter()

    class Meta:
        model = Lead
        fields = ("stage", "priority", "tags", "assigned_to", "is_archived")
