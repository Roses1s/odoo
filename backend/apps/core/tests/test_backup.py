from subprocess import CompletedProcess
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model

from apps.core.tasks import daily_backup

User = get_user_model()


@pytest.mark.django_db
def test_failed_backup_marks_celery_task_as_failed():
    User.objects.create_user(email="backup-admin@test.local", role="admin", password="x")
    failed = CompletedProcess(args=["backup.sh"], returncode=1, stdout="", stderr="pg_dump failed")

    with (
        patch("apps.core.tasks.subprocess.run", return_value=failed),
        patch("apps.notifications.services.notify") as notify,
        pytest.raises(RuntimeError, match="backup failed"),
    ):
        daily_backup.run()

    notify.assert_called_once()
    assert "pg_dump failed" not in notify.call_args.args[2]
