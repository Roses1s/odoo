from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import TimeStampedModel
from apps.core.validators import normalize_phone, validate_inn


class Stage(models.Model):
    name = models.CharField(max_length=100)
    sequence = models.PositiveIntegerField(default=10)
    is_closed = models.BooleanField(default=False)
    color = models.CharField(max_length=20, default="slate")

    class Meta:
        ordering = ["sequence", "id"]

    def __str__(self) -> str:
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, default="blue")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Lead(TimeStampedModel):
    PRIORITY_CHOICES = (
        (0, "None"),
        (1, "Low"),
        (2, "Medium"),
        (3, "High"),
    )

    name = models.CharField(max_length=255)
    inn = models.CharField(max_length=12, db_index=True)
    logist_email = models.EmailField(blank=True, null=True)
    logist_contact = models.CharField(max_length=255, blank=True)
    priority = models.IntegerField(default=0, choices=PRIORITY_CHOICES)
    expected_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.ForeignKey(Stage, on_delete=models.PROTECT, related_name="leads")
    tags = models.ManyToManyField(Tag, blank=True, related_name="leads")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_leads",
    )
    is_archived = models.BooleanField(default=False)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        self.inn = validate_inn(self.inn)
        if self.logist_contact:
            self.logist_contact = normalize_phone(self.logist_contact)
        if self.inn and not self.is_archived:
            qs = Lead.objects.filter(inn=self.inn, is_archived=False)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            for other in qs.select_related("stage"):
                if not other.stage.is_closed:
                    raise ValidationError({"inn": "Уже есть активный лид с этим ИНН"})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Note(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Note #{self.pk}"
