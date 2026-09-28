# Extra lead fields (requisites, contacts, call dates, limit).
#
# `makemigrations` also wants to rewrite every `id` column to BigAutoField
# (DEFAULT_AUTO_FIELD drift that predates this change). Running that on
# production would rewrite every CRM table, so those operations are removed
# on purpose — same as in 0005.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0005_attachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='historicallead',
            name='company_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='company_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='credit_limit',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='extra_info',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='first_call_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='kpp',
            field=models.CharField(blank=True, max_length=9),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='logist_phone',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='mobile',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='next_call_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='okved',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='phone',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='region',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='taken_by_logist',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='historicallead',
            name='timezone',
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name='lead',
            name='company_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='company_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='lead',
            name='credit_limit',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='lead',
            name='extra_info',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='first_call_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='kpp',
            field=models.CharField(blank=True, max_length=9),
        ),
        migrations.AddField(
            model_name='lead',
            name='logist_phone',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='lead',
            name='mobile',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='lead',
            name='next_call_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='okved',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='lead',
            name='phone',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='lead',
            name='region',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='lead',
            name='taken_by_logist',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='lead',
            name='timezone',
            field=models.CharField(blank=True, max_length=32),
        ),
    ]
