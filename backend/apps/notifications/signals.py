from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.crm.models import Lead, Note
from apps.notifications.services import notify
from apps.shipments.models import Shipment


@receiver(pre_save, sender=Lead)
def lead_pre_save(sender, instance: Lead, **kwargs):
    if not instance.pk:
        instance._old_stage_id = None
        instance._old_assigned = None
        return
    try:
        old = Lead.objects.get(pk=instance.pk)
        instance._old_stage_id = old.stage_id
        instance._old_assigned = old.assigned_to_id
    except Lead.DoesNotExist:
        instance._old_stage_id = None
        instance._old_assigned = None


@receiver(post_save, sender=Lead)
def lead_post_save(sender, instance: Lead, created, **kwargs):
    if created:
        return
    if instance.assigned_to_id and instance.assigned_to_id != getattr(instance, "_old_assigned", None):
        notify(
            instance.assigned_to,
            "Назначен лид",
            f"Вам назначен лид «{instance.name}»",
            f"/crm/leads/{instance.pk}",
        )
    if instance.stage_id != getattr(instance, "_old_stage_id", instance.stage_id):
        if instance.assigned_to_id:
            notify(
                instance.assigned_to,
                "Смена этапа",
                f"Лид «{instance.name}»: этап изменён",
                f"/crm/leads/{instance.pk}",
            )


@receiver(post_save, sender=Note)
def note_created(sender, instance: Note, created, **kwargs):
    if not created:
        return
    lead = instance.lead
    if lead.assigned_to_id and lead.assigned_to_id != instance.author_id:
        notify(
            lead.assigned_to,
            "Новая заметка",
            f"К лиду «{lead.name}» добавлена заметка",
            f"/crm/leads/{lead.pk}",
        )


@receiver(pre_save, sender=Shipment)
def shipment_pre_save(sender, instance: Shipment, **kwargs):
    if not instance.pk:
        instance._old_status = None
        return
    try:
        old = Shipment.objects.get(pk=instance.pk)
        instance._old_status = old.status
    except Shipment.DoesNotExist:
        instance._old_status = None


@receiver(post_save, sender=Shipment)
def shipment_status_note(sender, instance: Shipment, created, **kwargs):
    if created:
        return
    old = getattr(instance, "_old_status", None)
    if old and old != instance.status:
        from apps.crm.models import Note

        labels = dict(Shipment.Status.choices)
        Note.objects.create(
            lead=instance.lead,
            author=instance.created_by,
            body=f"Заявка #{instance.pk}: {labels.get(old, old)} → {labels.get(instance.status, instance.status)}",
        )
