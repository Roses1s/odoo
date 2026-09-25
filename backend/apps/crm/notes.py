from rest_framework import serializers

from apps.crm.models import Note


class NoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ("id", "body", "author", "author_name", "author_initials", "created_at")
        read_only_fields = ("author", "created_at")

    def get_author_name(self, obj) -> str:
        user = obj.author
        full = f"{user.first_name} {user.last_name}".strip()
        return full or user.email

    def get_author_initials(self, obj) -> str:
        user = obj.author
        if user.first_name or user.last_name:
            return f"{user.first_name[:1]}{user.last_name[:1]}".upper() or "U"
        return (user.email[:2] or "U").upper()
