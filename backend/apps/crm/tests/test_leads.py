import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.crm.models import Lead, Stage

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def stage(db):
    return Stage.objects.create(name="Новый")


@pytest.mark.django_db
def test_operator_sees_only_own_leads(api, stage):
    op = User.objects.create_user(email="op@t.local", password="x", role="operator")
    other = User.objects.create_user(email="o2@t.local", password="x", role="operator")
    Lead.objects.create(name="Mine", inn="7707083893", stage=stage, assigned_to=op)
    Lead.objects.create(name="Other", inn="500100732259", stage=stage, assigned_to=other)
    api.force_authenticate(op)
    res = api.get("/api/crm/leads/")
    names = [row["name"] for row in res.data["results"]]
    assert names == ["Mine"]


@pytest.mark.django_db
def test_operator_loses_access_after_reassignment(api, stage):
    operator = User.objects.create_user(email="op@t.local", password="x", role="operator")
    other = User.objects.create_user(email="other@t.local", password="x", role="operator")
    lead = Lead.objects.create(
        name="Created here",
        inn="7707083893",
        stage=stage,
        assigned_to=operator,
        created_by=operator,
    )
    lead.assigned_to = other
    lead.save()

    api.force_authenticate(operator)
    assert api.get(f"/api/crm/leads/{lead.id}/").status_code == 404
    assert api.patch(f"/api/crm/leads/{lead.id}/", {"name": "Changed"}).status_code == 404


@pytest.mark.django_db
def test_masked_values_cannot_be_written(api, stage):
    operator = User.objects.create_user(email="op-mask@t.local", password="x", role="operator")
    lead = Lead.objects.create(name="Mine", inn="7707083893", stage=stage, assigned_to=operator)
    api.force_authenticate(operator)

    response = api.patch(f"/api/crm/leads/{lead.id}/", {"inn": "77****3893"})
    assert response.status_code == 400
    lead.refresh_from_db()
    assert lead.inn == "7707083893"


@pytest.mark.django_db
def test_operator_cannot_delete(api, stage):
    op = User.objects.create_user(email="op@t.local", password="x", role="operator")
    lead = Lead.objects.create(name="Mine", inn="7707083893", stage=stage, assigned_to=op)
    api.force_authenticate(op)
    res = api.delete(f"/api/crm/leads/{lead.id}/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_list_hides_archived_by_default(api, stage):
    admin = User.objects.create_user(email="a@t.local", password="x", role="admin")
    Lead.objects.create(name="Live", inn="7707083893", stage=stage, assigned_to=admin)
    archived = Lead.objects.create(name="Old", inn="500100732259", stage=stage, assigned_to=admin)
    archived.is_archived = True
    archived.save(update_fields=["is_archived"])
    api.force_authenticate(admin)
    names = [row["name"] for row in api.get("/api/crm/leads/").data["results"]]
    assert names == ["Live"]
    shown = [row["name"] for row in api.get("/api/crm/leads/?is_archived=true").data["results"]]
    assert "Old" in shown


@pytest.mark.django_db
def test_archived_lead_stays_reachable_by_id(api, stage):
    # A lead used to 404 on its own detail URL the moment it was archived,
    # because the "hide archived" default meant for the list also applied to
    # single-record lookups — including for the manager who just archived it.
    admin = User.objects.create_user(email="a@t.local", password="x", role="admin")
    lead = Lead.objects.create(name="Old", inn="7707083893", stage=stage, assigned_to=admin)
    lead.is_archived = True
    lead.save(update_fields=["is_archived"])
    api.force_authenticate(admin)

    res = api.get(f"/api/crm/leads/{lead.id}/")
    assert res.status_code == 200
    assert res.data["name"] == "Old"

    res = api.patch(f"/api/crm/leads/{lead.id}/", {"name": "Old, renamed"})
    assert res.status_code == 200


@pytest.mark.django_db
def test_archived_lead_out_of_reach_for_unrelated_operator(api, stage):
    admin = User.objects.create_user(email="a@t.local", password="x", role="admin")
    operator = User.objects.create_user(email="op@t.local", password="x", role="operator")
    lead = Lead.objects.create(name="Old", inn="7707083893", stage=stage, assigned_to=admin)
    lead.is_archived = True
    lead.save(update_fields=["is_archived"])
    api.force_authenticate(operator)

    res = api.get(f"/api/crm/leads/{lead.id}/")
    assert res.status_code == 404


@pytest.mark.django_db
def test_pager_reports_position_total_and_neighbours(api, stage):
    admin = User.objects.create_user(email="a@t.local", password="x", role="admin")
    inns = ["7707083893", "500100732259", "7700000009", "7700000016", "7700000023"]
    leads = [
        Lead.objects.create(name=f"Lead {i}", inn=inn, stage=stage, assigned_to=admin)
        for i, inn in enumerate(inns)
    ]
    # Newest first (default ordering), so leads[-1] (created last) is #1.
    api.force_authenticate(admin)

    res = api.get(f"/api/crm/leads/{leads[-1].id}/pager/")
    assert res.status_code == 200
    assert res.data["position"] == 1
    assert res.data["total"] == 5
    assert res.data["prev_id"] is None
    assert res.data["next_id"] == leads[-2].id

    res = api.get(f"/api/crm/leads/{leads[0].id}/pager/")
    assert res.data["position"] == 5
    assert res.data["next_id"] is None
    assert res.data["prev_id"] == leads[1].id

    res = api.get(f"/api/crm/leads/{leads[2].id}/pager/")
    assert res.data["position"] == 3
    assert res.data["prev_id"] == leads[3].id
    assert res.data["next_id"] == leads[1].id


@pytest.mark.django_db
def test_pager_scoped_to_operators_own_leads(api, stage):
    admin = User.objects.create_user(email="a@t.local", password="x", role="admin")
    operator = User.objects.create_user(email="op@t.local", password="x", role="operator")
    mine = Lead.objects.create(name="Mine", inn="7707083893", stage=stage, assigned_to=operator)
    Lead.objects.create(name="Other", inn="500100732259", stage=stage, assigned_to=admin)

    api.force_authenticate(operator)
    res = api.get(f"/api/crm/leads/{mine.id}/pager/")
    assert res.status_code == 200
    assert res.data == {"position": 1, "total": 1, "prev_id": None, "next_id": None}


@pytest.mark.django_db
def test_pager_stays_within_the_archived_bucket(api, stage):
    admin = User.objects.create_user(email="a@t.local", password="x", role="admin")
    live = Lead.objects.create(name="Live", inn="7707083893", stage=stage, assigned_to=admin)
    archived = Lead.objects.create(name="Old", inn="500100732259", stage=stage, assigned_to=admin)
    archived.is_archived = True
    archived.save(update_fields=["is_archived"])

    api.force_authenticate(admin)
    res = api.get(f"/api/crm/leads/{archived.id}/pager/")
    assert res.data == {"position": 1, "total": 1, "prev_id": None, "next_id": None}
    res = api.get(f"/api/crm/leads/{live.id}/pager/")
    assert res.data == {"position": 1, "total": 1, "prev_id": None, "next_id": None}
