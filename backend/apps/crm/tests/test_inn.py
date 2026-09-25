from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.core.exceptions import ValidationError
from django.db import connection, connections

from apps.core.validators import inn_checksum_ok
from apps.crm.models import Lead, Stage


@pytest.mark.parametrize(
    "inn,ok",
    [
        ("7707083893", True),
        ("500100732259", True),
        ("1234567890", False),
        ("123", False),
    ],
)
def test_inn_checksum(inn, ok):
    assert inn_checksum_ok(inn) is ok


@pytest.mark.django_db
def test_duplicate_active_inn_rejected():
    stage = Stage.objects.create(name="Новый", sequence=10)
    Lead.objects.create(name="A", inn="7707083893", stage=stage)
    with pytest.raises(ValidationError):
        Lead.objects.create(name="B", inn="7707083893", stage=stage)


@pytest.mark.django_db(transaction=True)
def test_concurrent_duplicate_active_inn_rejected():
    if connection.vendor != "postgresql":
        pytest.skip("PostgreSQL advisory-lock regression test")

    stage = Stage.objects.create(name="Новый", sequence=10)
    barrier = Barrier(2)

    def create_lead(name):
        connections.close_all()
        barrier.wait()
        try:
            Lead.objects.create(name=name, inn="7707083893", stage_id=stage.id)
            return "created"
        except ValidationError:
            return "rejected"
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(create_lead, ["A", "B"]))

    assert sorted(results) == ["created", "rejected"]
    assert Lead.objects.filter(inn="7707083893", is_archived=False).count() == 1
