from datetime import timedelta

import pytest
from django.utils.timezone import now

from apps.core.tasks import prune_lead_history
from apps.crm.models import Lead, Stage


@pytest.mark.django_db
def test_old_revisions_are_removed_but_the_lead_keeps_its_origin(settings):
    settings.HISTORY_RETENTION_DAYS = 30
    stage = Stage.objects.create(name="Новый")
    lead = Lead.objects.create(name="ООО Ромашка", inn="7707083893", stage=stage)
    lead.name = "ООО Ромашка (переименован)"
    lead.save()

    # Age everything past the window.
    Lead.history.update(history_date=now() - timedelta(days=90))

    result = prune_lead_history()

    remaining = Lead.history.filter(id=lead.id)
    assert remaining.count() == 1
    assert remaining.first().history_type == "+", "creation record must survive"
    assert "removed" in result


@pytest.mark.django_db
def test_recent_revisions_are_kept(settings):
    settings.HISTORY_RETENTION_DAYS = 30
    stage = Stage.objects.create(name="Новый")
    lead = Lead.objects.create(name="ООО Ромашка", inn="7707083893", stage=stage)
    lead.name = "Новое имя"
    lead.save()

    prune_lead_history()

    assert Lead.history.filter(id=lead.id).count() == 2
