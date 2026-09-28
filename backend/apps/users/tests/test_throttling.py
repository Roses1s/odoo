import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_login_stops_accepting_attempts_once_the_rate_is_hit(api, monkeypatch):
    """Rates are class attributes read at import time, so the limit is patched
    on the throttle itself rather than through settings."""
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"auth": "2/min"})
    User.objects.create_user(email="u@t.local", password="secret-pass", role="operator")
    payload = {"email": "u@t.local", "password": "wrong-pass"}

    first = api.post("/api/auth/login/", payload)
    second = api.post("/api/auth/login/", payload)
    third = api.post("/api/auth/login/", payload)

    assert first.status_code == 400
    assert second.status_code == 400
    assert third.status_code == 429, "third attempt should be rate limited"


@pytest.mark.django_db
def test_api_stops_serving_a_client_that_hammers_it(api, monkeypatch):
    monkeypatch.setattr(UserRateThrottle, "THROTTLE_RATES", {"user": "3/min"})
    user = User.objects.create_user(email="u@t.local", password="x", role="operator")
    api.force_authenticate(user)

    codes = [api.get("/api/crm/leads/").status_code for _ in range(4)]

    assert codes[:3] == [200, 200, 200]
    assert codes[3] == 429


@pytest.mark.django_db
def test_normal_usage_is_not_throttled(api):
    """A guard against setting the production limit too low: opening the CRM
    fires a handful of requests in a row."""
    user = User.objects.create_user(email="u@t.local", password="x", role="operator")
    api.force_authenticate(user)

    codes = [api.get("/api/crm/leads/").status_code for _ in range(12)]

    assert set(codes) == {200}
