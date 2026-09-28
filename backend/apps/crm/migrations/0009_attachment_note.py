# Files attached straight to a chatter note. Nullable: existing attachments
# belong to the lead itself and stay that way.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0008_bigautofield_ids'),
    ]

    operations = [
        migrations.AddField(
            model_name='attachment',
            name='note',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='attachments',
                to='crm.note',
            ),
        ),
    ]
