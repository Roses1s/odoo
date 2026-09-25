import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("crm", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Carrier",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255, unique=True)),
                ("inn", models.CharField(db_index=True, max_length=12)),
                ("contact_name", models.CharField(blank=True, max_length=255)),
                ("contact_phone", models.CharField(blank=True, max_length=50)),
                ("contact_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Shipment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("new", "Новая"),
                            ("in_progress", "В работе"),
                            ("in_transit", "В пути"),
                            ("delivered", "Доставлена"),
                            ("cancelled", "Отменена"),
                        ],
                        default="new",
                        max_length=20,
                    ),
                ),
                ("city_loading", models.CharField(max_length=255, verbose_name="Город погрузки")),
                ("city_unloading", models.CharField(max_length=255, verbose_name="Город выгрузки")),
                ("address_loading", models.TextField(verbose_name="Адрес погрузки")),
                ("address_unloading", models.TextField(verbose_name="Адрес выгрузки")),
                ("contact_loading_name", models.CharField(max_length=255, verbose_name="Контакт на погрузке")),
                ("contact_loading_phone", models.CharField(max_length=50, verbose_name="Телефон на погрузке")),
                ("contact_unloading_name", models.CharField(max_length=255, verbose_name="Контакт на выгрузке")),
                ("contact_unloading_phone", models.CharField(max_length=50, verbose_name="Телефон на выгрузке")),
                (
                    "transport_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("ft_20", "Фура 20т"),
                            ("ft_40", "Фура 40т"),
                            ("ref", "Рефрижератор"),
                            ("tent", "Тент"),
                            ("gazel", "Газель"),
                            ("other", "Другое"),
                        ],
                        max_length=20,
                    ),
                ),
                ("cargo_weight", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("cargo_volume", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("comment", models.TextField(blank=True, verbose_name="Комментарий")),
                (
                    "carrier",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="shipments.carrier",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shipments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "lead",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shipments",
                        to="crm.lead",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
