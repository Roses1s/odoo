"""Notifications are the only channel telling a salesperson a lead moved to
them, so the delivery rules and the privacy boundary are worth pinning down."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.crm.models import Lead, Stage
from apps.notifications.models import Notification

User = get_user_model()

INN = ["7707083893", "7700000009"]


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


@pytest.mark.django_db
def test_assigning_a_lead_notifies_the_new_owner(stage, operator):
    lead = Lead.objects.create(name="ООО Ромашка", inn=INN[0], stage=stage)
    assert Notification.objects.count() == 0

    lead.assigned_to = operator
    lead.save()

    note = Notification.objects.get(recipient=operator)
    assert "Ромашка" in note.body
    assert note.link == f"/crm/leads/{lead.pk}"
    assert note.is_read is False


@pytest.mark.django_db
def test_a_user_only_sees_their_own_notifications(api, operator, other_operator):
    Notification.objects.create(recipient=operator, title="Моё")
    Notification.objects.create(recipient=other_operator, title="Чужое")
    api.force_authenticate(operator)

    res = api.get("/api/notifications/")

    assert res.status_code == 200
    assert [row["title"] for row in res.data["results"]] == ["Моё"]


@pytest.mark.django_db
def test_someone_elses_notification_cannot_be_marked_read(api, operator, other_operator):
    foreign = Notification.objects.create(recipient=other_operator, title="Чужое")
    api.force_authenticate(operator)

    res = api.patch(f"/api/notifications/{foreign.id}/read/")

    assert res.status_code == 404
    foreign.refresh_from_db()
    assert foreign.is_read is False


@pytest.mark.django_db
def test_marking_read_updates_the_unread_counter(api, operator):
    first = Notification.objects.create(recipient=operator, title="Первое")
    Notification.objects.create(recipient=operator, title="Второе")
    api.force_authenticate(operator)

    assert api.get("/api/notifications/unread-count/").data["count"] == 2

    assert api.patch(f"/api/notifications/{first.id}/read/").status_code == 200

    assert api.get("/api/notifications/unread-count/").data["count"] == 1


@pytest.mark.django_db
def test_notifications_require_authentication(api):
    assert api.get("/api/notifications/").status_code == 401
