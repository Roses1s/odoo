import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.shipments.models import Carrier

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def manager():
    return User.objects.create_user(email="mgr@t.local", password="x", role="manager")


@pytest.mark.django_db
def test_invalid_inn_is_a_client_error_not_a_crash(api, manager):
    """Carrier.save() calls full_clean(), so without serializer validation the
    model error escapes after DRF is done and the API answers 500."""
    api.force_authenticate(manager)

    res = api.post("/api/carriers/", {"name": "ООО Возчик", "inn": "123"})

    assert res.status_code == 400, res.status_code
    assert "inn" in res.data
    assert not Carrier.objects.filter(name="ООО Возчик").exists()


@pytest.mark.django_db
def test_invalid_phone_is_a_client_error(api, manager):
    api.force_authenticate(manager)

    res = api.post(
        "/api/carriers/",
        {"name": "ООО Возчик", "inn": "7707083893", "contact_phone": "не телефон"},
    )

    assert res.status_code == 400, res.status_code
    assert "contact_phone" in res.data


@pytest.mark.django_db
def test_valid_carrier_is_created_with_normalised_phone(api, manager):
    api.force_authenticate(manager)

    res = api.post(
        "/api/carriers/",
        {"name": "ООО Возчик", "inn": "7707083893", "contact_phone": "8 999 123-45-67"},
    )

    assert res.status_code == 201, res.data
    carrier = Carrier.objects.get(name="ООО Возчик")
    assert carrier.inn == "7707083893"
    assert carrier.contact_phone == "+79991234567"


@pytest.mark.django_db
def test_operator_cannot_create_a_carrier(api):
    operator = User.objects.create_user(email="op@t.local", password="x", role="operator")
    api.force_authenticate(operator)

    res = api.post("/api/carriers/", {"name": "ООО Возчик", "inn": "7707083893"})

    assert res.status_code == 403
