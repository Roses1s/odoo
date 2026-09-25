import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@test.local",
        password="Secret123!",
        role=User.Role.ADMIN,
    )


@pytest.mark.django_db
def test_login_returns_access_and_sets_cookie(api, admin_user):
    res = api.post(
        "/api/auth/login/",
        {"email": "admin@test.local", "password": "Secret123!"},
        format="json",
    )
    assert res.status_code == 200
    assert "access" in res.data
    assert res.data["user"]["role"] == "admin"
    assert "refresh_token" in res.cookies


@pytest.mark.django_db
def test_login_wrong_password(api, admin_user):
    res = api.post(
        "/api/auth/login/",
        {"email": "admin@test.local", "password": "wrong"},
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_me_requires_auth(api):
    res = api.get("/api/auth/me/")
    assert res.status_code == 401
