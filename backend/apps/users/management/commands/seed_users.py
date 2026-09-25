import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()

USERS = [
    {
        "email": "admin@crm.local",
        "password_env": "DEMO_ADMIN_PASSWORD",
        "role": User.Role.ADMIN,
        "first_name": "Админ",
        "last_name": "Системы",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "email": "manager@crm.local",
        "password_env": "DEMO_MANAGER_PASSWORD",
        "role": User.Role.MANAGER,
        "first_name": "Мария",
        "last_name": "Менеджер",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "operator@crm.local",
        "password_env": "DEMO_OPERATOR_PASSWORD",
        "role": User.Role.OPERATOR,
        "first_name": "Олег",
        "last_name": "Оператор",
        "is_staff": False,
        "is_superuser": False,
    },
]


class Command(BaseCommand):
    help = "Create explicitly configured development/demo users"

    def handle(self, *args, **options):
        missing = [
            item["password_env"]
            for item in USERS
            if not os.environ.get(item["password_env"])
        ]
        if missing:
            raise CommandError(
                "Demo users were not created. Set explicit passwords in: " + ", ".join(missing)
            )

        for definition in USERS:
            item = definition.copy()
            password = os.environ[item.pop("password_env")]
            email = item["email"]
            user, created = User.objects.get_or_create(email=email, defaults=item)
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"created {email}"))
            else:
                self.stdout.write(f"exists {email}")
