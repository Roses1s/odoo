"""The health endpoint is the only thing an outside monitor can ask, so its
contract matters: liveness must stay open, and the detailed probe must not
hand the backup schedule to anyone who guesses the URL."""

import pytest


@pytest.mark.django_db
def test_liveness_is_open_and_reports_the_database(client):
    res = client.get("/api/health/")

    assert res.status_code == 200
    assert res.json() == {"status": "ok", "db": "ok"}


@pytest.mark.django_db
def test_deep_probe_reports_backup_age(client, settings, tmp_path):
    settings.BACKUP_DIR = str(tmp_path)
    settings.HEALTH_TOKEN = ""

    body = client.get("/api/health/?deep=1").json()

    assert body["db"] == "ok"
    # No dump in an empty directory: the probe must say so, not stay silent.
    assert body["backup_ok"] is False
    assert body["backup_age_hours"] is None


@pytest.mark.django_db
def test_a_fresh_dump_makes_the_probe_healthy(client, settings, tmp_path):
    settings.BACKUP_DIR = str(tmp_path)
    settings.HEALTH_TOKEN = ""
    (tmp_path / "crm_db_20260928_030000.sql.gz").write_bytes(b"dump")

    res = client.get("/api/health/?deep=1")

    assert res.status_code == 200
    assert res.json()["backup_ok"] is True


@pytest.mark.django_db
def test_stale_dump_answers_503_so_a_monitor_can_alert(client, settings, tmp_path):
    import os
    import time

    settings.BACKUP_DIR = str(tmp_path)
    settings.HEALTH_TOKEN = ""
    dump = tmp_path / "crm_db_20260901_030000.sql.gz"
    dump.write_bytes(b"dump")
    three_days_ago = time.time() - 3 * 24 * 3600
    os.utime(dump, (three_days_ago, three_days_ago))

    res = client.get("/api/health/?deep=1")

    assert res.status_code == 503
    assert res.json()["backup_ok"] is False
    assert res.json()["backup_age_hours"] > 25


@pytest.mark.django_db
def test_the_token_guards_the_details_when_configured(client, settings, tmp_path):
    settings.BACKUP_DIR = str(tmp_path)
    settings.HEALTH_TOKEN = "secret-probe-token"

    assert client.get("/api/health/?deep=1").status_code == 403
    assert client.get("/api/health/?deep=1&token=wrong").status_code == 403
    # Liveness stays open: the container healthcheck has no token.
    assert client.get("/api/health/").status_code == 200

    ok = client.get("/api/health/?deep=1&token=secret-probe-token")
    assert ok.status_code in (200, 503)
    assert "backup_ok" in ok.json()
