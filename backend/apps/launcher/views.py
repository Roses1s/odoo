from rest_framework import permissions, viewsets

from apps.launcher.models import App
from apps.launcher.serializers import AppSerializer
from apps.users.permissions import IsAdmin


class AppViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AppSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = App.objects.filter(is_active=True)

    def get_queryset(self):
        qs = App.objects.filter(is_active=True)
        role = getattr(self.request.user, "role", "operator")
        slugs = [app.slug for app in qs if app.visible_for(role)]
        return qs.filter(slug__in=slugs)


class AdminAppViewSet(viewsets.ModelViewSet):
    serializer_class = AppSerializer
    permission_classes = [IsAdmin]
    queryset = App.objects.all()
