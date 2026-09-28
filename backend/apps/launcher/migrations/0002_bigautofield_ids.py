# DEFAULT_AUTO_FIELD drift: launcher primary keys become BigAutoField.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('launcher', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='app',
            name='id',
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
            ),
        ),
    ]
