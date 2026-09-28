"""The chatter feed must cost the same whether a lead has three changes or fifty.

It used to ask simple_history for `prev_record` per row, which is one query
each, so opening a busy lead hit the database a hundred times.
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.crm.models import Lead, Note, Stage

User = get_user_model()

# Valid tax-office checksums; the model refuses a second active lead per INN.
INN = ["7707083893", "7700000009", "7700000016"]


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def manager(db):
    return User.objects.create_user(email="mgr@t.local", password="x", role="manager")


@pytest.fixture
def stages(db):
    return [Stage.objects.create(name=f"Этап {i}", sequence=i) for i in range(3)]


def lead_with_history(stages, inn: str, changes: int) -> Lead:
    lead = Lead.objects.create(name="ООО Ромашка", inn=inn, stage=stages[0])
    for i in range(changes):
        lead.stage = stages[(i + 1) % len(stages)]
        lead.save()
    return lead


@pytest.mark.django_db
def test_timeline_query_count_does_not_grow_with_history(api, manager, stages):
    api.force_authenticate(manager)
    short = lead_with_history(stages, INN[0], changes=3)
    long = lead_with_history(stages, INN[1], changes=25)

    with CaptureQueriesContext(connection) as short_queries:
        assert api.get(f"/api/crm/leads/{short.id}/timeline/").status_code == 200

    with CaptureQueriesContext(connection) as long_queries:
        assert api.get(f"/api/crm/leads/{long.id}/timeline/").status_code == 200

    assert len(long_queries) == len(short_queries), (
        f"{len(short_queries)} queries for 3 changes, "
        f"{len(long_queries)} for 25 — the count must not depend on history size"
    )


@pytest.mark.django_db
def test_timeline_reports_what_changed(api, manager, stages):
    api.force_authenticate(manager)
    lead = lead_with_history(stages, INN[0], changes=2)

    res = api.get(f"/api/crm/leads/{lead.id}/timeline/")

    assert res.status_code == 200
    tracked = [row for row in res.data if row.get("field_label") == "Этапы лидов"]
    assert tracked, res.data
    newest = tracked[0]
    assert newest["old_value"] and newest["new_value"]
    assert newest["old_value"] != newest["new_value"]


@pytest.mark.django_db
def test_timeline_mixes_notes_and_history_newest_first(api, manager, stages):
    api.force_authenticate(manager)
    lead = lead_with_history(stages, INN[0], changes=1)
    Note.objects.create(lead=lead, author=manager, body="Позвонить завтра")

    res = api.get(f"/api/crm/leads/{lead.id}/timeline/")

    assert res.status_code == 200
    assert res.data[0]["type"] == "note"
    assert res.data[0]["body"] == "Позвонить завтра"
    assert any(row["type"] == "history" for row in res.data)
