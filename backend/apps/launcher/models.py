from django.db import models

ROLE_ORDER = {"operator": 0, "manager": 1, "admin": 2}


class App(models.Model):
    class MinRole(models.TextChoices):
        OPERATOR = "operator", "Operator"
        MANAGER = "manager", "Manager"
        ADMIN = "admin", "Admin"

    slug = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=50, default="LayoutGrid")
    route = models.CharField(max_length=100)
    min_role = models.CharField(max_length=20, choices=MinRole.choices, default=MinRole.OPERATOR)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=10)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.name

    def visible_for(self, role: str) -> bool:
        return ROLE_ORDER.get(role, 0) >= ROLE_ORDER.get(self.min_role, 0)
