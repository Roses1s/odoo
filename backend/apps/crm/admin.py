from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from apps.crm.models import Lead, Note, Stage, Tag


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ("id", "sequence", "name", "color", "is_closed")
    list_display_links = ("id", "name")
    list_editable = ("sequence", "is_closed")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "color")


@admin.register(Lead)
class LeadAdmin(SimpleHistoryAdmin):
    list_display = ("name", "inn", "stage", "assigned_to", "priority", "is_archived")
    list_filter = ("stage", "priority", "is_archived")
    search_fields = ("name", "inn", "logist_email")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("lead", "author", "created_at")
