import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.launcher.models import App

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def tiles(db):
    App.objects.create(
        slug="crm", name="CRM", route="/crm", min_role="operator", order=1, icon="Kanban"
    )
    App.objects.create(
        slug="admin", name="Admin", route="/admin", min_role="manager", order=2, icon="Settings"
    )


def _user(**kwargs):
    return User.objects.create_user(password="Secret123!", **kwargs)


@pytest.mark.django_db
def test_operator_does_not_see_admin_tile(api, tiles):
    user = _user(email="op@test.local", role=User.Role.OPERATOR)
    api.force_authenticate(user)
    res = api.get("/api/launcher/apps/")
    assert res.status_code == 200
    slugs = {row["slug"] for row in res.data["results"]}
    assert "crm" in slugs
    assert "admin" not in slugs


@pytest.mark.django_db
def test_manager_sees_admin_tile(api, tiles):
    user = _user(email="mgr@test.local", role=User.Role.MANAGER)
    api.force_authenticate(user)
    res = api.get("/api/launcher/apps/")
    slugs = {row["slug"] for row in res.data["results"]}
    assert slugs == {"crm", "admin"}
