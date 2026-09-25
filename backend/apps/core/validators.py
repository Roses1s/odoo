from __future__ import annotations

import phonenumbers
from django.core.exceptions import ValidationError


def inn_checksum_ok(inn: str) -> bool:
    inn = "".join(ch for ch in (inn or "") if ch.isdigit())
    if len(inn) == 10:
        coeffs = [2, 4, 10, 3, 5, 9, 4, 6, 8]
        control = sum(int(inn[i]) * coeffs[i] for i in range(9)) % 11 % 10
        return control == int(inn[9])
    if len(inn) == 12:
        coeffs11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        coeffs12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        n11 = sum(int(inn[i]) * coeffs11[i] for i in range(10)) % 11 % 10
        n12 = sum(int(inn[i]) * coeffs12[i] for i in range(11)) % 11 % 10
        return n11 == int(inn[10]) and n12 == int(inn[11])
    return False


def digits_inn(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def validate_inn(value: str) -> str:
    digits = digits_inn(value)
    if not digits:
        raise ValidationError("ИНН обязателен")
    if len(digits) not in (10, 12):
        raise ValidationError("ИНН должен содержать 10 или 12 цифр")
    if not inn_checksum_ok(digits):
        raise ValidationError("Некорректный ИНН (ФНС 10/12 цифр)")
    return digits


def normalize_phone(value: str, region: str = "RU") -> str:
    if not value:
        return value
    try:
        parsed = phonenumbers.parse(value, region)
        if not phonenumbers.is_valid_number(parsed):
            raise ValidationError("Некорректный телефон")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException as exc:
        raise ValidationError("Некорректный телефон") from exc
