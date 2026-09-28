from rest_framework import serializers

# Masks keep just enough of a value for a human to tell two records apart.
# Anything more makes the original guessable: an INN carries a checksum, so
# every digit shown shrinks the search space by an order of magnitude.


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
    """+7*******67"""

    def to_representation(self, value: str) -> str:
        if not value or len(value) < 7:
            return value
        prefix = value[:2] if value.startswith("+") else value[:1]
        hidden = "*" * max(len(value) - len(prefix) - 2, 3)
        return f"{prefix}{hidden}{value[-2:]}"


class MaskedINNField(serializers.CharField):
    """*******893"""

    def to_representation(self, value: str) -> str:
        if not value or len(value) < 6:
            return value
        return f"{'*' * (len(value) - 3)}{value[-3:]}"
