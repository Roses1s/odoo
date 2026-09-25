from django.core.management.base import BaseCommand

from apps.crm.models import Stage, Tag

STAGES = [
    ("Новый", 10, False, "blue"),
    ("Не дозвонились", 20, False, "orange"),
    ("ЛПР", 30, False, "purple"),
    ("Потенциал", 40, False, "green"),
    ("Уехали", 50, True, "slate"),
]

TAGS = [
    ("Логистика", "blue"),
    ("Москва", "green"),
    ("Регион", "yellow"),
]


class Command(BaseCommand):
    help = "Seed default CRM stages and tags"

    def handle(self, *args, **options):
        for name, seq, closed, color in STAGES:
            Stage.objects.update_or_create(
                name=name,
                defaults={"sequence": seq, "is_closed": closed, "color": color},
            )
            self.stdout.write(f"stage {name}")
        for name, color in TAGS:
            Tag.objects.update_or_create(name=name, defaults={"color": color})
            self.stdout.write(f"tag {name}")
