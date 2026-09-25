from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="App",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("slug", models.SlugField(unique=True)),
                ("name", models.CharField(max_length=100)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("icon", models.CharField(default="LayoutGrid", max_length=50)),
                ("route", models.CharField(max_length=100)),
                (
                    "min_role",
                    models.CharField(
                        choices=[
                            ("operator", "Operator"),
                            ("manager", "Manager"),
                            ("admin", "Admin"),
                        ],
                        default="operator",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=10)),
            ],
            options={"ordering": ["order", "id"]},
        ),
    ]
