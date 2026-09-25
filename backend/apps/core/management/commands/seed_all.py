from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed users, launcher tiles, CRM stages"

    def handle(self, *args, **options):
        call_command("seed_users")
        call_command("seed_launcher")
        call_command("seed_crm")
        self.stdout.write(self.style.SUCCESS("seed_all done"))
