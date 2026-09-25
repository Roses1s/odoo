import pytest
from django.core.exceptions import ValidationError

from apps.core.validators import inn_checksum_ok, validate_inn
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
