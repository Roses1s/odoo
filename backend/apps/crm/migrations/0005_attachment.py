# Lead attachments.
#
# Only the new table is created here on purpose. `makemigrations` also wants to
# rewrite every `id` column to BigAutoField (DEFAULT_AUTO_FIELD drift that
# predates this change); running that on production would rewrite every CRM
# table, so it is deliberately left out. The FK below therefore matches the
# existing integer `crm_lead.id` column.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.crm.models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0004_lead_search_indexes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Attachment",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("file", models.FileField(upload_to=apps.crm.models.attachment_upload_to)),
                ("name", models.CharField(max_length=255)),
                ("size", models.PositiveBigIntegerField(default=0)),
                ("content_type", models.CharField(blank=True, max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "lead",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachments",
                        to="crm.lead",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="crm_attachments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
