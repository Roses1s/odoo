from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == "admin")


class IsManagerOrAbove(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role in ("admin", "manager"))


class IsLeadOwnerOrManager(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if user.role in ("admin", "manager"):
            return True
        assigned = getattr(obj, "assigned_to_id", None)
        created = getattr(obj, "created_by_id", None)
        return assigned == user.id or created == user.id


class IsManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.role in ("admin", "manager")
