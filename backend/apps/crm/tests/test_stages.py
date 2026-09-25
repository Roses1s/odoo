import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.crm.models import Lead, Stage

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email="mgr@test.local", password="x", role=User.Role.MANAGER
    )


@pytest.fixture
def operator(db):
    return User.objects.create_user(
        email="op@test.local", password="x", role=User.Role.OPERATOR
    )


@pytest.mark.django_db
def test_operator_cannot_create_tag(api, operator):
    api.force_authenticate(operator)
    res = api.post("/api/crm/tags/", {"name": "X", "color": "blue"}, format="json")
    assert res.status_code == 403


@pytest.mark.django_db
def test_operator_cannot_create_stage(api, operator):
    api.force_authenticate(operator)
    res = api.post("/api/crm/stages/", {"name": "X"}, format="json")
    assert res.status_code == 403


@pytest.mark.django_db
def test_manager_create_and_reorder(api, manager):
    api.force_authenticate(manager)
    a = api.post("/api/crm/stages/", {"name": "A", "color": "blue"}, format="json")
    b = api.post("/api/crm/stages/", {"name": "B", "color": "green"}, format="json")
    assert a.status_code == 201
    ids = [b.data["id"], a.data["id"]]
    res = api.patch("/api/crm/stages/reorder/", {"ids": ids}, format="json")
    assert res.status_code == 200
    names = [row["name"] for row in res.data]
    assert names[0] == "B"


@pytest.mark.django_db
def test_delete_requires_fallback(api, manager):
    api.force_authenticate(manager)
    s1 = Stage.objects.create(name="A", sequence=10)
    s2 = Stage.objects.create(name="B", sequence=20)
    Lead.objects.create(name="L", inn="7707083893", stage=s1)
    res = api.delete(f"/api/crm/stages/{s1.id}/")
    assert res.status_code == 400
    res = api.delete(f"/api/crm/stages/{s1.id}/?fallback_stage_id={s2.id}")
    assert res.status_code == 204
    assert Lead.objects.get().stage_id == s2.id
