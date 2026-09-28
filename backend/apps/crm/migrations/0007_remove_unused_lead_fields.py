# Drop the lead fields that were added and then removed from the form on the
# same day (company name, OKVED, region, mobile, taken-by-logist, notes).
# They never held data. The BigAutoField id rewrite is handled separately in
# the next migration, on purpose.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0006_lead_extra_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='historicallead',
            name='company_name',
        ),
        migrations.RemoveField(
            model_name='historicallead',
            name='extra_info',
        ),
        migrations.RemoveField(
            model_name='historicallead',
            name='mobile',
        ),
        migrations.RemoveField(
            model_name='historicallead',
            name='okved',
        ),
        migrations.RemoveField(
            model_name='historicallead',
            name='region',
        ),
        migrations.RemoveField(
            model_name='historicallead',
            name='taken_by_logist',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='company_name',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='extra_info',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='mobile',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='okved',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='region',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='taken_by_logist',
        ),
    ]
