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
        # Assignment is the single source of truth, matching
        # LeadViewSet.get_queryset: a lead handed to someone else must stop
        # being visible to whoever created it.
        if hasattr(obj, "assigned_to_id"):
            return obj.assigned_to_id == user.id
        # Objects that nobody is assigned to (shipments) belong to their author.
        return getattr(obj, "created_by_id", None) == user.id


class IsManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.role in ("admin", "manager")
