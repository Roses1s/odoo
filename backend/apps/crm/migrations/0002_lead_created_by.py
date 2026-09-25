from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("crm", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_leads",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name="lead",
            index=models.Index(fields=["is_archived", "stage"], name="crm_lead_arch_stage_idx"),
        ),
        migrations.AddIndex(
            model_name="lead",
            index=models.Index(fields=["name"], name="crm_lead_name_idx"),
        ),
    ]
