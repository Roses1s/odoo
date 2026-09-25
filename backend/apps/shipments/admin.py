from django.contrib import admin

from apps.shipments.models import Carrier, Shipment


@admin.register(Carrier)
class CarrierAdmin(admin.ModelAdmin):
    list_display = ("name", "inn", "is_active")
    search_fields = ("name", "inn")


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("id", "lead", "status", "city_loading", "city_unloading", "created_by")
    list_filter = ("status",)
