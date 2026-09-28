# Close the DEFAULT_AUTO_FIELD drift that shipped with the project: every CRM
# primary key becomes BigAutoField. PostgreSQL rewrites these tables and the
# foreign keys pointing at them (notes, attachments, shipments, tags), so run
# it during a deploy window and take a database backup first. The CRM tables
# are small, so the rewrite is a matter of seconds.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0007_remove_unused_lead_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='historicallead',
            name='id',
            field=models.BigIntegerField(
                auto_created=True, blank=True, db_index=True, verbose_name='ID'
            ),
        ),
        migrations.AlterField(
            model_name='lead',
            name='id',
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
            ),
        ),
        migrations.AlterField(
            model_name='note',
            name='id',
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
            ),
        ),
        migrations.AlterField(
            model_name='stage',
            name='id',
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
            ),
        ),
        migrations.AlterField(
            model_name='tag',
            name='id',
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
            ),
        ),
    ]
