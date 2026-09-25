import django.db.models.deletion
import simple_history.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Stage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("sequence", models.PositiveIntegerField(default=10)),
                ("is_closed", models.BooleanField(default=False)),
                ("color", models.CharField(default="slate", max_length=20)),
            ],
            options={"ordering": ["sequence", "id"]},
        ),
        migrations.CreateModel(
            name="Tag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50, unique=True)),
                ("color", models.CharField(default="blue", max_length=20)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Lead",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("inn", models.CharField(db_index=True, max_length=12)),
                ("logist_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("logist_contact", models.CharField(blank=True, max_length=255)),
                ("priority", models.IntegerField(choices=[(0, "None"), (1, "Low"), (2, "Medium"), (3, "High")], default=0)),
                ("expected_revenue", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("is_archived", models.BooleanField(default=False)),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="leads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "stage",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="leads",
                        to="crm.stage",
                    ),
                ),
                ("tags", models.ManyToManyField(blank=True, related_name="leads", to="crm.tag")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Note",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
                ),
                (
                    "lead",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="notes", to="crm.lead"
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="HistoricalLead",
            fields=[
                ("id", models.BigIntegerField(blank=True, db_index=True)),
                ("created_at", models.DateTimeField(blank=True, editable=False)),
                ("updated_at", models.DateTimeField(blank=True, editable=False)),
                ("name", models.CharField(max_length=255)),
                ("inn", models.CharField(db_index=True, max_length=12)),
                ("logist_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("logist_contact", models.CharField(blank=True, max_length=255)),
                ("priority", models.IntegerField(choices=[(0, "None"), (1, "Low"), (2, "Medium"), (3, "High")], default=0)),
                ("expected_revenue", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("is_archived", models.BooleanField(default=False)),
                ("history_id", models.AutoField(primary_key=True, serialize=False)),
                ("history_date", models.DateTimeField(db_index=True)),
                ("history_change_reason", models.CharField(max_length=100, null=True)),
                (
                    "history_type",
                    models.CharField(choices=[("+", "Created"), ("~", "Changed"), ("-", "Deleted")], max_length=1),
                ),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "history_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "stage",
                    models.ForeignKey(
                        blank=True,
                        db_constraint=False,
                        null=True,
                        on_delete=django.db.models.deletion.DO_NOTHING,
                        related_name="+",
                        to="crm.stage",
                    ),
                ),
            ],
            options={
                "verbose_name": "historical lead",
                "verbose_name_plural": "historical leads",
                "ordering": ("-history_date", "-history_id"),
                "get_latest_by": ("history_date", "history_id"),
            },
            bases=(simple_history.models.HistoricalChanges, models.Model),
        ),
    ]
