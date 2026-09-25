import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.crm.models import Lead, Stage
from apps.shipments.models import Shipment

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_create_shipment_autofills_logist(api):
    user = User.objects.create_user(email="op@t.local", password="x", role="operator")
    stage = Stage.objects.create(name="N")
    lead = Lead.objects.create(
        name="Ромашка",
        inn="7707083893",
        stage=stage,
        assigned_to=user,
        logist_contact="+79991234567",
    )
    api.force_authenticate(user)
    res = api.post(
        "/api/shipments/",
        {
            "lead": lead.id,
            "city_loading": "Москва",
            "city_unloading": "Казань",
            "address_loading": "A",
            "address_unloading": "B",
            "contact_loading_name": "",
            "contact_loading_phone": "",
            "contact_unloading_name": "Иван",
            "contact_unloading_phone": "+79990001122",
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.data["contact_loading_phone"].startswith("+7")


@pytest.mark.django_db
def test_manager_sees_all_shipments_by_default(api):
    manager = User.objects.create_user(email="manager@t.local", password="x", role="manager")
    operator = User.objects.create_user(email="shipper@t.local", password="x", role="operator")
    stage = Stage.objects.create(name="N")
    lead = Lead.objects.create(name="A", inn="7707083893", stage=stage, assigned_to=operator)
    Shipment.objects.create(
        lead=lead,
        created_by=operator,
        city_loading="Мск",
        city_unloading="Спб",
        address_loading="A",
        address_unloading="B",
        contact_loading_name="A",
        contact_loading_phone="+79991234567",
        contact_unloading_name="B",
        contact_unloading_phone="+79990001122",
    )

    api.force_authenticate(manager)
    response = api.get("/api/shipments/")
    assert response.status_code == 200
    assert response.data["count"] == 1


@pytest.mark.django_db
def test_status_change(api):
    user = User.objects.create_user(email="op@t.local", password="x", role="operator")
    stage = Stage.objects.create(name="N")
    lead = Lead.objects.create(name="A", inn="7707083893", stage=stage, assigned_to=user)
    api.force_authenticate(user)
    created = api.post(
        "/api/shipments/",
        {
            "lead": lead.id,
            "city_loading": "Мск",
            "city_unloading": "Спб",
            "address_loading": "A",
            "address_unloading": "B",
            "contact_loading_name": "A",
            "contact_loading_phone": "+79991234567",
            "contact_unloading_name": "B",
            "contact_unloading_phone": "+79990001122",
        },
        format="json",
    )
    pk = created.data["id"]
    res = api.patch(f"/api/shipments/{pk}/status/", {"status": "in_transit"}, format="json")
    assert res.status_code == 200
    assert res.data["status"] == "in_transit"
