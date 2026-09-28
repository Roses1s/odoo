"""Role boundaries for leads.

These are the rules the business relies on: an operator works with the leads
assigned to them and must not reach anyone else's, neither through the list,
nor a direct link, nor an attachment URL.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.crm.models import Attachment, Lead, Stage

User = get_user_model()

# The model rejects a second active lead with the same INN, so every lead in a
# test needs its own. These pass the tax-office checksum.
INN = ["7707083893", "7700000009", "7700000016", "7700000023"]


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def stage(db):
    return Stage.objects.create(name="Новый")


@pytest.fixture
def operator(db):
    return User.objects.create_user(email="op@t.local", password="x", role="operator")


@pytest.fixture
def other_operator(db):
    return User.objects.create_user(email="op2@t.local", password="x", role="operator")


@pytest.fixture
def manager(db):
    return User.objects.create_user(email="mgr@t.local", password="x", role="manager")


def make_lead(stage, owner, name="ООО Ромашка", inn=INN[0], **extra):
    return Lead.objects.create(name=name, inn=inn, stage=stage, assigned_to=owner, **extra)


@pytest.mark.django_db
def test_operator_sees_only_leads_assigned_to_them(api, stage, operator, other_operator):
    make_lead(stage, operator, name="Мой лид", inn=INN[0])
    make_lead(stage, other_operator, name="Чужой лид", inn=INN[1])
    api.force_authenticate(operator)

    res = api.get("/api/crm/leads/")

    assert res.status_code == 200
    names = [row["name"] for row in res.data["results"]]
    assert names == ["Мой лид"]


@pytest.mark.django_db
def test_operator_cannot_open_someone_elses_lead(api, stage, operator, other_operator):
    foreign = make_lead(stage, other_operator)
    api.force_authenticate(operator)

    assert api.get(f"/api/crm/leads/{foreign.id}/").status_code == 404


@pytest.mark.django_db
def test_operator_cannot_hand_a_lead_to_themselves(api, stage, operator, other_operator):
    """assigned_to is read-only for operators, so the field is ignored rather
    than rejected — what matters is that the owner does not change."""
    lead = make_lead(stage, operator)
    api.force_authenticate(operator)

    res = api.patch(f"/api/crm/leads/{lead.id}/", {"assigned_to": other_operator.id})

    assert res.status_code == 200
    lead.refresh_from_db()
    assert lead.assigned_to_id == operator.id


@pytest.mark.django_db
def test_creator_loses_access_once_the_lead_is_reassigned(api, stage, operator, other_operator):
    lead = make_lead(stage, other_operator, created_by=operator)
    api.force_authenticate(operator)

    assert api.get(f"/api/crm/leads/{lead.id}/").status_code == 404
    assert api.get("/api/crm/leads/").data["count"] == 0


@pytest.mark.django_db
def test_operator_cannot_archive_a_lead(api, stage, operator):
    lead = make_lead(stage, operator)
    api.force_authenticate(operator)

    assert api.delete(f"/api/crm/leads/{lead.id}/").status_code == 403
    lead.refresh_from_db()
    assert lead.is_archived is False


@pytest.mark.django_db
def test_manager_sees_every_lead(api, stage, operator, other_operator, manager):
    make_lead(stage, operator, name="Первый", inn=INN[0])
    make_lead(stage, other_operator, name="Второй", inn=INN[1])
    api.force_authenticate(manager)

    res = api.get("/api/crm/leads/")

    assert res.status_code == 200
    assert res.data["count"] == 2


@pytest.mark.django_db
def test_attachment_of_a_foreign_lead_is_not_reachable(
    api, stage, operator, other_operator, settings, tmp_path
):
    settings.MEDIA_ROOT = tmp_path
    foreign = make_lead(stage, other_operator)
    attachment = Attachment.objects.create(
        lead=foreign,
        file=SimpleUploadedFile("secret.txt", b"content"),
        name="secret.txt",
        size=7,
        uploaded_by=other_operator,
    )
    api.force_authenticate(operator)

    assert api.get(f"/api/crm/leads/{foreign.id}/attachments/").status_code == 404
    download = f"/api/crm/leads/{foreign.id}/attachments/{attachment.id}/download/"
    assert api.get(download).status_code == 404


@pytest.mark.django_db
def test_owner_can_read_their_own_attachment(api, stage, operator, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    lead = make_lead(stage, operator)
    Attachment.objects.create(
        lead=lead,
        file=SimpleUploadedFile("mine.txt", b"content"),
        name="mine.txt",
        size=7,
        uploaded_by=operator,
    )
    api.force_authenticate(operator)

    res = api.get(f"/api/crm/leads/{lead.id}/attachments/")

    assert res.status_code == 200
    assert [row["name"] for row in res.data] == ["mine.txt"]
