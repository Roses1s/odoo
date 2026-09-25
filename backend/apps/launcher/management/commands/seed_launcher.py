from django.core.management.base import BaseCommand

from apps.launcher.models import App

TILES = [
    {
        "slug": "crm",
        "name": "CRM-система",
        "description": "Воронка лидов, канбан, сделки",
        "icon": "Kanban",
        "route": "/crm",
        "min_role": App.MinRole.OPERATOR,
        "order": 10,
    },
    {
        "slug": "shipments",
        "name": "Заявки",
        "description": "Перевозки, маршруты, перевозчики",
        "icon": "Package",
        "route": "/shipments",
        "min_role": App.MinRole.OPERATOR,
        "order": 20,
    },
    {
        "slug": "admin",
        "name": "Панель управления",
        "description": "Пользователи, этапы, аналитика",
        "icon": "Settings",
        "route": "/admin",
        "min_role": App.MinRole.MANAGER,
        "order": 30,
    },
]


class Command(BaseCommand):
    help = "Seed launcher tiles: CRM, Shipments, Admin"

    def handle(self, *args, **options):
        for tile in TILES:
            obj, created = App.objects.update_or_create(slug=tile["slug"], defaults=tile)
            verb = "created" if created else "updated"
            self.stdout.write(self.style.SUCCESS(f"{verb} {obj.slug}"))
