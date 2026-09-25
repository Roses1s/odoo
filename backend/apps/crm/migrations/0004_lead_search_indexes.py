import django.contrib.postgres.indexes
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("crm", "0003_historicallead_created_by")]

    operations = [
        TrigramExtension(),
        migrations.AddIndex(
            model_name="lead",
            index=django.contrib.postgres.indexes.GinIndex(
                fields=["name"],
                name="crm_lead_name_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        migrations.AddIndex(
            model_name="lead",
            index=django.contrib.postgres.indexes.GinIndex(
                fields=["logist_email"],
                name="crm_lead_email_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        migrations.AddIndex(
            model_name="lead",
            index=django.contrib.postgres.indexes.GinIndex(
                fields=["logist_contact"],
                name="crm_lead_phone_trgm_idx",
                opclasses=["gin_trgm_ops"],
            ),
        ),
    ]
