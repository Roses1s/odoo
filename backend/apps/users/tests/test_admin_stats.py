import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.crm.models import Lead, Stage

User = get_user_model()


@pytest.mark.django_db
def test_stats_query_count_is_constant(django_assert_num_queries):
    admin = User.objects.create_user(email="stats@test.local", password="x", role="admin")
    for index in range(8):
        stage = Stage.objects.create(name=f"Stage {index}", sequence=index)
        Lead.objects.create(
            name=f"Lead {index}",
            inn="7707083893" if index == 0 else "500100732259",
            stage=stage,
            is_archived=index > 1,
        )
        # The domain permits reuse when the previously created lead is archived.
        if index == 0:
            Lead.objects.filter(stage=stage).update(is_archived=True)

    client = APIClient()
    client.force_authenticate(admin)
    with django_assert_num_queries(4):
        response = client.get("/api/admin/stats/")

    assert response.status_code == 200
    assert len(response.data["funnel"]) == 8
