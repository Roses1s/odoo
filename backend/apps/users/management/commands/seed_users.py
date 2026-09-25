from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

SEED = [
    {
        "email": "admin@crm.local",
        "password": "Admin123!",
        "role": User.Role.ADMIN,
        "first_name": "Админ",
        "last_name": "Системы",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "email": "manager@crm.local",
        "password": "Manager123!",
        "role": User.Role.MANAGER,
        "first_name": "Мария",
        "last_name": "Менеджер",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "operator@crm.local",
        "password": "Operator123!",
        "role": User.Role.OPERATOR,
        "first_name": "Олег",
        "last_name": "Оператор",
        "is_staff": False,
        "is_superuser": False,
    },
]


class Command(BaseCommand):
    help = "Create demo admin / manager / operator users"

    def handle(self, *args, **options):
        for item in SEED:
            password = item.pop("password")
            email = item["email"]
            user, created = User.objects.get_or_create(email=email, defaults=item)
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"created {email}"))
            else:
                self.stdout.write(f"exists {email}")
            item["password"] = password
