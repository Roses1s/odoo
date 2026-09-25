from rest_framework import serializers


class MaskedEmailField(serializers.CharField):
    """l***@romashka.ru"""

    def to_representation(self, value: str) -> str:
        if not value or "@" not in value:
            return value
        local, domain = value.split("@", 1)
        if not local:
            return value
        return f"{local[0]}***@{domain}"


class MaskedPhoneField(serializers.CharField):
    """+7 *** ***-45-67"""

    def to_representation(self, value: str) -> str:
        if not value or len(value) < 7:
            return value
        return f"{value[:3]} *** ***-{value[-5:]}"


class MaskedINNField(serializers.CharField):
    """77****3456"""

    def to_representation(self, value: str) -> str:
        if not value or len(value) < 6:
            return value
        return f"{value[:2]}****{value[-4:]}"
