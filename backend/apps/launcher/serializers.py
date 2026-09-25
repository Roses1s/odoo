from rest_framework import serializers

from apps.launcher.models import App


class AppSerializer(serializers.ModelSerializer):
    class Meta:
        model = App
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "icon",
            "route",
            "min_role",
            "is_active",
            "order",
        )
