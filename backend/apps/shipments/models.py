from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.validators import normalize_phone, validate_inn


class Carrier(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    inn = models.CharField(max_length=12, db_index=True)
    contact_name = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.EmailField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        if self.inn:
            validate_inn(self.inn)
        if self.contact_phone:
            self.contact_phone = normalize_phone(self.contact_phone)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Shipment(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "Новая"
        IN_PROGRESS = "in_progress", "В работе"
        IN_TRANSIT = "in_transit", "В пути"
        DELIVERED = "delivered", "Доставлена"
        CANCELLED = "cancelled", "Отменена"

    class TransportType(models.TextChoices):
        FT_20 = "ft_20", "Фура 20т"
        FT_40 = "ft_40", "Фура 40т"
        REF = "ref", "Рефрижератор"
        TENT = "tent", "Тент"
        GAZEL = "gazel", "Газель"
        OTHER = "other", "Другое"

    lead = models.ForeignKey("crm.Lead", on_delete=models.CASCADE, related_name="shipments")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shipments"
    )
    carrier = models.ForeignKey(Carrier, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)

    city_loading = models.CharField("Город погрузки", max_length=255)
    city_unloading = models.CharField("Город выгрузки", max_length=255)
    address_loading = models.TextField("Адрес погрузки")
    address_unloading = models.TextField("Адрес выгрузки")

    contact_loading_name = models.CharField("Контакт на погрузке", max_length=255)
    contact_loading_phone = models.CharField("Телефон на погрузке", max_length=50)
    contact_unloading_name = models.CharField("Контакт на выгрузке", max_length=255)
    contact_unloading_phone = models.CharField("Телефон на выгрузке", max_length=50)

    transport_type = models.CharField(max_length=20, choices=TransportType.choices, blank=True)
    cargo_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cargo_volume = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Shipment #{self.pk}"

    def clean(self) -> None:
        if self.contact_loading_phone:
            self.contact_loading_phone = normalize_phone(self.contact_loading_phone)
        if self.contact_unloading_phone:
            self.contact_unloading_phone = normalize_phone(self.contact_unloading_phone)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
