from unittest.mock import patch

import pytest


@pytest.mark.django_db
def test_health_does_not_expose_database_exception(client):
    with patch("django.db.backends.base.base.BaseDatabaseWrapper.ensure_connection") as probe:
        probe.side_effect = RuntimeError("postgres://secret-user:secret-password@private-db/crm")
        response = client.get("/api/health/")

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "db": "unavailable"}
    assert b"secret-password" not in response.content
