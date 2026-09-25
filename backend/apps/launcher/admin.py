from django.contrib import admin

from apps.launcher.models import App


@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    list_display = ("order", "slug", "name", "min_role", "is_active")
    list_editable = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}
